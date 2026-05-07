
-- Status enums
CREATE TYPE public.b2b_lead_status AS ENUM ('new','contacted','in_proposal','won','lost','archived');
CREATE TYPE public.private_label_project_status AS ENUM ('briefing','design','approval','production','delivered','cancelled');
CREATE TYPE public.corporate_quote_status AS ENUM ('draft','sent','accepted','rejected','expired');

-- B2B LEADS
CREATE TABLE public.b2b_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  estimated_quantity TEXT,
  purpose TEXT,
  desired_deadline TEXT,
  has_brand BOOLEAN DEFAULT false,
  packaging_preference TEXT,
  notes TEXT,
  logo_url TEXT,
  source TEXT DEFAULT 'private_label_form',
  status b2b_lead_status NOT NULL DEFAULT 'new',
  assigned_admin_id UUID,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_leads_public_insert" ON public.b2b_leads
  FOR INSERT WITH CHECK (true);
CREATE POLICY "b2b_leads_admin_select" ON public.b2b_leads
  FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "b2b_leads_admin_update" ON public.b2b_leads
  FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "b2b_leads_admin_delete" ON public.b2b_leads
  FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER tg_b2b_leads_updated BEFORE UPDATE ON public.b2b_leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PACKAGING OPTIONS
CREATE TABLE public.packaging_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  min_quantity INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packaging_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_public_read" ON public.packaging_options
  FOR SELECT USING (is_active = true OR is_admin(auth.uid()));
CREATE POLICY "packaging_admin_write" ON public.packaging_options
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- PRIVATE LABEL PROJECTS
CREATE TABLE public.private_label_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  packaging_option_id UUID REFERENCES public.packaging_options(id),
  quantity INTEGER,
  estimated_value NUMERIC(12,2),
  status private_label_project_status NOT NULL DEFAULT 'briefing',
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.private_label_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_admin_all" ON public.private_label_projects
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER tg_projects_updated BEFORE UPDATE ON public.private_label_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- PROJECT FILES
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.private_label_projects(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_files_admin_all" ON public.project_files
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- CORPORATE QUOTE REQUESTS
CREATE TABLE public.corporate_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.b2b_leads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.private_label_projects(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  status corporate_quote_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.corporate_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_admin_all" ON public.corporate_quote_requests
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER tg_quotes_updated BEFORE UPDATE ON public.corporate_quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Storage bucket for B2B files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('b2b-files', 'b2b-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to a public-intake folder for new leads (logos before login)
CREATE POLICY "b2b_files_public_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'b2b-files' AND (storage.foldername(name))[1] = 'leads');

CREATE POLICY "b2b_files_admin_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'b2b-files' AND is_admin(auth.uid()));

CREATE POLICY "b2b_files_admin_write"
  ON storage.objects FOR ALL
  USING (bucket_id = 'b2b-files' AND is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'b2b-files' AND is_admin(auth.uid()));

-- Seed packaging options
INSERT INTO public.packaging_options (slug, name, description, min_quantity, sort_order) VALUES
  ('pouch-kraft-250', 'Pouch Kraft 250g', 'Embalagem stand-up kraft com válvula desgaseificadora e zíper. Acabamento natural premium.', 50, 1),
  ('pouch-black-250', 'Pouch Black Matte 250g', 'Embalagem black matte com hot stamping dourado opcional. Visual sofisticado.', 50, 2),
  ('lata-premium-250', 'Lata Premium 250g', 'Lata metálica com tampa hermética. Reutilizável e ideal para presentes corporativos.', 100, 3),
  ('drip-coffee-sache', 'Drip Coffee (sachê individual)', 'Sachê individual com filtro de origami. Perfeito para brindes e eventos.', 200, 4),
  ('kit-degustacao', 'Kit Degustação Personalizado', 'Caixa premium com 3 a 5 microlotes em embalagens menores. Ideal para presentear.', 30, 5);
