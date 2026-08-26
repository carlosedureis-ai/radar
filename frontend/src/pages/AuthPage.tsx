import { ArrowRight, CheckCircle, Key, UserPlus } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../components/Brand";

type Mode = "signin" | "signup" | "reset";

export function AuthPage() {
  const { configured, signIn, signUp, sendPasswordReset } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get("modo") === "recuperar" ? "reset" : "signin",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") await signIn(email, password);
      if (mode === "signup") {
        const result = await signUp({ email, password, displayName });
        if (result.needsEmailConfirmation) setNotice("Confira seu e-mail para confirmar a conta.");
      }
      if (mode === "reset") {
        await sendPasswordReset(email);
        setNotice("Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "ENTRE NO SEU RADAR" : mode === "signup" ? "CRIE SUA CAMADA" : "RECUPERE O ACESSO";
  const submitLabel = mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link";

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-copy">
          <p className="section-label">ESCUTE ONDE QUISER</p>
          <h1><span>SUA MÚSICA</span><span>GANHA FORMA.</span></h1>
          <p>Conecte sua plataforma, evolua cartas e compartilhe a trajetória construída por escutas reais.</p>
        </div>
        <div className="auth-layer-art" aria-hidden="true">
          <span className="layer layer-one">ESCUTA</span>
          <span className="layer layer-two">CARTA</span>
          <span className="layer layer-three">HISTÓRIA</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel__inner">
          <div className="auth-heading">
            {mode === "signup" ? <UserPlus size={28} weight="bold" /> : <Key size={28} weight="bold" />}
            <h2 id="auth-title">{title}</h2>
            <p>{mode === "reset" ? "Enviaremos um link seguro para o e-mail cadastrado." : "Seu progresso fica ligado a uma conta segura."}</p>
          </div>

          {!configured && (
            <div className="config-notice" role="alert">
              <strong>Configuração pendente</strong>
              <span>Adicione a chave pública do Supabase em <code>frontend/.env</code>.</span>
            </div>
          )}

          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && (
              <label>
                <span>Como você quer ser chamado?</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" minLength={2} maxLength={60} required />
              </label>
            )}
            <label>
              <span>E-mail</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            {mode !== "reset" && (
              <label>
                <span>Senha</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required />
                {mode === "signup" && <small>Use pelo menos 8 caracteres.</small>}
              </label>
            )}
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            {notice && <p className="form-message form-message--success" role="status"><CheckCircle size={20} weight="fill" />{notice}</p>}
            <button className="button button-primary" type="submit" disabled={busy || !configured}>
              {busy ? "Aguarde" : submitLabel}
              {!busy && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
            </button>
          </form>

          <div className="auth-switches">
            {mode !== "signin" && <button type="button" onClick={() => setMode("signin")}>Já tenho conta</button>}
            {mode !== "signup" && <button type="button" onClick={() => setMode("signup")}>Criar uma conta</button>}
            {mode !== "reset" && <button type="button" onClick={() => setMode("reset")}>Esqueci a senha</button>}
          </div>
        </div>
      </section>
    </main>
  );
}
