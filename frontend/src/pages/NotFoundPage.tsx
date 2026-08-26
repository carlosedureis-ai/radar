import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <main className="not-found"><span>404</span><h1>Esta camada não existe.</h1><Link className="button button-primary" to="/"><ArrowLeft size={19} weight="bold" />Voltar ao início</Link></main>;
}
