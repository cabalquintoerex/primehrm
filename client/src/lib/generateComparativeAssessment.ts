import jsPDF from 'jspdf';
import type { AssessmentGroup, PsbMember, Position } from '@/types';

/**
 * Comparative Assessment Form — landscape folio, laid out from the reference workbook.
 *
 * Each candidate occupies four rows, mirroring the source:
 *   1. identity                 (no., name, gender, eligibility)
 *   2. Equivalent Percentage Weight  = maxWeight x rating%
 *   3. Total:                        = group subtotal (multi-factor groups only)
 *   4. Equivalent Points Score       = subtotal x group points, plus TOTAL POINTS
 */

const PAGE_W = 936; // 13in landscape
const PAGE_H = 612; // 8.5in
const MARGIN = 24;
const CONTENT_W = PAGE_W - MARGIN * 2;

const W_NO = 22;
const W_NAME = 118;
const W_GENDER = 42;
const W_ELIG = 92;
const W_TOTAL = 54;
const W_REMARKS = 80;

const LABEL_BG: [number, number, number] = [234, 234, 234];
const HEAD_BG: [number, number, number] = [214, 214, 214];

export interface AssessmentCandidate {
  name: string;
  gender?: string;
  eligibility?: string;
  /** factorId -> rating percent */
  ratings: Record<string, number>;
  remarks?: string;
}

export interface ComparativeAssessmentData {
  lguName: string;
  position: Pick<Position, 'title' | 'itemNumber' | 'salaryGrade' | 'monthlySalary' | 'education' | 'training' | 'experience' | 'eligibility' | 'openDate'> & {
    departmentName?: string | null;
    level?: string | null;
  };
  groups: AssessmentGroup[];
  candidates: AssessmentCandidate[];
  psbMembers: PsbMember[];
  preparedBy: PsbMember[];
}

/**
 * Column count per group = its factors. The subtotal is NOT a column of its own — it prints on
 * the "Total" row as a single cell merged across the group's factor columns, as in the workbook
 * (H14 = SUM(G13:I13) sits under the EDUCATION/TRAINING/EXPERIENCE span).
 */
const groupColumns = (group: AssessmentGroup) => group.factors.length;

