import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  topByColumn,
  dailyTopKByColumn,
  getAllowedCodesWithCounts,
  getTotalReportsCount,
} from '@/lib/queries';

export const revalidate = 30; // ISR

const schema = z.object({
  range: z.string().regex(/^\d+d$/).optional(), // 7d|30d|90d
  all: z.enum(['0', '1']).optional(),           // ?all=1 — игнорировать даты
});

// YYYY-MM-DD в UTC (чтобы совпадать с created_at::date)
function fmtUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = schema.safeParse({
      range: url.searchParams.get('range') ?? undefined,
      all:   url.searchParams.get('all')   ?? undefined,
    });

    const defaultDays = Number(process.env.DEFAULT_RANGE_DAYS ?? 30);

    const allTime = parsed.success ? parsed.data.all === '1' : false;
    const days = parsed.success && parsed.data.range
      ? Number(parsed.data.range.replace('d', ''))
      : defaultDays;

    // период в UTC (только если не allTime)
    const toDate = new Date(); // сегодня (UTC дата)
    const fromDate = new Date(Date.UTC(
      toDate.getUTCFullYear(),
      toDate.getUTCMonth(),
      toDate.getUTCDate(),
    ));
    fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));

    const from = fmtUTC(fromDate);
    const to   = fmtUTC(toDate);

    // --- Top lists (как было)
    const [bPartTop, dopvTop, typeTop, vvTop, resultTop] = await Promise.all([
      topByColumn('b_part_main', days, 10),
      topByColumn('dopv_main',   days, 10),
      topByColumn('type_choice', days, 10),
      topByColumn('vv_main',     days, 10),
      topByColumn('result_main', days, 10),
    ]);

    // --- Daily top-K (как было)
    const [bPartDaily, dopvDaily, typeDaily, vvDaily, resultDaily] = await Promise.all([
      dailyTopKByColumn('b_part_main', days, 5),
      dailyTopKByColumn('dopv_main',   days, 5),
      dailyTopKByColumn('type_choice', days, 5),
      dailyTopKByColumn('vv_main',     days, 5),
      dailyTopKByColumn('result_main', days, 5),
    ]);

    // --- Новое: коды доступа и общий счётчик за выбранный диапазон
    const [codes, totalReports] = await Promise.all([
      getAllowedCodesWithCounts(allTime ? undefined : from, allTime ? undefined : to, allTime),
      getTotalReportsCount({}, allTime ? null : from, allTime ? null : to, allTime),
    ]);

    return NextResponse.json({
      ok: true,
      days,
      allTime,
      period: allTime ? null : { from, to },
      totals: { reports: totalReports },
      codesByAccess: codes, // [{ id_code, cnt }]
      categories: {
        b_part_main: { top: bPartTop,  daily: bPartDaily  },
        dopv_main:   { top: dopvTop,   daily: dopvDaily   },
        type_choice: { top: typeTop,   daily: typeDaily   },
        vv_main:     { top: vvTop,     daily: vvDaily     },
        result_main: { top: resultTop, daily: resultDaily },
      },
    });
  } catch (e) {
    console.error('GET /api/stats error:', e);
    return NextResponse.json({ ok:false, error:'stats_failed' }, { status: 500 });
  }
}
