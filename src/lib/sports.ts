import { supabase } from "@/integrations/supabase/client";

export type SportsNodeType =
  | "sport"
  | "category"
  | "subcategory"
  | "country"
  | "championship"
  | "club"
  | "selection"
  | "custom";

export type SportsNode = {
  id: string;
  store_id: string;
  parent_id: string | null;
  node_type: SportsNodeType;
  name: string;
  short_name: string | null;
  slug: string | null;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SportsSettings = {
  store_id: string;
  enabled: boolean;
  name: string;
  description: string;
  primary_node_id: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type UntypedSupabase = {
  from: (table: string) => {
    select: (columns?: string) => any;
    insert: (values: unknown) => any;
    update: (values: unknown) => any;
    delete: () => any;
  };
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export const sportsDb = supabase as unknown as UntypedSupabase;

export async function listSportsNodes(storeId: string): Promise<SportsNode[]> {
  const { data, error } = await sportsDb
    .from("sports_nodes")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as SportsNode[];
}

export async function getSportsSettings(storeId: string): Promise<SportsSettings | null> {
  const { data, error } = await sportsDb
    .from("sports_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) throw error;
  return (data as SportsSettings | null) ?? null;
}

export function childrenOf(nodes: SportsNode[], parentId: string | null): SportsNode[] {
  return nodes
    .filter((node) => node.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "pt-BR"));
}

export const sportsNodeTypes: { value: SportsNodeType; label: string }[] = [
  { value: "sport", label: "Esporte" },
  { value: "category", label: "Categoria" },
  { value: "subcategory", label: "Subcategoria" },
  { value: "country", label: "País" },
  { value: "championship", label: "Campeonato" },
  { value: "club", label: "Clube" },
  { value: "selection", label: "Seleção" },
  { value: "custom", label: "Personalizado" },
];

export function sportsTypeLabel(type: SportsNodeType): string {
  return sportsNodeTypes.find((item) => item.value === type)?.label ?? "Item";
}
