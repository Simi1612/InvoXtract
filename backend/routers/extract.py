import uuid
import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from fastapi.responses import StreamingResponse
from pdf2image import convert_from_bytes

from services.supabase_service import supabase, get_current_user, get_optional_user, upload_file_to_storage
from services.gemini_service import extract_invoice, extract_all_pages, _POPPLER_PATH

router = APIRouter()

ALLOWED_TYPES = {"application/pdf", "image/png", "image/jpeg"}
MAX_SIZE = 50 * 1024 * 1024
_jobs: dict[str, list[dict]] = {}


def _validate(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Use PDF, PNG, or JPG.")


def _get_pdf_page_count(file_bytes: bytes) -> int:
    try:
        pages = convert_from_bytes(file_bytes, dpi=72, first_page=1, last_page=999, poppler_path=_POPPLER_PATH)
        return len(pages)
    except Exception:
        return 1


def _get_template_fields(template_id: str | None, user_id: str) -> list | None:
    if not template_id:
        return None
    res = supabase.table("extraction_templates").select("fields").eq("id", template_id).eq("user_id", user_id).single().execute()
    return res.data["fields"] if res.data else None


async def _check_duplicate(filename: str, user_id: str) -> dict | None:
    """Check if invoice with same filename already exists. Returns existing record or None."""
    if not user_id or not filename:
        return None
    res = supabase.table("invoices").select("id, extracted_data").eq("user_id", user_id).eq("file_name", filename).execute()
    if res.data:
        return res.data[0]
    return None


async def _save_extracted(extracted: dict, file_bytes: bytes, filename: str, user_id: str) -> dict:
    invoice_id = str(uuid.uuid4())
    file_url = await upload_file_to_storage(user_id, invoice_id, file_bytes, filename)
    supabase.table("invoices").insert({
        "id": invoice_id, "user_id": user_id, "file_name": filename,
        "file_url": file_url, "status": "completed", "extracted_data": extracted,
    }).execute()
    return {"invoice_id": invoice_id, "file_url": file_url, "extracted_data": extracted, "duplicate": False}


@router.post("/single")
async def extract_single(
    file: UploadFile = File(...),
    template_id: str | None = Form(None),
    user_id: str | None = Depends(get_optional_user),
):
    _validate(file)
    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(400, "File too large. Max 50MB.")

    # Check duplicate BEFORE calling Gemini — saves tokens + time
    if user_id:
        existing = await _check_duplicate(file.filename, user_id)
        if existing:
            return {
                "invoice_id": existing["id"],
                "file_url": None,
                "extracted_data": existing["extracted_data"],
                "duplicate": True,
                "message": f"'{file.filename}' already extracted. Showing saved result."
            }

    template_fields = _get_template_fields(template_id, user_id) if user_id else None

    if file.content_type == "application/pdf":
        page_count = _get_pdf_page_count(file_bytes)
        if page_count > 1:
            job_id = str(uuid.uuid4())
            _jobs[job_id] = []

            async def run_multipage():
                try:
                    pages_data = extract_all_pages(file_bytes, template_fields)
                except Exception as e:
                    _jobs[job_id].append({"status": "batch_complete", "total_files": 0, "success_count": 0, "fail_count": 1})
                    return
                total = len(pages_data)
                success = fail = 0
                for i, ed in enumerate(pages_data):
                    fname = f"{file.filename}_page{i+1}.pdf"
                    try:
                        if "_error" in ed:
                            raise ValueError(ed["_error"])
                        if user_id:
                            result = await _save_extracted(ed, file_bytes, fname, user_id)
                        else:
                            result = {"invoice_id": None, "file_url": None, "extracted_data": ed}
                        _jobs[job_id].append({
                            "job_id": job_id, "file_name": fname, "file_index": i + 1, "total_files": total,
                            "status": "completed", "invoice_id": result["invoice_id"],
                            "extracted_data": result["extracted_data"],
                            "progress_percent": int((i + 1) / total * 100), "error": None,
                        })
                        success += 1
                    except Exception as e:
                        _jobs[job_id].append({
                            "job_id": job_id, "file_name": fname, "file_index": i + 1, "total_files": total,
                            "status": "failed", "invoice_id": None, "extracted_data": None,
                            "progress_percent": int((i + 1) / total * 100), "error": str(e),
                        })
                        fail += 1
                _jobs[job_id].append({"status": "batch_complete", "total_files": total, "success_count": success, "fail_count": fail})

            asyncio.create_task(run_multipage())
            return {"multi_page": True, "job_id": job_id, "total_pages": page_count}

    try:
        extracted = extract_invoice(file_bytes, file.content_type, template_fields)
    except Exception as e:
        raise HTTPException(422, f"AI extraction failed: {str(e)}")

    if not user_id:
        return {"invoice_id": None, "file_url": None, "extracted_data": extracted}
    return await _save_extracted(extracted, file_bytes, file.filename, user_id)


@router.post("/batch")
async def extract_batch(
    files: list[UploadFile] = File(...),
    template_id: str | None = Form(None),
    user_id: str = Depends(get_current_user),
):
    if len(files) > 50:
        raise HTTPException(400, "Max 50 files per batch.")
    for f in files:
        _validate(f)

    template_fields = _get_template_fields(template_id, user_id)
    job_id = str(uuid.uuid4())
    _jobs[job_id] = []
    file_data = [(await f.read(), f.content_type, f.filename) for f in files]

    async def run_batch():
        total = len(file_data)
        success = fail = 0
        for i, (fb, mime, fname) in enumerate(file_data):
            try:
                extracted = extract_invoice(fb, mime, template_fields)
                result = await _save_extracted(extracted, fb, fname, user_id)
                _jobs[job_id].append({
                    "job_id": job_id, "file_name": fname, "file_index": i + 1, "total_files": total,
                    "status": "completed", "invoice_id": result["invoice_id"],
                    "extracted_data": result["extracted_data"],
                    "progress_percent": int((i + 1) / total * 100), "error": None,
                })
                success += 1
            except Exception as e:
                _jobs[job_id].append({
                    "job_id": job_id, "file_name": fname, "file_index": i + 1, "total_files": total,
                    "status": "failed", "invoice_id": None, "extracted_data": None,
                    "progress_percent": int((i + 1) / total * 100), "error": str(e),
                })
                fail += 1
        _jobs[job_id].append({"status": "batch_complete", "total_files": total, "success_count": success, "fail_count": fail})

    asyncio.create_task(run_batch())
    return {"job_id": job_id, "total_files": len(file_data)}


@router.get("/batch/progress/{job_id}")
async def batch_progress(job_id: str):
    async def stream() -> AsyncGenerator[str, None]:
        sent = 0
        while True:
            events = _jobs.get(job_id, [])
            while sent < len(events):
                event = events[sent]
                sent += 1
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") == "batch_complete":
                    _jobs.pop(job_id, None)
                    return
            await asyncio.sleep(0.5)

    return StreamingResponse(stream(), media_type="text/event-stream")
