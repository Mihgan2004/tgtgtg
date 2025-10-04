// src/lib/queries.ts
import 'server-only';
import { q } from './db';

/** 11 шагов (основные и их подкатегории) */
export const INDICATORS = [
  'b_part_main','b_part_sub1','b_part_sub2',
  'dopv_main','dopv_sub',
  'vv_main','vv_sub',
  'target_main','target_sub',
  'result_main','result_sub',
] as const;
export type Indicator = typeof INDICATORS[number];

export const INDICATOR_LABEL: Record<Indicator, string> = {
  b_part_main:  'B-часть (основная)',
  b_part_sub1:  'B-часть · подкатегория 1',
  b_part_sub2:  'B-часть · подкатегория 2',
  dopv_main:    'Доп.в (основная)',
  dopv_sub:     'Доп.в · подкатегория',
  vv_main:      'ВВ (основная)',
  vv_sub:       'ВВ · подкатегория',
  target_main:  'Цель (основная)',
  target_sub:   'Цель · подкатегория',
  result_main:  'Результат (основной)',
  result_sub:   'Результат · подкатегория',
};

/* соответствие «индикатор → колонка в reports» */
const FIELD_COL: Record<Indicator, string> = {
  b_part_main: 'b_part_main',
  b_part_sub1: 'b_part_sub1',
  b_part_sub2: 'b_part_sub2',
  dopv_main:   'dopv_main',
  dopv_sub:    'dopv_sub',
  vv_main:     'vv_main',
  vv_sub:      'vv_sub',
  target_main: 'target_main',
  target_sub:  'target_sub',
  result_main: 'result_main',
  result_sub:  'result_sub',
};

/* ===== Общие хелперы для WHERE ===== */

type Scope = { userId?: string | null; chatId?: string | null; idCode?: string | null };

function buildBoundsCTE() {
  return `
    bounds AS (
      SELECT
        CASE WHEN $5::bool THEN NULL ELSE $3::timestamptz END AS dt_from,
        CASE WHEN $5::bool THEN NULL ELSE $4::timestamptz END AS dt_to
    )`;
}

function buildFilteredR() {
  // $1 userId, $2 chatId, $3 from, $4 to, $5 allTime, $6 idCode
  return `
    R AS (
      SELECT r.*
      FROM reports r, bounds b
      WHERE ($1::bigint IS NULL OR r.user_id = $1)
        AND ($2::bigint IS NULL OR r.chat_id = $2)
        AND (b.dt_from IS NULL OR r.created_at >= b.dt_from)
        AND (b.dt_to   IS NULL OR r.created_at <  b.dt_to + INTERVAL '1 day')
        AND ($6::text  IS NULL OR r.id_code = $6)
    )`;
}

function packParams(scope: Scope, from?: string | null, to?: string | null, allTime = false): any[] {
  return [
    scope.userId ?? null,
    scope.chatId ?? null,
    from ?? null,
    to ?? null,
    !!allTime,
    scope.idCode ?? null,
  ];
}

/* ---------- A) Распределение (для донат-диаграмм) ---------- */

export type DistRow = { label: string; count: number; total: number };

export async function getFieldDistribution(
  field: Indicator,
  scope: Scope = {},
  from?: string | null,
  to?: string | null,
  allTime = false,
  limit = 6
): Promise<DistRow[]> {
  const col = FIELD_COL[field];

  const sql = `
    WITH
    ${buildBoundsCTE()},
    ${buildFilteredR()},
    base AS (
      SELECT ${col} AS label
      FROM R
      WHERE NULLIF(${col}, '') IS NOT NULL
    ),
    totals AS (SELECT COUNT(*)::int AS total FROM base),
    topn AS (
      SELECT label, COUNT(*)::int AS count, (SELECT total FROM totals) AS total
      FROM base
      GROUP BY label
      ORDER BY COUNT(*) DESC
      LIMIT $7
    )
    SELECT * FROM topn
  `;

  return q<DistRow>(sql, [...packParams(scope, from, to, allTime), limit]);
}

/* ---------- B) Общий отчёт цифрами по всем полям ---------- */

const TOTAL_KEYS = [
  'id_code','date_time','number_n','type_choice','coords','freq',
  'b_part_main','b_part_sub1','b_part_sub2',
  'dopv_main','dopv_sub',
  'vv_main','vv_sub',
  'target_main','target_sub',
  'result_main','result_sub',
] as const;

