import 'server-only';
import { q } from "./db";

/** Разрешённые 10 пользователей (их id в БД) */
export const ALLOWED_USER_IDS = [
  "260600", "557321", "194475", "156426", "197178",
  "371520", "700031", "521102", "51416484", "381481",
] as const;

/** 11 шагов (основные и их подкатегории) */
export const INDICATORS = [
  "b_part_main","b_part_sub1","b_part_sub2",
  "dopv_main","dopv_sub",
  "vv_main","vv_sub",
  "target_main","target_sub",
  "result_main","result_sub",
] as const;
export type Indicator = typeof INDICATORS[number];

export const INDICATOR_LABEL: Record<Indicator, string> = {
  b_part_main:  "B-часть (основная)",
  b_part_sub1:  "B-часть · подкатегория 1",
  b_part_sub2:  "B-часть · подкатегория 2",
  dopv_main:    "Доп.в (основная)",
  dopv_sub:     "Доп.в · подкатегория",
  vv_main:      "ВВ (основная)",
  vv_sub:       "ВВ · подкатегория",
  target_main:  "Цель (основная)",
  target_sub:   "Цель · подкатегория",
  result_main:  "Результат (основной)",
  result_sub:   "Результат · подкатегория",
};

/* соответствие «индикатор → колонка в reports» */
const FIELD_COL: Record<Indicator, string> = {
  b_part_main: "b_part_main",
  b_part_sub1: "b_part_sub1",
  b_part_sub2: "b_part_sub2",
  dopv_main:   "dopv_main",
  dopv_sub:    "dopv_sub",
  vv_main:     "vv_main",
  vv_sub:      "vv_sub",
  target_main: "target_main",
  target_sub:  "target_sub",
  result_main: "result_main",
  result_sub:  "result_sub",
};

/* ---------- A) Распределение (для донат-диаграмм) ---------- */

export type DistRow = { label: string; count: number; total: number };

/** Топ-N категорий + total для поля `field` (фильтры: пользователь/чат, период, «за всё время»). */
export async function getFieldDistribution(
  field: Indicator,
  scope: { userId?: string|null; chatId?: string|null } = {},
  from?: string|null,
  to?: string|null,
  allTime = false,
  limit = 6
): Promise<DistRow[]> {
  const col = FIELD_COL[field];
  const userId = scope.userId ?? null;
  const chatId = scope.chatId ?? null;

  const sql = `
    with bounds as (
      select
        case when $5::bool then null else $3::timestamptz end as dt_from,
        case when $5::bool then null else $4::timestamptz end as dt_to
    ),
    R as (
      select *
      from reports r, bounds b
      where ($1::bigint is null or r.user_id=$1)
        and ($2::bigint is null or r.chat_id=$2)
        and (b.dt_from is null or r.created_at >= b.dt_from)
        and (b.dt_to   is null or r.created_at <  b.dt_to + interval '1 day')
    ),
    base as (
      select ${col} as label
      from R
      where nullif(${col},'') is not null
    ),
    totals as ( select count(*)::int as total from base ),
    topn as (
      select label, count(*)::int as count, (select total from totals) as total
      from base
      group by label
      order by count(*) desc
      limit $6
    )
    select * from topn
  `;
  return await q<DistRow>(sql, [userId, chatId, from ?? null, to ?? null, allTime, limit]);
}

/* ---------- B) Общий отчёт цифрами по всем полям ---------- */

