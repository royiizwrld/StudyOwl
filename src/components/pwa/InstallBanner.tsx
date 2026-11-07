import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { INSTALL_KEYS, usePwa } from "@/lib/pwa";
import { useStudy } from "@/lib/store";

const FOURTEEN_DAYS = 14 * 86400000;

export function IosSteps({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install on iPhone or iPad</DialogTitle>
          <DialogDescription>Three quick steps in Safari:</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3"><Share className="size-5 text-primary" aria-hidden /> 1. Tap the <strong>Share</strong> button in the toolbar.</li>
          <li className="flex items-center gap-3"><SquarePlus className="size-5 text-primary" aria-hidden /> 2. Choose <strong>Add to Home Screen</strong>.</li>
          <li className="flex items-center gap-3"><Download className="size-5 text-primary" aria-hidden /> 3. Tap <strong>Add</strong>.</li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** Rendered only inside the signed-in app, so landing/auth pages never show it. */
export function InstallBanner() {
  const { canPrompt, isIOS, standalone, installed, promptInstall } = usePwa();
  const { subjects } = useStudy();
  const [eligible, setEligible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("study-planner:visit-counted")) return;
    sessionStorage.setItem("study-planner:visit-counted", "1");
    localStorage.setItem(INSTALL_KEYS.visits, String(Number(localStorage.getItem(INSTALL_KEYS.visits) ?? 0) + 1));
  }, []);
  useEffect(() => {
    const never = localStorage.getItem(INSTALL_KEYS.never) === "1";
    const at = Number(localStorage.getItem(INSTALL_KEYS.dismissedAt) ?? 0);
    const visits = Number(localStorage.getItem(INSTALL_KEYS.visits) ?? 0);
    setEligible(!never && Date.now() - at > FOURTEEN_DAYS && (visits >= 2 || subjects.length > 0));
  }, [subjects.length]);

  const show = eligible && !hidden && !standalone && !installed && (canPrompt || isIOS);
  const notNow = () => { localStorage.setItem(INSTALL_KEYS.dismissedAt, String(Date.now())); setHidden(true); };
  const never = () => { localStorage.setItem(INSTALL_KEYS.never, "1"); setHidden(true); };

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && notNow();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const install = async () => {
    const r = await promptInstall();
    if (r === "dismissed") notNow();
  };

  return (
    <>
      {show && (
        <div role="dialog" aria-labelledby="install-title" aria-describedby="install-desc"
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 rounded-t-2xl border bg-card p-4 shadow-lg md:inset-x-auto md:bottom-6 md:right-6 md:w-80 md:rounded-2xl">
          <button onClick={notNow} aria-label="Close install banner" className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
          <h2 id="install-title" className="pr-8 font-display font-semibold">Install Study Planner</h2>
          <p id="install-desc" className="mt-1 text-sm text-muted-foreground">Open it from your home screen in one tap, full-screen like an app.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isIOS && !canPrompt ? <Button onClick={() => setIos(true)} autoFocus>How to install</Button> : <Button onClick={() => void install()} autoFocus><Download /> Install</Button>}
            <Button variant="ghost" onClick={notNow}>Not now</Button>
            <button onClick={never} className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline">Don't ask again</button>
          </div>
        </div>
      )}
      <IosSteps open={ios} onOpenChange={setIos} />
    </>
  );
}
