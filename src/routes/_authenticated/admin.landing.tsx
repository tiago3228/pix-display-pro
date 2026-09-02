import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/hooks/useAuth";
import { getLandingBannerRaw, saveLandingBanner } from "@/lib/landing.functions";
import { uploadAsset } from "@/lib/images";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/landing")({
  head: () => ({
    meta: [
      { title: "Banner principal | Vitrini" },
      { name: "description", content: "Edite o banner principal da landing page do Vitrini." },
      { property: "og:title", content: "Banner principal | Vitrini" },
      { property: "og:description", content: "Atualize título, descrição, CTA e fundo da página inicial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLanding,
});

function AdminLanding() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const fetchBanner = useServerFn(getLandingBannerRaw);
  const saveBanner = useServerFn(saveLandingBanner);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-landing-banner"], enabled: isAdmin === true, queryFn: () => fetchBanner() });
  const [form, setForm] = useState({ badge: "", title: "", subtitle: "", ctaLabel: "", ctaHref: "", imagePath: null as string | null });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      let imagePath = form.imagePath;
      if (imageFile) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error("Sessão expirada.");
        imagePath = await uploadAsset(userData.user.id, imageFile);
      }
      return saveBanner({ data: { ...form, imagePath } });
    },
    onSuccess: () => {
      toast.success("Banner atualizado.");
      setImageFile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-landing-banner"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o banner."),
  });

  if (adminLoading || (isAdmin && isLoading)) return <AppShell title="Banner principal"><p className="text-sm text-muted-foreground">Carregando configuração...</p></AppShell>;
  if (!isAdmin) return <AppShell title="Banner principal"><div className="surface p-10 text-center text-sm text-muted-foreground">Você não tem acesso a esta área.</div></AppShell>;

  return (
    <AppShell title="Banner principal" description="Conteúdo da página inicial">
      <section className="surface space-y-4 p-5">
        <div><h2 className="text-base font-semibold">Editar banner principal</h2><p className="mt-1 text-sm text-muted-foreground">As alterações aparecem na página inicial sem alterar o código.</p></div>
        <div className="space-y-1.5"><Label>Badge</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={4} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Texto do botão</Label><Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></div><div className="space-y-1.5"><Label>Link do botão</Label><Input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/signup ou https://..." /></div></div>
        <div className="space-y-1.5"><Label>Imagem de fundo</Label><Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} /><p className="text-xs text-muted-foreground">{form.imagePath ? "Uma imagem já está configurada. Envie outra para substituí-la." : "Opcional: envie uma imagem para o fundo do banner."}</p></div>
        <Button className="h-11 w-full sm:w-auto" disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Salvando..." : "Salvar banner"}</Button>
      </section>
    </AppShell>
  );
}
