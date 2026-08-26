import { ArrowRight, CheckCircle, Circle, Key, LinkBreak } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "../auth/password";
import { Brand } from "../components/Brand";

export function PasswordResetPage() {
  const { configured, finishPasswordRecovery, recoveryMode, session, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validation = validateNewPassword(password, confirmation);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!validation.valid) {
      setError(`Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres e repita a mesma senha.`);
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setComplete(true);
      finishPasswordRecovery();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("same password")) {
        setError("Escolha uma senha diferente da usada anteriormente.");
      } else if (message.includes("weak") || message.includes("password")) {
        setError("Essa senha não atende aos requisitos de segurança. Escolha outra e tente novamente.");
      } else if (message.includes("session") || message.includes("expir")) {
        setError("Este link de recuperação expirou. Solicite um novo link.");
      } else {
        setError("Não foi possível redefinir a senha. Solicite um novo link e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page password-reset-page">
      <section className="auth-story password-reset-story">
        <Brand />
        <div className="auth-copy">
          <h1><span>PROTEJA O QUE</span><span>VOCÊ CONSTRUIU.</span></h1>
          <p>Uma nova senha protege suas cartas, conexões e toda a trajetória criada por escutas reais.</p>
        </div>
        <div className="auth-layer-art" aria-hidden="true">
          <span className="layer layer-one">LINK</span>
          <span className="layer layer-two">NOVA SENHA</span>
          <span className="layer layer-three">CONTINUAR</span>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="password-reset-title">
        <div className="auth-panel__inner">
          {!configured && (
            <div className="config-notice" role="alert">
              <strong>Configuração pendente</strong>
              <span>Adicione a chave pública do Supabase em <code>frontend/.env</code>.</span>
            </div>
          )}

          {complete ? (
            <div className="password-reset-result" aria-live="polite">
              <CheckCircle size={34} weight="fill" />
              <h1 id="password-reset-title">SENHA ATUALIZADA</h1>
              <p>Sua nova senha foi salva. Entre novamente para continuar no Radar.</p>
              <Link className="button button-primary" to="/entrar">
                Voltar para entrar <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          ) : !session || !recoveryMode ? (
            <div className="password-reset-result">
              <LinkBreak size={34} weight="bold" />
              <h1 id="password-reset-title">LINK INVÁLIDO OU EXPIRADO</h1>
              <p>Solicite um novo e-mail de recuperação para proteger sua conta.</p>
              <Link className="button button-primary" to="/entrar?modo=recuperar">
                Solicitar novo link <ArrowRight size={20} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                <Key size={28} weight="bold" />
                <h1 id="password-reset-title">DEFINA UMA NOVA SENHA</h1>
                <p>O link confirmou sua identidade. Agora escolha uma senha exclusiva para o Radar.</p>
              </div>
              <form onSubmit={submit} className="auth-form">
                <label>
                  <span>Nova senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={128}
                    required
                    autoFocus
                  />
                </label>
                <label>
                  <span>Repita a nova senha</span>
                  <input
                    type="password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={128}
                    required
                  />
                </label>
                <ul className="password-requirements" aria-label="Requisitos da nova senha">
                  <li data-valid={validation.longEnough}>
                    {validation.longEnough ? <CheckCircle size={17} weight="fill" /> : <Circle size={17} />}
                    <span className="visually-hidden">{validation.longEnough ? "Concluído" : "Pendente"}: </span>
                    Pelo menos {PASSWORD_MIN_LENGTH} caracteres
                  </li>
                  <li data-valid={validation.matches}>
                    {validation.matches ? <CheckCircle size={17} weight="fill" /> : <Circle size={17} />}
                    <span className="visually-hidden">{validation.matches ? "Concluído" : "Pendente"}: </span>
                    As duas senhas são iguais
                  </li>
                </ul>
                {error && <p className="form-message form-message--error" role="alert">{error}</p>}
                <button className="button button-primary" type="submit" disabled={busy || !configured || !validation.valid}>
                  {busy ? "Atualizando" : "Salvar nova senha"}
                  {!busy && <ArrowRight size={20} weight="bold" aria-hidden="true" />}
                </button>
              </form>
              <div className="auth-switches">
                <Link to="/entrar">Voltar para entrar</Link>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
