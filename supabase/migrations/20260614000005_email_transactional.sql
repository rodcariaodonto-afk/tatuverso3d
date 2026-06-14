-- Campos para e-mails transacionais via Resend (whitelabel)
ALTER TABLE tenant_credentials
  ADD COLUMN IF NOT EXISTS resend_api_key      TEXT,
  ADD COLUMN IF NOT EXISTS email_from_name     TEXT,
  ADD COLUMN IF NOT EXISTS email_from_address  TEXT,
  ADD COLUMN IF NOT EXISTS email_reply_to      TEXT;
