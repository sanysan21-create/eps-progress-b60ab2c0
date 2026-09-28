import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import type { Db } from "./db.server";
import { ULTIMATE_TEAM_CODES } from "./ultimate";

export type UltimatePower = {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  rule: string;
  cost: number;
  active: boolean;
};

export type RankBudget = { rank: number; points: number };

export type PowersTeam = {
  team: string;
  members: { id: string; first_name: string; last_name: string }[];
  captain_id: string | null;
  rank: number | null;
  budget: number;
  power_ids: string[];
};

export type PowersBoard = {
  powers: UltimatePower[];
  budgets: RankBudget[];
  teams: PowersTeam[];
};

const POWER_COLS = "id, name, icon, description, rule, cost, active";

function normPower(row: UltimatePower): UltimatePower {
  return { ...row, cost: Number(row.cost) };
}

async function loadBudgets(sql: Db, teacherId: string): Promise<RankBudget[]> {
  const rows = await sql<RankBudget[]>`
    select rank, points from ultimate_rank_budgets
    where teacher_id = ${teacherId} order by rank asc
  `;
  return rows.map((r) => ({ rank: Number(r.rank), points: Number(r.points) }));
}

function budgetFor(budgets: RankBudget[], rank: number | null): number {
  if (rank === null) return 0;
  return budgets.find((b) => b.rank === rank)?.points ?? 0;
}

async function assertOwn(sql: Db, teacherId: string, classId: string, activityId: string) {
  const rows = await sql<{ ok: number }[]>`
    select 1 as ok from classes c, activities a
    where c.id = ${classId} and c.teacher_id = ${teacherId}
      and a.id = ${activityId} and a.teacher_id = ${teacherId}
  `;
  if (!rows[0]) throw new Error("Classe ou activité introuvable");
}

const scopeSchema = z.object({ classId: z.string().uuid(), activityId: z.string().uuid() });

/** Tableau complet des pouvoirs pour une classe et une activité ultimate. */
export const getPowersBoard = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string; activityId: string }) => scopeSchema.parse(input))
  .handler(async ({ data, context }): Promise<PowersBoard> => {
    const sql = context.sql;
    await assertOwn(sql, context.userId, data.classId, data.activityId);
    const powers = (
      await sql<UltimatePower[]>`
        select ${sql.unsafe(POWER_COLS)} from ultimate_powers
        where teacher_id = ${context.userId}
        order by cost asc, name asc
      `
    ).map(normPower);
    const budgets = await loadBudgets(sql, context.userId);

    const members = await sql<
      { team: string; id: string; first_name: string; last_name: string }[]
    >`
      select t.team, s.id, s.first_name, s.last_name
      from student_ultimate_teams t
      join class_students cs on cs.student_id = t.student_id and cs.class_id = ${data.classId}
      join students s on s.id = t.student_id
      where t.teacher_id = ${context.userId} and t.activity_id = ${data.activityId}
      order by s.last_name, s.first_name
    `;
    const settings = await sql<
      { id: string; team: string; captain_student_id: string | null; rank: number | null }[]
    >`
      select id, team, captain_student_id, rank from ultimate_team_settings
      where teacher_id = ${context.userId} and class_id = ${data.classId}
        and activity_id = ${data.activityId}
    `;
    const assigned = await sql<{ team_setting_id: string; power_id: string }[]>`
      select tp.team_setting_id, tp.power_id from ultimate_team_powers tp
      join ultimate_team_settings ts on ts.id = tp.team_setting_id
      where ts.teacher_id = ${context.userId} and ts.class_id = ${data.classId}
        and ts.activity_id = ${data.activityId}
    `;

    const teamCodes = ULTIMATE_TEAM_CODES.filter((code) =>
      members.some((m) => m.team === code),
    );
    const teams: PowersTeam[] = teamCodes.map((code) => {
      const setting = settings.find((s) => s.team === code);
      const rank = setting?.rank == null ? null : Number(setting.rank);
      return {
        team: code,
        members: members
          .filter((m) => m.team === code)
          .map(({ id, first_name, last_name }) => ({ id, first_name, last_name })),
        captain_id: setting?.captain_student_id ?? null,
        rank,
        budget: budgetFor(budgets, rank),
        power_ids: setting
          ? assigned.filter((a) => a.team_setting_id === setting.id).map((a) => a.power_id)
          : [],
      };
    });
    return { powers, budgets, teams };
  });

const powerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(8).nullable(),
  description: z.string().trim().max(500),
  rule: z.string().trim().max(1500),
  cost: z.number().int().min(0).max(99),
  active: z.boolean(),
});

/** Crée ou modifie un pouvoir. */
export const savePower = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: z.input<typeof powerSchema>) => powerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const icon = data.icon || null;
    if (data.id) {
      await context.sql`
        update ultimate_powers set name = ${data.name}, icon = ${icon},
          description = ${data.description}, rule = ${data.rule}, cost = ${data.cost},
          active = ${data.active}, updated_at = now()
        where id = ${data.id} and teacher_id = ${context.userId}
      `;
    } else {
      await context.sql`
        insert into ultimate_powers (teacher_id, name, icon, description, rule, cost, active)
        values (${context.userId}, ${data.name}, ${icon}, ${data.description}, ${data.rule},
                ${data.cost}, ${data.active})
      `;
    }
    return { ok: true };
  });

