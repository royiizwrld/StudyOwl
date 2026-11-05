import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { isStandalone } from "./auth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaValue {
  canPrompt: boolean;
  isIOS: boolean;
  standalone: boolean;
  installed: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const Ctx = createContext<PwaValue | null>(null);

export const INSTALL_KEYS = {
  dismissedAt: "study-planner:install-dismissed-at",
  never: "study-planner:install-never",
  done: "study-planner:install-done",
  visits: "study-planner:visit-count",
};

export function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iDevice && safari;
}

/** True when the service worker must not register (dev, editor iframe, preview hosts, ?sw=off). */
export function swBlocked() {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname.toLowerCase();
  const label = h.split(".")[0];
  const previewDomain = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h);
  if (previewDomain && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label)) return true;
  if (previewDomain && /^project--.+-dev$/.test(label)) return true;
  if (/(^|\.)lovableproject(-dev)?\.com$/.test(h)) return true;
  if (/(^|\.)beta\.lovable\.dev$/.test(h)) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js") || r.waiting?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
}

/** Single registration point for the offline service worker. */
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  if (swBlocked()) return void unregisterAppSW();
  try {
    const { registerSW: reg } = await import("virtual:pwa-register");
    const update = reg({
      immediate: true,
      onNeedRefresh() {
        toast("Update available", {
          id: "sw-update",
          description: "A new version of Study Planner is ready.",
          duration: Infinity,
          action: { label: "Refresh", onClick: () => void update(true) },
        });
      },
    });
  } catch (e) {
    console.warn("service worker unavailable", e);
  }
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setIsIOS(detectIOS());
    setInstalled(isStandalone() || localStorage.getItem(INSTALL_KEYS.done) === "1");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
      localStorage.setItem(INSTALL_KEYS.done, "1");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    void registerSW();
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      localStorage.setItem(INSTALL_KEYS.done, "1");
      setInstalled(true);
      toast.success("Thanks for installing Study Planner!");
    }
    return outcome;
  }, [deferred]);

  return (
    <Ctx.Provider value={{ canPrompt: !!deferred, isIOS, standalone, installed, promptInstall }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePwa() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePwa must be used inside PwaProvider");
  return v;
}
