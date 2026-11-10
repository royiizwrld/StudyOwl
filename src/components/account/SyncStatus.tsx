import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useStudy } from "@/lib/store";
import { Button } from "@/components/ui/button";

/** Small header indicator: saving / failed save with retry. */
export function SyncStatus() {
  const { sync, retrySync, pendingChanges } = useStudy();
  if (sync === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status"><Loader2 className="size-3.5 animate-spin" /> Saving</span>;
  if (sync === "error" || sync === "offline")
    return (
      <Button variant="ghost" size="sm" onClick={() => void retrySync()} className="h-auto min-h-9 max-w-full gap-1 whitespace-normal px-2 text-xs text-muted-foreground" aria-label="Retry syncing pending changes">
        {sync === "offline" ? <CloudOff className="size-3.5 shrink-0" /> : <RefreshCw className="size-3.5 shrink-0" />} {sync === "offline" ? `Offline (${pendingChanges} changes pending)` : `${pendingChanges} changes pending · Retry`}
      </Button>
    );
  return null;
}
