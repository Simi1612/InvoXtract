from fastapi import APIRouter, Depends, HTTPException
from services.supabase_service import supabase, get_current_user

router = APIRouter()


@router.get("")
def list_invoices(
    page: int = 1, limit: int = 20, search: str | None = None,
    date_from: str | None = None, date_to: str | None = None,
    user_id: str = Depends(get_current_user),
):
    query = (supabase.table("invoices").select("id, file_name, status, extracted_data, created_at")
             .eq("user_id", user_id).order("created_at", desc=True))
    if date_from: query = query.gte("created_at", date_from)
    if date_to: query = query.lte("created_at", date_to)

    res = query.range((page - 1) * limit, page * limit - 1).execute()
    result = []
    for inv in (res.data or []):
        ed = inv.get("extracted_data") or {}
        result.append({"id": inv["id"], "file_name": inv["file_name"],
                        "vendor_name": ed.get("vendor_name"), "invoice_number": ed.get("invoice_number"),
                        "date": ed.get("date"), "total": ed.get("total"),
                        "currency": ed.get("currency"), "status": inv["status"], "created_at": inv["created_at"]})
    if search:
        s = search.lower()
        result = [r for r in result if s in (r["vendor_name"] or "").lower() or s in (r["invoice_number"] or "").lower()]

    count_res = supabase.table("invoices").select("id", count="exact").eq("user_id", user_id).execute()
    return {"invoices": result, "total": count_res.count or 0, "page": page, "limit": limit}


@router.get("/consolidate-data")
def consolidate_data(invoice_ids: str, user_id: str = Depends(get_current_user)):
    ids = [i.strip() for i in invoice_ids.split(",") if i.strip()]
    if not ids: raise HTTPException(400, "No invoice IDs provided.")
    res = supabase.table("invoices").select("id, extracted_data, file_name").in_("id", ids).eq("user_id", user_id).execute()
    consolidated = []
    grand_subtotal = grand_tax = grand_total = 0.0
    for inv in (res.data or []):
        ed = inv.get("extracted_data") or {}
        s, t, tot = float(ed.get("subtotal") or 0), float(ed.get("tax") or 0), float(ed.get("total") or 0)
        grand_subtotal += s; grand_tax += t; grand_total += tot
        consolidated.append({"invoice_id": inv["id"], "file_name": inv["file_name"],
                              "vendor_name": ed.get("vendor_name"), "invoice_number": ed.get("invoice_number"),
                              "date": ed.get("date"), "line_items": ed.get("line_items") or [],
                              "subtotal": s, "tax": t, "total": tot, "currency": ed.get("currency")})
    return {"invoices": consolidated, "summary": {"total_invoices": len(consolidated),
            "grand_subtotal": grand_subtotal, "grand_tax": grand_tax, "grand_total": grand_total}}


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    res = supabase.table("invoices").select("*").eq("id", invoice_id).eq("user_id", user_id).single().execute()
    if not res.data: raise HTTPException(404, "Invoice not found.")
    return res.data


@router.patch("/{invoice_id}")
def update_invoice(invoice_id: str, body: dict, user_id: str = Depends(get_current_user)):
    existing = supabase.table("invoices").select("extracted_data").eq("id", invoice_id).eq("user_id", user_id).single().execute()
    if not existing.data: raise HTTPException(404, "Invoice not found.")
    merged = {**(existing.data.get("extracted_data") or {}), **(body.get("extracted_data") or {})}
    res = supabase.table("invoices").update({"extracted_data": merged}).eq("id", invoice_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else {}


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("invoices").delete().eq("id", invoice_id).eq("user_id", user_id).execute()
