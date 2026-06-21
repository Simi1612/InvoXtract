# Database Schema — AI Invoice Extractor

Run all SQL below in Supabase → SQL Editor.

---

## Tables

### invoices

```sql
CREATE TABLE invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_data JSONB,
    template_id UUID REFERENCES extraction_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### extraction_templates

```sql
CREATE TABLE extraction_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_user_id ON extraction_templates(user_id);
```

---

## extracted_data JSON Structure

What gets stored in `invoices.extracted_data`:

```json
{
  "invoice_number": "INV-2024-001",
  "date": "2024-01-15",
  "due_date": "2024-02-15",
  "payment_terms": "Net 30",
  "currency": "INR",
  "vendor_name": "ABC Supplies Pvt Ltd",
  "vendor_address": "123 MG Road, Bengaluru 560001",
  "buyer_name": "XYZ Corporation",
  "buyer_address": "456 Park Street, Mumbai 400001",
  "line_items": [
    {
      "description": "Web Development Services",
      "quantity": 1,
      "unit_price": 50000.00,
      "amount": 50000.00
    }
  ],
  "subtotal": 50000.00,
  "tax": 9000.00,
  "total": 59000.00
}
```

### extraction_templates.fields structure

```json
["vendor_name", "total", "tax", "invoice_number", "date"]
```

Available field names:
- `invoice_number`
- `date`
- `due_date`
- `payment_terms`
- `currency`
- `vendor_name`
- `vendor_address`
- `buyer_name`
- `buyer_address`
- `line_items`
- `subtotal`
- `tax`
- `total`

---

## Row Level Security (RLS)

Enable RLS and add policies so users can only access their own rows.

```sql
-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_templates ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users see own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own invoices"
    ON invoices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users delete own invoices"
    ON invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Templates policies
CREATE POLICY "Users see own templates"
    ON extraction_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own templates"
    ON extraction_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own templates"
    ON extraction_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users delete own templates"
    ON extraction_templates FOR DELETE
    USING (auth.uid() = user_id);
```

---

## Supabase Storage

```sql
-- Create invoices bucket (run in SQL editor or via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false);

-- Storage policy: users access only their own files
CREATE POLICY "Users upload own files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users read own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users delete own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'invoices'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
```

> Files stored at path: `{user_id}/{invoice_id}/{filename}`

---

## Analytics Queries

These run server-side in FastAPI using Supabase client:

```sql
-- Summary stats
SELECT
    COUNT(*) as total_invoices,
    SUM((extracted_data->>'total')::numeric) as total_spend,
    AVG((extracted_data->>'total')::numeric) as avg_invoice_value
FROM invoices
WHERE user_id = $1 AND status = 'completed';

-- Spend by vendor
SELECT
    extracted_data->>'vendor_name' as vendor,
    SUM((extracted_data->>'total')::numeric) as total_spend,
    COUNT(*) as invoice_count
FROM invoices
WHERE user_id = $1 AND status = 'completed'
GROUP BY vendor
ORDER BY total_spend DESC
LIMIT 10;

-- Monthly volume
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as invoice_count,
    SUM((extracted_data->>'total')::numeric) as total_spend
FROM invoices
WHERE user_id = $1
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '12 months'
GROUP BY month
ORDER BY month;
```
