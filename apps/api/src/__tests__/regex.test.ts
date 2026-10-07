import { describe, expect, it } from "vitest";
import { escapeRegExp } from "../lib/regex.js";

describe("escapeRegExp", () => {
  it("escapes every metacharacter", () => {
    expect(escapeRegExp("a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o")).toBe(
      "a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o",
    );
  });

  it("makes user input match literally", () => {
    const safe = escapeRegExp("user.name+tag");
    const regex = new RegExp(safe, "i");
    expect(regex.test("user.name+tag")).toBe(true);
    expect(regex.test("userXname+tag")).toBe(false);
  });

  it("defuses regex-looking search strings (ReDoS / injection)", () => {
    const evil = "^(a+)+$";
    const regex = new RegExp(escapeRegExp(evil));
    expect(regex.test("^(a+)+$")).toBe(true);
    expect(regex.test("aaaa")).toBe(false);
    // A huge crafted string must not blow up as a pattern.
    expect(() => new RegExp(escapeRegExp("(?<=<script>)".repeat(50)))).not.toThrow();
  });

  it("leaves plain words untouched", () => {
    expect(escapeRegExp("wolvinix")).toBe("wolvinix");
  });
});