/** Duplique un pouvoir. */
export const duplicatePower = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into ultimate_powers (teacher_id, name, icon, description, rule, cost, active)
      select teacher_id, name || ' (copie)', icon, description, rule, cost, active
      from ultimate_powers where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Supprime un pouvoir (retiré de toutes les équipes). */
export const deletePower = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from ultimate_powers where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Remplace la correspondance classement → points. */
export const saveRankBudgets = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { budgets: RankBudget[] }) =>
    z
      .object({
        budgets: z
          .array(
            z.object({
              rank: z.number().int().min(1).max(20),
              points: z.number().int().min(0).max(99),
            }),
          )
          .max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql.begin(async (tx) => {
      await tx`delete from ultimate_rank_budgets where teacher_id = ${context.userId}`;
      for (const b of data.budgets) {
        await tx`
          insert into ultimate_rank_budgets (teacher_id, rank, points)
          values (${context.userId}, ${b.rank}, ${b.points})
          on conflict (teacher_id, rank) do update set points = excluded.points
        `;
      }
    });
    return { ok: true };
  });

/** Enregistre capitaine, classement et pouvoirs attribués d'une équipe. */
export const saveTeamPowers = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      classId: string;
      activityId: string;
      team: string;
      captainId: string | null;
      rank: number | null;
      powerIds: string[];
    }) =>
      scopeSchema
        .extend({
          team: z.enum(ULTIMATE_TEAM_CODES),
          captainId: z.string().uuid().nullable(),
          rank: z.number().int().min(1).max(20).nullable(),
          powerIds: z.array(z.string().uuid()).max(50),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sql = context.sql;
    await assertOwn(sql, context.userId, data.classId, data.activityId);

    if (data.captainId) {
      const ok = await sql<{ ok: number }[]>`
        select 1 as ok from student_ultimate_teams t
        join class_students cs on cs.student_id = t.student_id and cs.class_id = ${data.classId}
        where t.student_id = ${data.captainId} and t.activity_id = ${data.activityId}
          and t.team = ${data.team} and t.teacher_id = ${context.userId}
      `;
      if (!ok[0]) throw new Error("Le capitaine doit faire partie de l'équipe.");
    }

    const ids = [...new Set(data.powerIds)];
    const powers = ids.length
      ? await sql<{ id: string; cost: number }[]>`
          select id, cost from ultimate_powers
          where teacher_id = ${context.userId} and id = any(${ids}::uuid[])
        `
      : [];
    if (powers.length !== ids.length) throw new Error("Pouvoir introuvable.");
    const budgets = await loadBudgets(sql, context.userId);
    const budget = budgetFor(budgets, data.rank);
    const used = powers.reduce((sum, p) => sum + Number(p.cost), 0);
    if (used > budget) throw new Error(`Budget dépassé : ${used} / ${budget} points.`);

    await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`
        insert into ultimate_team_settings (teacher_id, class_id, activity_id, team, captain_student_id, rank)
        values (${context.userId}, ${data.classId}, ${data.activityId}, ${data.team},
                ${data.captainId}, ${data.rank})
        on conflict (class_id, activity_id, team) do update
          set captain_student_id = excluded.captain_student_id, rank = excluded.rank,
              updated_at = now()
        returning id
      `;
      const settingId = rows[0]!.id;
      await tx`delete from ultimate_team_powers where team_setting_id = ${settingId}`;
      for (const id of ids) {
        await tx`insert into ultimate_team_powers (team_setting_id, power_id) values (${settingId}, ${id})`;
      }
    });
    return { ok: true };
  });

export type MyTeamPowers = {
  team: string;
  rank: number | null;
  powers: UltimatePower[];
} | null;

/** Lecture seule, réservée au capitaine : pouvoirs attribués à son équipe. */
export const getMyTeamPowers = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<MyTeamPowers> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;
    const sql = context.sql;

    // Capitaine actuel ET toujours membre de l'équipe dans la classe.
    const settings = await sql<{ id: string; team: string; rank: number | null }[]>`
      select ts.id, ts.team, ts.rank from ultimate_team_settings ts
      join student_ultimate_teams t on t.student_id = ts.captain_student_id
        and t.activity_id = ts.activity_id and t.team = ts.team
      join class_students cs on cs.student_id = ts.captain_student_id and cs.class_id = ts.class_id
      where ts.captain_student_id = ${studentId}
      order by ts.updated_at desc limit 1
    `;
    const setting = settings[0];
    if (!setting) return null;
    const powers = (
      await sql<UltimatePower[]>`
        select p.id, p.name, p.icon, p.description, p.rule, p.cost, p.active
        from ultimate_team_powers tp join ultimate_powers p on p.id = tp.power_id
        where tp.team_setting_id = ${setting.id} and p.active
        order by p.name
      `
    ).map(normPower);
    return {
      team: setting.team,
      rank: setting.rank === null ? null : Number(setting.rank),
      powers,
    };
  });
