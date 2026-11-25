import { test } from "node:test";
import { strictEqual } from "node:assert";
import { DEFAULT_AFL_ITEMS, activityScale, competencyMaxPoints, gradeTotals, levelForScore } from "./grades";

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

test("le barème d'activité conserve 6 + 6, 4, 4 par défaut", () => {
  const scale = activityScale();
  strictEqual(scale.AFL1a, 6);
  strictEqual(scale.AFL1b, 6);
  strictEqual(scale.AFL2, 4);
  strictEqual(scale.AFL3, 4);
});

test("une compétence accepte une allocation de 0.5 point dans son budget AFL", () => {
  const competency = { id: "c", afl: "AFL2", max_points: 0.5 };
  strictEqual(competencyMaxPoints(competency, [competency, { id: "other", afl: "AFL2" }]), 0.5);
});

test("un ancien barème de 4 suit automatiquement AFL1a sur 8 et AFL1b sur 4", () => {
  const a = { id: "a", afl: "AFL1", afl1_part: "a" as const, max_points: 4 };
  const b = { id: "b", afl: "AFL1", afl1_part: "b" as const, max_points: 4 };
  const scale = { AFL1a: 8, AFL1b: 4 };
  strictEqual(competencyMaxPoints(a, [a, b], scale), 8);
  strictEqual(competencyMaxPoints(b, [a, b], scale), 4);
});

test("plusieurs compétences personnalisées se répartissent les 8 points sans multiplier le budget", () => {
  const a = { id: "a", afl: "AFL1", max_points: 4 };
  const b = { id: "b", afl: "AFL1", max_points: 4 };
  strictEqual(competencyMaxPoints(a, [a, b], { AFL1a: 8 }), 4);
  strictEqual(competencyMaxPoints(b, [a, b], { AFL1a: 8 }), 4);
});

test("les arrondis de trois compétences totalisent exactement 4 points", () => {
  const group = ["a", "b", "c"].map((id) => ({ id, afl: "AFL2" }));
  strictEqual(gradeTotals(group.map((c) => ({ points: 0, max_points: competencyMaxPoints(c, group) }))).max, 4);
});

test("les compétences se partagent le budget de leur AFL sans le multiplier", () => {
  const a = { id: "a", afl: "AFL2", max_points: 1.5 };
  const b = { id: "b", afl: "AFL2" };
  strictEqual(competencyMaxPoints(b, [a, b]), 2.5);
  strictEqual(competencyMaxPoints(b, [a, b], { AFL2: 6 }), 4.5);
});

test("AFL1a et AFL1b disposent de budgets indépendants de 6 points", () => {
  const a = { id: "a", afl: "AFL1", afl1_part: "a" as const };
  const b = { id: "b", afl: "AFL1", afl1_part: "b" as const };
  strictEqual(competencyMaxPoints(a, [a, b]), 6);
  strictEqual(competencyMaxPoints(b, [a, b]), 6);
});

test("les compétences non répertoriées n'ont pas de points AFL", () => {
  const competency = { id: "c", afl: "OTHER", max_points: 5 };
  strictEqual(competencyMaxPoints(competency, [competency]), 0);
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
