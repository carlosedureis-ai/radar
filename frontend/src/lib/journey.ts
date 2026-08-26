import type { JourneyStats } from "../types";

export type JourneyMilestone = {
  id: "first-card" | "three-artists" | "ten-listens" | "card-level-two";
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  complete: boolean;
  href: "/cartas" | "/conexoes";
  action: string;
};

export function journeyMilestones(stats: JourneyStats): JourneyMilestone[] {
  return [
    milestone({
      id: "first-card",
      title: "Primeira camada",
      description: "Forme sua primeira carta com uma escuta reconhecida.",
      current: stats.artistCount,
      target: 1,
      unit: "carta",
      href: "/conexoes",
      action: "Sincronizar escutas",
    }),
    milestone({
      id: "three-artists",
      title: "Radar aberto",
      description: "Construa cartas de três artistas diferentes.",
      current: stats.artistCount,
      target: 3,
      unit: "artistas",
      href: "/conexoes",
      action: "Ampliar coleção",
    }),
    milestone({
      id: "ten-listens",
      title: "Arquivo vivo",
      description: "Registre dez escutas válidas na sua história.",
      current: stats.qualifiedListenCount,
      target: 10,
      unit: "escutas válidas",
      href: "/conexoes",
      action: "Atualizar histórico",
    }),
    milestone({
      id: "card-level-two",
      title: "Carta em movimento",
      description: "Leve uma carta da coleção ao nível 2.",
      current: stats.highestCardLevel,
      target: 2,
      unit: "nível da carta",
      href: "/cartas",
      action: "Ver coleção",
    }),
  ];
}

function milestone(input: Omit<JourneyMilestone, "complete">): JourneyMilestone {
  return { ...input, complete: input.current >= input.target };
}
