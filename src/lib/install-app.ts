const OPEN_INSTALL_EVENT = "vitrini:open-install-prompt";

export function isAppInstalled() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

export function openInstallPrompt() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
  }
}

export { OPEN_INSTALL_EVENT };
