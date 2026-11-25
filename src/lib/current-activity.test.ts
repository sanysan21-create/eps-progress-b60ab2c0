import { test } from "node:test";
import { strictEqual } from "node:assert";
import { currentActivityName } from "./current-activity";

const seq = (activity_name: string, start_date: string, end_date: string) =>
  ({ id: activity_name, class_id: null, class_name: null, activity_id: null, activity_name, name: activity_name, from_session: null, to_session: null, position: 0, scale_image_url: null, start_date, end_date });

test("la séquence dont la période contient la date du jour l'emporte", () => {
  const sequences = [seq("Ultimate", "2026-09-15", "2026-11-11"), seq("Acrosport", "2026-11-10", "2027-01-19")];
  strictEqual(currentActivityName([], "2026-11-25", sequences), "Acrosport");
  strictEqual(currentActivityName([], "2026-10-01", sequences), "Ultimate");
});
