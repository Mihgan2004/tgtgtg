export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
} from 'docx';

import {
  getFieldDistributionExtended,
  getTotalsCommon,
  targetExpr,
  resultExpr,
  bPartExpr as bPartExprFn,
  CREATED_DAY_EXPR,
  decodeBPart,
  type Indicator,
} from '@/lib/queries';

/* ===== общие типы/хелперы (1-в-1 как на странице) ===== */

type DistRow = { label: string; value?: number; count?: number; total?: number; reports?: number };
const toNum = (d: DistRow) => Number(d.value ?? d.count ?? d.total ?? d.reports ?? 0);

const TARGET_MAIN_LABELS: Record<string, string> = {
  '1': 'Категория 1','2': 'Категория 2','3': 'Категория 3','4': 'Категория 4',
  '5': 'Табак','6': 'Категория 6','7': 'Категория 7','8': 'Категория 8','9': 'Категория 9',
  '10': 'Категория 10','11': 'Категория 11','12': 'Категория 12',
};
const TARGET_HAS_SUB = new Set(['5','6','7','8','9']);
const TARGET_SUB_LABELS: Record<string, Record<string, string>> = {
  '5': { '1': 'Вэйп', '2': 'Сигареты', '3': 'Папироса', '4': 'Сигарилла' },
  '6': { '1': '6.1', '2': '6.2', '3': '6.3', '4': '6.4' },
  '7': { '1': '7.1', '2': '7.2', '3': '7.3', '4': '7.4' },
  '8': { '1': '8.1', '2': '8.2', '3': '8.3', '4': '8.4', '5': '8.5' },
  '9': { '1': '9.1', '2': '9.2', '3': '9.3', '4': '9.4' },
};

const RESULT_MAIN_LABELS: Record<string, string> = {
  '1': 'Категория R1','2': 'Категория R2','3': 'Категория R3',
  '4': 'Категория R4','5': 'Категория R5','6': 'Категория R6',
  '7': 'Категория R7','8': 'Категория R8','9': 'Категория R9',
};
const RESULT_HAS_SUB = new Set(['4','5','6']);
const RESULT_SUB_LABELS: Record<string, Record<string, string>> = {
  '4': { '1':'R4.1','2':'R4.2','3':'R4.3','4':'R4.4','5':'R4.5','6':'R4.6','7':'R4.7' },
  '5': { '1':'R5.1','2':'R5.2','3':'R5.3','4':'R5.4','5':'R5.5' },
  '6': { '1':'R6.1','2':'R6.2','3':'R6.3' },
};

function decodeTargetCombined(label: string) {
  const [main, sub] = (label || '').split('::');
  if (TARGET_HAS_SUB.has(main) && sub) return TARGET_SUB_LABELS[main]?.[sub] ?? sub;
  return TARGET_MAIN_LABELS[main] ?? main;
}
function decodeResultCombined(label: string) {
  const [main, sub] = (label || '').split('::');
  if (RESULT_HAS_SUB.has(main) && sub) return RESULT_SUB_LABELS[main]?.[sub] ?? sub;
  return RESULT_MAIN_LABELS[main] ?? main;
}

/* ===== B-часть (точно как в page.tsx) ===== */

const MAIN_ALIASES: Record<string, string> = {
  'Тротиловом шашка 400 гр': 'Тротиловая шашка 400 гр',
  'ТБГ-7В (головная часть)': 'ТБГ-7В',
};
const norm = (m: string) => MAIN_ALIASES[m] ?? m;
const KG_MAINS = new Set<string>(['Тротиловая шашка 400 гр', 'ТМ-62']);
const MAIN_DISPLAY_ORDER = [
  'ОФБЧ 2 кг','ОФБЧ 3 кг','ОФСП 2.5 кг','СЗ-6','ПВВ-7','Тротиловая шашка 400 гр',
  'КЗ-7','ПГ7-ВР','СЗ-3А','КЗ-6','ТБГ-7В','ТМ-62','Д-105',
];

