import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface ShippingItem {
  variant_id: string;
  weight_grams: number;
  unit_price: number;
  quantity: number;
}

interface CalcShippingBody {
  tenant_id?: string;
  cep_destino: string;
  items: ShippingItem[];
}

// Estimativa de dimensões por peso (embalagem de café)
function dimensionsForWeight(grams: number): { width: number; height: number; length: number } {
  if (grams <= 250) return { width: 12, height: 5, length: 18 };
  if (grams <= 500) return { width: 14, height: 8, length: 20 };
  if (grams <= 1000) return { width: 16, height: 12, length: 22 };
  return { width: 20, height: 15, length: 25 };
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: CalcShippingBody = await req.json();
    const tenantId = body.tenant_id ?? "default";

    const cepDestino = body.cep_destino.replace(/\D/g, "");
    if (cepDestino.length !== 8) {
      return err("CEP de destino inválido (deve ter 8 dígitos)", 400);
    }
    if (!body.items?.length) {
      return err("Lista de itens vazia", 400);
    }

    // 1. Busca credenciais e dados do tenant
    const { data: settings, error: settingsErr } = await supabase
      .from("tenant_credentials")
      .select("melhor_envio_token, me_environment, cep_origem, store_name")
      .eq("tenant_id", tenantId)
      .single();

    if (settingsErr || !settings) {
      return err("Configurações da plataforma não encontradas", 404);
    }
    if (!settings.melhor_envio_token) {
      return err("Token do Melhor Envio não configurado", 400);
    }
    if (!settings.cep_origem) {
      return err("CEP de origem não configurado nas integrações", 400);
    }

    const { melhor_envio_token, me_environment, cep_origem, store_name } = settings;
    const meBase = me_environment === "production"
      ? "https://melhorenvio.com.br"
      : "https://sandbox.melhorenvio.com.br";

    const cepOrigem = cep_origem.replace(/\D/g, "");

    // 2. Monta produtos para o Melhor Envio
    const products = body.items.map((item) => {
      const dims = dimensionsForWeight(item.weight_grams);
      return {
        id: item.variant_id,
        ...dims,
        weight: item.weight_grams / 1000, // kg
        insurance_value: item.unit_price * item.quantity,
        quantity: item.quantity,
      };
    });

    // 3. Chama a API do Melhor Envio
    const meRes = await fetch(`${meBase}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${melhor_envio_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": `${store_name ?? "Café EX"} (contato@cafezeira.com)`,
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        products,
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          reverse: false,
          non_commercial: false,
        },
        services: "1,2,3,4,17,18,291,292,316",
      }),
    });

    const meData = await meRes.json();

    if (!meRes.ok) {
      const msg = (meData as any)?.message ?? meRes.statusText;
      return err(`Erro Melhor Envio: ${msg}`, 502);
    }

    // 4. Filtra erros (alguns services retornam { error }) e normaliza
    const options = (Array.isArray(meData) ? meData : [])
      .filter((s: any) => !s.error && s.price != null)
      .map((s: any) => ({
        id: String(s.id),
        name: s.name ?? s.service_name ?? "Serviço",
        company: s.company?.name ?? s.company_name ?? "",
        company_logo: s.company?.picture ?? null,
        price: Number(s.price),
        delivery_time: Number(s.delivery_time ?? s.days ?? 0),
        currency: "BRL",
      }))
      .sort((a: any, b: any) => a.price - b.price);

    return json({ options, cep_origem: cepOrigem, cep_destino: cepDestino });
  } catch (e: any) {
    console.error("calculate-shipping error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
