import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useMyStore } from "@/hooks/useAuth";
import { DEFAULT_SHARE_MESSAGE, StoreWhatsAppShare } from "@/components/StoreWhatsAppShare";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Bell, Megaphone, Shield, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: Settings,
});

function Settings() {
  const { data: store, refetch: refetchStore } = useMyStore();
  const [profile, setProfile] = useState({ name: "", whatsapp: "", email: "" });
  const [shareMessage, setShareMessage] = useState(DEFAULT_SHARE_MESSAGE);
  const [passwords, setPasswords] = useState({ current: "", next: "" });
  const [saving, setSaving] = useState(false);
  const [openSection, setOpenSection] = useState("profile");

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

  useEffect(() => {
    setShareMessage(store?.share_message?.trim() || DEFAULT_SHARE_MESSAGE);
  }, [store?.share_message]);

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
    toast[error ? "error" : "success"](error ? "Não foi possível salvar." : "Dados atualizados.");
  }

  async function changePassword() {
    if (passwords.next.length < 6) {
      toast.error("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.next,
      current_password: passwords.current,
    } as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPasswords({ current: "", next: "" });
    toast.success("Senha alterada!");
  }

  async function saveShareMessage() {
    if (!store) return;
    setSaving(true);
    const { error } = await supabase
      .from("stores")
      .update({ share_message: shareMessage.trim() || null })
      .eq("id", store.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a mensagem de divulgação.");
      return;
    }
    await refetchStore();
    toast.success("Mensagem de divulgação salva!");
  }

  return (
    <AppShell title="Configurações" description="Sua conta">
      <div className="space-y-3">
        <CollapsibleSection
          title="Dados pessoais"
          description="Nome, WhatsApp e e-mail da conta"
          icon={<UserRound className="size-4" />}
          open={openSection === "profile"}
          onOpenChange={(open) => setOpenSection(open ? "profile" : "")}
        >
          <div className="space-y-4">
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
        </CollapsibleSection>

        <CollapsibleSection
          title="Divulgação"
          description="Mensagem e compartilhamento da vitrine"
          icon={<Megaphone className="size-4" />}
          open={openSection === "sharing"}
          onOpenChange={(open) => setOpenSection(open ? "sharing" : "")}
        >
          <div className="space-y-4">
            <div>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure a frase padrão usada ao compartilhar o link da sua vitrine pelo WhatsApp.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem para compartilhar no WhatsApp</Label>
              <Textarea
                rows={3}
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder={DEFAULT_SHARE_MESSAGE}
              />
              <p className="text-xs text-muted-foreground">
                O link da loja será incluído automaticamente. Se apagar a frase, a mensagem padrão
                será usada novamente.
              </p>
            </div>
            {store ? <StoreWhatsAppShare slug={store.slug} message={shareMessage} /> : null}
            <Button disabled={saving || !store} onClick={saveShareMessage}>
              Salvar mensagem
            </Button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Alterar senha"
          description="Atualize a senha de acesso à conta"
          icon={<Shield className="size-4" />}
          open={openSection === "password"}
          onOpenChange={(open) => setOpenSection(open ? "password" : "")}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Senha atual</Label>
              <PasswordInput
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <PasswordInput
                value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
              />
            </div>
            <Button variant="outline" disabled={saving} onClick={changePassword}>
              Alterar senha
            </Button>
          </div>
        </CollapsibleSection>
        <CollapsibleSection
          title="Notificações"
          description="Preferências de alertas serão adicionadas aqui"
          icon={<Bell className="size-4" />}
        >
          <p className="text-sm text-muted-foreground">
            As notificações da conta permanecem disponíveis conforme forem ativadas pelo sistema.
          </p>
        </CollapsibleSection>
      </div>
    </AppShell>
  );
}
