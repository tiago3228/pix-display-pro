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

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { name: form.name.trim(), whatsapp: form.whatsapp.trim() },
        },
      });
      if (error) {
        toast.error(
          error.message.toLowerCase().includes("already")
            ? "Este e-mail já possui uma conta. Faça login."
            : error.message || "Não foi possível criar a conta.",
        );
        return;
      }
      let userId = data.user?.id ?? null;
      if (!data.session) {
        // Em projetos sem confirmação de e-mail, a sessão pode chegar alguns instantes depois.
        const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (signInError || !signIn.session) {
          toast.success("Conta criada. Confirme seu e-mail e entre para criar a loja.");
          navigate({ to: "/login" });
          return;
        }
        userId = signIn.user.id;
      }
      if (userId) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          name: form.name.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
        });
        if (profileError) console.warn("Não foi possível salvar o perfil inicial", profileError);
      }
      navigate({ to: "/onboarding" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
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
