import { describe, expect, it } from "vitest";
import { extractHashtags, MAX_HASHTAGS_PER_POST, normalizeHashtag } from "../lib/hashtags.js";

describe("extractHashtags", () => {
  it("extracts and lowercases hashtags", () => {
    expect(extractHashtags("Loving #Valorant tonight #FPS")).toEqual(["valorant", "fps"]);
  });

  it("dedupes case-insensitively", () => {
    expect(extractHashtags("#Valorant and #valorant and #VALORANT")).toEqual(["valorant"]);
  });

  it("keeps underscores and digits", () => {
    expect(extractHashtags("#clan_wars_2 wins")).toEqual(["clan_wars_2"]);
  });

  it("does not match hashtags glued to word characters", () => {
    expect(extractHashtags("snake#case and foo#bar")).toEqual([]);
  });

  it("matches after punctuation and at string boundaries", () => {
    expect(extractHashtags("(#tag1) (#tag2)")).toEqual(["tag1", "tag2"]);
    expect(extractHashtags("#start")).toEqual(["start"]);
  });

  it("matches consecutive hashtags separated by a single space", () => {
    expect(extractHashtags("a #b #c")).toEqual(["b", "c"]);
  });

  it("ignores a bare # and over-long tags", () => {
    expect(extractHashtags("just a # sign")).toEqual([]);
    expect(extractHashtags(`#${"a".repeat(31)}`)).toEqual([]);
    expect(extractHashtags(`#${"a".repeat(30)}`)).toEqual(["a".repeat(30)]);
  });

  it("caps the number of stored hashtags", () => {
    const text = Array.from({ length: 20 }, (_, i) => `#tag${i}`).join(" ");
    expect(extractHashtags(text)).toHaveLength(MAX_HASHTAGS_PER_POST);
  });

  it("returns an empty list for empty input", () => {
    expect(extractHashtags("")).toEqual([]);
    expect(extractHashtags(undefined)).toEqual([]);
    expect(extractHashtags(null)).toEqual([]);
    expect(extractHashtags("no tags here")).toEqual([]);
  });
});

describe("normalizeHashtag", () => {
  it("normalizes a route param", () => {
    expect(normalizeHashtag("#Valorant")).toBe("valorant");
    expect(normalizeHashtag(" valorant ")).toBe("valorant");
    expect(normalizeHashtag("clan_wars")).toBe("clan_wars");
  });

  it("rejects values that cannot be hashtags", () => {
    expect(normalizeHashtag("two words")).toBeNull();
    expect(normalizeHashtag("")).toBeNull();
    expect(normalizeHashtag(`#${"a".repeat(31)}`)).toBeNull();
    expect(normalizeHashtag("<script>")).toBeNull();
    expect(normalizeHashtag(undefined)).toBeNull();
  });
});
