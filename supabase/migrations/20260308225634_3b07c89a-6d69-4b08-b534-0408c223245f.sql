-- Drop ALL existing storage policies
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents storage" ON storage.objects;

-- Receipts
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "receipts_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "receipts_admin" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));

-- Documents
CREATE POLICY "documents_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "documents_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "documents_admin" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));