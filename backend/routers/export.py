from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.supabase_service import supabase, get_current_user
from services.export_service import to_csv, to_excel, to_json, to_pdf

router = APIRouter()
FORMATS = {
    "csv": ("text/csv", ".csv"),
    "excel": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    "json": ("application/json", ".json"),
    "pdf": ("application/pdf", ".pdf"),
}


def _stream(data: bytes, fmt: str, name: str):
    mime, ext = FORMATS[fmt]
    return StreamingResponse(iter([data]), media_type=mime,
                             headers={"Content-Disposition": f"attachment; filename={name}{ext}"})


@router.get("/{invoice_id}")
def export_single(invoice_id: str, format: str = Query("excel"), user_id: str = Depends(get_current_user)):
    if format not in FORMATS: raise HTTPException(400, f"Invalid format.")
    res = supabase.table("invoices").select("*").eq("id", invoice_id).eq("user_id", user_id).single().execute()
    if not res.data: raise HTTPException(404, "Invoice not found.")
    inv = res.data
    ed = inv.get("extracted_data") or {}
    data = {"invoices": [{"invoice_id": inv["id"], "file_name": inv["file_name"], **ed}]}
    exporters = {"csv": to_csv, "excel": to_excel, "json": to_json, "pdf": to_pdf}
    return _stream(exporters[format](data), format, ed.get("vendor_name", "invoice"))


class ConsolidatedExportBody(BaseModel):
    invoice_ids: list[str]


@router.post("/consolidated")
def export_consolidated(body: ConsolidatedExportBody, format: str = Query("excel"), user_id: str = Depends(get_current_user)):
    if format not in FORMATS: raise HTTPException(400, f"Invalid format.")
    res = supabase.table("invoices").select("*").in_("id", body.invoice_ids).eq("user_id", user_id).execute()
    invoices = res.data or []
    if not invoices: raise HTTPException(404, "No invoices found.")
    items = [{"invoice_id": inv["id"], "file_name": inv["file_name"], **(inv.get("extracted_data") or {})} for inv in invoices]
    exporters = {"csv": to_csv, "excel": to_excel, "json": to_json, "pdf": to_pdf}
    return _stream(exporters[format]({"invoices": items}), format, "consolidated")
