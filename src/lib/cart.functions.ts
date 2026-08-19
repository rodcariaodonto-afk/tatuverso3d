import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { cartPayloadSchema } from "./cart-validation";
import type { ValidatedCartItem, ValidatedCustomization } from "./cart-validation";
import { revalidateCart } from "./cart.server";

export type { ValidatedCartItem, ValidatedCustomization };

/**
 * Revalida o carrinho inteiramente no servidor: preços, estoque, prazos e
 * personalizações são recarregados do banco.
 */
export const validateCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => cartPayloadSchema.parse(data))
  .handler(async ({ data }) => {
    const authHeader = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? null;
    const result = await revalidateCart(data, token);
    return {
      items: result.items,
      subtotal: result.subtotal,
      production_days: result.production_days,
    };
  });
