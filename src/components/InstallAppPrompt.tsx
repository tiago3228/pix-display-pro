import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "vitrini:install-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    }
    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      setIosHelp(true);
      timer = setTimeout(() => setVisible(true), 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Download className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Instalar o Vitrini</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Instale o Vitrini no seu dispositivo para acessar sua loja mais rapidamente.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar aviso de instalação"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </div>

        {iosHelp && !deferred ? (
          <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Share className="size-4 shrink-0 text-primary" /> 1. Toque em Compartilhar no Safari.
            </li>
            <li className="flex items-center gap-2">
              <Plus className="size-4 shrink-0 text-primary" /> 2. Escolha “Adicionar à Tela de
              Início”.
            </li>
          </ol>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1" onClick={install}>
              Instalar aplicativo
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
