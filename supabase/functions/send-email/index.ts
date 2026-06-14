import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Template definitions ──────────────────────────────────────────────────────

type TemplateId =
  | "order_confirmed"
  | "order_paid"
  | "order_shipped"
  | "order_delivered"
  | "producer_approved"
  | "subscription_active"
  | "subscription_cancelled"
  | "test_email";

interface TemplateVars {
  order_id?: string;
  tracking_code?: string;
  tracking_url?: string;
  producer_name?: string;
  store_name?: string;
  store_url?: string;
  recipient_name?: string;
  club_name?: string;
}

function renderTemplate(
  id: TemplateId,
  vars: TemplateVars,
): { subject: string; html: string } {
  const s = vars.store_name ?? "Cafezeira";
  const url = vars.store_url ?? "#";
  const name = vars.recipient_name ? `, ${vars.recipient_name.split(" ")[0]}` : "";
  const orderId = vars.order_id ? `#${vars.order_id.slice(0, 8).toUpperCase()}` : "";

  const wrap = (body: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${s}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
        <!-- Header -->
        <tr><td style="background:#1a0f07;padding:28px 40px;">
          <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#d4a84b;letter-spacing:2px;text-transform:uppercase;">${s}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f5f0eb;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#888;font-family:Arial,sans-serif;">
            Você recebeu este e-mail porque realizou uma ação em <a href="${url}" style="color:#888;">${url}</a>.<br/>
            © ${new Date().getFullYear()} ${s}. Todos os direitos reservados.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const h1 = (t: string) =>
    `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;color:#1a0f07;">${t}</h1>`;
  const p = (t: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#444;font-family:Arial,sans-serif;">${t}</p>`;
  const btn = (label: string, href: string) =>
    `<a href="${href}" style="display:inline-block;margin-top:8px;background:#1a0f07;color:#d4a84b;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:14px 32px;border-radius:100px;">${label}</a>`;
  const divider = `<hr style="border:none;border-top:1px solid #ede8e0;margin:24px 0;" />`;

  switch (id) {
    case "order_confirmed":
      return {
        subject: `Pedido ${orderId} confirmado — ${s}`,
        html: wrap(
          h1(`Pedido recebido${name}!`) +
          p(`Recebemos seu pedido <strong>${orderId}</strong> e já estamos cuidando de tudo. Você receberá outro e-mail assim que o pagamento for confirmado.`) +
          divider +
          p(`Acompanhe seu pedido na sua conta.`) +
          btn("Ver meus pedidos", `${url}/minha-conta`),
        ),
      };

    case "order_paid":
      return {
        subject: `Pagamento aprovado — pedido ${orderId} em preparação`,
        html: wrap(
          h1(`Pagamento aprovado${name}!`) +
          p(`Ótima notícia! O pagamento do pedido <strong>${orderId}</strong> foi confirmado. Estamos separando e embalando seu café com todo o cuidado.`) +
          p(`Assim que seu pedido for enviado, você receberá o código de rastreamento.`) +
          divider +
          btn("Ver meus pedidos", `${url}/minha-conta`),
        ),
      };

    case "order_shipped":
      return {
        subject: `Seu pedido ${orderId} foi enviado!`,
        html: wrap(
          h1(`Pedido a caminho${name}!`) +
          p(`Seu pedido <strong>${orderId}</strong> saiu para entrega.`) +
          (vars.tracking_code
            ? `<div style="background:#f5f0eb;border-radius:8px;padding:16px 20px;margin:16px 0;">
                <p style="margin:0 0 4px;font-size:11px;font-family:Arial,sans-serif;color:#888;text-transform:uppercase;letter-spacing:1px;">Código de rastreamento</p>
                <p style="margin:0;font-family:monospace;font-size:18px;color:#1a0f07;letter-spacing:2px;">${vars.tracking_code}</p>
              </div>` +
              (vars.tracking_url ? btn("Rastrear pedido", vars.tracking_url) : "")
            : p("O rastreamento ficará disponível em breve.")) +
          divider +
          btn("Minha conta", `${url}/minha-conta`),
        ),
      };

    case "order_delivered":
      return {
        subject: `Seu pedido chegou! Conte como foi — ${s}`,
        html: wrap(
          h1(`Chegou${name}!`) +
          p(`Seu pedido <strong>${orderId}</strong> foi entregue. Esperamos que você aproveite muito o café!`) +
          p(`Que tal compartilhar sua experiência? Sua avaliação ajuda outros amantes de café a escolher melhor.`) +
          divider +
          btn("Avaliar meu pedido", `${url}/minha-conta`),
        ),
      };

    case "producer_approved":
      return {
        subject: `Bem-vindo à ${s}, ${vars.producer_name ?? "produtor"}!`,
        html: wrap(
          h1(`Candidatura aprovada!`) +
          p(`Parabéns${name}! Sua candidatura para vender na <strong>${s}</strong> foi aprovada.`) +
          p(`Agora você pode acessar seu painel de produtor, cadastrar seus produtos e começar a vender.`) +
          divider +
          btn("Acessar painel do produtor", `${url}/produtor`),
        ),
      };

    case "subscription_active":
      return {
        subject: `Sua assinatura do ${vars.club_name ?? "Clube"} está ativa!`,
        html: wrap(
          h1(`Bem-vindo ao ${vars.club_name ?? "Clube"}${name}!`) +
          p(`Sua assinatura foi ativada com sucesso. A partir de agora você faz parte do nosso grupo seleto de apreciadores de café especial.`) +
          p(`Nos próximos dias você receberá informações sobre o seu primeiro envio.`) +
          divider +
          btn("Ver minha assinatura", `${url}/clube`),
        ),
      };

    case "subscription_cancelled":
      return {
        subject: `Sua assinatura foi cancelada — ${s}`,
        html: wrap(
          h1(`Assinatura cancelada`),
        ) + wrap(
          p(`Sua assinatura do ${vars.club_name ?? "Clube"} foi cancelada${name}.`) +
          p(`Se foi um engano ou se quiser reativar, basta acessar a página do clube.`) +
          divider +
          btn("Reativar assinatura", `${url}/clube`),
        ),
      };

    case "test_email":
      return {
        subject: `E-mail de teste — ${s}`,
        html: wrap(
          h1("E-mail de teste") +
          p(`Se você está vendo esta mensagem, a configuração de e-mail transacional do <strong>${s}</strong> está funcionando corretamente.`) +
          divider +
          p(`<strong>Remetente:</strong> configurado com sucesso via Resend.`),
        ),
      };

    default:
      return { subject: `Notificação — ${s}`, html: wrap(p("Você tem uma nova notificação.")) };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export interface SendEmailPayload {
  tenant_id?: string;
  to: string;
  template: TemplateId;
  vars?: TemplateVars;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: SendEmailPayload = await req.json();
    const tenantId = body.tenant_id ?? "default";

    if (!body.to) return err("Campo 'to' é obrigatório", 400);
    if (!body.template) return err("Campo 'template' é obrigatório", 400);

    // 1. Busca credenciais do tenant
    const { data: settings, error: settingsErr } = await supabase
      .from("tenant_credentials")
      .select("resend_api_key, email_from_name, email_from_address, email_reply_to, store_name, store_logo_url")
      .eq("tenant_id", tenantId)
      .single();

    if (settingsErr || !settings) {
      return err("Configurações do tenant não encontradas", 404);
    }
    if (!settings.resend_api_key) {
      console.warn("send-email: Resend API key não configurada para tenant", tenantId);
      return err("Resend API key não configurada em /admin/integracoes", 400);
    }

    const fromName = settings.email_from_name ?? settings.store_name ?? "Cafezeira";
    const fromAddress = settings.email_from_address ?? "noreply@cafezeira.com.br";
    const replyTo = settings.email_reply_to ?? undefined;

    // 2. Renderiza o template
    const vars: TemplateVars = {
      store_name: settings.store_name ?? fromName,
      ...body.vars,
    };
    const { subject, html } = renderTemplate(body.template, vars);

    // 3. Envia via Resend
    const resendPayload: Record<string, unknown> = {
      from: `${fromName} <${fromAddress}>`,
      to: [body.to],
      subject,
      html,
    };
    if (replyTo) resendPayload.reply_to = replyTo;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      const msg = (resendData as any)?.message ?? resendRes.statusText;
      console.error("send-email: Resend error", resendRes.status, msg);
      return err(`Erro Resend: ${msg}`, 502);
    }

    console.log(`send-email: enviado template=${body.template} to=${body.to} id=${(resendData as any)?.id}`);
    return json({ sent: true, id: (resendData as any)?.id });
  } catch (e: any) {
    console.error("send-email error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
