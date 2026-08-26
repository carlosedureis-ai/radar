import { describe, expect, it } from "vitest";
import { journeyComparison, journeyMilestones } from "./journey";

describe("journeyMilestones", () => {
  it("deriva marcos apenas das estatísticas verificadas", () => {
    const milestones = journeyMilestones({
      artistCount: 3,
      qualifiedListenCount: 7,
      highestCardLevel: 1,
    });

    expect(milestones.map((item) => ({ id: item.id, complete: item.complete }))).toEqual([
      { id: "first-card", complete: true },
      { id: "three-artists", complete: true },
      { id: "ten-listens", complete: false },
      { id: "card-level-two", complete: false },
    ]);
    expect(milestones[2]).toMatchObject({ current: 7, target: 10 });
  });

  it("mantém os valores reais mesmo depois de completar um marco", () => {
    const [first] = journeyMilestones({
      artistCount: 5,
      qualifiedListenCount: 14,
      highestCardLevel: 3,
    });

    expect(first).toMatchObject({ current: 5, target: 1, complete: true });
  });

  it("compara jornadas sem declarar vencedor", () => {
    const rows = journeyComparison(
      {
        token: "public-token",
        accountXp: 140,
        accountLevel: 2,
        journey: { artistCount: 3, qualifiedListenCount: 8, highestCardLevel: 1 },
        createdAt: "2026-08-26T10:00:00.000Z",
      },
      {
        account: { id: "viewer", displayName: "Ouvinte", xp: 180, level: 2 },
        rules: [],
        journey: { artistCount: 2, qualifiedListenCount: 12, highestCardLevel: 2 },
      },
    );

    expect(rows).toEqual([
      { id: "account-level", label: "Nível da conta", shared: 2, current: 2 },
      { id: "milestones", label: "Marcos concluídos", shared: 2, current: 3 },
      { id: "artists", label: "Artistas na coleção", shared: 3, current: 2 },
      { id: "listens", label: "Escutas válidas", shared: 8, current: 12 },
    ]);
  });
});