type BMainTotals = Record<string, { units: number; kg: number }>;
function parseQty(text: string) {
  const s = (text || '').replace(',', '.').toLowerCase();
  const n = parseFloat(s.match(/[\d.]+/)?.[0] ?? '0');
  return { units: /шт/.test(s) ? n : 0, kg: /кг/.test(s) ? n : 0 };
}
function aggregateBPart(rows: DistRow[]): BMainTotals {
  const totals: BMainTotals = {};
  for (const r of rows) {
    const [rawMain, sub1, sub2] = (r.label || '').split('::');
    if (!rawMain) continue;
    const main = norm(rawMain);
    const cnt = toNum(r);

    let qty = '';
    if (main === 'ТМ-62' && sub1 && sub2) {
      qty = decodeBPart(rawMain, `${sub1}::${sub2}`);
    } else if (KG_MAINS.has(main) && sub1) {
      qty = decodeBPart(rawMain, sub1);
    } else if (sub1) {
      qty = decodeBPart(rawMain, sub1);
    } else {
      qty = '1 шт.';
    }

    const { units, kg } = parseQty(qty);
    const addUnits = KG_MAINS.has(main) ? 0 : (units || 1);
    const addKg = KG_MAINS.has(main) ? kg : 0;

    if (!totals[main]) totals[main] = { units: 0, kg: 0 };
    totals[main].units += addUnits * cnt;
    totals[main].kg += addKg * cnt;
  }
  return totals;
}

