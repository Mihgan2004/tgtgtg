// src/lib/queries.ts — single source of truth (clean)
import { Pool } from 'pg';

/* ===================== INIT ===================== */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('ENV DATABASE_URL is required');

export const pool = new Pool({ connectionString: DATABASE_URL });

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
export const CREATED_AT_COL = 'r.created_at'; // есть в schema.sql
export const CREATED_DAY_EXPR = `to_char(${CREATED_AT_COL} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

export function targetExpr(): string {
  return `COALESCE(r.target_main,'') || '::' || COALESCE(r.target_sub,'')`;
}
export function resultExpr(): string {
  return `COALESCE(r.result_main,'') || '::' || COALESCE(r.result_sub,'')`;
}
export function bPartExpr(): string {
  return `COALESCE(r.b_part_main,'') || '::' || COALESCE(r.b_part_sub1,'') || '::' || COALESCE(r.b_part_sub2,'')`;
}

/* ===================== DB UTILS ===================== */
async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const c = await pool.connect();
  try {
    const r = await c.query(sql, params);
    return r.rows as T[];
  } finally {
    c.release();
  }
}

function isIsoDate(s?: string) { return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s); }

/** WHERE + params для таблицы reports r */
function buildWhere(
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): { whereSql: string; params: any[] } {
  const where: string[] = [];
  const params: any[] = [];
  const add = (v: any) => { params.push(v); return params.length; };

  if (scope?.id_code) { const i = add(String(scope.id_code)); where.push(`r.id_code = $${i}`); }
  if (scope?.user_id) { const i = add(String(scope.user_id)); where.push(`r.user_id = $${i}`); }

  if (!all) {
    if (isIsoDate(from) && isIsoDate(to)) {
      const i1 = add(from); const i2 = add(to);
      where.push(`${CREATED_AT_COL}::date BETWEEN $${i1}::date AND $${i2}::date`);
    } else if (isIsoDate(from)) {
      const i = add(from); where.push(`${CREATED_AT_COL}::date = $${i}::date`);
    } else if (isIsoDate(to)) {
      const i = add(to); where.push(`${CREATED_AT_COL}::date = $${i}::date`);
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
  topN?: number,
) {
  const field = typeof fieldExpr === 'string' ? fieldExpr : `r.${fieldExpr}`;
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const limitClause = topN && Number.isFinite(topN) ? `LIMIT $${params.length + 1}` : '';
  const sql = `
    SELECT ${field} AS label, COUNT(*)::int AS count
    FROM reports r
    ${whereSql}
    GROUP BY 1
    ORDER BY count DESC NULLS LAST
    ${limitClause}
  `;
  const finalParams = topN && Number.isFinite(topN) ? [...params, topN] : params;
  return q<{ label: string | null; count: number }>(sql, finalParams);
}

export async function getFieldDistribution(
  field: Indicator,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
) {
  return getFieldDistributionExtended(`r.${field}`, scope, from, to, all);
}

/** top-N для индикатора (удобный враппер) */
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

/* ===================== DETAILED / PAGED ===================== */
export interface ReportRow {
  id: number;
  date_time: string | null;
  id_code: string | null;
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
}

export async function getReportsPaged(
  scope: Record<string, any> = {},
  page = 1,
  pageSize = 20,
  from?: string,
  to?: string,
  all?: boolean,
): Promise<{ rows: ReportRow[]; total: number }> {
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT r.id, to_char(${CREATED_AT_COL}, 'YYYY-MM-DD HH24:MI:SS') AS date_time,
           r.id_code, r.number_n, r.type_choice, r.coords, r.freq,
           r.b_part_main, r.b_part_sub1, r.b_part_sub2,
           r.dopv_main, r.dopv_sub,
           r.vv_main, r.vv_sub,
           r.target_main, r.target_sub,
           r.result_main, r.result_sub
    FROM reports r
    ${whereSql}
    ORDER BY ${CREATED_AT_COL} DESC NULLS LAST, r.id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const countSql = `SELECT COUNT(*)::int AS total FROM reports r ${whereSql}`;

  const [rows, totalArr] = await Promise.all([
    q<ReportRow>(dataSql, [...params, pageSize, offset]),
    q<{ total: number }>(countSql, params),
  ]);
  return { rows, total: totalArr[0]?.total ?? 0 };
}

/* ===================== DECODE HELPERS (B-PART) ===================== */
const KG_MAINS = new Set<string>(['Тротиловая шашка 400 гр', 'ТМ-62']);

/** Весовые позиции → «X кг», прочие → «1 шт.» */
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
export async function getDistinctValues(field: Indicator, scope?: Record<string, any>) {
  const { whereSql, params } = buildWhere(scope);
  const sql = `SELECT DISTINCT r.${field} AS value FROM reports r ${whereSql} ORDER BY 1`;
  return q<{ value: string | null }>(sql, params);
}

export async function getDailyTimeline(
  field: Indicator,
  scope?: Record<string, any>,
  from?: string,
  to?: string,
  all?: boolean,
): Promise<{ day: string; count: number }[]> {
  const { whereSql, params } = buildWhere(scope, from, to, all);
  const sql = `
    SELECT ${CREATED_DAY_EXPR} AS day, COUNT(r.${field})::int AS count
    FROM reports r
    ${whereSql}
    GROUP BY 1
    ORDER BY 1
  `;
  return q(sql, params);
}

/* ===================== TOTALS ===================== */
export async function getTotalReportsCount(
  scope: Record<string, any> = {},
  from?: string | null,
  to?: string | null,
  allTime = false,
): Promise<number> {
  const { whereSql, params } = buildWhere(scope, from ?? undefined, to ?? undefined, allTime);
  const rows = await q<{ total: number }>(`SELECT COUNT(*)::int AS total FROM reports r ${whereSql}`, params);
  return rows[0]?.total ?? 0;
}

/** id_code + username + count (учитывает фильтры) */
export async function getAllowedUsersWithCounts(
  from?: string | null,
  to?: string | null,
  allTime = false
): Promise<{ id_code: string; username: string | null; cnt: number }[]> {
  const { whereSql, params } = buildWhere(undefined, from ?? undefined, to ?? undefined, allTime);
  const sql = `
    SELECT
      r.id_code,
      MAX(u.username) AS username,
      COUNT(*)::int AS cnt
    FROM reports r
    LEFT JOIN tg_users u ON u.id = r.user_id
    ${whereSql}
    GROUP BY r.id_code
    HAVING r.id_code IS NOT NULL
    ORDER BY cnt DESC, r.id_code
  `;
  return q(sql, params);
}

export async function getTotalsCommon(
  scope: Record<string, any> = {},
  from?: string,
  to?: string,
  all?: boolean,
) {
  const [byType, byBMain, byVVMain, byTarget, byResult] = await Promise.all([
    getFieldDistribution('type_choice', scope, from, to, all),
    getFieldDistribution('b_part_main', scope, from, to, all),
    getFieldDistribution('vv_main', scope, from, to, all),
    getFieldDistributionExtended(targetExpr(), scope, from, to, all),
    getFieldDistributionExtended(resultExpr(), scope, from, to, all),
  ]);
  return { byType, byBMain, byVVMain, byTarget, byResult };
}

export async function getAllowedCodesWithCounts(
  from?: string,
  to?: string,
  all?: boolean,
): Promise<{ id_code: string; cnt: number }[]> {
  const { whereSql, params } = buildWhere(undefined, from, to, all);
  const sql = `
    SELECT r.id_code AS id_code, COUNT(*)::int AS cnt
    FROM reports r
    ${whereSql}
    GROUP BY r.id_code
    HAVING r.id_code IS NOT NULL
    ORDER BY cnt DESC NULLS LAST, r.id_code
  `;
  return q(sql, params);
}

/* ===================== AGG HELPERS FOR /api/stats ===================== */
const INDICATOR_COLUMNS: Indicator[] = [
  'id_code','number_n','type_choice','coords','freq',
  'b_part_main','b_part_sub1','b_part_sub2',
  'dopv_main','dopv_sub','vv_main','vv_sub',
  'target_main','target_sub','result_main','result_sub','date_time'
];

/** Top-K by column for the last N days (inclusive). */
export async function topByColumn(
  column: Indicator,
  days: number,
  k: number = 10
): Promise<{ label: string | null; count: number }[]> {
  if (!INDICATOR_COLUMNS.includes(column)) throw new Error('Unsupported column: ' + column);
  const sql = `
    SELECT r.${column} AS label, COUNT(*)::int AS count
    FROM reports r
    WHERE ${CREATED_AT_COL} >= NOW() - ($1::text || ' days')::interval
    GROUP BY 1
    ORDER BY count DESC NULLS LAST
    LIMIT $2
  `;
  return q(sql, [days, k]);
}

/** Per-day Top-K by column for the last N days (inclusive). */
export async function dailyTopKByColumn(
  column: Indicator,
  days: number,
  k: number = 5
): Promise<{ day: string; top: { label: string | null; count: number }[] | null }[]> {
  if (!INDICATOR_COLUMNS.includes(column)) throw new Error('Unsupported column: ' + column);
  const sql = `
    WITH dates AS (
      SELECT generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS d
    ),
    counts AS (
      SELECT DATE(${CREATED_AT_COL})::date AS d, r.${column} AS label, COUNT(*)::int AS count
      FROM reports r
      WHERE ${CREATED_AT_COL} >= NOW() - ($1::text || ' days')::interval
      GROUP BY 1,2
    ),
    ranked AS (
      SELECT c.*, ROW_NUMBER() OVER (PARTITION BY d ORDER BY count DESC NULLS LAST) AS rk
      FROM counts c
    )
    SELECT d::text AS day,
           CASE WHEN COUNT(r.label) FILTER (WHERE r.rk <= $2) = 0 THEN NULL
                ELSE JSON_AGG(JSON_BUILD_OBJECT('label', r.label, 'count', r.count) ORDER BY r.count DESC)
           END AS top
    FROM dates
    LEFT JOIN ranked r USING (d)
    GROUP BY d
    ORDER BY d;
  `;
  return q(sql, [days, k]);
}
