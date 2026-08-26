import type { JourneyStats, Progression, PublicJourneyShare } from "../types";

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

export function completedJourneyMilestones(stats: JourneyStats): number {
  return journeyMilestones(stats).filter((milestone) => milestone.complete).length;
}

export type JourneyComparisonRow = {
  id: "account-level" | "milestones" | "artists" | "listens";
  label: string;
  shared: number;
  current: number;
};

export function journeyComparison(
  shared: PublicJourneyShare,
  current: Progression,
): JourneyComparisonRow[] {
  return [
    { id: "account-level", label: "Nível da conta", shared: shared.accountLevel, current: current.account.level },
    {
      id: "milestones",
      label: "Marcos concluídos",
      shared: completedJourneyMilestones(shared.journey),
      current: completedJourneyMilestones(current.journey),
    },
    { id: "artists", label: "Artistas na coleção", shared: shared.journey.artistCount, current: current.journey.artistCount },
    { id: "listens", label: "Escutas válidas", shared: shared.journey.qualifiedListenCount, current: current.journey.qualifiedListenCount },
  ];
}

function milestone(input: Omit<JourneyMilestone, "complete">): JourneyMilestone {
  return { ...input, complete: input.current >= input.target };
}
