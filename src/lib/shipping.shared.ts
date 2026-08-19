/** Tipos e validações compartilhados de entrega (seguros para o navegador). */
import { z } from "zod";

export const cepSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 8, "CEP inválido");

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable(),
  quantity: z.number().int().positive().max(999),
  customizations: z
    .array(z.object({ field_id: z.string().uuid(), value: z.string().max(5000) }))
    .max(50)
    .default([]),
});

export const quoteInputSchema = z.object({
  postal_code: cepSchema,
  state: z.string().length(2).optional(),
  items: z.array(cartItemSchema).min(1).max(50),
});

export const addressInputSchema = z.object({
  recipient: z.string().min(3).max(120),
  postal_code: cepSchema,
  street: z.string().min(2).max(160),
  number: z.string().max(20).default(""),
  complement: z.string().max(120).default(""),
  neighborhood: z.string().max(120).default(""),
  city: z.string().min(2).max(120),
  state: z.string().length(2),
  phone: z.string().max(30).default(""),
  label: z.string().max(60).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  address_id: z.string().uuid(),
  quote_id: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});

export type ShippingQuoteOption = {
  quote_id: string;
  provider: string;
  method_code: string;
  name: string;
  carrier: string | null;
  service: string | null;
  price: number;
  delivery_days: number;
  production_days: number;
  is_pickup: boolean;
  expires_at: string;
};

/** CPF com dígitos verificadores — usado no cliente e no servidor. */
export function isValidCPF(input: string): boolean {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidPhoneBR(input: string): boolean {
  const d = input.replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}

export function formatCEP(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
