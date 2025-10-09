// src/lib/queries.ts
import { Pool } from 'pg';

/* ===================== INIT ===================== */

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('ENV DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // включи при необходимости
});

/* ===================== TYPES ===================== */

export type Indicator =
  | 'id_code'
  | 'number_n'
  | 'type_choice'
  | 'coords'
  | 'freq'
  | 'b_part_main'
  | 'b_part_sub1'
  | 'b_part_sub2'
  | 'dopv_main'
  | 'dopv_sub'
  | 'vv_main'
  | 'vv_sub'
  | 'target_main'
  | 'target_sub'
  | 'result_main'
  | 'result_sub'
  | 'date_time';

/* ===================== COMMON SQL CONSTS ===================== */

export const CREATED_AT_COL = 'r.created_at';
export const CREATED_DAY_EXPR =
  `to_char(${CREATED_AT_COL} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

export function targetExpr(): string {
  return `COALESCE(r.target_main,'') || '::' || COALESCE(r.target_sub,'')`;
}
export function resultExpr(): string {
  return `COALESCE(r.result_main,'') || '::' || COALESCE(r.result_sub,'')`;
}
export function bPartExpr(): string {
  return `COALESCE(r.b_part_main,'') || '::' || COALESCE(r.b_part_sub1,'') || '::' || COALESCE(r.b_part_sub2,'')`;
}

/* ===================== UTILS ===================== */

// ⚠️ экспортируем q и НЕ используем generic у c.query — так уходит TS-ошибка QueryResultRow
export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const c = await pool.connect();
  try {
    const r = await c.query(sql, params);
    return r.rows as T[];
  } finally {
    c.release();
  }
}

function isIsoDate(s?: string) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** WHERE + params для таблицы reports r */
function buildWhere(
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): { whereSql: string; params: any[] } {
  const where: string[] = [];
  const params: any[] = [];
  const push = (v: any) => {
    params.push(v);
    return params.length; // возвращаем индекс для $n
  };

  if (scope?.id_code) {
    const i = push(String(scope.id_code));
    where.push(`r.id_code = $${i}`);
  }

  if (!all) {
    if (isIsoDate(from) && isIsoDate(to)) {
      const i1 = push(from);
      const i2 = push(to);
      where.push(`${CREATED_AT_COL}::date BETWEEN $${i1}::date AND $${i2}::date`);
    } else if (isIsoDate(from)) {
      const i = push(from);
      where.push(`${CREATED_AT_COL}::date = $${i}::date`);
    } else if (isIsoDate(to)) {
      const i = push(to);
      where.push(`${CREATED_AT_COL}::date = $${i}::date`);
    }
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/* ===================== DISTRIBUTIONS ===================== */

export async function getFieldDistributionExtended(
  fieldExpr: string | Indicator,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
  limit: number = 100,
): Promise<Array<{ label: string; count: number }>> {
  const expr = typeof fieldExpr === 'string' ? fieldExpr : `r.${fieldExpr}`;
  const { whereSql, params } = buildWhere(scope, from, to, all);

  const sql = `
    SELECT ${expr} AS label, COUNT(*)::int AS count
    FROM reports r
    ${whereSql}
    GROUP BY ${expr}
    ORDER BY COUNT(*) DESC, ${expr} ASC
    LIMIT ${Math.max(1, limit)}
  `;
  return q(sql, params);
}

export async function getFieldDistribution(
  field: Indicator,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
  limit: number = 100,
) {
  return getFieldDistributionExtended(field, scope, from, to, all, limit);
}

/* ===================== TOTALS / USERS ===================== */

export async function getTotalReportsCount(
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): Promise<number> {
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const rows = await q<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM reports r ${whereSql}`,
    params,
  );
  return rows[0]?.total ?? 0;
}

/** id_code + username + count (учитывает фильтры) */
export async function getAllowedUsersWithCounts(
  from?: string,
  to?: string,
  all?: boolean,
): Promise<Array<{ user_id: string; username: string | null; count: number }>> {
  const { whereSql, params } = buildWhere(undefined, from, to, all);
  const sql = `
    SELECT
      r.id_code::text AS user_id,
      u.username::text AS username,
      COUNT(*)::int AS count
    FROM reports r
    LEFT JOIN tg_users u ON u.id = r.user_id
    ${whereSql}
    GROUP BY r.id_code, u.username
    ORDER BY COUNT(*) DESC, r.id_code ASC
  `;
  return q(sql, params);
}

