-- Tabela de solicitações de orçamento (personalizados sob encomenda)
CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  idea text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','quoted','closed')),
  notes text
);

GRANT INSERT ON public.quote_requests TO anon;
GRANT INSERT ON public.quote_requests TO authenticated;
GRANT SELECT, UPDATE ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode enviar (apenas INSERT, sem leitura)
CREATE POLICY "Anyone can submit a quote request"
ON public.quote_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Apenas admin lê/atualiza
CREATE POLICY "Admins can view quote requests"
ON public.quote_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quote requests"
ON public.quote_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));