import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export type ThemeMode = "clean" | "dark";

const STORAGE_KEY = "vitrini-theme";

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove("clean", "dark");
  root.classList.add(theme);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("clean");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = saved === "dark" ? "dark" : "clean";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function selectTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div
      aria-label="Escolher aparência"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 ${compact ? "" : "h-9"}`}
      role="group"
    >
      <button
        type="button"
        aria-pressed={theme === "clean"}
        aria-label="Usar tema Clean"
        onClick={() => selectTheme("clean")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${theme === "clean" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
      >
        <Sun className="size-3.5" />
        <span>Clean</span>
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        aria-label="Usar tema Dark"
        onClick={() => selectTheme("dark")}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${theme === "dark" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
      >
        <Moon className="size-3.5" />
        <span>Dark</span>
      </button>
    </div>
  );
}
