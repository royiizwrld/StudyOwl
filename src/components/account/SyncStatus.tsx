import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useStudy } from "@/lib/store";

/** Small header indicator: saving / failed save with retry. */
export function SyncStatus() {
  const { sync, retrySync } = useStudy();
  if (sync === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status"><Loader2 className="size-3.5 animate-spin" /> Saving</span>;
  if (sync === "error" || sync === "offline")
    return (
      <button onClick={() => void retrySync()} className="flex min-h-9 items-center gap-1 rounded-full bg-destructive/10 px-3 text-xs font-medium text-destructive" aria-label="Changes not saved. Retry saving">
        {sync === "offline" ? <CloudOff className="size-3.5" /> : <RefreshCw className="size-3.5" />} {sync === "offline" ? "Offline — retry" : "Not saved — retry"}
      </button>
    );
  return null;
}
