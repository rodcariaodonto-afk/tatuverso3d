-- ── Fase 5: Módulo de Assinaturas (MP Preapproval) + LGPD ────────────────────

-- Adiciona campos do Mercado Pago nas assinaturas
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_status TEXT DEFAULT 'pending';

-- Preapproval plan ID do MP no plano de assinatura (para criação automática)
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS mp_preapproval_plan_id TEXT;

-- ── LGPD: solicitações de exclusão de dados ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed')),
  notes           TEXT
);
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deletion_own" ON public.data_deletion_requests;
CREATE POLICY "deletion_own" ON public.data_deletion_requests
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());
