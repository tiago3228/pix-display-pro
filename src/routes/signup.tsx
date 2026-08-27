import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Criar minha loja grátis | Vitrini" },
      {
        name: "description",
        content: "Crie sua conta no Vitrini e monte sua vitrine online em minutos. É grátis.",
      },
      { property: "og:title", content: "Criar minha loja grátis | Vitrini" },
      { property: "og:description", content: "Monte sua vitrine online em minutos." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", whatsapp: "" });
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: form.name, whatsapp: form.whatsapp },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("already")
          ? "Este e-mail já possui uma conta. Faça login."
          : "Não foi possível criar a conta.",
      );
      return;
    }
    if (!data.session) {
      setAwaitingConfirm(true);
      return;
    }
    await supabase.from("profiles").upsert({
      id: data.user!.id,
      name: form.name,
      email: form.email,
      whatsapp: form.whatsapp,
    });
    navigate({ to: "/onboarding" });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível continuar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/onboarding" });
  }

  if (awaitingConfirm) {
    return (
      <AuthShell
        title="Confirme seu e-mail"
        subtitle={`Enviamos um link de confirmação para ${form.email}. Depois de confirmar, faça login para criar sua loja.`}
      >
        <Button asChild className="h-11 w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar minha loja grátis"
      subtitle="Leva 2 minutos. Não pedimos cartão."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Seu nome</Label>
          <Input id="name" required value={form.name} onChange={set("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" required value={form.email} onChange={set("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            inputMode="tel"
            placeholder="(11) 99999-9999"
            required
            value={form.whatsapp}
            onChange={set("whatsapp")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={set("password")}
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
      <Button variant="outline" className="mt-3 h-11 w-full" onClick={handleGoogle}>
        Continuar com o Google
      </Button>
    </AuthShell>
  );
}
