import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  sensory: "Sensorial",
  decoration: "Decoração",
  utility: "Utilidade",
  gift: "Presente",
  collectible: "Colecionável",
  articulated: "Articulado",
  organizer: "Organização",
  personalized: "Personalizado",
  other: "Outro",
};

export const OPTION_TYPE_LABEL: Record<string, string> = {
  color: "Cor",
  size: "Tamanho",
  material: "Material",
  finish: "Acabamento",
  other: "Opção",
};

export type CatalogVariant = {
  id: string;
  name: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean | null;
  image_url: string | null;
  option_value_ids: string[];
};

export type CatalogOptionValue = {
  id: string;
  label: string;
  value: string;
  color_hex: string | null;
  image_url: string | null;
  price_adjustment: number;
  is_active: boolean | null;
  sort_order: number;
};

export type CatalogOption = {
  id: string;
  name: string;
  option_type: string;
  is_required: boolean;
  sort_order: number;
  values: CatalogOptionValue[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  cover_url: string | null;
  badges: string[] | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  product_type: string;
  material_description: string | null;
  production_time_days: number | null;
  made_to_order: boolean;
  is_personalizable: boolean;
  is_sensory: boolean;
  is_featured: boolean | null;
  status: string;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  track_inventory: boolean;
  created_at: string;
  category_ids: string[];
  variants: CatalogVariant[];
  options: CatalogOption[];
  min_price: number;
  total_stock: number;
  in_stock: boolean;
};

const PRODUCT_SELECT = `
  id, slug, name, short_description, cover_url, badges, price, compare_at_price,
  stock_quantity, product_type, material_description, production_time_days,
  made_to_order, is_personalizable, is_sensory, is_featured, allow_backorder,
  track_inventory, created_at,
  product_categories ( category_id ),
  product_variants (
    id, name, sku, price, compare_at_price, stock_quantity, is_active, image_url, sort_order,
    variant_option_values ( option_value_id )
  ),
  product_options (
    id, name, option_type, is_required, sort_order,
    product_option_values ( id, label, value, color_hex, image_url, price_adjustment, is_active, sort_order )
  )
`;

export function mapCatalogProduct(p: any): CatalogProduct {
  const variants: CatalogVariant[] = (p.product_variants ?? [])
    .filter((v: any) => v.is_active !== false)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: Number(v.price),
      compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
      stock_quantity: v.stock_quantity ?? 0,
      is_active: v.is_active,
      image_url: v.image_url,
      option_value_ids: (v.variant_option_values ?? []).map((x: any) => x.option_value_id),
    }));

  const options: CatalogOption[] = (p.product_options ?? [])
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((o: any) => ({
      id: o.id,
      name: o.name,
      option_type: o.option_type,
      is_required: o.is_required ?? true,
      sort_order: o.sort_order ?? 0,
      values: (o.product_option_values ?? [])
        .filter((v: any) => v.is_active !== false)
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((v: any) => ({
          id: v.id,
          label: v.label,
          value: v.value,
          color_hex: v.color_hex,
          image_url: v.image_url,
          price_adjustment: Number(v.price_adjustment ?? 0),
          is_active: v.is_active,
          sort_order: v.sort_order ?? 0,
        })),
    }));

  const basePrice = Number(p.price ?? 0);
  const variantPrices = variants.map((v) => v.price).filter((n) => Number.isFinite(n));
  const min_price = variantPrices.length ? Math.min(...variantPrices) : basePrice;
  const total_stock = variants.length
    ? variants.reduce((s, v) => s + (v.stock_quantity ?? 0), 0)
    : (p.stock_quantity ?? 0);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short_description: p.short_description,
    cover_url: p.cover_url,
    badges: p.badges,
    price: basePrice,
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    stock_quantity: p.stock_quantity ?? 0,
    product_type: p.product_type ?? "other",
    material_description: p.material_description,
    production_time_days: p.production_time_days,
    made_to_order: !!p.made_to_order,
    is_personalizable: !!p.is_personalizable,
    is_sensory: !!p.is_sensory,
    is_featured: p.is_featured,
    allow_backorder: !!p.allow_backorder,
    track_inventory: p.track_inventory !== false,
    created_at: p.created_at,
    category_ids: (p.product_categories ?? []).map((c: any) => c.category_id),
    variants,
    options,
    min_price,
    total_stock,
    in_stock: !!p.made_to_order || !!p.allow_backorder || p.track_inventory === false || total_stock > 0,
  };
}

export function useCatalogProducts() {
  return useQuery({
    queryKey: ["catalog-products"],
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map(mapCatalogProduct);
    },
    staleTime: 60_000,
  });
}

export function useSalesCounts() {
  return useQuery({
    queryKey: ["product-sales-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.rpc("product_sales_counts");
      if (error) return {};
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        map[r.product_id] = r.sold ?? 0;
      });
      return map;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name, parent_id, icon, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export type CatalogFilters = {
  search?: string;
  categoryIds?: string[];
  materials?: string[];
  colors?: string[];
  types?: string[];
  priceMax?: number;
  personalizableOnly?: boolean;
  inStockOnly?: boolean;
  madeToOrderOnly?: boolean;
  sort?: "featured" | "price_asc" | "price_desc" | "newest" | "best_sellers";
  salesCounts?: Record<string, number>;
};

function optionLabels(p: CatalogProduct, type: string) {
  return p.options
    .filter((o) => o.option_type === type)
    .flatMap((o) => o.values.map((v) => v.label));
}

export function productMaterials(p: CatalogProduct) {
  const fromOptions = optionLabels(p, "material");
  if (fromOptions.length) return fromOptions;
  return p.material_description ? [p.material_description] : [];
}

export function productColors(p: CatalogProduct) {
  return p.options
    .filter((o) => o.option_type === "color")
    .flatMap((o) => o.values.map((v) => ({ label: v.label, hex: v.color_hex })));
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
        p.variants.some((v) => v.sku?.toLowerCase().includes(q)),
    );
  }
  if (filters.categoryIds?.length) {
    list = list.filter((p) => p.category_ids.some((c) => filters.categoryIds!.includes(c)));
  }
  if (filters.types?.length) {
    list = list.filter((p) => filters.types!.includes(p.product_type));
  }
  if (filters.materials?.length) {
    list = list.filter((p) =>
      productMaterials(p).some((m) =>
        filters.materials!.some((f) => m.toLowerCase().includes(f.toLowerCase())),
      ),
    );
  }
  if (filters.colors?.length) {
    list = list.filter((p) =>
      productColors(p).some((c) =>
        filters.colors!.some((f) => c.label.toLowerCase() === f.toLowerCase()),
      ),
    );
  }
  if (filters.priceMax != null) {
    list = list.filter((p) => p.min_price <= filters.priceMax!);
  }
  if (filters.personalizableOnly) list = list.filter((p) => p.is_personalizable);
  if (filters.inStockOnly) list = list.filter((p) => p.total_stock > 0);
  if (filters.madeToOrderOnly) list = list.filter((p) => p.made_to_order);

  const sales = filters.salesCounts ?? {};
  switch (filters.sort) {
    case "price_asc":
      list.sort((a, b) => a.min_price - b.min_price);
      break;
    case "price_desc":
      list.sort((a, b) => b.min_price - a.min_price);
      break;
    case "newest":
      list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
      break;
    case "best_sellers":
      list.sort((a, b) => (sales[b.id] ?? 0) - (sales[a.id] ?? 0));
      break;
    default:
      list.sort((a, b) => Number(b.is_featured ?? false) - Number(a.is_featured ?? false));
  }
  return list;
}
