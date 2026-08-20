import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Admin TatuVerso3D" }] }),
  component: PedidosLayout,
});

function PedidosLayout() {
  return <Outlet />;
}