export async function getTotalsCommon(
  scope: { userId?: string|null; chatId?: string|null } = {},
  from?: string|null,
  to?: string|null,
  allTime = false
): Promise<Record<string, number>> {
  const userId = scope.userId ?? null;
  const chatId = scope.chatId ?? null;

  const rows = await q<{ metric: string; value: number }>(`
    with bounds as (
      select
        case when $5::bool then null else $3::timestamptz end as dt_from,
        case when $5::bool then null else $4::timestamptz end as dt_to
    ),
    R as (
      select *
      from reports r, bounds b
      where ($1::bigint is null or r.user_id=$1)
        and ($2::bigint is null or r.chat_id=$2)
        and (b.dt_from is null or r.created_at >= b.dt_from)
        and (b.dt_to   is null or r.created_at <  b.dt_to + interval '1 day')
    )
    -- заполненность каждого поля
    select 'id_code' as metric, count(*)::float from R where nullif(id_code,'') is not null
    union all select 'date_time',       count(*)::float from R where nullif(date_time,'')    is not null
    union all select 'number_n',        count(*)::float from R where nullif(number_n,'')     is not null
    union all select 'type_choice',     count(*)::float from R where nullif(type_choice,'')  is not null
    union all select 'coords',          count(*)::float from R where nullif(coords,'')       is not null
    union all select 'freq',            count(*)::float from R where nullif(freq,'')         is not null
    union all select 'b_part_main',     count(*)::float from R where nullif(b_part_main,'')  is not null
    union all select 'b_part_sub1',     count(*)::float from R where nullif(b_part_sub1,'')  is not null
    union all select 'b_part_sub2',     count(*)::float from R where nullif(b_part_sub2,'')  is not null
    union all select 'dopv_main',       count(*)::float from R where nullif(dopv_main,'')    is not null
    union all select 'dopv_sub',        count(*)::float from R where nullif(dopv_sub,'')     is not null
    union all select 'vv_main',         count(*)::float from R where nullif(vv_main,'')      is not null
    union all select 'vv_sub',          count(*)::float from R where nullif(vv_sub,'')       is not null
    union all select 'target_main',     count(*)::float from R where nullif(target_main,'')  is not null
    union all select 'target_sub',      count(*)::float from R where nullif(target_sub,'')   is not null
    union all select 'result_main',     count(*)::float from R where nullif(result_main,'')  is not null
    union all select 'result_sub',      count(*)::float from R where nullif(result_sub,'')   is not null
  `, [userId, chatId, from ?? null, to ?? null, allTime]);

  const out: Record<string, number> = {};
  for (const r of rows) out[r.metric] = r.value;
  return out;
}

/* ---------- C) Ровно 10 разрешённых пользователей (по количеству отчётов) ---------- */

// src/lib/queries.ts
export async function getAllowedUsersWithCounts(
  from?: string | null,
  to?: string | null,
  allTime = false
): Promise<{ user_id: string; username: string | null; reports: number }[]> {
  const rows = await q<{ user_id: string; username: string | null; reports: number }>(`
    with bounds as (
      select
        case when $3::bool then null else $1::timestamptz end as dt_from,
        case when $3::bool then null else $2::timestamptz end as dt_to
    ),
    R as (
      select *
      from reports r, bounds b
      where r.user_id = any($4::bigint[])
        and (b.dt_from is null or r.created_at >= b.dt_from)
        and (b.dt_to   is null or r.created_at <  b.dt_to + interval '1 day')
    ),
    agg as (
      select r.user_id::bigint as uid, count(*)::int as reports
      from R r
      group by 1
    )
    select 
      a.uid::text as user_id,
      (select username from tg_users u where u.id = a.uid) as username,
      coalesce(agg.reports, 0) as reports
    from (select unnest($4::bigint[]) as uid) a
    left join agg on agg.uid = a.uid
    order by coalesce(agg.reports, 0) desc, a.uid asc
  `, [from ?? null, to ?? null, allTime, ALLOWED_USER_IDS.map(Number)]);

  return rows;
}


/* ---------- D) (опционально) Последние 5 суток (для обратной совместимости) ---------- */

export type Point = { metric: Indicator; bucket: string; value: number };

export async function getLast5Indicators(
  scope: { userId?: string|null; chatId?: string|null } = {},
  to?: string|null
): Promise<Point[]> {
  const userId = scope.userId ?? null;
  const chatId = scope.chatId ?? null;

  const rows = await q<Point>(`
    with anchor as (select coalesce($3::timestamptz, now()) as t_end),
    series as (
      select date_trunc('day', t_end) - (i||' day')::interval as bucket
      from anchor, generate_series(4, 0, -1) g(i)
      order by bucket
    )
    /* считаем «сколько заполнено» для каждого поля в день */
    /* 1 */ select 'b_part_main'::text as metric, s.bucket::timestamptz, coalesce(count(r.id),0)::float
      from series s left join reports r
        on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.b_part_main,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 2 */ select 'b_part_sub1', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.b_part_sub1,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 3 */ select 'b_part_sub2', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.b_part_sub2,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 4 */ select 'dopv_main', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.dopv_main,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 5 */ select 'dopv_sub', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.dopv_sub,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 6 */ select 'vv_main', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.vv_main,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 7 */ select 'vv_sub', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.vv_sub,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 8 */ select 'target_main', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.target_main,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 9 */ select 'target_sub', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.target_sub,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 10 */ select 'result_main', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.result_main,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    union all
    /* 11 */ select 'result_sub', s.bucket, coalesce(count(r.id),0)::float from series s
      left join reports r on date_trunc('day', r.created_at)=s.bucket
       and nullif(r.result_sub,'') is not null
       and ($1::bigint is null or r.user_id=$1) and ($2::bigint is null or r.chat_id=$2)
      group by s.bucket
    order by 1 asc, 2 asc
  `, [userId, chatId, to ?? null]);

  return rows;
}
