
-- 1. platform_settings: admin-only read
DROP POLICY IF EXISTS settings_public_read ON public.platform_settings;
CREATE POLICY settings_admin_read ON public.platform_settings
  FOR SELECT USING (public.is_admin(auth.uid()));

-- 2. producers: hide contact_email/contact_phone from anon
REVOKE SELECT (contact_email, contact_phone) ON public.producers FROM anon;

-- 3. audit_logs: drop authenticated insert policy (service role bypasses RLS)
DROP POLICY IF EXISTS audit_authenticated_insert ON public.audit_logs;

-- 4. b2b-files: tighten upload check to image/PDF extensions
DROP POLICY IF EXISTS b2b_files_public_insert ON storage.objects;
CREATE POLICY b2b_files_public_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'b2b-files'
    AND (storage.foldername(name))[1] = 'leads'
    AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp','svg','pdf')
  );

-- 5. b2b_leads: replace permissive WITH CHECK (true)
DROP POLICY IF EXISTS b2b_leads_public_insert ON public.b2b_leads;
CREATE POLICY b2b_leads_public_insert ON public.b2b_leads
  FOR INSERT
  WITH CHECK (
    company_name IS NOT NULL
    AND length(company_name) > 0
    AND email IS NOT NULL
    AND length(email) > 3
  );

-- 6. Remove broad SELECT policies on storage.objects for public buckets
-- (public files remain accessible through their public CDN URLs)
DROP POLICY IF EXISTS product_images_public_read ON storage.objects;
DROP POLICY IF EXISTS "site-images public read" ON storage.objects;
