import { NextResponse } from 'next/server';
import { z } from 'zod';
import { topByColumn, dailyTopKByColumn } from '@/lib/queries';

export const revalidate = 30; // ISR

const schema = z.object({
  range: z.string().regex(/^\d+d$/).optional(), // 7d|30d|90d
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = schema.safeParse({ range: url.searchParams.get('range') ?? undefined });

    const defaultDays = Number(process.env.DEFAULT_RANGE_DAYS ?? 30);
    const days = parsed.success
      ? Number((parsed.data.range ?? '').replace('d','') || defaultDays)
      : defaultDays;

    const [
      bPartTop,  bPartDaily,
      dopvTop,   dopvDaily,
      typeTop,   typeDaily,
      vvTop,     vvDaily,
      resultTop, resultDaily,
    ] = await Promise.all([
      topByColumn('b_part_main', days, 8),    dailyTopKByColumn('b_part_main', days, 5),
      topByColumn('dopv_main',   days, 8),    dailyTopKByColumn('dopv_main',   days, 5),
      topByColumn('type_choice', days, 8),    dailyTopKByColumn('type_choice', days, 5),
      topByColumn('vv_main',     days, 8),    dailyTopKByColumn('vv_main',     days, 5),
      topByColumn('result_main', days, 8),    dailyTopKByColumn('result_main', days, 5),
    ]);

    return NextResponse.json({
      ok: true,
      days,
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
