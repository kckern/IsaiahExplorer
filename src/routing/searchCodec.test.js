import { encodeForUrl, decodeFromUrl, toDisplay, fromDisplay } from "./searchCodec";

describe("searchCodec", () => {
  test("encodeForUrl: spaces to +, lowercased", () => {
    expect(encodeForUrl("Comfort My People")).toBe("comfort+my+people");
  });

  test("decodeFromUrl: + back to spaces", () => {
    expect(decodeFromUrl("comfort+my+people")).toBe("comfort my people");
  });

  test("url round-trips a plain multi-word query", () => {
    const q = "comfort my people";
    expect(decodeFromUrl(encodeForUrl(q))).toBe(q);
  });

  test("word-boundary markers: internal \\b becomes corner brackets in the URL", () => {
    // "\bzion" (boundary before zion) as it lives internally, via display markers
    expect(encodeForUrl("｢zion")).toBe("\\bzion");
    expect(decodeFromUrl("\\bzion".replace(/\\b/, "｢"))).toBe("/zion");
  });

  test("toDisplay: en-dashes and corner-bracket boundaries", () => {
    expect(toDisplay("a-b")).toBe("a–b");
    expect(toDisplay("\\bzion")).toBe("｢zion");
    expect(toDisplay("zion\\b")).toBe("zion｣");
  });

  test("fromDisplay: boundary markers collapse to /", () => {
    expect(fromDisplay("｢zion")).toBe("/zion");
    expect(fromDisplay("\\bzion")).toBe("/zion");
  });

  test("null/undefined-safe", () => {
    expect(toDisplay(null)).toBe("");
    expect(fromDisplay(undefined)).toBe("");
  });
});
