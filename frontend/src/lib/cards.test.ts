import { describe, expect, it } from "vitest";
import type { ArtistCard } from "../types";
import { organizeCards } from "./cards";

const cards: ArtistCard[] = [
  { artistId: "a", artistName: "Aurora", slug: "aurora", isEmerging: true, xp: 80, listenCount: 6, level: 1, updatedAt: "2026-08-24T10:00:00.000Z" },
  { artistId: "b", artistName: "Banda Solar", slug: "banda-solar", isEmerging: false, xp: 520, listenCount: 22, level: 3, updatedAt: "2026-08-26T10:00:00.000Z" },
  { artistId: "c", artistName: "Cais", slug: "cais", isEmerging: true, xp: 160, listenCount: 12, level: 2, updatedAt: "2026-08-25T10:00:00.000Z" },
];

describe("organizeCards", () => {
  it("filtra por trajetória e busca sem diferenciar maiúsculas", () => {
    expect(organizeCards(cards, { query: "cAi", filter: "moving", sort: "recent" }).map((card) => card.artistId)).toEqual(["c"]);
    expect(organizeCards(cards, { query: "", filter: "emerging", sort: "name" }).map((card) => card.artistId)).toEqual(["a", "c"]);
  });

  it("ordena por avanço, nível e escutas com desempate estável", () => {
    expect(organizeCards(cards, { query: "", filter: "all", sort: "recent" }).map((card) => card.artistId)).toEqual(["b", "c", "a"]);
    expect(organizeCards(cards, { query: "", filter: "all", sort: "level" }).map((card) => card.artistId)).toEqual(["b", "c", "a"]);
    expect(organizeCards(cards, { query: "", filter: "all", sort: "listens" }).map((card) => card.artistId)).toEqual(["b", "c", "a"]);
  });
});
