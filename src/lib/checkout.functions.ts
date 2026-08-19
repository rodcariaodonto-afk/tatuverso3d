import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addressInputSchema,
  createOrderSchema,
  quoteInputSchema,
  isValidPhoneBR,
  type ShippingQuoteOption,
} from "./shipping.shared";

/** Cotação de frete calculada exclusivamente no servidor. */
export const quoteShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => quoteInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ options: ShippingQuoteOption[]; cart_hash: string; subtotal: number; production_days: number }> => {
    const { revalidateCart } = await import("./cart.server");
    const { quoteAllProviders, cartHash } = await import("./shipping.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cart = await revalidateCart({ items: data.items }, null);
    const hash = cartHash(cart);

    const [{ data: settings }, { data: methods }] = await Promise.all([
      supabaseAdmin.from("shipping_settings").select("*").eq("id", true).maybeSingle(),
      supabaseAdmin.from("shipping_methods").select("*").eq("is_active", true).order("sort_order"),
    ]);

    const quotes = await quoteAllProviders({
      cart,
      postalCode: data.postal_code,
      state: data.state ?? null,
      settings,
      methods: methods ?? [],
    });

    const expires = new Date(Date.now() + 30 * 60_000).toISOString();
    const options: ShippingQuoteOption[] = [];

    for (const q of quotes) {
      const { data: row, error } = await supabaseAdmin
        .from("shipping_quotes")
        .insert({
          customer_id: context.userId,
          cart_hash: hash,
          postal_code: data.postal_code,
          provider: q.provider,
          method_code: q.method_code,
          carrier: q.carrier,
          service: q.service,
          price: q.price,
          delivery_days: q.delivery_days,
          production_days: q.production_days,
          package_data: { ...cart.package, is_pickup: q.is_pickup, name: q.name },
          expires_at: expires,
        })
        .select("id, expires_at")
        .single();
      if (error) throw new Error(error.message);
      options.push({ ...q, quote_id: row.id, expires_at: row.expires_at });
    }

    return {
      options,
      cart_hash: hash,
      subtotal: cart.subtotal,
      production_days: cart.production_days,
    };
  });

/** Endereços salvos do cliente. */
export const listAddresses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("addresses")
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    addressInputSchema.extend({ id: addressInputSchema.shape.label.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.phone && !isValidPhoneBR(data.phone)) throw new Error("Telefone inválido");
    const payload = {
      user_id: context.userId,
      label: data.label ?? "Entrega",
      recipient: data.recipient,
      postal_code: data.postal_code,
      street: data.street,
      number: data.number || null,
      complement: data.complement || null,
      neighborhood: data.neighborhood || null,
      city: data.city,
      state: data.state.toUpperCase(),
      phone: data.phone || null,
      country: "BR",
    };
    const { data: row, error } = await context.supabase
      .from("addresses")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Cria o pedido a partir de dados recalculados no servidor.
 * O navegador só informa quais itens, qual endereço e qual cotação.
 */
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { revalidateCart } = await import("./cart.server");
    const { cartHash } = await import("./shipping.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cart = await revalidateCart({ items: data.items }, null);
    const hash = cartHash(cart);

    const { data: address, error: addrErr } = await context.supabase
      .from("addresses")
      .select("*")
      .eq("id", data.address_id)
      .maybeSingle();
    if (addrErr) throw new Error(addrErr.message);
    if (!address) throw new Error("Endereço não encontrado");

    const { data: quote, error: quoteErr } = await supabaseAdmin
      .from("shipping_quotes")
      .select("*")
      .eq("id", data.quote_id)
      .maybeSingle();
    if (quoteErr) throw new Error(quoteErr.message);
    if (!quote || quote.customer_id !== context.userId) {
      throw new Error("Cotação de frete inválida");
    }
    if (new Date(quote.expires_at).getTime() < Date.now()) {
      throw new Error("A cotação de frete expirou. Calcule o frete novamente.");
    }
    if (quote.cart_hash !== hash) {
      throw new Error("O carrinho mudou depois da cotação. Calcule o frete novamente.");
    }
    if (quote.postal_code !== String(address.postal_code).replace(/\D/g, "")) {
      throw new Error("A cotação não corresponde ao CEP do endereço escolhido.");
    }

    const shippingTotal = Number(quote.price);
    const total = Number((cart.subtotal + shippingTotal).toFixed(2));

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: context.userId,
        status: "pending",
        payment_status: "pending",
        subtotal: cart.subtotal,
        discount_total: 0,
        shipping_total: shippingTotal,
        total,
        notes: data.notes ?? null,
        production_days: cart.production_days,
        shipping_quote_id: quote.id,
        shipping_address: {
          recipient: address.recipient,
          postal_code: address.postal_code,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          phone: address.phone,
        },
        shipping_snapshot: {
          provider: quote.provider,
          method_code: quote.method_code,
          carrier: quote.carrier,
          service: quote.service,
          price: shippingTotal,
          delivery_days: quote.delivery_days,
          production_days: quote.production_days,
          quoted_at: quote.quoted_at,
          external_id: quote.external_id,
          package: quote.package_data,
        },
      })
      .select("id")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      cart.items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product_name,
        variant_name_snapshot: i.variant_name,
        sku_snapshot: i.sku,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        customization_data: i.customization_data,
        production_status: "queued",
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    return {
      order_id: order.id as string,
      subtotal: cart.subtotal,
      shipping_total: shippingTotal,
      total,
      production_days: cart.production_days,
      delivery_days: Number(quote.delivery_days),
    };
  });
