import { Brand } from "./Brand";

export function LoadingView({ label = "Carregando seu Radar" }: { label?: string }) {
  return (
    <main className="loading-view" aria-live="polite" aria-busy="true">
      <Brand />
      <div className="loading-layers" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </main>
  );
}
