from fastapi import APIRouter, Depends, Query
from services.supabase_service import supabase, get_current_user
from datetime import datetime, timezone

router = APIRouter()


@router.get("/summary")
def summary(date_from: str | None = Query(None), date_to: str | None = Query(None), user_id: str = Depends(get_current_user)):
    query = supabase.table("invoices").select("extracted_data, created_at, status").eq("user_id", user_id)
    if date_from: query = query.gte("created_at", date_from)
    if date_to: query = query.lte("created_at", date_to)
    rows = query.execute().data or []
    now = datetime.now(timezone.utc)
    this_month = f"{now.year}-{now.month:02d}"
    lm = datetime(now.year, now.month - 1 if now.month > 1 else 12, 1)
    last_month = f"{lm.year}-{lm.month:02d}"
    totals, this_m, last_m = [], [], []
    vendors = set()
    status_counts = {"completed": 0, "processing": 0, "failed": 0}
    for r in rows:
        t = float((r.get("extracted_data") or {}).get("total") or 0)
        totals.append(t)
        month = r["created_at"][:7]
        if month == this_month: this_m.append(t)
        elif month == last_month: last_m.append(t)
        v = (r.get("extracted_data") or {}).get("vendor_name")
        if v: vendors.add(v)
        s = r.get("status", "completed")
        if s in status_counts: status_counts[s] += 1
        else: status_counts["completed"] += 1
    return {
        "total_invoices": len(totals), "total_spend": sum(totals),
        "avg_invoice_value": sum(totals) / len(totals) if totals else 0,
        "this_month_invoices": len(this_m), "this_month_spend": sum(this_m),
        "last_month_invoices": len(last_m), "last_month_spend": sum(last_m),
        "total_vendors": len(vendors),
        "status_breakdown": status_counts,
    }


@router.get("/by-vendor")
def by_vendor(date_from: str | None = Query(None), date_to: str | None = Query(None), limit: int = Query(10), user_id: str = Depends(get_current_user)):
    query = supabase.table("invoices").select("extracted_data").eq("user_id", user_id).eq("status", "completed")
    if date_from: query = query.gte("created_at", date_from)
    if date_to: query = query.lte("created_at", date_to)
    rows = query.execute().data or []
    vm: dict = {}
    for r in rows:
        ed = r.get("extracted_data") or {}
        v = ed.get("vendor_name") or "Unknown"
        t = float(ed.get("total") or 0)
        if v not in vm: vm[v] = {"vendor": v, "total_spend": 0.0, "invoice_count": 0}
        vm[v]["total_spend"] += t
        vm[v]["invoice_count"] += 1
    return sorted(vm.values(), key=lambda x: x["total_spend"], reverse=True)[:limit]


@router.get("/monthly")
def monthly(user_id: str = Depends(get_current_user)):
    rows = supabase.table("invoices").select("extracted_data, created_at").eq("user_id", user_id).eq("status", "completed").execute().data or []
    mm: dict = {}
    for r in rows:
        month = r["created_at"][:7]
        t = float((r.get("extracted_data") or {}).get("total") or 0)
        if month not in mm: mm[month] = {"month": month, "invoice_count": 0, "total_spend": 0.0}
        mm[month]["invoice_count"] += 1
        mm[month]["total_spend"] += t
    return sorted(mm.values(), key=lambda x: x["month"])
