
import json
import re
import io
import os
import tempfile
from PIL import Image
from pdf2image import convert_from_bytes
import vertexai
from vertexai.generative_models import GenerativeModel, Image as VertexImage

# Poppler path for Windows
_POPPLER_PATH = None
for _candidate in [
    r"C:\poppler\poppler-26.02.0\Library\bin",
    r"C:\poppler\Library\bin",
    r"C:\Program Files\poppler\Library\bin",
]:
    if os.path.exists(_candidate):
        _POPPLER_PATH = _candidate
        break

# Vertex AI Configuration
_PROJECT_ID = "ai-invoice-499507"
_LOCATION = "us-central1"

# Load credentials from Render Environment Variable
creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")

if not creds_json:
    raise RuntimeError(
        "GOOGLE_CREDENTIALS_JSON environment variable not found"
    )

with tempfile.NamedTemporaryFile(
    mode="w",
    suffix=".json",
    delete=False,
    encoding="utf-8"
) as temp_file:
    temp_file.write(creds_json)
    creds_path = temp_file.name

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path

vertexai.init(
    project=_PROJECT_ID,
    location=_LOCATION
)

model = GenerativeModel("gemini-2.5-flash")

ALL_FIELDS = [
    "invoice_number",
    "date",
    "due_date",
    "payment_terms",
    "currency",
    "vendor_name",
    "vendor_address",
    "buyer_name",
    "buyer_address",
    "line_items",
    "subtotal",
    "tax",
    "total",
]


def _build_prompt(fields: list[str] | None) -> str:
    target = fields if fields else ALL_FIELDS

    return (
        f"Extract the following fields from this invoice image and return ONLY valid JSON. "
        f"No markdown, no explanation, no extra text.\n\n"
        f"Fields: {', '.join(target)}\n\n"
        f"Rules:\n"
        f"- Invoice may be in ANY language — extract and return field values in English\n"
        f"- line_items: list of {{description, quantity, unit_price, amount}}\n"
        f"- Missing fields: return null\n"
        f"- Numeric fields: return numbers not strings\n"
        f"- Return raw JSON object only, starting with {{"
    )


def _clean_json(raw: str) -> str:
    raw = raw.strip()

    raw = re.sub(r"^```(?:json)?\s*\n?", "", raw)
    raw = re.sub(r"\n?```\s*$", "", raw)

    start = raw.find("{")
    end = raw.rfind("}")

    if start != -1 and end != -1:
        raw = raw[start:end + 1]

    return raw


def _pil_to_vertex_image(pil_img: Image.Image) -> VertexImage:
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return VertexImage.from_bytes(buf.getvalue())


def _image_from_bytes(file_bytes: bytes, mime_type: str) -> Image.Image:
    if mime_type == "application/pdf":
        return convert_from_bytes(
            file_bytes,
            first_page=1,
            last_page=1,
            dpi=200,
            poppler_path=_POPPLER_PATH
        )[0]

    return Image.open(io.BytesIO(file_bytes))


def _extract_image(
    pil_img: Image.Image,
    fields: list[str] | None
) -> dict:
    vertex_img = _pil_to_vertex_image(pil_img)

    response = model.generate_content(
        [_build_prompt(fields), vertex_img]
    )

    raw = _clean_json(response.text)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Model returned invalid JSON: {str(e)}. Raw: {raw[:200]}"
        )


def extract_invoice(
    file_bytes: bytes,
    mime_type: str,
    fields: list[str] | None = None
) -> dict:
    return _extract_image(
        _image_from_bytes(file_bytes, mime_type),
        fields
    )


def extract_all_pages(
    file_bytes: bytes,
    fields: list[str] | None = None
) -> list[dict]:
    images = convert_from_bytes(
        file_bytes,
        dpi=200,
        poppler_path=_POPPLER_PATH
    )

    results = []

    for img in images:
        try:
            results.append(_extract_image(img, fields))
        except Exception as e:
            results.append(
                {
                    "_error": str(e),
                    "_page": len(results) + 1
                }
            )

    return results

