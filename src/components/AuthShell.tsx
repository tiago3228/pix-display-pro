import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg">Vitrini</span>
        </Link>
        <div className="surface p-6">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}
