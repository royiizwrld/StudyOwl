import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LOCAL_KEY, readLocalData, useStudy } from "@/lib/store";
import type { StudyData } from "@/lib/types";

const SKIP_KEY = "study-planner:import-skipped";

/** One-time offer to move pre-account device data into the signed-in account. */
export function ImportLocalPrompt() {
  const { importData } = useStudy();
  const [local, setLocal] = useState<StudyData | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(SKIP_KEY)) return;
    setLocal(readLocalData());
  }, []);
  if (!local) return null;
  const skip = () => { localStorage.setItem(SKIP_KEY, "1"); setLocal(null); };
  const doImport = async () => {
    setBusy(true);
    const ok = await importData(local);
    setBusy(false);
    if (ok) {
      localStorage.removeItem(LOCAL_KEY);
      setLocal(null);
      toast.success("Your study data is now saved to your account.");
    } else toast.error("Import didn't finish. Check your connection and try again.");
  };
  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Import data from this device?</AlertDialogTitle>
          <AlertDialogDescription>
            We found study data saved on this device ({local.subjects.length} subjects, {local.topics.length} topics, {local.sessions.length} focus sessions). Import it to your account?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={skip} disabled={busy}>Skip</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); void doImport(); }} disabled={busy}>{busy ? "Importing…" : "Import"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
