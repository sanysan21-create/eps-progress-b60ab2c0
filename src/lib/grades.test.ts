import { test } from "node:test";
import { strictEqual } from "node:assert";
import { DEFAULT_AFL_ITEMS, gradeTotals, levelForScore } from "./grades";

/** Barème demandé par l'enseignant : AFL1 12 pts, AFL2 4 pts, AFL3 4 pts. */
test("default scale is AFL1 12, AFL2 4, AFL3 4", () => {
  strictEqual(DEFAULT_AFL_ITEMS.find((item) => item.label === "AFL1")?.maxPoints, 12);
  strictEqual(DEFAULT_AFL_ITEMS.find((item) => item.label === "AFL2")?.maxPoints, 4);
  strictEqual(DEFAULT_AFL_ITEMS.find((item) => item.label === "AFL3")?.maxPoints, 4);
});

test("default scale adds up to 20 points", () => {
  const totals = gradeTotals(
    DEFAULT_AFL_ITEMS.map((item) => ({ points: item.maxPoints, max_points: item.maxPoints })),
  );
  strictEqual(totals.max, 20);
  strictEqual(totals.percent, 100);
});

test("AFL1 is split into AFL1a 6 pts and AFL1b 6 pts", async () => {
  const { AFL1_PARTS } = await import("./grades");
  strictEqual(AFL1_PARTS.find((p) => p.label === "AFL1a")?.maxPoints, 6);
  strictEqual(AFL1_PARTS.find((p) => p.label === "AFL1b")?.maxPoints, 6);
});

const levels = Array.from({ length: 4 }, (_, i) => ({ id: String(i + 1), position: i + 1 }));
test("2 points sur 4 attribuent le niveau 2 sur 4", () => {
  strictEqual(levelForScore(levels, 2, 4)?.level.id, "2");
});
test("les décimales et le barème sont convertis proportionnellement", () => {
  strictEqual(levelForScore(levels, 1.5, 6)?.rank, 1);
  strictEqual(levelForScore(levels, 3, 6)?.rank, 2);
  strictEqual(levelForScore(levels, 6, 6)?.rank, 4);
});
test("la conversion respecte le nombre réel et l'ordre des niveaux", () => {
  const seven = Array.from({ length: 7 }, (_, i) => ({ id: String(i + 1), position: i + 1 })).reverse();
  strictEqual(levelForScore(seven, 2, 4)?.level.id, "4");
  strictEqual(levelForScore(seven, 4, 4)?.level.id, "7");
  strictEqual(levelForScore([], 2, 4), null);
  strictEqual(levelForScore(levels, 2, 0), null);
});