export function buildComparativeAssessmentDoc(data: ComparativeAssessmentData) {
  const doc = new jsPDF({ unit: 'pt', format: [PAGE_W, PAGE_H], orientation: 'landscape' });

  const leftW = W_NO + W_NAME + W_GENDER + W_ELIG;
  const rightW = W_TOTAL + W_REMARKS;
  const factorArea = CONTENT_W - leftW - rightW;
  const totalFactorCols = data.groups.reduce((sum, g) => sum + groupColumns(g), 0) || 1;
  const colW = factorArea / totalFactorCols;

  const cell = (
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    opts: {
      size?: number;
      style?: 'normal' | 'bold' | 'italic';
      align?: 'left' | 'center' | 'right';
      fill?: [number, number, number];
      valign?: 'top' | 'middle';
      /** Clip to this many lines (ellipsised) so long values can't spill past the border. */
      maxLines?: number;
    } = {}
  ) => {
    const { size = 6.5, style = 'normal', align = 'center', fill, valign = 'middle', maxLines } = opts;
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(x, y, w, h, 'F');
    }
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, h);
    if (!text) return;
    doc.setFont('helvetica', style).setFontSize(size);
    let lines = doc.splitTextToSize(String(text), w - 6) as string[];
    // Cap by the caller's limit and by what physically fits in the cell.
    const fitLines = Math.max(1, Math.floor((h - 2) / (size * 1.15)));
    const cap = Math.min(maxLines ?? fitLines, fitLines);
    if (lines.length > cap) {
      lines = lines.slice(0, cap);
      lines[cap - 1] = `${lines[cap - 1].replace(/[\s,;]+$/, '')}…`;
    }
    const lineH = size * 1.15;
    let ty = valign === 'middle' ? y + h / 2 - ((lines.length - 1) * lineH) / 2 + size * 0.35 : y + size + 2;
    lines.forEach((line) => {
      const tx = align === 'center' ? x + w / 2 : align === 'right' ? x + w - 3 : x + 3;
      doc.text(line, tx, ty, { align });
      ty += lineH;
    });
  };

  // Weights are fractions internally; the form shows them as percentages.
  // Computed values keep 2dp so the columns line up; max weights trim trailing zeros (35%, 100%).
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const pctTrim = (v: number) => `${Number((v * 100).toFixed(2))}%`;

  const fmtMoney = (v: unknown) =>
    v == null ? '' : `Php ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  let y = MARGIN;

  // ---- Title ----
  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('COMPARATIVE ASSESSMENT FORM', PAGE_W / 2, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(8);
  doc.text(data.lguName.toUpperCase(), PAGE_W / 2, y + 22, { align: 'center' });
  y += 34;

  // ---- Position header (two columns of label/value) ----
  const hLabelW = 96;
  const halfW = CONTENT_W / 2;
  const hValueW = halfW - hLabelW;
  const rowH = 13;

  const headerLeft: Array<[string, string]> = [
    ['Position & Salary Grade:', `${data.position.title}${data.position.salaryGrade ? ` [SG-${data.position.salaryGrade}]` : ''}`],
    ['Level:', data.position.level || ''],
    ['Education:', data.position.education || ''],
    ['Experience:', data.position.experience || ''],
    ['Training:', data.position.training || ''],
    ['Eligibility:', data.position.eligibility || ''],
  ];
  const headerRight: Array<[string, string]> = [
    ['Item No:', data.position.itemNumber || ''],
    ['Monthly Rate:', fmtMoney(data.position.monthlySalary)],
    ['Date of Publication:', fmtDate(data.position.openDate)],
    ['Office where vacancy exists:', data.position.departmentName || ''],
    ['', ''],
    ['', ''],
  ];

  headerLeft.forEach(([label, value], i) => {
    const ry = y + i * rowH;
    cell(MARGIN, ry, hLabelW, rowH, label, { align: 'left', style: 'bold', fill: LABEL_BG, size: 6.5 });
    cell(MARGIN + hLabelW, ry, hValueW, rowH, value, { align: 'left', size: 6.5 });
    const [rLabel, rValue] = headerRight[i];
    if (rLabel) {
      cell(MARGIN + halfW, ry, hLabelW, rowH, rLabel, { align: 'left', style: 'bold', fill: LABEL_BG, size: 6.5 });
      cell(MARGIN + halfW + hLabelW, ry, hValueW, rowH, rValue, { align: 'left', size: 6.5 });
    } else {
      cell(MARGIN + halfW, ry, halfW, rowH, '', {});
    }
  });
  y += headerLeft.length * rowH + 10;

  // ---- Table header ----
  const xNo = MARGIN;
  const xName = xNo + W_NO;
  const xGender = xName + W_NAME;
  const xElig = xGender + W_GENDER;
  const xFactors = xElig + W_ELIG;
  const xTotal = xFactors + factorArea;
  const xRemarks = xTotal + W_TOTAL;

  const hRow1 = 16;
  const hRow2 = 13;
  const hRow3 = 30;
  const hRow4 = 12;

  // Row 1 — spanning headers
  cell(xNo, y, W_NO + W_NAME, hRow1 + hRow2 + hRow3, 'CANDIDATE/S', { style: 'bold', fill: HEAD_BG, size: 7 });
  cell(xGender, y, W_GENDER, hRow1 + hRow2 + hRow3, 'GENDER', { style: 'bold', fill: HEAD_BG, size: 7 });
  cell(xElig, y, W_ELIG, hRow1 + hRow2 + hRow3, 'APPROPRIATE CIVIL SERVICE ELIGIBILITY', { style: 'bold', fill: HEAD_BG, size: 6.5 });
  cell(xFactors, y, factorArea, hRow1, 'FACTORS and assigned POINT WEIGHT', { style: 'bold', fill: HEAD_BG, size: 7 });
  cell(xTotal, y, W_TOTAL, hRow1 + hRow2 + hRow3 + hRow4, 'TOTAL POINTS', { style: 'bold', fill: HEAD_BG, size: 7 });
  cell(xRemarks, y, W_REMARKS, hRow1 + hRow2 + hRow3 + hRow4, 'REMARKS', { style: 'bold', fill: HEAD_BG, size: 7 });

  // Row 2 — group headers
  let gx = xFactors;
  data.groups.forEach((group) => {
    const w = groupColumns(group) * colW;
    const label = `${group.code}${group.label ? ` - ${group.label}` : ''} [${Number(group.points)}]`;
    cell(gx, y + hRow1, w, hRow2, label, { style: 'bold', fill: HEAD_BG, size: 6.5 });
    gx += w;
  });

  // Row 3 — factor labels
  gx = xFactors;
  data.groups.forEach((group) => {
    group.factors.forEach((factor) => {
      cell(gx, y + hRow1 + hRow2, colW, hRow3, factor.label, { style: 'bold', size: 6 });
      gx += colW;
    });
  });

  // Row 4 — maximum percentage weights
  const wy = y + hRow1 + hRow2 + hRow3;
  cell(xNo, wy, leftW, hRow4, 'Maximum Percentage Weight   -   -   >', { align: 'right', style: 'bold', size: 6.5, fill: LABEL_BG });
  gx = xFactors;
  data.groups.forEach((group) => {
    group.factors.forEach((factor) => {
      cell(gx, wy, colW, hRow4, pctTrim(Number(factor.maxWeight)), { size: 6.5, fill: LABEL_BG });
      gx += colW;
    });
  });
  y = wy + hRow4;

  // ---- Candidate blocks (4 rows each) ----
  const rIdent = 22;
  const rCalc = 12;

  data.candidates.forEach((candidate, index) => {
    const blockH = rIdent + rCalc * 3;

    // Page break — redraw nothing fancy, just start a fresh page
    if (y + blockH > PAGE_H - 150) {
      doc.addPage([PAGE_W, PAGE_H], 'landscape');
      y = MARGIN;
    }

    // Compute this candidate's figures
    const subtotals: number[] = [];
    const points: number[] = [];
    let total = 0;
    data.groups.forEach((group) => {
      let subtotal = 0;
      group.factors.forEach((factor) => {
        const rating = Number(candidate.ratings[String(factor.id)] ?? 0);
        subtotal += Number(factor.maxWeight) * (rating / 100);
      });
      const pts = subtotal * Number(group.points);
      subtotals.push(subtotal);
      points.push(pts);
      total += pts;
    });

    // Row 1 — identity
    cell(xNo, y, W_NO, rIdent, String(index + 1), { size: 6.5 });
    cell(xName, y, W_NAME, rIdent, candidate.name, { align: 'left', style: 'bold', size: 6.5, maxLines: 2 });
    cell(xGender, y, W_GENDER, rIdent, candidate.gender || '', { size: 6.5 });
    cell(xElig, y, W_ELIG, rIdent, candidate.eligibility || '', { size: 5.5, maxLines: 3 });
    gx = xFactors;
    data.groups.forEach((group) => {
      group.factors.forEach((factor) => {
        const rating = candidate.ratings[String(factor.id)];
        cell(gx, y, colW, rIdent, rating == null ? '' : `${Number(rating)}%`, { size: 6.5 });
        gx += colW;
      });
    });
    cell(xTotal, y, W_TOTAL, blockH, total.toFixed(2), { style: 'bold', size: 8 });
    cell(xRemarks, y, W_REMARKS, blockH, candidate.remarks || '', { align: 'left', size: 5.8 });

    // Row 2 — equivalent percentage weight
    let ry = y + rIdent;
    cell(xNo, ry, leftW, rCalc, 'Equivalent Percentage Weight   -   -   >', { align: 'right', style: 'bold', size: 6, fill: LABEL_BG });
    gx = xFactors;
    data.groups.forEach((group) => {
      group.factors.forEach((factor) => {
        const rating = Number(candidate.ratings[String(factor.id)] ?? 0);
        const equiv = Number(factor.maxWeight) * (rating / 100);
        cell(gx, ry, colW, rCalc, pct(equiv), { size: 6 });
        gx += colW;
      });
    });

    // Row 3 — group subtotal (only where the group has more than one factor)
    ry += rCalc;
    cell(xNo, ry, leftW, rCalc, 'Total   -   -   >', { align: 'right', style: 'bold', size: 6, fill: LABEL_BG });
    gx = xFactors;
    data.groups.forEach((group, gi) => {
      const w = group.factors.length * colW;
      // Multi-factor groups show their subtotal merged across the whole group; single-factor
      // groups have nothing to sum, so the cell stays blank.
      cell(gx, ry, w, rCalc, group.factors.length > 1 ? pct(subtotals[gi]) : '', {
        style: 'bold',
        size: 6,
        ...(group.factors.length > 1 ? { fill: LABEL_BG } : {}),
      });
      gx += w;
    });

    // Row 4 — equivalent points score
    ry += rCalc;
    cell(xNo, ry, leftW, rCalc, 'Equivalent Points Score   -   -   >', { align: 'right', style: 'bold', size: 6, fill: LABEL_BG });
    gx = xFactors;
    data.groups.forEach((group, gi) => {
      const cols = groupColumns(group);
      cell(gx, ry, cols * colW, rCalc, points[gi].toFixed(2), { style: 'bold', size: 6.5 });
      gx += cols * colW;
    });

    y += blockH;
  });

  // ---- Signature block ----
  y += 22;
  if (y > PAGE_H - 120) {
    doc.addPage([PAGE_W, PAGE_H], 'landscape');
    y = MARGIN;
  }

  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text('HRMPSB:', MARGIN, y);
  y += 26;

  const members = data.psbMembers;
  if (members.length) {
    const perRow = Math.min(3, members.length);
    const cellW = CONTENT_W / perRow;
    members.forEach((member, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const cx = MARGIN + col * cellW + cellW / 2;
      const cy = y + row * 46;
      doc.setFont('helvetica', 'bold').setFontSize(7.5);
      doc.text(member.name, cx, cy, { align: 'center' });
      doc.setDrawColor(0).setLineWidth(0.5);
      doc.line(cx - cellW / 2 + 20, cy + 3, cx + cellW / 2 - 20, cy + 3);
      doc.setFont('helvetica', 'normal').setFontSize(6.5);
      if (member.designation) doc.text(member.designation, cx, cy + 12, { align: 'center' });
      if (member.psbRole) doc.text(member.psbRole, cx, cy + 21, { align: 'center' });
    });
    y += Math.ceil(members.length / perRow) * 46;
  }

  // ---- Prepared by ----
  y += 14;
  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text('Prepared by:', MARGIN, y);
  y += 30;
  const preparer = data.preparedBy[0];
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.text(preparer?.name || '', MARGIN + 110, y, { align: 'center' });
  doc.setDrawColor(0).line(MARGIN + 20, y + 3, MARGIN + 200, y + 3);
  doc.setFont('helvetica', 'normal').setFontSize(6.5);
  doc.text(preparer?.designation || 'Position', MARGIN + 110, y + 12, { align: 'center' });

  return doc;
}

export function generateComparativeAssessment(data: ComparativeAssessmentData) {
  buildComparativeAssessmentDoc(data).save('Comparative-Assessment-Form.pdf');
}
