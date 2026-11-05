import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StudyProvider, useStudy } from "@/lib/store";
import { TimerProvider } from "@/lib/timer";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ImportLocalPrompt } from "@/components/account/ImportLocalPrompt";
import { InstallBanner } from "@/components/pwa/InstallBanner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = useAuth();
  if (!user) return <FullPageMessage text="Loading your planner…" />;
  return (
    <StudyProvider key={user.id} mode={{ kind: "cloud", userId: user.id }}>
      <TimerProvider>
        <Gate>
          <AppShell>
            <Outlet />
          </AppShell>
          <ImportLocalPrompt />
          <InstallBanner />
        </Gate>
      </TimerProvider>
    </StudyProvider>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { ready, loadError, reload } = useStudy();
  if (loadError)
    return (
      <FullPageMessage text={loadError}>
        <Button onClick={reload}><RefreshCw /> Try again</Button>
      </FullPageMessage>
    );
  if (!ready) return <FullPageMessage text="Loading your planner…" />;
  return <>{children}</>;
}

function FullPageMessage({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center" role="status">
      <p className="text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}
