from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.supabase_service import supabase, get_current_user

router = APIRouter()


class TemplateBody(BaseModel):
    name: str
    fields: list[str]


@router.get("")
def list_templates(user_id: str = Depends(get_current_user)):
    res = supabase.table("extraction_templates").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data or []


@router.post("", status_code=201)
def create_template(body: TemplateBody, user_id: str = Depends(get_current_user)):
    res = supabase.table("extraction_templates").insert({"user_id": user_id, "name": body.name, "fields": body.fields}).execute()
    return res.data[0]


@router.put("/{template_id}")
def update_template(template_id: str, body: TemplateBody, user_id: str = Depends(get_current_user)):
    res = supabase.table("extraction_templates").update({"name": body.name, "fields": body.fields}).eq("id", template_id).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(404, "Template not found.")
    return res.data[0]


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("extraction_templates").delete().eq("id", template_id).eq("user_id", user_id).execute()
