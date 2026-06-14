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
  mp_access_token     TEXT,
  mp_public_key       TEXT,
  mp_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  melhor_envio_token  TEXT,
  me_environment      TEXT        NOT NULL DEFAULT 'sandbox',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Recria política idempotentemente
DROP POLICY IF EXISTS "platform_settings_admin_all" ON platform_settings;
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

-- Trigger updated_at (sem moddatetime)
CREATE OR REPLACE FUNCTION set_platform_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_settings_updated_at ON platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION set_platform_settings_updated_at();

-- Linha padrão para tenant único (idempotente)
INSERT INTO platform_settings (tenant_id)
VALUES ('default')
ON CONFLICT (tenant_id) DO NOTHING;
