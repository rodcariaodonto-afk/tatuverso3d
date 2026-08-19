-- Onda 3C: operação de pedidos, rastreio e estoque (aditiva, sem remoção de dados)

-- 1) Índices para os filtros da central de pedidos e das telas de operação
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created ON public.orders (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON public.orders (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_production ON public.order_items (production_status);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment ON public.tracking_events (shipment_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements (variant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (order_id, created_at DESC);

-- 2) Operação passa a ser exclusiva do servidor da loja.
--    Leitura continua liberada (RLS restringe a admin/dono do pedido).
REVOKE UPDATE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.shipments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tracking_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.inventory_movements FROM anon, authenticated;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.shipments TO service_role;
GRANT ALL ON public.tracking_events TO service_role;
GRANT ALL ON public.inventory_movements TO service_role;
GRANT ALL ON public.order_status_history TO service_role;