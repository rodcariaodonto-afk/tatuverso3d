import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CatalogFilters = {
  search?: string;
  categoryIds?: string[];
  roastLevels?: string[];
  origins?: string[];
  noteIds?: string[];
  priceMax?: number;
  subscriptionOnly?: boolean;
  sort?: "featured" | "price_asc" | "price_desc" | "score_desc" | "newest";
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  cover_url: string | null;
  score: number | null;
  badges: string[] | null;
  origin_region: string | null;
  origin_country: string | null;
  roast_level: string | null;
  is_featured: boolean | null;
  is_subscription_available: boolean | null;
  created_at: string;
  producer: { name: string; slug: string } | null;
  variants: Array<{
    id: string;
    price: number;
    compare_at_price: number | null;
    weight_grams: number;
    grind_option: string;
    stock_quantity: number;
    is_default: boolean | null;
  }>;
  notes: Array<{ name: string; family: string | null }>;
  category_ids: string[];
  min_price: number;
  default_variant_id: string | null;
};

export function useCatalogProducts() {
  return useQuery({
    queryKey: ["catalog-products"],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id, slug, name, short_description, cover_url, score, badges,
          origin_region, origin_country, roast_level, is_featured,
          is_subscription_available, created_at,
          producers ( name, slug ),
          product_variants ( id, price, compare_at_price, weight_grams, grind_option, stock_quantity, is_default ),
          product_sensory_notes ( sensory_notes ( id, name, family ) ),
          product_categories ( category_id )
          `,
        )
        .eq("status", "active");

      if (error) throw error;

      return (data ?? []).map((p: any) => {
        const variants = (p.product_variants ?? []).map((v: any) => ({
          ...v,
          price: Number(v.price),
          compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
        }));
        const prices = variants.map((v: any) => v.price).filter((n: number) => Number.isFinite(n));
        const min_price = prices.length ? Math.min(...prices) : 0;
        const def =
          variants.find((v: any) => v.is_default) ??
          variants.slice().sort((a: any, b: any) => a.price - b.price)[0] ??
          null;
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          short_description: p.short_description,
          cover_url: p.cover_url,
          score: p.score,
          badges: p.badges,
          origin_region: p.origin_region,
          origin_country: p.origin_country,
          roast_level: p.roast_level,
          is_featured: p.is_featured,
          is_subscription_available: p.is_subscription_available,
          created_at: p.created_at,
          producer: p.producers
            ? { name: p.producers.name, slug: p.producers.slug }
            : null,
          variants,
          notes: (p.product_sensory_notes ?? [])
            .map((n: any) => n.sensory_notes)
            .filter(Boolean),
          category_ids: (p.product_categories ?? []).map((c: any) => c.category_id),
          min_price,
          default_variant_id: def?.id ?? null,
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useSensoryNotes() {
  return useQuery({
    queryKey: ["sensory-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sensory_notes")
        .select("id, name, family")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function applyCatalogFilters(
  products: CatalogProduct[],
  filters: CatalogFilters,
): CatalogProduct[] {
  let list = products.slice();
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.short_description?.toLowerCase().includes(q) ||
        p.producer?.name.toLowerCase().includes(q),
    );
  }
  if (filters.categoryIds?.length) {
    list = list.filter((p) =>
      p.category_ids.some((cid) => filters.categoryIds!.includes(cid)),
    );
  }
  if (filters.roastLevels?.length) {
    list = list.filter((p) => p.roast_level && filters.roastLevels!.includes(p.roast_level));
  }
  if (filters.origins?.length) {
    list = list.filter(
      (p) =>
        (p.origin_region && filters.origins!.includes(p.origin_region)) ||
        (p.origin_country && filters.origins!.includes(p.origin_country)),
    );
  }
  if (filters.noteIds?.length) {
    list = list.filter((p) =>
      p.notes.some((n) => filters.noteIds!.includes(n.id))
    );
  }
  if (filters.priceMax != null) {
    list = list.filter((p) => p.min_price <= filters.priceMax!);
  }
  if (filters.subscriptionOnly) {
    list = list.filter((p) => p.is_subscription_available === true);
  }

  switch (filters.sort) {
    case "price_asc":
      list.sort((a, b) => a.min_price - b.min_price);
      break;
    case "price_desc":
      list.sort((a, b) => b.min_price - a.min_price);
      break;
    case "score_desc":
      list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      break;
    case "newest":
      list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
      break;
    default:
      list.sort(
        (a, b) => Number(b.is_featured ?? false) - Number(a.is_featured ?? false),
      );
  }
  return list;
}
