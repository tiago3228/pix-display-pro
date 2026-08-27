import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const [profile, setProfile] = useState({ name: "", whatsapp: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("name, whatsapp")
        .eq("id", user.id)
        .maybeSingle();
      setProfile({
        name: data?.name ?? "",
        whatsapp: data?.whatsapp ?? "",
        email: user.email ?? "",
      });
    })();
  }, []);

  async function saveProfile() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      whatsapp: profile.whatsapp,
      email: user.email ?? null,
    });
    setSaving(false);
    toast[error ? "error" : "success"](
      error ? "Não foi possível salvar." : "Dados atualizados.",
    );
  }

  async function changePassword() {
    if (passwords.next.length < 6) {
      toast.error("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.next,
      // @ts-expect-error current_password is supported by Lovable Cloud auth
      current_password: passwords.current,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswords({ current: "", next: "" });
    toast.success("Senha alterada!");
  }

  return (
    <AppShell title="Configurações" description="Sua conta">
      <div className="surface space-y-4 p-5">
        <p className="font-semibold">Dados pessoais</p>
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp</Label>
          <Input
            value={profile.whatsapp}
            onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={profile.email} disabled />
        </div>
        <Button disabled={saving} onClick={saveProfile}>
          Salvar dados
        </Button>
      </div>

      <div className="surface mt-4 space-y-4 p-5">
        <p className="font-semibold">Alterar senha</p>
        <div className="space-y-1.5">
          <Label>Senha atual</Label>
          <Input
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Nova senha</Label>
          <Input
            type="password"
            value={passwords.next}
            onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
          />
        </div>
        <Button variant="outline" disabled={saving} onClick={changePassword}>
          Alterar senha
        </Button>
      </div>
    </AppShell>
  );
}
