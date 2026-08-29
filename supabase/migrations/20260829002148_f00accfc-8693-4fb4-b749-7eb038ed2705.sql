-- Permitir que admins removam solicitações de orçamento
GRANT DELETE ON public.quote_requests TO authenticated;

CREATE POLICY "Admins can delete quote requests"
ON public.quote_requests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));