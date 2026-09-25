import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/joias")({
  beforeLoad: () => {
    throw redirect({ href: "/produtos?module=joias" });
  },
});
