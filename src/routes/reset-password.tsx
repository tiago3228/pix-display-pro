import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha | Vitrini" },
      { name: "description", content: "Defina uma nova senha para acessar sua loja." },
      { property: "og:title", content: "Nova senha | Vitrini" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Link expirado ou inválido. Solicite um novo.");
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell title="Criar nova senha" subtitle="Escolha uma senha para acessar sua loja.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </AuthShell>
  );
}
