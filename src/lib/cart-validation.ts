/** Constantes e helpers usados pela validação de carrinho no servidor. */
import { z } from "zod";

export const CUSTOM_BUCKET = "customization-uploads";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "model/stl",
  "application/sla",
  "application/octet-stream",
];

const customizationSchema = z.object({
  field_id: z.string().uuid(),
  /** Valor escolhido pelo cliente. Nunca aceitamos preço vindo do navegador. */
  value: z.string().max(5000),
});

const itemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.number().int().positive().max(999),
  customizations: z.array(customizationSchema).max(50).default([]),
});

export const cartPayloadSchema = z.object({ items: z.array(itemSchema).min(1).max(50) });

export type ValidatedCustomization = {
  field_id: string;
  label: string;
  field_type: string;
  value: string;
  price_adjustment: number;
};

export type ValidatedCartItem = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  made_to_order: boolean;
  production_time_days: number | null;
  customization_data: ValidatedCustomization[];
};

export function optionValues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: any) => (o && typeof o === "object" ? String(o.value ?? o.label ?? "") : String(o)))
    .filter(Boolean);
}

export function optionLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o: any) => (o && typeof o === "object" ? String(o.label ?? o.value ?? "") : String(o)))
    .filter(Boolean);
}
