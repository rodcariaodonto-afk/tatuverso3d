-- ── tenant_credentials: credenciais de integração por tenant ─────────────────
-- Tabela dedicada para não conflitar com a platform_settings (key-value) já existente.
-- Em produção, criptografe os tokens com pgp_sym_encrypt ou Supabase Vault.

CREATE TABLE IF NOT EXISTS tenant_credentials (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT        NOT NULL UNIQUE DEFAULT 'default',
  store_name          TEXT,
  store_logo_url      TEXT,
  primary_color       TEXT        DEFAULT '#1a1a1a',
  cep_origem          TEXT,
  commission_percent  NUMERIC(5,2) DEFAULT 0,
  -- Mercado Pago
  mp_access_token     TEXT,
  mp_public_key       TEXT,
  mp_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  -- Melhor Envio
  melhor_envio_token  TEXT,
  me_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_credentials_admin_all" ON tenant_credentials;
CREATE POLICY "tenant_credentials_admin_all" ON tenant_credentials
  FOR ALL TO authenticated
  USING  (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- updated_at trigger (sem moddatetime)
CREATE OR REPLACE FUNCTION set_tenant_credentials_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_credentials_updated_at ON tenant_credentials;
CREATE TRIGGER tenant_credentials_updated_at
  BEFORE UPDATE ON tenant_credentials
  FOR EACH ROW EXECUTE FUNCTION set_tenant_credentials_updated_at();

-- Linha padrão para tenant único (idempotente)
INSERT INTO tenant_credentials (tenant_id)
VALUES ('default')
ON CONFLICT (tenant_id) DO NOTHING;

-- ── Suporte a pedidos guest ───────────────────────────────────────────────────

ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_cpf        TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service JSONB;

-- Atualiza política de INSERT dos pedidos
DROP POLICY IF EXISTS "customers_insert_orders" ON orders;
CREATE POLICY "customers_insert_orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR customer_id IS NULL
  );
