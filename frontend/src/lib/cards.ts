import type { ArtistCard } from "../types";

export type CardFilter = "all" | "moving" | "emerging";
export type CardSort = "recent" | "level" | "listens" | "name";

export type OrganizeCardsOptions = {
  query: string;
  filter: CardFilter;
  sort: CardSort;
};

export function organizeCards(cards: ArtistCard[], options: OrganizeCardsOptions): ArtistCard[] {
  const normalizedQuery = options.query.trim().toLocaleLowerCase("pt-BR");
  return cards
    .filter((card) => !normalizedQuery || card.artistName.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
    .filter((card) => {
      if (options.filter === "moving") return card.level >= 2;
      if (options.filter === "emerging") return card.isEmerging;
      return true;
    })
    .sort((left, right) => {
      const nameOrder = left.artistName.localeCompare(right.artistName, "pt-BR");
      if (options.sort === "name") return nameOrder;
      if (options.sort === "level") return right.level - left.level || right.xp - left.xp || nameOrder;
      if (options.sort === "listens") return right.listenCount - left.listenCount || nameOrder;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime() || nameOrder;
    });
}
