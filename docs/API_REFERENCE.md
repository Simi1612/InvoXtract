# API Reference — AI Invoice Extractor

Base URL (local): `http://localhost:8000`
Base URL (production): `https://your-app.onrender.com`

All protected endpoints require header:
```
Authorization: Bearer <supabase_jwt_token>
```

---

## Health

### GET /health
No auth required.

**Response:**
```json
{ "status": "ok" }
```

---

## Extraction

### POST /extract/single
Upload one invoice. Auth optional (guest mode: result not saved).

**Request:** `multipart/form-data`
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| file | File | Yes | PDF, PNG, or JPG. Max 10MB |
| template_id | string (UUID) | No | If omitted, extracts all fields |

**Response `200`:**
```json
{
  "invoice_id": "uuid",
  "file_url": "https://...",
  "extracted_data": {
    "invoice_number": "INV-001",
    "date": "2024-01-15",
    "due_date": "2024-02-15",
    "payment_terms": "Net 30",
    "currency": "INR",
    "vendor_name": "ABC Supplies",
    "vendor_address": "123 MG Road, Bengaluru",
    "buyer_name": "XYZ Corp",
    "buyer_address": "456 Park St, Mumbai",
    "line_items": [
      {
        "description": "Services",
        "quantity": 1,
        "unit_price": 50000,
        "amount": 50000
      }
    ],
    "subtotal": 50000,
    "tax": 9000,
    "total": 59000
  }
}
```

**Errors:**
- `400` — unsupported file type or file too large
- `422` — Gemini failed to parse invoice
- `500` — internal error

---

### POST /extract/batch
Upload multiple invoices. Returns job_id for SSE progress tracking.

**Request:** `multipart/form-data`
| Field | Type | Notes |
|-------|------|-------|
| files | File[] | Up to 50 files |
| template_id | string | Optional |

**Response `202`:**
```json
{ "job_id": "uuid", "total_files": 5 }
```

---

### GET /extract/batch/progress/{job_id}
SSE stream. Connect after POST /extract/batch.

**Response:** `text/event-stream`

Each event:
```json
{
  "job_id": "uuid",
  "file_name": "invoice1.pdf",
  "file_index": 1,
  "total_files": 5,
  "status": "completed",
  "invoice_id": "uuid",
  "extracted_data": { ... },
  "progress_percent": 20,
  "error": null
}
```

Final event when all done:
```json
{ "status": "batch_complete", "total_files": 5, "success_count": 5, "fail_count": 0 }
```

---

## Invoices

### GET /invoices
List user's invoices. Paginated.

**Query params:**
| Param | Default | Notes |
|-------|---------|-------|
| page | 1 | |
| limit | 20 | max 100 |
| search | — | filters vendor_name or invoice_number |
| date_from | — | ISO date string |
| date_to | — | ISO date string |

**Response `200`:**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "file_name": "invoice.pdf",
      "vendor_name": "ABC Supplies",
      "invoice_number": "INV-001",
      "date": "2024-01-15",
      "total": 59000,
      "currency": "INR",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### GET /invoices/{id}
Full invoice detail.

**Response `200`:**
```json
{
  "id": "uuid",
  "file_name": "invoice.pdf",
  "file_url": "https://...",
  "status": "completed",
  "extracted_data": { ... },
  "template_id": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### PATCH /invoices/{id}
Update specific fields in extracted_data.

**Request body:**
```json
{
  "extracted_data": {
    "vendor_name": "Corrected Vendor Name",
    "total": 60000
  }
}
```

**Response `200`:** Updated invoice object.

---

### POST /invoices/consolidate
Merge multiple invoices into one combined result.

**Request body:**
```json
{ "invoice_ids": ["uuid1", "uuid2", "uuid3"] }
```

**Response `200`:**
```json
{
  "invoices": [
    {
      "invoice_id": "uuid1",
      "vendor_name": "ABC Supplies",
      "invoice_number": "INV-001",
      "date": "2024-01-15",
      "line_items": [ ... ],
      "subtotal": 50000,
      "tax": 9000,
      "total": 59000
    }
  ],
  "summary": {
    "total_invoices": 3,
    "grand_subtotal": 150000,
    "grand_tax": 27000,
    "grand_total": 177000,
    "currency": "INR"
  }
}
```

---

## Templates

### GET /templates
List user's extraction templates.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Tax Summary",
    "fields": ["vendor_name", "total", "tax", "invoice_number"],
    "created_at": "2024-01-10T09:00:00Z"
  }
]
```

---

### POST /templates
Create new template.

**Request body:**
```json
{
  "name": "Tax Summary",
  "fields": ["vendor_name", "total", "tax", "invoice_number"]
}
```

**Response `201`:** Created template object.

---

### PUT /templates/{id}
Update template.

**Request body:** Same as POST.
**Response `200`:** Updated template object.

---

### DELETE /templates/{id}
Delete template.

**Response `204`:** No content.

---

## Export

### GET /export/{invoice_id}
Download single invoice in specified format.

**Query params:**
| Param | Values |
|-------|--------|
| format | `csv` `excel` `json` `pdf` |

**Response:** File download with appropriate Content-Type.

---

### POST /export/consolidated
Download consolidated invoices in specified format.

**Query params:** `format=csv|excel|json|pdf`

**Request body:**
```json
{ "invoice_ids": ["uuid1", "uuid2"] }
```

**Response:** File download.

---

## Analytics

### GET /analytics/summary
**Query params:** `date_from`, `date_to` (optional ISO dates)

**Response `200`:**
```json
{
  "total_invoices": 42,
  "total_spend": 2450000,
  "avg_invoice_value": 58333,
  "this_month_invoices": 8,
  "this_month_spend": 480000,
  "last_month_invoices": 6,
  "last_month_spend": 360000
}
```

---

### GET /analytics/by-vendor
**Query params:** `date_from`, `date_to`, `limit` (default 10)

**Response `200`:**
```json
[
  { "vendor": "ABC Supplies", "total_spend": 590000, "invoice_count": 10 },
  { "vendor": "XYZ Corp", "total_spend": 420000, "invoice_count": 7 }
]
```

---

### GET /analytics/monthly
**Response `200`:**
```json
[
  { "month": "2024-01", "invoice_count": 8, "total_spend": 480000 },
  { "month": "2023-12", "invoice_count": 6, "total_spend": 360000 }
]
```
