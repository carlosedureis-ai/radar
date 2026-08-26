import type { ProgressionRule } from "../types";

export type ProgressWindow = {
  current: ProgressionRule | null;
  next: ProgressionRule | null;
  percent: number;
  remainingXp: number;
};

export function progressWindow(
  rules: ProgressionRule[],
  scope: ProgressionRule["scope"],
  xp: number,
): ProgressWindow {
  const scoped = rules.filter((rule) => rule.scope === scope).sort((a, b) => a.minXp - b.minXp);
  const current = [...scoped].reverse().find((rule) => rule.minXp <= xp) ?? null;
  const next = scoped.find((rule) => rule.minXp > xp) ?? null;
  if (!next) return { current, next: null, percent: 100, remainingXp: 0 };
  const floor = current?.minXp ?? 0;
  const range = Math.max(1, next.minXp - floor);
  return {
    current,
    next,
    percent: Math.max(0, Math.min(100, ((xp - floor) / range) * 100)),
    remainingXp: Math.max(0, next.minXp - xp),
  };
}

export function formatXp(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
