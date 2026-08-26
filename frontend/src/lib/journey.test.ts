import { describe, expect, it } from "vitest";
import { journeyMilestones } from "./journey";

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
});
