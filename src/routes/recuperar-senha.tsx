import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | Vitrini" },
      { name: "description", content: "Receba um link para redefinir a senha da sua conta." },
      { property: "og:title", content: "Recuperar senha | Vitrini" },
      { property: "og:description", content: "Redefina a senha da sua conta Vitrini." },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail agora.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para você criar uma nova senha."
      footer={
        <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Se existir uma conta com esse e-mail, o link de recuperação já está a caminho.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
