import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Vitrini" },
      { name: "description", content: "Acesse o painel da sua vitrine online Vitrini." },
      { property: "og:title", content: "Entrar | Vitrini" },
      { property: "og:description", content: "Acesse o painel da sua loja." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique seu e-mail e senha.");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o painel da sua loja."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Criar loja grátis
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <Button variant="outline" className="mt-3 h-11 w-full" onClick={handleGoogle}>
        Entrar com o Google
      </Button>
      <div className="mt-4 text-center">
        <Link
          to="/recuperar-senha"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>
    </AuthShell>
  );
}
