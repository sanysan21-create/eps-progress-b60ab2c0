import { test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { quizzesForSession } from "./program-selection";
import { musicProposalSchema } from "./acrosport-music";

const quizzes = [{ id: "q1", session_id: "s1" }, { id: "q2", session_id: "s2" }];
test("no quiz before selecting a session", () => {
  deepStrictEqual(quizzesForSession(quizzes, null), []);
});
test("only quizzes saved in the selected session", () => {
  deepStrictEqual(quizzesForSession(quizzes, "s2"), [quizzes[1]]);
});
test("student music proposal accepts an internet link", () => {
  strictEqual(musicProposalSchema.parse({ title: "Musique acrosport", url: "https://www.youtube.com/watch?v=abc" }).url, "https://www.youtube.com/watch?v=abc");
});
test("music links cannot execute scripts", () => {
  strictEqual(musicProposalSchema.safeParse({ title: "Musique", url: "javascript:alert(1)" }).success, false);
});