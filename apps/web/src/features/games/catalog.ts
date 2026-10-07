/**
 * Curated, offline-first game catalogue.
 *
 * Covers are generated from the title's hue (see `hueFrom`) so the catalog
 * ships with zero external image requests — nothing to hotlink, nothing to
 * break. `gameUrl` points at the fictional Wolvinix arcade domain used for
 * the "Play now" demo.
 */

export interface GameEntry {
  id: string;
  title: string;
  genre: string;
  rating: number;
  year: number;
  developer: string;
  players: string;
  description: string;
  gameUrl: string;
}

export const GAMES: GameEntry[] = [
  {
    id: "nightfall-protocol",
    title: "Nightfall Protocol",
    genre: "Tactical Shooter",
    rating: 4.7,
    year: 2041,
    developer: "Vantablack Studio",
    players: "5v5 online",
    description:
      "Sunset-tinted maps, one-life rounds and gadgets that reward the squad that actually talks. Every match is a nine-minute argument about the spike.",
    gameUrl: "https://play.wolvinix.gg/nightfall-protocol",
  },
  {
    id: "emberfall",
    title: "Emberfall",
    genre: "Action RPG",
    rating: 4.5,
    year: 2040,
    developer: "Cinder & Steel",
    players: "Single-player · co-op",
    description:
      "A dying kingdom, a living sword and a leveling tree that remembers every mercy you showed. Roughly 60 hours of very bad decisions.",
    gameUrl: "https://play.wolvinix.gg/emberfall",
  },
  {
    id: "void-runners",
    title: "Void Runners",
    genre: "Battle Royale",
    rating: 4.2,
    year: 2042,
    developer: "Hyperlane Games",
    players: "60 players",
    description:
      "Zero-g gunfights inside a collapsing station. Loot momentum, not armour — the longer you drift, the faster you hit.",
    gameUrl: "https://play.wolvinix.gg/void-runners",
  },
  {
    id: "signal-lost",
    title: "Signal Lost",
    genre: "Horror",
    rating: 4.8,
    year: 2039,
    developer: "Pale Static",
    players: "1–4 co-op",
    description:
      "Research station, dead crew, one working radio. Coordinate in the dark or become the thing your friends are listening for.",
    gameUrl: "https://play.wolvinix.gg/signal-lost",
  },
  {
    id: "grid-kings",
    title: "Grid Kings",
    genre: "Strategy",
    rating: 4.4,
    year: 2038,
    developer: "Northtable",
    players: "1v1 · 2v2",
    description:
      "City-scale chess with economies that crash if you blink. Build the metro line, lose the war.",
    gameUrl: "https://play.wolvinix.gg/grid-kings",
  },
  {
    id: "apex-drift",
    title: "Apex Drift",
    genre: "Racing",
    rating: 4.1,
    year: 2041,
    developer: "Redline Collective",
    players: "12 players online",
    description:
      "Night-city drift circuits, absurdly tunable suspensions and a replay editor made for posting your one clean lap.",
    gameUrl: "https://play.wolvinix.gg/apex-drift",
  },
  {
    id: "hollow-tide",
    title: "Hollow Tide",
    genre: "Survival",
    rating: 4.6,
    year: 2042,
    developer: "Salt & Fog",
    players: "1–6 co-op",
    description:
      "Build a raft, survive the storm, argue about who ate the last fish. Tides rewrite the map every in-game week.",
    gameUrl: "https://play.wolvinix.gg/hollow-tide",
  },
  {
    id: "glyphbound",
    title: "Glyphbound",
    genre: "Puzzle",
    rating: 4.3,
    year: 2037,
    developer: "Tessellate",
    players: "Single-player",
    description:
      "Hand-drawn runes that behave like programming primitives. Two hundred levels, no timers, pure brain-melty satisfaction.",
    gameUrl: "https://play.wolvinix.gg/glyphbound",
  },
  {
    id: "iron-banner-arena",
    title: "Iron Banner Arena",
    genre: "MOBA",
    rating: 3.9,
    year: 2040,
    developer: "Standard Bearer",
    players: "5v5 online",
    description:
      "Three lanes, one banner, endless blame. Twelve-minute matches designed to fit between everything else you had planned.",
    gameUrl: "https://play.wolvinix.gg/iron-banner-arena",
  },
  {
    id: "metro-mogul",
    title: "Metro Mogul",
    genre: "Simulation",
    rating: 4.5,
    year: 2036,
    developer: "Commuter Works",
    players: "Single-player",
    description:
      "Design the transit network your city swears it doesn't need. Watch four million commuters quietly judge your junctions.",
    gameUrl: "https://play.wolvinix.gg/metro-mogul",
  },
  {
    id: "skybreakers",
    title: "Skybreakers",
    genre: "Platformer",
    rating: 4.4,
    year: 2043,
    developer: "Updraft",
    players: "1–4 co-op",
    description:
      "Wall-run, grapple and slam through floating ruins at 120fps. Speedrun timers built in, coyote time actually generous.",
    gameUrl: "https://play.wolvinix.gg/skybreakers",
  },
  {
    id: "crown-and-circuit",
    title: "Crown & Circuit",
    genre: "Card Battler",
    rating: 4.0,
    year: 2042,
    developer: "Deckhand Digital",
    players: "1v1 online",
    description:
      "Deck-building with a kingdom layer: every card you play is also a promise to your subjects. Balance is a feature, not a bug.",
    gameUrl: "https://play.wolvinix.gg/crown-and-circuit",
  },
];

/** Unique genre list for the filter chips, in catalogue order. */
export const GENRES: string[] = Array.from(new Set(GAMES.map((game) => game.genre)));
