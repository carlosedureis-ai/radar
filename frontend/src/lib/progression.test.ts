import { describe, expect, it } from "vitest";
import { formatXp, progressWindow } from "./progression";
import type { ProgressionRule } from "../types";

const rules: ProgressionRule[] = [
  { scope: "account", level: 1, name: "Ouvinte", minXp: 0, provisional: true },
  { scope: "account", level: 2, name: "Explorador", minXp: 100, provisional: true },
  { scope: "account", level: 3, name: "Curador", minXp: 300, provisional: true },
  { scope: "card", level: 1, name: "Descoberta", minXp: 0, provisional: true },
];

describe("progressWindow", () => {
  it("calcula a faixa e o XP restante", () => {
    expect(progressWindow(rules, "account", 150)).toEqual({
      current: rules[1],
      next: rules[2],
      percent: 25,
      remainingXp: 150,
    });
  });

  it("limita o nível máximo a cem por cento", () => {
    const result = progressWindow(rules, "account", 500);
    expect(result.next).toBeNull();
    expect(result.percent).toBe(100);
    expect(result.remainingXp).toBe(0);
  });
});

describe("formatXp", () => {
  it("formata números para pt-BR", () => {
    expect(formatXp(1250)).toBe("1.250");
  });
});
