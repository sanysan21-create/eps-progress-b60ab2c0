import { test } from "node:test";
import { strictEqual } from "node:assert";
import { DEFAULT_AFL_ITEMS, gradeTotals } from "./grades";

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
