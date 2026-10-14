// What a Vybe is, from a fixed list, so the list can be filtered by what
// people feel like doing. Fixed rather than free text: "sport", "Sports" and
// "sporty" would split one filter into three.
export const TAGS = {
  sport: { label: "Sport", emoji: "🏸" },
  study: { label: "Study", emoji: "📚" },
  food: { label: "Food", emoji: "🍜" },
  social: { label: "Social", emoji: "🎉" },
  outdoors: { label: "Outdoors", emoji: "🌿" },
  music: { label: "Music", emoji: "🎸" },
  games: { label: "Games", emoji: "🎲" },
} as const;

export type Tag = keyof typeof TAGS;

export const isTag = (value: string): value is Tag => value in TAGS;
