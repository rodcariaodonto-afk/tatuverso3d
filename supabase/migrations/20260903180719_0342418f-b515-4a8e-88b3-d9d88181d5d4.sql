-- 1) Restaura execução da função usada nas políticas de leitura pública.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- 2) Atalho: visitante sem sessão nunca é admin (evita consulta em user_roles).
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'admin'::app_role
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

-- 3) Caminho público não depende mais da checagem de admin.
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS banners_public_read ON public.banners;
CREATE POLICY banners_public_read ON public.banners
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS packaging_public_read ON public.packaging_options;
CREATE POLICY packaging_public_read ON public.packaging_options
  FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS blog_public_read_published ON public.blog_posts;
CREATE POLICY blog_public_read_published ON public.blog_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_admin(auth.uid()));
