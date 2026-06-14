-- ── platform_settings: credenciais por tenant ─────────────────────────────────
-- Em produção, criptografe mp_access_token e melhor_envio_token com
-- pgp_sym_encrypt(valor, current_setting('app.secret_key')) ou Supabase Vault.

CREATE TABLE IF NOT EXISTS platform_settings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT        NOT NULL UNIQUE DEFAULT 'default',
  store_name          TEXT,
  store_logo_url      TEXT,
  primary_color       TEXT        DEFAULT '#1a1a1a',
  cep_origem          TEXT,
  commission_percent  NUMERIC(5,2) DEFAULT 0,
  -- Credenciais Mercado Pago (armazenadas como texto; criptografar em produção)
  mp_access_token     TEXT,
  mp_public_key       TEXT,
  -- Credenciais Melhor Envio (armazenadas como texto; criptografar em produção)
  melhor_envio_token  TEXT,
  -- Ambiente (sandbox | production)
  mp_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  me_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Somente administradores lêem e escrevem
CREATE POLICY "platform_settings_admin_all" ON platform_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'support')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'support')
    )
  );

-- Service role bypassa RLS (edge functions usam service_role)

CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Linha padrão para tenant único (upsert idempotente)
INSERT INTO platform_settings (tenant_id)
VALUES ('default')
ON CONFLICT (tenant_id) DO NOTHING;

-- ── Suporte a pedidos guest (customer_id nullable) ────────────────────────────
ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_cpf    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_service JSONB;

-- Atualiza a política de INSERT dos pedidos para permitir edge functions
-- criarem pedidos guest (customer_id = NULL via service_role)
-- Nota: service_role ignora RLS; policies abaixo são para authenticated users.

DROP POLICY IF EXISTS "customers_insert_orders" ON orders;
CREATE POLICY "customers_insert_orders" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR customer_id IS NULL  -- guest: inserido via service_role
  );
