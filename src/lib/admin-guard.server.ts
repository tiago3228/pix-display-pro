type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
};

/** Confirma o papel de administrador com o próprio token do usuário (RLS aplicada). */
export async function assertAdmin(supabase: RpcClient, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito a administradores.");
}
