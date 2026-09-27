import { Component, type ErrorInfo, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { ErrorPageShell } from "./ErrorPageShell";
import { Button } from "@/components/ui/button";

export class AppErrorBoundary extends Component<{ children: ReactNode; reloadPage?: () => void }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorPageShell
        icon={<CircleAlert className="h-12 w-12 text-[var(--color-bear)]" />}
        title="エラーが発生しました"
        description="ページの表示中に問題が発生しました。時間をおいて再度お試しください。"
      >
        <Button onClick={() => this.setState({ error: null })}>再試行</Button>
        <Button variant="outline" onClick={() => (this.props.reloadPage ?? (() => window.location.reload()))()}>
          ページ再読み込み
        </Button>
      </ErrorPageShell>
    );
  }
}
