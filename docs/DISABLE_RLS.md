# Run this SQL in Supabase SQL Editor to disable RLS (no-auth mode)

```sql
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_templates DISABLE ROW LEVEL SECURITY;
```
