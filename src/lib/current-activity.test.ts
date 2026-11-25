import { test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { currentActivityName, programActivityNames } from "./current-activity";
import type { ProgramSequence } from "./program-sequences";
import type { ProgramSession } from "./program";

const seq = (activity_name: string, start_date: string, end_date: string): ProgramSequence =>
  ({ id: activity_name, class_id: null, class_name: null, activity_id: null, activity_name, name: activity_name, from_session: null, to_session: null, position: 0, scale_image_url: null, start_date, end_date });

const session = (
  id: string,
  activity_name: string,
  session_date: string,
  sequence_id: string | null = null,
): ProgramSession =>
  ({ id, sequence_id, session_number: null, class_id: null, class_name: null, activity_id: null, activity_name, session_date, period_label: null, objective: null, description: null, scale_image_path: null, scale_image_url: null, scale_activity_id: null, scale_activity_name: null });

test("la séquence dont la période contient la date du jour l'emporte", () => {
  const sequences = [seq("Ultimate", "2026-09-15", "2026-11-11"), seq("Acrosport", "2026-11-10", "2027-01-19")];
  strictEqual(currentActivityName([], "2026-11-25", sequences), "Acrosport");
  strictEqual(currentActivityName([], "2026-10-01", sequences), "Ultimate");
});

test("les pastilles reprennent les séquences et les séances libres, sans doublon", () => {
  const sessions = [
    session("s1", "Ultimate", "2026-11-20", "seq1"),
    session("s2", "Acrosport", "2026-11-25"),
    session("s3", "Acrosport", "2026-11-26"),
    session("s4", "Badminton", "2026-11-27"),
  ];
  const sequences = [seq("Acrosport", "2026-11-10", "2027-01-19"), seq("Natation", "2026-09-01", "2026-10-15")];
  deepStrictEqual(programActivityNames(sessions, sequences), ["Acrosport", "Natation", "Badminton"]);
});