function sumByMain(rows: DistRow[], decodeLabel?: (main: string, sub?: string) => string) {
  const acc = new Map<string, number>();
  for (const r of rows) {
    const [main, sub] = (r.label || '').split('::');
    if (!main) continue;
    const key = (decodeLabel ? decodeLabel(main, sub) : main) || main;
    acc.set(key, (acc.get(key) || 0) + toNum(r));
  }
  return Array.from(acc.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'));
}

/* ===== API ===== */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      from?: string;
      to?: string;
      all?: 0 | 1;
      forAllUsers?: 0 | 1;
      code?: string;
      includeSteps?: string[]; // '1'..'11','T'
      format?: 'docx' | 'pdf';
    };

    const { from, to, all, forAllUsers, code } = body;
    const include = new Set(body.includeSteps && body.includeSteps.length ? body.includeSteps : ['1','2','3','4','5','6','7','8','9','10','11','T']);
    const format = body.format === 'pdf' ? 'pdf' : 'docx';

    const scope: Record<string, any> = !forAllUsers && code ? { id_code: code } : {};
    const step4TypeField = 'type_choice' as Indicator;

    // Все выборки — как на странице (те же выражения)
    const [
      targetCombined, bpartCombined, resultCombined, step4TypeData,
      totalsCommon,
      step1IdCode, step2Date, step3Number, step5Coords, step6Freq, dopvCombined, vvCombined,
    ] = await Promise.all([
      getFieldDistributionExtended(targetExpr(), scope, from, to, !!all, 200),
      getFieldDistributionExtended(bPartExprFn(), scope, from, to, !!all, 200),
      getFieldDistributionExtended(resultExpr(), scope, from, to, !!all, 200),
      getFieldDistributionExtended(step4TypeField, scope, from, to, !!all, 9999),
      getTotalsCommon(scope, from, to, !!all),

      getFieldDistributionExtended('id_code', scope, from, to, !!all, 9999),
      getFieldDistributionExtended(CREATED_DAY_EXPR, scope, from, to, !!all, 9999),
      getFieldDistributionExtended('number_n', scope, from, to, !!all, 9999),
      getFieldDistributionExtended('coords', scope, from, to, !!all, 9999),
      getFieldDistributionExtended('freq', scope, from, to, !!all, 9999),
      getFieldDistributionExtended("COALESCE(dopv_main,'') || '::' || COALESCE(dopv_sub,'')", scope, from, to, !!all, 9999),
      getFieldDistributionExtended("COALESCE(vv_main,'')   || '::' || COALESCE(vv_sub,'')",   scope, from, to, !!all, 9999),
    ]);

    // B-часть суммами — 1-в-1
    const byMain = aggregateBPart(bpartCombined as DistRow[]);

    const step7List = MAIN_DISPLAY_ORDER.map((m) => {
      const t = byMain[m] || { units: 0, kg: 0 };
      const value = KG_MAINS.has(m) ? t.kg : t.units;
      return { label: m, value };
    }).filter(x => x.value > 0);

    // Прочие секции
    const step1Items = (step1IdCode as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step2Items = (step2Date as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step3Items = (step3Number as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step4Items = (step4TypeData as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step5Items = (step5Coords as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step6Items = (step6Freq as DistRow[]).map(r => ({ label: String(r.label || '—'), value: toNum(r) }))
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label,'ru'));

    const step8Items = sumByMain(dopvCombined as DistRow[]);
    const step9Items = sumByMain(vvCombined as DistRow[]);
    const step10Items = sumByMain(targetCombined as DistRow[], (main, sub) => decodeTargetCombined(`${main}${sub ? `::${sub}` : ''}`));
    const step11Items = sumByMain(resultCombined as DistRow[], (main, sub) => decodeResultCombined(`${main}${sub ? `::${sub}` : ''}`));
    const totalsCommonPairs = Object.entries(totalsCommon).map(([k,v]) => ({ label: k, value: Number(v) || 0 }));

    // Подготовка «разделов» точно как в TotalsList
    const SECTIONS: { key: string; title: string; items: {label: string; value: number}[] }[] = [
      { key: '1',  title: 'Шаг 1 · Код доступа (id_code)', items: step1Items },
      { key: '2',  title: 'Шаг 2 · Дата (по created_at, день)', items: step2Items },
      { key: '3',  title: 'Шаг 3 · Номер (number_n)', items: step3Items },
      { key: '4',  title: 'Шаг 4 · Тип (type_choice)', items: step4Items },
      { key: '5',  title: 'Шаг 5 · Координаты', items: step5Items },
      { key: '6',  title: 'Шаг 6 · Частота (freq)', items: step6Items },
      { key: '7',  title: 'Шаг 7 · B-часть (суммирование подкатегорий)', items: step7List },
      { key: '8',  title: 'Шаг 8 · Доп.в (main+sub → main)', items: step8Items },
      { key: '9',  title: 'Шаг 9 · ВВ (main+sub → main)', items: step9Items },
      { key: '10', title: 'Шаг 10 · Target (main/sub → main)', items: step10Items },
      { key: '11', title: 'Шаг 11 · Result (main/sub → main)', items: step11Items },
      { key: 'T',  title: 'Итоги · служебные метрики', items: totalsCommonPairs },
    ].filter(sec => include.has(sec.key));

    /* ====== генерация ====== */
    if (format === 'pdf') {
      const pdf = new PDFDocument({ margin: 28 });
      const chunks: Buffer[] = [];
      pdf.on('data', (c: Buffer) => chunks.push(c));
      const done = new Promise<Buffer>((resolve) => pdf.on('end', () => resolve(Buffer.concat(chunks))));

      pdf.fontSize(16).text('Детальная сводка', { align: 'left' });
      pdf.moveDown(0.5);
      pdf.fontSize(10).text(`Период: ${from || '—'} … ${to || '—'} · ${forAllUsers ? 'По всем пользователям' : `Код: ${code || '—'}`}`);
      pdf.moveDown();

      SECTIONS.forEach((sec, idx) => {
        if (idx) pdf.addPage();
        pdf.fontSize(14).text(sec.title);
        pdf.moveDown(0.5);
        if (!sec.items.length) {
          pdf.fontSize(10).text('Нет данных');
        } else {
          // простая таблица: "позиция — шт"
          pdf.font('Helvetica-Bold').fontSize(10).text('Позиция | Шт');
          pdf.font('Helvetica').moveDown(0.3);
          sec.items.forEach((it) => {
            pdf.fontSize(9).text(`${it.label} | ${it.value}`);
          });
        }
      });

      pdf.end();
      const buf = await done;
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="detailed_${Date.now()}.pdf"`,
        },
      });
    }

    // DOCX
    const rowsAll: TableRow[] = [];
    // Заголовок документа + мета
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Детальная сводка', bold: true, size: 28 })] }),
          new Paragraph({ text: `Период: ${from || '—'} … ${to || '—'} · ${forAllUsers ? 'По всем пользователям' : `Код: ${code || '—'}`}` }),
          ...SECTIONS.flatMap(sec => {
            const head = new Paragraph({
              children: [new TextRun({ text: `\n${sec.title}`, bold: true, size: 24 })],
            });
            if (!sec.items.length) {
              return [head, new Paragraph({ text: 'Нет данных' })];
            }
            const tableRows: TableRow[] = [];
            const header = new TableRow({
              children: [
                new TableCell({ children: [ new Paragraph({ children:[new TextRun({ text: 'Позиция', bold: true })] }) ] }),
                new TableCell({ children: [ new Paragraph({ children:[new TextRun({ text: 'Шт', bold: true })] }) ] }),
              ],
            });
            tableRows.push(header);
            sec.items.forEach(it => {
              tableRows.push(new TableRow({
                children: [
                  new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [ new Paragraph(String(it.label)) ] }),
                  new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [ new Paragraph(String(it.value)) ] }),
                ],
              }));
            });
            return [
              head,
              new Table({ rows: tableRows }),
            ];
          }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="detailed_${Date.now()}.docx"`,
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
