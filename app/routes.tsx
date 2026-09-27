import { Navigate, Route, Routes } from "react-router";
import useSWR from "swr";
import { ApiError } from "@/lib/api";
import { fetchWatchlist } from "@/hooks/useWatchlist";
import { PageLoadingScreen } from "@/components/ui/LoadingIndicator";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import Home from "./page";
import LoginPage from "./login/page";
import SignupPage from "./signup/page";
import NotFound from "./not-found";

function SessionGate({ children, publicPage = false }: { children: React.ReactNode; publicPage?: boolean }) {
  const { data, error, mutate } = useSWR("/v1/watchlist", fetchWatchlist, {
    shouldRetryOnError: false,
  });

  // 初回の認証確認中にも画面の各取得を開始し、チャートを直列待ちにしない。
  const checking = data === undefined && !error;
  if (error instanceof ApiError && error.status === 401) {
    return publicPage ? children : <Navigate to="/login" replace />;
  }
  if (error && data === undefined) {
    return (
      <main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p>認証状態を確認できませんでした。通信を確認して再試行してください。</p>
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={() => void mutate()}>再試行</button>
      </main>
    );
  }
  if (publicPage && !checking) return <Navigate to="/" replace />;
  return (
    <>
      <div aria-hidden={checking} inert={checking}>{children}</div>
      {checking && <PageLoadingScreen />}
    </>
  );
}

export function AppRoutes() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<SessionGate key="protected"><Home /></SessionGate>} />
        <Route path="/login" element={<SessionGate key="login" publicPage><LoginPage /></SessionGate>} />
        <Route path="/signup" element={<SessionGate key="signup" publicPage><SignupPage /></SessionGate>} />
        <Route path="*" element={<SessionGate key="not-found"><NotFound /></SessionGate>} />
      </Routes>
    </AppErrorBoundary>
  );
}