/** только id_code + count */
export async function getAllowedCodesWithCounts(
  from?: string,
  to?: string,
  all?: boolean,
): Promise<Array<{ id_code: string; count: number }>> {
  const { whereSql, params } = buildWhere(undefined, from, to, all);
  const sql = `
    SELECT r.id_code::text AS id_code, COUNT(*)::int AS count
    FROM reports r
    ${whereSql}
    GROUP BY r.id_code
    ORDER BY COUNT(*) DESC, r.id_code ASC
  `;
  return q(sql, params);
}

/** общий тотал (оставляем для совместимости; UI-блок «служебные метрики» вы выключили) */
export async function getTotalsCommon(
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): Promise<Array<{ label: string; value: number }>> {
  const total = await getTotalReportsCount(scope, from, to, all);
  return [
    { label: 'Количество отчётов (равно количеству заполнений)', value: total },
  ];
}

/* ===================== TIMELINE / TOPN ===================== */

export async function getDailyTimeline(
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): Promise<Array<{ day: string; count: number }>> {
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const sql = `
    SELECT ${CREATED_DAY_EXPR} AS day, COUNT(*)::int AS count
    FROM reports r
    ${whereSql}
    GROUP BY ${CREATED_DAY_EXPR}
    ORDER BY ${CREATED_DAY_EXPR} ASC
  `;
  return q(sql, params);
}

export async function getFieldTopN(
  field: Indicator,
  n: number,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
) {
  return getFieldDistributionExtended(field, scope, from, to, all, n);
}

/* ===================== DETAILED / PAGED (для export-detailed и таблиц) ===================== */

export interface ReportRow {
  id: number;
  user_id: string | null;
  id_code: string;
  username: string | null;
  chat_id: string | null;
  date_time: string | null;
  number_n: string | null;
  type_choice: string | null;
  coords: string | null;
  freq: string | null;
  b_part_main: string | null;
  b_part_sub1: string | null;
  b_part_sub2: string | null;
  dopv_main: string | null;
  dopv_sub: string | null;
  vv_main: string | null;
  vv_sub: string | null;
  target_main: string | null;
  target_sub: string | null;
  result_main: string | null;
  result_sub: string | null;
  meta: any | null;
  created_at: string; // ISO
}

export async function getReportsPaged(
  page: number,
  pageSize: number,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
  order: 'asc' | 'desc' = 'desc',
): Promise<{ rows: ReportRow[]; total: number }> {
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const limit = Math.max(1, Math.min(1000, pageSize));
  const offset = Math.max(0, (Math.max(1, page) - 1) * limit);

  const dataSql = `
    SELECT
      r.id,
      r.user_id::text,
      r.id_code,
      u.username,
      r.chat_id::text,
      r.date_time,
      r.number_n,
      r.type_choice,
      r.coords,
      r.freq,
      r.b_part_main,
      r.b_part_sub1,
      r.b_part_sub2,
      r.dopv_main,
      r.dopv_sub,
      r.vv_main,
      r.vv_sub,
      r.target_main,
      r.target_sub,
      r.result_main,
      r.result_sub,
      r.meta,
      (r.created_at AT TIME ZONE 'UTC')::timestamptz AS created_at
    FROM reports r
    LEFT JOIN tg_users u ON u.id = r.user_id
    ${whereSql}
    ORDER BY ${CREATED_AT_COL} ${order.toUpperCase()}
    LIMIT ${limit} OFFSET ${offset}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM reports r ${whereSql}`;
  const [rows, totalArr] = await Promise.all([
    q<ReportRow>(dataSql, params),
    q<{ total: number }>(countSql, params),
  ]);
  return { rows, total: totalArr[0]?.total ?? 0 };
}

/* ===================== DECODE HELPERS (B-PART) ===================== */

const KG_MAINS = new Set<string>(['Тротиловая шашка 400 гр', 'ТМ-62']);

/**
 * Преобразует путь подкатегорий В-части в «человеческое» значение.
 * Весовые позиции → «X кг», прочие → «1 шт.».
 */
export function decodeBPart(main: string, subPath?: string): string {
  const m = (main || '').trim();
  const s = (subPath || '').trim();

  if (KG_MAINS.has(m)) {
    const num = s.match(/[\d.,]+/)?.[0];
    if (num) return `${num.replace(',', '.')} кг`;
    return '1 кг';
  }
  return '1 шт.';
}

/* ===================== MISC ===================== */

export async function getDistinctValues(field: Indicator): Promise<string[]> {
  const sql = `SELECT DISTINCT ${'r.' + field} AS v FROM reports r WHERE r.${field} IS NOT NULL ORDER BY 1`;
  const rows = await q<{ v: string }>(sql);
  return rows.map(r => String(r.v));
}