export async function getTotalsCommon(
  scope: Scope = {},
  from?: string | null,
  to?: string | null,
  allTime = false
): Promise<Record<string, number>> {
  const sql = `
    WITH
    ${buildBoundsCTE()},
    ${buildFilteredR()}
    SELECT
      COUNT(*) FILTER (WHERE NULLIF(id_code,     '') IS NOT NULL)::int AS id_code,
      COUNT(*) FILTER (WHERE NULLIF(date_time,   '') IS NOT NULL)::int AS date_time,
      COUNT(*) FILTER (WHERE NULLIF(number_n,    '') IS NOT NULL)::int AS number_n,
      COUNT(*) FILTER (WHERE NULLIF(type_choice, '') IS NOT NULL)::int AS type_choice,
      COUNT(*) FILTER (WHERE NULLIF(coords,      '') IS NOT NULL)::int AS coords,
      COUNT(*) FILTER (WHERE NULLIF(freq,        '') IS NOT NULL)::int AS freq,

      COUNT(*) FILTER (WHERE NULLIF(b_part_main, '') IS NOT NULL)::int AS b_part_main,
      COUNT(*) FILTER (WHERE NULLIF(b_part_sub1, '') IS NOT NULL)::int AS b_part_sub1,
      COUNT(*) FILTER (WHERE NULLIF(b_part_sub2, '') IS NOT NULL)::int AS b_part_sub2,

      COUNT(*) FILTER (WHERE NULLIF(dopv_main,   '') IS NOT NULL)::int AS dopv_main,
      COUNT(*) FILTER (WHERE NULLIF(dopv_sub,    '') IS NOT NULL)::int AS dopv_sub,

      COUNT(*) FILTER (WHERE NULLIF(vv_main,     '') IS NOT NULL)::int AS vv_main,
      COUNT(*) FILTER (WHERE NULLIF(vv_sub,      '') IS NOT NULL)::int AS vv_sub,

      COUNT(*) FILTER (WHERE NULLIF(target_main, '') IS NOT NULL)::int AS target_main,
      COUNT(*) FILTER (WHERE NULLIF(target_sub,  '') IS NOT NULL)::int AS target_sub,

      COUNT(*) FILTER (WHERE NULLIF(result_main, '') IS NOT NULL)::int AS result_main,
      COUNT(*) FILTER (WHERE NULLIF(result_sub,  '') IS NOT NULL)::int AS result_sub
    FROM R
  `;

  const rows = await q<Record<string, unknown>>(sql, packParams(scope, from, to, allTime));
  const r = rows[0] ?? {};
  const out: Record<string, number> = {};
  for (const k of TOTAL_KEYS) out[k] = Number((r as any)[k] ?? 0);
  return out;
}

/* ---------- C) Список кодов доступа с количеством отчётов ---------- */

export async function getAllowedCodesWithCounts(
  from?: string | null,
  to?: string | null,
  allTime = false,
  limit = 200
): Promise<{ id_code: string; reports: number }[]> {
  const sql = `
    WITH
    bounds AS (
      SELECT
        CASE WHEN $3::bool THEN NULL ELSE $1::timestamptz END AS dt_from,
        CASE WHEN $3::bool THEN NULL ELSE $2::timestamptz END AS dt_to
    ),
    R AS (
      SELECT r.*
      FROM reports r, bounds b
      WHERE NULLIF(r.id_code,'') IS NOT NULL
        AND (b.dt_from IS NULL OR r.created_at >= b.dt_from)
        AND (b.dt_to   IS NULL OR r.created_at <  b.dt_to + INTERVAL '1 day')
    )
    SELECT id_code, COUNT(*)::int AS reports
    FROM R
    GROUP BY id_code
    ORDER BY reports DESC, id_code ASC
    LIMIT $4
  `;
  return q<{ id_code: string; reports: number }>(sql, [from ?? null, to ?? null, !!allTime, limit]);
}

/* ---------- D) (опц.) последние 5 суток по индикаторам ---------- */

export type Point = { metric: Indicator; bucket: string; value: number };

export async function getLast5Indicators(
  scope: Scope = {},
  to?: string | null
): Promise<Point[]> {
  const rows = await q<Point>(`
    WITH
    anchor AS (SELECT COALESCE($3::timestamptz, NOW()) AS t_end),
    series AS (
      SELECT DATE_TRUNC('day', t_end) - (i || ' day')::interval AS bucket
      FROM anchor, GENERATE_SERIES(4, 0, -1) g(i)
      ORDER BY bucket
    )
    /* 1 */ SELECT 'b_part_main'::text AS metric, s.bucket::timestamptz, COALESCE(COUNT(r.id),0)::float
      FROM series s LEFT JOIN reports r
        ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.b_part_main,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 2 */ SELECT 'b_part_sub1', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.b_part_sub1,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 3 */ SELECT 'b_part_sub2', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.b_part_sub2,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 4 */ SELECT 'dopv_main', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.dopv_main,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 5 */ SELECT 'dopv_sub', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.dopv_sub,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 6 */ SELECT 'vv_main', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.vv_main,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 7 */ SELECT 'vv_sub', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.vv_sub,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 8 */ SELECT 'target_main', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.target_main,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 9 */ SELECT 'target_sub', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.target_sub,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 10 */ SELECT 'result_main', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.result_main,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    UNION ALL
    /* 11 */ SELECT 'result_sub', s.bucket, COALESCE(COUNT(r.id),0)::float FROM series s
      LEFT JOIN reports r ON DATE_TRUNC('day', r.created_at)=s.bucket
       AND NULLIF(r.result_sub,'') IS NOT NULL
       AND ($1::bigint IS NULL OR r.user_id=$1) AND ($2::bigint IS NULL OR r.chat_id=$2)
      GROUP BY s.bucket
    ORDER BY 1, 2
  `, [scope.userId ?? null, scope.chatId ?? null, to ?? null]);
  return rows;
}
