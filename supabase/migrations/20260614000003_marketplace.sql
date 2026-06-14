-- ── Fase 4: Marketplace — Split de Pagamentos e Candidaturas ─────────────────

-- mp_account_id: ID da conta Mercado Pago do produtor (obtido via OAuth)
ALTER TABLE public.producers ADD COLUMN IF NOT EXISTS mp_account_id TEXT;

-- mp_master_account_id: ID da conta MP master da plataforma (recebe comissão)
ALTER TABLE public.tenant_credentials ADD COLUMN IF NOT EXISTS mp_master_account_id TEXT;
