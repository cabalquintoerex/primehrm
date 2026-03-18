import jsPDF from 'jspdf';
import type { PDSData } from '@/types';

// === PAGE DIMENSIONS (8.5 x 13 inches folio) ===
const PW = 612; // 8.5 * 72
const PH = 936; // 13 * 72
const ML = 20;  // left margin
const MR = 20;  // right margin
const MT = 15;  // top margin

const CW = PW - ML - MR; // 572pt content width

// === COLUMN X-POSITIONS ===
const X0 = ML;            // 20  - left edge
const X1 = ML + 92;       // 112 - end of left labels
const XCB = ML + 160;     // 180 - checkbox column split
const X3 = ML + 215;      // 235 - middle divider
const X4 = ML + 307;      // 327 - end of right labels (16. CITIZENSHIP label end)
const X5 = ML + 462;      // 482 - address sub-field split
const X6 = PW - MR;       // 592 - right edge

// === STANDARD ROW HEIGHT ===
const RH = 17;

// === FONT SIZES ===
const FS_LABEL = 5.5;
const FS_VALUE = 7;
const FS_SECTION = 7.5;
const FS_ADDR_SUBLABEL = 5;

// === COLORS ===
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const SECTION_BG: [number, number, number] = [150, 150, 150]; // #969696
const LABEL_BG: [number, number, number] = [234, 234, 234];   // #eaeaea

// === HELPERS ===

function v(val: string | undefined | null, fallback = ''): string {
  return val || fallback;
}

/** Format a date string to dd/mm/yyyy. Handles ISO (yyyy-mm-dd), mm/dd/yyyy, and passthrough. */
function fmtDate(val: string | undefined | null): string {
  if (!val) return '';
  // Try ISO format (yyyy-mm-dd or yyyy-mm-ddT...)
  const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  // Try mm/dd/yyyy
  const mdy = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdy) return `${mdy[2]}/${mdy[1]}/${mdy[3]}`;
  // Already dd/mm/yyyy or unknown — return as-is
  return val;
}

/** Draw a bordered cell, optionally filled */
function drawCell(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  opts?: {
    fill?: [number, number, number];
    noBorder?: boolean;
  }
) {
  if (opts?.fill) {
    doc.setFillColor(...opts.fill);
    doc.rect(x, y, w, h, 'F');
  }
  if (!opts?.noBorder) {
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.5);
    doc.rect(x, y, w, h, 'S');
  }
}

/** Place a small label (top-left of cell, or vertically centered if h is given) */
function putLabel(
  doc: jsPDF,
  text: string,
  x: number, y: number,
  opts?: { size?: number; style?: string; color?: [number, number, number]; indent?: number; h?: number }
) {
  const fs = opts?.size || FS_LABEL;
  doc.setFont('helvetica', opts?.style || 'normal');
  doc.setFontSize(fs);
  doc.setTextColor(...(opts?.color || BLACK));
  const ty = opts?.h ? y + opts.h / 2 + fs / 3 : y + fs + 1;
  doc.text(text, x + (opts?.indent ?? 2), ty);
}

/** Place a value (vertically centered in cell) */
function putValue(
  doc: jsPDF,
  text: string,
  x: number, y: number, h: number,
  opts?: { size?: number; style?: string; indent?: number; align?: 'left' | 'center' | 'right'; maxWidth?: number }
) {
  const fs = opts?.size || FS_VALUE;
  doc.setFont('helvetica', opts?.style || 'normal');
  doc.setFontSize(fs);
  doc.setTextColor(...BLACK);
  const ty = y + h / 2 + fs / 3;
  const tx = x + (opts?.indent ?? 3);
  if (opts?.maxWidth) {
    const lines = doc.splitTextToSize(text, opts.maxWidth);
    doc.text(lines[0] || '', tx, ty, { align: opts?.align || 'left' });
  } else {
    doc.text(text, tx, ty, { align: opts?.align || 'left' });
  }
}

/** Place italic sub-label at bottom-center of cell (for address fields) */
function putAddrSublabel(
  doc: jsPDF,
  text: string,
  x: number, y: number, w: number, h: number
) {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FS_ADDR_SUBLABEL);
  doc.setTextColor(...BLACK);
  doc.text(text, x + w / 2, y + h - 2, { align: 'center' });
}

/** Draw a checkbox (small square, optionally with checkmark) */
function drawCheckbox(doc: jsPDF, x: number, y: number, checked: boolean) {
  const s = 7;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.rect(x, y, s, s, 'S');
  if (checked) {
    doc.setLineWidth(0.8);
    doc.line(x + 1.5, y + 3.5, x + 3, y + 5.5);
    doc.line(x + 3, y + 5.5, x + 5.5, y + 1.5);
    doc.setLineWidth(0.5);
  }
}

// =================================================================
//  MAIN EXPORT
// =================================================================

export function generatePDS(data: PDSData): void {
  const doc = new jsPDF({
    unit: 'pt',
    format: [PW, PH],
    orientation: 'portrait',
  });

  let y = MT;

  // ── Form Header ──
  y = drawFormHeader(doc, y);

  // ── I. PERSONAL INFORMATION ──
  y = drawSectionHeader(doc, y, 'I.  PERSONAL INFORMATION');
  y = drawPersonalInfo(doc, y, data);

  // ── II. FAMILY BACKGROUND ──
  y = drawSectionHeader(doc, y, 'II.  FAMILY BACKGROUND');
  y = drawFamilyBackground(doc, y, data);

  // ── III. EDUCATIONAL BACKGROUND ──
  y = drawSectionHeader(doc, y, 'III.  EDUCATIONAL BACKGROUND');
  y = drawEducationalBackground(doc, y, data);

  // ── SIGNATURE / DATE row ──
  y = drawSignatureDateRow(doc, y);

  // ── Page footer ──
  drawPageFooter(doc, 1);

  // ── PAGE 2 ──
  doc.addPage([PW, PH]);
  y = MT;

  // ── IV. CIVIL SERVICE ELIGIBILITY ──
  y = drawSectionHeader(doc, y, 'IV.  CIVIL SERVICE ELIGIBILITY');
  y = drawCivilServiceEligibility(doc, y, data);

  // ── V. WORK EXPERIENCE ──
  y = drawSectionHeaderWithSub(doc, y,
    'V.  WORK EXPERIENCE',
    '(Include private employment.  Start from your recent work.)  Description of duties should be indicated in the attached Work Experience Sheet.'
  );
  y = drawWorkExperience(doc, y, data);

  // ── SIGNATURE / DATE row (page 2) ──
  y = drawSignatureDateRow2(doc, y);

  // ── Page footer ──
  drawPageFooter(doc, 2);

  // ── PAGE 3 ──
  doc.addPage([PW, PH]);
  y = MT;

  // ── VI. VOLUNTARY WORK ──
  y = drawSectionHeader(doc, y, 'VI.  VOLUNTARY WORK OR INVOLVEMENT IN CIVIC / NON-GOVERNMENT / PEOPLE / VOLUNTARY ORGANIZATION/S');
  y = drawVoluntaryWork(doc, y, data);

  // ── VII. LEARNING AND DEVELOPMENT ──
  y = drawSectionHeader(doc, y, 'VII.  LEARNING AND DEVELOPMENT (L&D) INTERVENTIONS/TRAINING PROGRAMS ATTENDED');
  y = drawLearningDevelopment(doc, y, data);

  // ── VIII. OTHER INFORMATION ──
  y = drawSectionHeader(doc, y, 'VIII.  OTHER INFORMATION');
  y = drawOtherInformation(doc, y, data);

  // ── SIGNATURE / DATE row (page 3) ──
  y = drawSignatureDateRow2(doc, y);

  // ── Page footer ──
  drawPageFooter(doc, 3);

  // ── PAGE 4 ──
  doc.addPage([PW, PH]);
  y = MT;

  // ── Questions 34-40 ──
  y = drawQuestions(doc, y, data);

  // ── 41. REFERENCES ──
  y = drawReferences(doc, y, data);

  // ── 42. Declaration, Gov ID, Signature, Photo ──
  y = drawDeclaration(doc, y, data);

  // ── Oath section ──
  y = drawOathSection(doc, y);

  // ── Page footer ──
  drawPageFooter(doc, 4);

  doc.save(`PDS_${data.surname || 'form'}_${data.firstName || ''}.pdf`);
}

// =================================================================
//  FORM HEADER
// =================================================================

function drawFormHeader(doc: jsPDF, startY: number): number {
  let y = startY;

  const padL = X0 + 4; // left padding inside border

  // "CS Form No. 212"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text('CS Form No. 212', padL, y + 10);

  // "Revised 2025"
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Revised 2025', padL, y + 19);

  // "PERSONAL DATA SHEET" (centered)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PERSONAL DATA SHEET', PW / 2, y + 30, { align: 'center' });

  y += 38;

  // WARNING line 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const warnPrefix = 'WARNING: ';
  doc.text(warnPrefix, padL, y + 8);
  const warnPrefixW = doc.getTextWidth(warnPrefix);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person',
    padL + warnPrefixW, y + 8
  );
  doc.text('concerned.', padL, y + 15);

  // "READ THE ATTACHED GUIDE..."
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(
    'READ THE ATTACHED GUIDE TO FILLING OUT THE PERSONAL DATA SHEET (PDS) BEFORE ACCOMPLISHING THE PDS FORM.',
    padL, y + 23
  );

  // Instructions line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const instr1 = 'Print legibly if accomplished through own handwriting. Tick appropriate boxes(';
  doc.text(instr1, padL, y + 31);
  const instr1W = doc.getTextWidth(instr1);
  // small checkbox symbol
  doc.rect(padL + instr1W, y + 25.5, 6, 6, 'S');
  const afterBox = padL + instr1W + 8;
  const instr2 = ') and use separate sheet if necessary. Indicate N/A if not applicable.  ';
  doc.text(instr2, afterBox, y + 31);
  const instr2W = doc.getTextWidth(instr2);
  doc.setFont('helvetica', 'bold');
  doc.text('DO NOT ABBREVIATE.', afterBox + instr2W, y + 31);

  const endY = y + 36;

  // Draw left, top, right border around the header block
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  doc.line(X0, startY, X6, startY);       // top
  doc.line(X0, startY, X0, endY);         // left
  doc.line(X6, startY, X6, endY);         // right

  return endY;
}

// =================================================================
//  SECTION HEADER
// =================================================================

function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  const h = 15;
  drawCell(doc, X0, y, CW, h, { fill: SECTION_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(FS_SECTION);
  doc.setTextColor(...WHITE);
  doc.text(title, X0 + 4, y + h / 2 + FS_SECTION / 3);
  doc.setTextColor(...BLACK);
  return y + h;
}

/** Section header with a subtitle line below the title */
function drawSectionHeaderWithSub(doc: jsPDF, y: number, title: string, sub: string): number {
  const h = 22;
  drawCell(doc, X0, y, CW, h, { fill: SECTION_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(FS_SECTION);
  doc.setTextColor(...WHITE);
  doc.text(title, X0 + 4, y + 9);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.text(sub, X0 + 4, y + 17);
  doc.setTextColor(...BLACK);
  return y + h;
}

// =================================================================
//  I. PERSONAL INFORMATION
// =================================================================

function drawPersonalInfo(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  const ra = d.residentialAddress || { houseNo: '', street: '', subdivision: '', barangay: '', city: '', province: '', zipCode: '' };
  const pa = d.permanentAddress || { houseNo: '', street: '', subdivision: '', barangay: '', city: '', province: '', zipCode: '' };

  // ── Rows 1-3: SURNAME, FIRST NAME, MIDDLE NAME ──
  const nameBlockH = RH * 3;

  // Left label cell spanning all 3 rows (rowspan=3)
  drawCell(doc, X0, y, X1 - X0, nameBlockH, { fill: LABEL_BG });
  putLabel(doc, '1.  SURNAME', X0, y, { h: RH });
  putLabel(doc, '2.  FIRST NAME', X0, y + RH, { h: RH });
  putLabel(doc, '     MIDDLE NAME', X0, y + RH * 2, { h: RH });

  // Row 1: SURNAME value
  drawCell(doc, X1, y, X6 - X1, RH);
  putValue(doc, v(d.surname), X1, y, RH);
  y += RH;

  // Row 2: FIRST NAME value + NAME EXTENSION
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.firstName), X1, y, RH);
  drawCell(doc, X4, y, X6 - X4, RH, { fill: LABEL_BG });
  putLabel(doc, 'NAME EXTENSION (JR., SR)', X4, y);
  putValue(doc, v(d.nameExtension, 'N/A'), X4 + 2, y + 2, RH - 4, { size: 7, indent: 90 });
  y += RH;

  // Row 3: MIDDLE NAME value
  drawCell(doc, X1, y, X6 - X1, RH);
  putValue(doc, v(d.middleName, 'N/A'), X1, y, RH);
  y += RH;

  // ── Rows 4-5: DATE OF BIRTH, PLACE OF BIRTH + 16. CITIZENSHIP ──
  const citizenBlockH = RH * 3; // ~51pt — taller DOB/POB to fit citizenship checkboxes
  const row4H = citizenBlockH / 2;
  const row5H = citizenBlockH - row4H;

  // Left: Row 4 - DATE OF BIRTH (vertically centered)
  drawCell(doc, X0, y, X1 - X0, row4H, { fill: LABEL_BG });
  const dob_cy = y + row4H / 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_LABEL);
  doc.setTextColor(...BLACK);
  doc.text('3.  DATE OF BIRTH', X0 + 2, dob_cy - 2);
  doc.setFontSize(5.5);
  doc.text('(dd/mm/yyyy)', X0 + 14, dob_cy + 6);
  drawCell(doc, X1, y, X3 - X1, row4H);
  putValue(doc, fmtDate(d.dateOfBirth), X1, y, row4H);

  // Right: 16. CITIZENSHIP block (spans 2 rows)
  drawCitizenshipBlock(doc, X3, y, X6 - X3, citizenBlockH, d);

  y += row4H;

  // Left: Row 5 - PLACE OF BIRTH (vertically centered)
  drawCell(doc, X0, y, X1 - X0, row5H, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_LABEL);
  doc.setTextColor(...BLACK);
  doc.text('4.  PLACE OF BIRTH', X0 + 2, y + row5H / 2 + FS_LABEL / 3);
  drawCell(doc, X1, y, X3 - X1, row5H);
  putValue(doc, v(d.placeOfBirth), X1, y, row5H);

  y += row5H;

  // ── Rows 6-8: SEX AT BIRTH, CIVIL STATUS, HEIGHT + 17. RESIDENTIAL ADDRESS ──
  const sexH = RH;
  const civilH = RH + 18; // taller for 3 rows of checkboxes
  const heightH = RH;
  const resAddrH = sexH + civilH + heightH;

  // Right: "17. RESIDENTIAL ADDRESS" label spanning 3 rows
  drawCell(doc, X3, y, X4 - X3, resAddrH, { fill: LABEL_BG });
  putLabel(doc, '17. RESIDENTIAL ADDRESS', X3, y, { size: 6 });

  // --- Row 6: SEX AT BIRTH (vertically centered) ---
  drawCell(doc, X0, y, X1 - X0, sexH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_LABEL);
  doc.setTextColor(...BLACK);
  doc.text('5.  SEX AT BIRTH', X0 + 2, y + sexH / 2 + FS_LABEL / 3);
  // Checkbox area (single bordered cell with 2 checkboxes)
  drawCell(doc, X1, y, X3 - X1, sexH);
  drawCheckbox(doc, X1 + 12, y + (sexH - 7) / 2, d.sex === 'Male');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Male', X1 + 24, y + sexH / 2 + 2);
  drawCheckbox(doc, XCB + 12, y + (sexH - 7) / 2, d.sex === 'Female');
  doc.text('Female', XCB + 24, y + sexH / 2 + 2);

  // Address row 1: House/Block/Lot No. | Street
  drawCell(doc, X4, y, X5 - X4, sexH);
  putValue(doc, v(ra.houseNo), X4, y, sexH - 4, { size: 7 });
  putAddrSublabel(doc, 'House/Block/Lot No.', X4, y, X5 - X4, sexH);
  drawCell(doc, X5, y, X6 - X5, sexH);
  putValue(doc, v(ra.street), X5, y, sexH - 4, { size: 7 });
  putAddrSublabel(doc, 'Street', X5, y, X6 - X5, sexH);
  y += sexH;

  // --- Row 7: CIVIL STATUS ---
  drawCell(doc, X0, y, X1 - X0, civilH, { fill: LABEL_BG });
  putLabel(doc, '6. CIVIL STATUS', X0, y);
  drawCell(doc, X1, y, X3 - X1, civilH);
  // Checkboxes: column 1 (Single, Widowed, Other/s) and column 2 (Married, Separated)
  const cbGap = 9;
  const cbStartY = y + 3;
  // Column 1
  drawCheckbox(doc, X1 + 5, cbStartY, d.civilStatus === 'Single');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Single', X1 + 17, cbStartY + 6);
  drawCheckbox(doc, X1 + 5, cbStartY + cbGap, d.civilStatus === 'Widowed' || d.civilStatus === 'Widow/er');
  doc.text('Widowed', X1 + 17, cbStartY + cbGap + 6);
  drawCheckbox(doc, X1 + 5, cbStartY + cbGap * 2, d.civilStatus === 'Others' || d.civilStatus === 'Solo Parent');
  doc.text('Other/s:', X1 + 17, cbStartY + cbGap * 2 + 6);
  if (d.civilStatusOther) {
    doc.setFontSize(6.5);
    doc.text(d.civilStatusOther, X1 + 50, cbStartY + cbGap * 2 + 6);
  }
  // Column 2
  drawCheckbox(doc, XCB + 5, cbStartY, d.civilStatus === 'Married');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Married', XCB + 17, cbStartY + 6);
  drawCheckbox(doc, XCB + 5, cbStartY + cbGap, d.civilStatus === 'Separated');
  doc.text('Separated', XCB + 17, cbStartY + cbGap + 6);

  // Address row 2: Subdivision/Village + Barangay (merged single cell)
  drawCell(doc, X4, y, X6 - X4, civilH);
  putValue(doc, [v(ra.subdivision), v(ra.barangay)].filter(Boolean).join(', '), X4, y, civilH - 6, { size: 7 });
  putAddrSublabel(doc, 'Subdivision/Village / Barangay', X4, y, X6 - X4, civilH);
  y += civilH;

  // --- Row 8: HEIGHT ---
  drawCell(doc, X0, y, X1 - X0, heightH, { fill: LABEL_BG });
  putLabel(doc, '7.  HEIGHT (m)', X0, y, { h: heightH });
  drawCell(doc, X1, y, X3 - X1, heightH);
  putValue(doc, v(d.height), X1, y, heightH);

  // Address row 3: City/Municipality + Province (merged single cell)
  drawCell(doc, X4, y, X6 - X4, heightH);
  putValue(doc, [v(ra.city), v(ra.province)].filter(Boolean).join(', '), X4, y, heightH - 4, { size: 7 });
  putAddrSublabel(doc, 'City/Municipality / Province', X4, y, X6 - X4, heightH);
  y += heightH;

  // ── Row 9: WEIGHT + ZIP CODE (residential) ──
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '8.  WEIGHT (kg)', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.weight), X1, y, RH);
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, '     ZIP CODE', X3, y);
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, v(ra.zipCode), X4, y, RH);
  y += RH;

  // ── Rows 10-12: BLOOD TYPE, UMID, PAG-IBIG + 18. PERMANENT ADDRESS ──
  const permAddrH = RH * 3;

  // Right: "18. PERMANENT ADDRESS" label spanning 3 rows
  drawCell(doc, X3, y, X4 - X3, permAddrH, { fill: LABEL_BG });
  putLabel(doc, '18. PERMANENT ADDRESS', X3, y, { size: 6 });

  // --- Row 10: BLOOD TYPE ---
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '9.  BLOOD TYPE', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.bloodType), X1, y, RH);
  // Permanent address row 1
  drawCell(doc, X4, y, X5 - X4, RH);
  putValue(doc, v(pa.houseNo), X4, y, RH - 4, { size: 7 });
  putAddrSublabel(doc, 'House/Block/Lot No.', X4, y, X5 - X4, RH);
  drawCell(doc, X5, y, X6 - X5, RH);
  putValue(doc, v(pa.street), X5, y, RH - 4, { size: 7 });
  putAddrSublabel(doc, 'Street', X5, y, X6 - X5, RH);
  y += RH;

  // --- Row 11: UMID ID NO. ---
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '10.  UMID ID NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.umidIdNo || (d as any).gsisIdNo), X1, y, RH);
  // Permanent address row 2: Subdivision/Village + Barangay (merged)
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, [v(pa.subdivision), v(pa.barangay)].filter(Boolean).join(', '), X4, y, RH - 4, { size: 7 });
  putAddrSublabel(doc, 'Subdivision/Village / Barangay', X4, y, X6 - X4, RH);
  y += RH;

  // --- Row 12: PAG-IBIG ID NO. ---
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '11.  PAG-IBIG ID NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.pagibigIdNo), X1, y, RH);
  // Permanent address row 3: City/Municipality + Province (merged)
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, [v(pa.city), v(pa.province)].filter(Boolean).join(', '), X4, y, RH - 4, { size: 7 });
  putAddrSublabel(doc, 'City/Municipality / Province', X4, y, X6 - X4, RH);
  y += RH;

  // ── Row 13: PHILHEALTH NO. + ZIP CODE (permanent) ──
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '12.  PHILHEALTH NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.philhealthNo), X1, y, RH);
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, '     ZIP CODE', X3, y);
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, v(pa.zipCode), X4, y, RH);
  y += RH;

  // ── Row 14: PhilSys Number (PSN) + TELEPHONE NO. ──
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '13.  PhilSys Number (PSN):', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.philsysNo || (d as any).sssNo), X1, y, RH);
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, '19. TELEPHONE NO.', X3, y, { h: RH });
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, v(d.telephoneNo), X4, y, RH, { size: 7 });
  y += RH;

  // ── Row 15: TIN NO. + MOBILE NO. ──
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '14.  TIN NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.tinNo), X1, y, RH);
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, '20. MOBILE NO.', X3, y, { h: RH });
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, v(d.mobileNo), X4, y, RH, { size: 7 });
  y += RH;

  // ── Row 16: AGENCY EMPLOYEE NO. + E-MAIL ADDRESS ──
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '15. AGENCY EMPLOYEE NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.agencyEmployeeNo), X1, y, RH);
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, '21. E-MAIL ADDRESS (if any)', X3, y, { h: RH });
  drawCell(doc, X4, y, X6 - X4, RH);
  putValue(doc, v(d.emailAddress), X4, y, RH, { size: 7 });
  y += RH;

  return y;
}

// =================================================================
//  16. CITIZENSHIP BLOCK (spans 2 rows on right side)
// =================================================================

function drawCitizenshipBlock(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  d: PDSData
) {
  // Left cell: "16. CITIZENSHIP" at top + "If holder..." at bottom (rowspan=2, label bg)
  const labelW = X4 - X3;
  drawCell(doc, x, y, labelW, h, { fill: LABEL_BG });
  putLabel(doc, '16. CITIZENSHIP', x, y);
  // "If holder..." pinned to bottom of cell
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('If holder of  dual citizenship,', x + 3, y + h - 14);
  doc.text('please indicate the details.', x + 3, y + h - 7);

  // Right cell: all checkboxes + "Pls. indicate country" merged (rowspan=2, colspan, white)
  const valX = x + labelW;
  const valW = w - labelW;
  drawCell(doc, valX, y, valW, h);

  const isFil = d.citizenship === 'Filipino';
  const isDual = d.citizenship === 'Dual Citizenship' || (d.citizenshipType !== '' && d.citizenshipType !== undefined);

  // Row 1: Filipino checkbox | Dual Citizenship checkbox
  drawCheckbox(doc, valX + 10, y + 4, isFil);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Filipino', valX + 22, y + 11);

  drawCheckbox(doc, valX + 80, y + 4, isDual);
  doc.text('Dual Citizenship', valX + 92, y + 11);

  // Row 2: by birth | by naturalization
  drawCheckbox(doc, valX + 90, y + 16, d.citizenshipType === 'by birth');
  doc.setFontSize(6.5);
  doc.text('by birth', valX + 102, y + 22);

  drawCheckbox(doc, valX + 145, y + 16, d.citizenshipType === 'by naturalization');
  doc.text('by naturalization', valX + 157, y + 22);

  // Row 3: "Pls. indicate country:" + dropdown arrow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Pls. indicate country:', valX + 5, y + h - 8);

  // Country value
  if (d.citizenshipCountry) {
    doc.setFontSize(7);
    doc.text(d.citizenshipCountry, valX + 75, y + h - 8);
  }

  // Dropdown arrow at far right
  const arrowX = valX + valW - 18;
  doc.setFillColor(...BLACK);
  doc.triangle(arrowX, y + h - 12, arrowX + 8, y + h - 12, arrowX + 4, y + h - 7, 'F');
}

// =================================================================
//  II. FAMILY BACKGROUND
// =================================================================

function drawFamilyBackground(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // 14 left-side rows total:
  //   Spouse (7): surname, first name, middle name, occupation, employer, business addr, telephone
  //   Father (3): surname, first name, middle name
  //   Mother (4): mother's maiden name header, surname, first name, middle name
  const totalRows = 14;
  // Children columns aligned with Filipino checkbox area (after citizenship label)
  const childNameX = X4;
  const childDobX = X5 + 10;

  // ── Right side: Children header row (row 1) ──
  drawCell(doc, childNameX, y, childDobX - childNameX, RH, { fill: LABEL_BG });
  putLabel(doc, '23. NAME of CHILDREN  (Write full name and list all)', childNameX, y, { size: 6, h: RH });
  drawCell(doc, childDobX, y, X6 - childDobX, RH, { fill: LABEL_BG });
  putLabel(doc, 'DATE OF BIRTH (dd/mm/yyyy)', childDobX, y, { size: 6, h: RH });

  // ── Right side: Children data rows (rows 2-13) ──
  const children = d.children || [];
  for (let i = 0; i < totalRows - 2; i++) {
    const rowY = y + RH * (i + 1);
    const child = children[i];
    drawCell(doc, childNameX, rowY, childDobX - childNameX, RH);
    if (child?.name) putValue(doc, child.name, childNameX, rowY, RH, { size: 7 });
    drawCell(doc, childDobX, rowY, X6 - childDobX, RH);
    if (child?.dateOfBirth) putValue(doc, fmtDate(child.dateOfBirth), childDobX, rowY, RH, { size: 7 });
  }

  // Last row (row 14): "(Continue on separate sheet if necessary)" — colspan, label bg
  const lastChildRowY = y + RH * (totalRows - 1);
  drawCell(doc, childNameX, lastChildRowY, X6 - childNameX, RH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text(
    '(Continue on separate sheet if necessary)',
    childNameX + (X6 - childNameX) / 2,
    lastChildRowY + RH / 2 + 2,
    { align: 'center' }
  );
  doc.setTextColor(...BLACK);

  // ══════════════════════════════════════════════
  //  LEFT SIDE: Spouse, Father, Mother rows
  // ══════════════════════════════════════════════

  // ── SPOUSE (rows 1-7) ──

  // Row 1: 22. SPOUSE'S SURNAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '22.  SPOUSE\'S SURNAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseSurname), X1, y, RH);
  y += RH;

  // Row 2: FIRST NAME + NAME EXTENSION (aligned with 16. CITIZENSHIP)
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     FIRST NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.spouseFirstName), X1, y, RH, { size: 6 });
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, 'NAME EXTENSION (JR., SR)', X3, y, { size: 4.5 });
  if (d.spouseNameExtension) {
    putValue(doc, d.spouseNameExtension, X3, y + 2, RH - 2, { size: 6 });
  }
  y += RH;

  // Row 3: MIDDLE NAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     MIDDLE NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseMiddleName), X1, y, RH);
  y += RH;

  // Row 4: OCCUPATION
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     OCCUPATION', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseOccupation), X1, y, RH);
  y += RH;

  // Row 5: EMPLOYER/BUSINESS NAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     EMPLOYER/BUSINESS NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseEmployerName), X1, y, RH);
  y += RH;

  // Row 6: BUSINESS ADDRESS
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     BUSINESS ADDRESS', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseEmployerAddress), X1, y, RH);
  y += RH;

  // Row 7: TELEPHONE NO.
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     TELEPHONE NO.', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.spouseTelephoneNo), X1, y, RH);
  y += RH;

  // ── FATHER (rows 8-10) ──

  // Row 8: 24. FATHER'S SURNAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '24.  FATHER\'S SURNAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.fatherSurname), X1, y, RH);
  y += RH;

  // Row 9: FIRST NAME + NAME EXTENSION (aligned with 16. CITIZENSHIP)
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     FIRST NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X3 - X1, RH);
  putValue(doc, v(d.fatherFirstName), X1, y, RH, { size: 6 });
  drawCell(doc, X3, y, X4 - X3, RH, { fill: LABEL_BG });
  putLabel(doc, 'NAME EXTENSION (JR., SR)', X3, y, { size: 4.5 });
  if (d.fatherNameExtension) {
    putValue(doc, d.fatherNameExtension, X3, y + 2, RH - 2, { size: 6 });
  }
  y += RH;

  // Row 10: MIDDLE NAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     MIDDLE NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.fatherMiddleName), X1, y, RH);
  y += RH;

  // ── MOTHER (rows 11-14) ──

  // Row 11: 25. MOTHER'S MAIDEN NAME (header row, no value)
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '25.  MOTHER\'S MAIDEN NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  y += RH;

  // Row 12: SURNAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     SURNAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.motherMaidenSurname), X1, y, RH);
  y += RH;

  // Row 13: FIRST NAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     FIRST NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.motherFirstName), X1, y, RH);
  y += RH;

  // Row 14: MIDDLE NAME
  drawCell(doc, X0, y, X1 - X0, RH, { fill: LABEL_BG });
  putLabel(doc, '     MIDDLE NAME', X0, y, { h: RH });
  drawCell(doc, X1, y, X4 - X1, RH);
  putValue(doc, v(d.motherMiddleName), X1, y, RH);
  y += RH;

  return y;
}

// =================================================================
//  III. EDUCATIONAL BACKGROUND
// =================================================================

function drawEducationalBackground(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Column x-positions for education table (8 data columns)
  // E1 matches X1 so Level column aligns with Surname label column
  const E0 = X0;            // 20  - Level label
  const E1 = X1;            // 138 - Name of School (matches left label col)
  const E2 = E1 + 145;      // 257 - Degree/Course (Name of School expanded more)
  const E3 = E2 + 120;      // 377 - From
  const E4 = E3 + 38;       // 415 - To
  const E5 = E4 + 38;       // 453 - Units Earned
  const E6 = X5 + 10;       // 492 - Year Graduated (aligned with children DOB column)
  const E7 = E6 + 42;       // 534 - Honors
  const E8 = X6;             // 592 - right edge

  const headerH = RH + 4;   // taller header row
  const subHeaderH = RH - 4; // sub-header row (From/To)

  // ── Header Row 1 (main headers) ──

  // "26. LEVEL" — spans 2 header rows
  drawCell(doc, E0, y, E1 - E0, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_LABEL);
  doc.setTextColor(...BLACK);
  const lvlMidY = y + (headerH + subHeaderH) / 2;
  doc.text('26.', E0 + 2, lvlMidY - 3);
  doc.setFontSize(6.5);
  doc.text('LEVEL', E0 + (E1 - E0) / 2, lvlMidY + 5, { align: 'center' });

  // "NAME OF SCHOOL" — spans 2 header rows
  drawCell(doc, E1, y, E2 - E1, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('NAME OF SCHOOL', E1 + (E2 - E1) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full)', E1 + (E2 - E1) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "BASIC EDUCATION/DEGREE/COURSE" — spans 2 header rows
  drawCell(doc, E2, y, E3 - E2, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(6);
  doc.text('BASIC EDUCATION/DEGREE/COURSE', E2 + (E3 - E2) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full)', E2 + (E3 - E2) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "PERIOD OF ATTENDANCE" — spans 2 columns (From + To), only row 1
  drawCell(doc, E3, y, E5 - E3, headerH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('PERIOD OF ATTENDANCE', E3 + (E5 - E3) / 2, y + headerH / 2 + 2, { align: 'center' });

  // "HIGHEST LEVEL / UNITS EARNED" — spans 2 header rows
  drawCell(doc, E5, y, E6 - E5, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(4.5);
  doc.text('HIGHEST LEVEL/', E5 + (E6 - E5) / 2, y + (headerH + subHeaderH) / 2 - 7, { align: 'center' });
  doc.text('UNITS EARNED', E5 + (E6 - E5) / 2, y + (headerH + subHeaderH) / 2, { align: 'center' });
  doc.text('(if not graduated)', E5 + (E6 - E5) / 2, y + (headerH + subHeaderH) / 2 + 7, { align: 'center' });

  // "YEAR GRADUATED" — spans 2 header rows
  drawCell(doc, E6, y, E7 - E6, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('YEAR', E6 + (E7 - E6) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('GRADUATED', E6 + (E7 - E6) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "SCHOLARSHIP / ACADEMIC HONORS RECEIVED" — spans 2 header rows
  drawCell(doc, E7, y, E8 - E7, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(4.5);
  doc.text('SCHOLARSHIP/', E7 + (E8 - E7) / 2, y + (headerH + subHeaderH) / 2 - 7, { align: 'center' });
  doc.text('ACADEMIC', E7 + (E8 - E7) / 2, y + (headerH + subHeaderH) / 2, { align: 'center' });
  doc.text('HONORS RECEIVED', E7 + (E8 - E7) / 2, y + (headerH + subHeaderH) / 2 + 7, { align: 'center' });

  // ── Header Row 2 (From / To sub-headers) ──
  const subY = y + headerH;
  drawCell(doc, E3, subY, E4 - E3, subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('From', E3 + (E4 - E3) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });
  drawCell(doc, E4, subY, E5 - E4, subHeaderH, { fill: LABEL_BG });
  doc.text('To', E4 + (E5 - E4) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });

  y += headerH + subHeaderH;

  // ── Data Rows ──
  const eduLevels = ['ELEMENTARY', 'SECONDARY', 'VOCATIONAL /\nTRADE COURSE', 'COLLEGE', 'GRADUATE STUDIES'];
  const eduKeys = ['ELEM', 'SECOND', 'VOC', 'COLLEGE', 'GRAD'];
  const education = d.education || [];

  const eduRowH = Math.round(RH * 1.5); // 1.5x height for word wrap

  for (let i = 0; i < eduLevels.length; i++) {
    const rowH = eduRowH;

    // Find matching education entry
    const match = education.find((e) => {
      const l = (e.level || '').toUpperCase();
      if (eduKeys[i] === 'ELEM') return l.includes('ELEM');
      if (eduKeys[i] === 'SECOND') return l.includes('SECOND') || l.includes('HIGH');
      if (eduKeys[i] === 'VOC') return l.includes('VOC') || l.includes('TRADE');
      if (eduKeys[i] === 'COLLEGE') return l.includes('COLLEGE');
      if (eduKeys[i] === 'GRAD') return l.includes('GRAD');
      return false;
    });

    // Level label
    drawCell(doc, E0, y, E1 - E0, rowH, { fill: LABEL_BG });
    if (eduLevels[i].includes('\n')) {
      const lines = eduLevels[i].split('\n');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FS_LABEL);
      doc.setTextColor(...BLACK);
      doc.text(lines[0], E0 + 5, y + rowH / 2 - 2);
      doc.text(lines[1], E0 + 5, y + rowH / 2 + 6);
    } else {
      putLabel(doc, '     ' + eduLevels[i], E0, y, { h: rowH });
    }

    // Data cells — school name and degree use word wrap
    drawCell(doc, E1, y, E2 - E1, rowH);
    if (match?.schoolName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(match.schoolName, E2 - E1 - 6);
      const lineH = 7.5;
      const startTy = y + (rowH - lines.length * lineH) / 2 + 5;
      lines.forEach((line: string, li: number) => {
        doc.text(line, E1 + 3, startTy + li * lineH);
      });
    }

    drawCell(doc, E2, y, E3 - E2, rowH);
    if (match?.degree) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      const lines = doc.splitTextToSize(match.degree, E3 - E2 - 6);
      const lineH = 7.5;
      const startTy = y + (rowH - lines.length * lineH) / 2 + 5;
      lines.forEach((line: string, li: number) => {
        doc.text(line, E2 + 3, startTy + li * lineH);
      });
    }

    drawCell(doc, E3, y, E4 - E3, rowH);
    if (match?.period?.from) putValue(doc, match.period.from, E3, y, rowH, { size: 6.5 });

    drawCell(doc, E4, y, E5 - E4, rowH);
    if (match?.period?.to) putValue(doc, match.period.to, E4, y, rowH, { size: 6.5 });

    drawCell(doc, E5, y, E6 - E5, rowH);
    if (match?.units) putValue(doc, match.units, E5, y, rowH, { size: 6.5 });

    drawCell(doc, E6, y, E7 - E6, rowH);
    if (match?.yearGraduated) putValue(doc, match.yearGraduated, E6, y, rowH, { size: 6.5 });

    drawCell(doc, E7, y, E8 - E7, rowH);
    if (match?.honors) putValue(doc, match.honors, E7, y, rowH, { size: 6.5 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)" — colspan all columns, label bg
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  SIGNATURE / DATE ROW (bottom of page 1)
// =================================================================

function drawSignatureDateRow(doc: jsPDF, y: number): number {
  const h = RH + 2;
  const sigLabelW = X1 - X0; // same width as Surname label column
  const dateLabelW = 50;
  const emptyAfterDateW = 80;
  const midW = CW - sigLabelW - dateLabelW - emptyAfterDateW;

  // SIGNATURE label (same width as Surname label)
  drawCell(doc, X0, y, sigLabelW, h, { fill: LABEL_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('SIGNATURE', X0 + 5, y + h / 2 + 2);

  // Middle: empty signature area
  drawCell(doc, X0 + sigLabelW, y, midW, h);

  // DATE label
  drawCell(doc, X0 + sigLabelW + midW, y, dateLabelW, h, { fill: LABEL_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6);
  doc.text('DATE', X0 + sigLabelW + midW + 5, y + h / 2 + 2);

  // Empty column after DATE
  drawCell(doc, X0 + sigLabelW + midW + dateLabelW, y, emptyAfterDateW, h);

  return y + h;
}

// =================================================================
//  PAGE FOOTER
// =================================================================

function drawPageFooter(doc: jsPDF, pageNum: number) {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text(
    `CS FORM 212 (Revised 2025), Page ${pageNum} of 4`,
    X6,
    PH - 10,
    { align: 'right' }
  );
}

// =================================================================
//  IV. CIVIL SERVICE ELIGIBILITY
// =================================================================

function drawCivilServiceEligibility(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Column positions
  const C0 = X0;             // 20  - Eligibility name
  const C1 = C0 + 215;       // 235 - Rating
  const C2 = C1 + 60;        // 295 - Date of Examination
  const C3 = C2 + 85;        // 380 - Place of Examination
  const C4 = C3 + 105;       // 485 - License Number
  const C5 = C4 + 55;        // 540 - Valid Until
  const C6 = X6;              // 592 - right edge

  const headerH = RH + 4;
  const subHeaderH = RH - 4;

  // ── Header Row 1 ──

  // "27. CES/CSEE/CAREER SERVICE..." — spans 2 header rows
  drawCell(doc, C0, y, C1 - C0, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('27.', C0 + 3, y + 8);
  const eligLabel1 = 'CES/CSEE/CAREER SERVICE/RA 1080 (BOARD/ BAR)/UNDER';
  const eligLabel2 = 'SPECIAL LAWS/CATEGORY II/ IV ELIGIBILITY and';
  const eligLabel3 = 'ELIGIBILITIES FOR UNIFORMED PERSONNEL';
  doc.text(eligLabel1, C0 + (C1 - C0) / 2, y + (headerH + subHeaderH) / 2 - 7, { align: 'center' });
  doc.text(eligLabel2, C0 + (C1 - C0) / 2, y + (headerH + subHeaderH) / 2, { align: 'center' });
  doc.text(eligLabel3, C0 + (C1 - C0) / 2, y + (headerH + subHeaderH) / 2 + 7, { align: 'center' });

  // "RATING (If Applicable)" — spans 2 header rows
  drawCell(doc, C1, y, C2 - C1, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('RATING', C1 + (C2 - C1) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(If Applicable)', C1 + (C2 - C1) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "DATE OF EXAMINATION / CONFERMENT" — spans 2 header rows
  drawCell(doc, C2, y, C3 - C2, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('DATE OF EXAMINATION', C2 + (C3 - C2) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('/ CONFERMENT', C2 + (C3 - C2) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "PLACE OF EXAMINATION / CONFERMENT" — spans 2 header rows
  drawCell(doc, C3, y, C4 - C3, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('PLACE OF EXAMINATION /', C3 + (C4 - C3) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('CONFERMENT', C3 + (C4 - C3) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "LICENSE (if applicable)" — spans row 1 only, over NUMBER + Valid Until
  drawCell(doc, C4, y, C6 - C4, headerH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('LICENSE (if applicable)', C4 + (C6 - C4) / 2, y + headerH / 2 + 2, { align: 'center' });

  // ── Header Row 2 (sub-headers for LICENSE) ──
  const subY = y + headerH;
  drawCell(doc, C4, subY, C5 - C4, subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('NUMBER', C4 + (C5 - C4) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });
  drawCell(doc, C5, subY, C6 - C5, subHeaderH, { fill: LABEL_BG });
  doc.text('Valid Until', C5 + (C6 - C5) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });

  y += headerH + subHeaderH;

  // ── Data Rows (7 rows) ──
  const eligibilities = d.eligibilities || [];
  const eligRows = 7;

  for (let i = 0; i < eligRows; i++) {
    const elig = eligibilities[i];
    const rowH = RH;

    drawCell(doc, C0, y, C1 - C0, rowH);
    if (elig?.name) putValue(doc, elig.name, C0, y, rowH, { size: 6 });

    drawCell(doc, C1, y, C2 - C1, rowH);
    if (elig?.rating) putValue(doc, elig.rating, C1, y, rowH, { size: 6.5 });

    drawCell(doc, C2, y, C3 - C2, rowH);
    if (elig?.dateOfExam) putValue(doc, fmtDate(elig.dateOfExam), C2, y, rowH, { size: 6.5 });

    drawCell(doc, C3, y, C4 - C3, rowH);
    if (elig?.placeOfExam) putValue(doc, elig.placeOfExam, C3, y, rowH, { size: 6 });

    drawCell(doc, C4, y, C5 - C4, rowH);
    if (elig?.licenseNo) putValue(doc, elig.licenseNo, C4, y, rowH, { size: 6.5 });

    drawCell(doc, C5, y, C6 - C5, rowH);
    if (elig?.licenseValidity) putValue(doc, fmtDate(elig.licenseValidity), C5, y, rowH, { size: 6.5 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)"
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  V. WORK EXPERIENCE
// =================================================================

function drawWorkExperience(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Column positions (2025 revised — no Monthly Salary or Salary Grade)
  const W0 = X0;             // 20  - From
  const W1 = W0 + 55;        // 75  - To
  const W2 = W1 + 55;        // 130 - Position Title
  const W3 = W2 + 150;       // 280 - Department/Agency
  const W4 = W3 + 165;       // 445 - Status of Appointment
  const W5 = W4 + 80;        // 525 - Gov't Service
  const W6 = X6;              // 592 - right edge

  const headerH = RH + 4;
  const subHeaderH = RH - 4;

  // ── Header Row 1 ──

  // "28. INCLUSIVE DATES (dd/mm/yyyy)" — row 1 only, spans From + To
  drawCell(doc, W0, y, W2 - W0, headerH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('28.', W0 + 3, y + 8);
  doc.text('INCLUSIVE DATES (dd/mm/yyyy)', W0 + (W2 - W0) / 2, y + headerH / 2 + 2, { align: 'center' });

  // "POSITION TITLE" — spans 2 header rows
  drawCell(doc, W2, y, W3 - W2, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('POSITION TITLE', W2 + (W3 - W2) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full/Do not abbreviate)', W2 + (W3 - W2) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "DEPARTMENT / AGENCY / OFFICE / COMPANY" — spans 2 header rows
  drawCell(doc, W3, y, W4 - W3, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('DEPARTMENT / AGENCY / OFFICE / COMPANY', W3 + (W4 - W3) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full/Do not abbreviate)', W3 + (W4 - W3) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "STATUS OF APPOINTMENT" — spans 2 header rows
  drawCell(doc, W4, y, W5 - W4, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('STATUS OF', W4 + (W5 - W4) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('APPOINTMENT', W4 + (W5 - W4) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "GOV'T SERVICE (Y/ N)" — spans 2 header rows
  drawCell(doc, W5, y, W6 - W5, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('GOV\'T SERVICE', W5 + (W6 - W5) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Y/ N)', W5 + (W6 - W5) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // ── Header Row 2 (From / To sub-headers) ──
  const subY = y + headerH;
  drawCell(doc, W0, subY, W1 - W0, subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('From', W0 + (W1 - W0) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });
  drawCell(doc, W1, subY, W2 - W1, subHeaderH, { fill: LABEL_BG });
  doc.text('To', W1 + (W2 - W1) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });

  y += headerH + subHeaderH;

  // ── Data Rows ──
  const workExp = d.workExperience || [];
  // Calculate how many rows fit until near page bottom (leave room for continue row + signature + footer)
  const availableH = PH - y - (RH - 4) - (RH + 2) - 25; // continue row + signature + footer margin
  const workRows = Math.floor(availableH / RH);

  for (let i = 0; i < workRows; i++) {
    const we = workExp[i];
    const rowH = RH;

    drawCell(doc, W0, y, W1 - W0, rowH);
    if (we?.period?.from) putValue(doc, fmtDate(we.period.from), W0, y, rowH, { size: 6 });

    drawCell(doc, W1, y, W2 - W1, rowH);
    if (we?.period?.to) putValue(doc, fmtDate(we.period.to), W1, y, rowH, { size: 6 });

    drawCell(doc, W2, y, W3 - W2, rowH);
    if (we?.positionTitle) putValue(doc, we.positionTitle, W2, y, rowH, { size: 6 });

    drawCell(doc, W3, y, W4 - W3, rowH);
    if (we?.department) putValue(doc, we.department, W3, y, rowH, { size: 6 });

    drawCell(doc, W4, y, W5 - W4, rowH);
    if (we?.statusOfAppointment) putValue(doc, we.statusOfAppointment, W4, y, rowH, { size: 5.5 });

    drawCell(doc, W5, y, W6 - W5, rowH);
    if (we) putValue(doc, we.isGovernmentService ? 'Y' : 'N', W5, y, rowH, { size: 6.5, align: 'center', indent: (W6 - W5) / 2 - 3 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)"
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  SIGNATURE / DATE ROW (Page 2 — with e-signature note)
// =================================================================

function drawSignatureDateRow2(doc: jsPDF, y: number): number {
  const h = RH + 2;
  const sigLabelW = 80;
  const dateLabelW = 50;
  const dateW = 80;
  const midW = CW - sigLabelW - dateLabelW - dateW;

  // SIGNATURE label
  drawCell(doc, X0, y, sigLabelW, h, { fill: LABEL_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('SIGNATURE', X0 + 5, y + h / 2 + 2);

  // Middle: e-signature note
  drawCell(doc, X0 + sigLabelW, y, midW, h);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.text('(wet signature/e-signature/digital certificate)', X0 + sigLabelW + midW / 2, y + h / 2 + 2, { align: 'center' });

  // DATE label
  drawCell(doc, X0 + sigLabelW + midW, y, dateLabelW, h, { fill: LABEL_BG });
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6);
  doc.text('DATE', X0 + sigLabelW + midW + 5, y + h / 2 + 2);

  // Empty date area
  drawCell(doc, X0 + sigLabelW + midW + dateLabelW, y, dateW, h);

  return y + h;
}

// =================================================================
//  VI. VOLUNTARY WORK
// =================================================================

function drawVoluntaryWork(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Column positions
  const V0 = X0;             // 20  - Organization name
  const V1 = V0 + 230;       // 250 - From
  const V2 = V1 + 40;        // 290 - To
  const V3 = V2 + 40;        // 330 - Number of Hours
  const V4 = V3 + 35;        // 365 - Position / Nature of Work
  const V5 = X6;              // 592

  const headerH = RH + 4;
  const subHeaderH = RH - 4;

  // ── Header Row 1 ──

  // "29. NAME & ADDRESS OF ORGANIZATION" — spans 2 header rows
  drawCell(doc, V0, y, V1 - V0, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('29.', V0 + 3, y + 8);
  doc.text('NAME & ADDRESS OF ORGANIZATION', V0 + (V1 - V0) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full)', V0 + (V1 - V0) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "INCLUSIVE DATES (dd/mm/yyyy)" — row 1 only, spans From + To
  drawCell(doc, V1, y, V3 - V1, headerH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('INCLUSIVE DATES', V1 + (V3 - V1) / 2, y + headerH / 2 - 2, { align: 'center' });
  doc.text('(dd/mm/yyyy)', V1 + (V3 - V1) / 2, y + headerH / 2 + 6, { align: 'center' });

  // "NUMBER OF HOURS" — spans 2 header rows
  drawCell(doc, V3, y, V4 - V3, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('NUMBER', V3 + (V4 - V3) / 2, y + (headerH + subHeaderH) / 2 - 5, { align: 'center' });
  doc.text('OF', V3 + (V4 - V3) / 2, y + (headerH + subHeaderH) / 2 + 3, { align: 'center' });
  doc.text('HOURS', V3 + (V4 - V3) / 2, y + (headerH + subHeaderH) / 2 + 11, { align: 'center' });

  // "POSITION / NATURE OF WORK" — spans 2 header rows
  drawCell(doc, V4, y, V5 - V4, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('POSITION / NATURE OF WORK', V4 + (V5 - V4) / 2, y + (headerH + subHeaderH) / 2 + 2, { align: 'center' });

  // ── Header Row 2 (From / To) ──
  const subY = y + headerH;
  drawCell(doc, V1, subY, V2 - V1, subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('From', V1 + (V2 - V1) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });
  drawCell(doc, V2, subY, V3 - V2, subHeaderH, { fill: LABEL_BG });
  doc.text('To', V2 + (V3 - V2) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });

  y += headerH + subHeaderH;

  // ── Data Rows (7 rows) ──
  const volWork = d.voluntaryWork || [];
  const volRows = 7;

  for (let i = 0; i < volRows; i++) {
    const vw = volWork[i];
    const rowH = RH;

    drawCell(doc, V0, y, V1 - V0, rowH);
    if (vw?.organization) putValue(doc, vw.organization, V0, y, rowH, { size: 6 });

    drawCell(doc, V1, y, V2 - V1, rowH);
    if (vw?.period?.from) putValue(doc, fmtDate(vw.period.from), V1, y, rowH, { size: 6 });

    drawCell(doc, V2, y, V3 - V2, rowH);
    if (vw?.period?.to) putValue(doc, fmtDate(vw.period.to), V2, y, rowH, { size: 6 });

    drawCell(doc, V3, y, V4 - V3, rowH);
    if (vw?.numberOfHours) putValue(doc, vw.numberOfHours, V3, y, rowH, { size: 6.5 });

    drawCell(doc, V4, y, V5 - V4, rowH);
    if (vw?.position) putValue(doc, vw.position, V4, y, rowH, { size: 6 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)"
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  VII. LEARNING AND DEVELOPMENT
// =================================================================

function drawLearningDevelopment(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Column positions
  const L0 = X0;             // 20  - Title
  const L1 = L0 + 230;       // 250 - From
  const L2 = L1 + 40;        // 290 - To
  const L3 = L2 + 40;        // 330 - Number of Hours
  const L4 = L3 + 28;        // 358 - Type of L&D
  const L5 = L4 + 45;        // 403 - Conducted/Sponsored By
  const L6 = X6;              // 592

  const headerH = RH + 8;
  const subHeaderH = RH - 4;

  // ── Header Row 1 ──

  // "30. TITLE OF LEARNING AND DEVELOPMENT..." — spans 2 header rows
  drawCell(doc, L0, y, L1 - L0, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('30.', L0 + 3, y + 8);
  doc.text('TITLE OF LEARNING AND DEVELOPMENT INTERVENTIONS/TRAINING PROGRAMS', L0 + (L1 - L0) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full)', L0 + (L1 - L0) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // "INCLUSIVE DATES OF ATTENDANCE (dd/mm/yyyy)" — row 1 only, spans From + To
  drawCell(doc, L1, y, L3 - L1, headerH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('INCLUSIVE DATES OF', L1 + (L3 - L1) / 2, y + headerH / 2 - 6, { align: 'center' });
  doc.text('ATTENDANCE', L1 + (L3 - L1) / 2, y + headerH / 2 + 1, { align: 'center' });
  doc.text('(dd/mm/yyyy)', L1 + (L3 - L1) / 2, y + headerH / 2 + 8, { align: 'center' });

  // "NUMBER OF HOURS" — spans 2 header rows
  drawCell(doc, L3, y, L4 - L3, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('NUMBER', L3 + (L4 - L3) / 2, y + (headerH + subHeaderH) / 2 - 5, { align: 'center' });
  doc.text('OF', L3 + (L4 - L3) / 2, y + (headerH + subHeaderH) / 2 + 3, { align: 'center' });
  doc.text('HOURS', L3 + (L4 - L3) / 2, y + (headerH + subHeaderH) / 2 + 11, { align: 'center' });

  // "Type of L&D (Managerial/ Supervisory/ Technical(s))" — spans 2 header rows
  drawCell(doc, L4, y, L5 - L4, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(4.5);
  doc.text('Type of L&D', L4 + (L5 - L4) / 2, y + (headerH + subHeaderH) / 2 - 7, { align: 'center' });
  doc.text('( Managerial/', L4 + (L5 - L4) / 2, y + (headerH + subHeaderH) / 2, { align: 'center' });
  doc.text('Supervisory/', L4 + (L5 - L4) / 2, y + (headerH + subHeaderH) / 2 + 7, { align: 'center' });
  doc.text('Technical(s))', L4 + (L5 - L4) / 2, y + (headerH + subHeaderH) / 2 + 14, { align: 'center' });

  // "CONDUCTED/ SPONSORED BY" — spans 2 header rows
  drawCell(doc, L5, y, L6 - L5, headerH + subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('CONDUCTED/ SPONSORED BY', L5 + (L6 - L5) / 2, y + (headerH + subHeaderH) / 2 - 3, { align: 'center' });
  doc.text('(Write in full)', L5 + (L6 - L5) / 2, y + (headerH + subHeaderH) / 2 + 5, { align: 'center' });

  // ── Header Row 2 (From / To) ──
  const subY = y + headerH;
  drawCell(doc, L1, subY, L2 - L1, subHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('From', L1 + (L2 - L1) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });
  drawCell(doc, L2, subY, L3 - L2, subHeaderH, { fill: LABEL_BG });
  doc.text('To', L2 + (L3 - L2) / 2, subY + subHeaderH / 2 + 2, { align: 'center' });

  y += headerH + subHeaderH;

  // ── Data Rows ──
  const ld = d.learningDevelopment || [];
  // Calculate rows to fill space before Other Information section
  // Other Info needs: section header(15) + header row(RH) + 7 data rows(7*RH) + continue row(RH-4) + signature(RH+2) + footer margin(25)
  const otherInfoH = 15 + RH + 7 * RH + (RH - 4) + (RH + 2) + 25;
  const availableH = PH - y - (RH - 4) - otherInfoH; // subtract continue row + other info
  const ldRows = Math.floor(availableH / RH);

  for (let i = 0; i < ldRows; i++) {
    const item = ld[i];
    const rowH = RH;

    drawCell(doc, L0, y, L1 - L0, rowH);
    if (item?.title) putValue(doc, item.title, L0, y, rowH, { size: 6 });

    drawCell(doc, L1, y, L2 - L1, rowH);
    if (item?.period?.from) putValue(doc, fmtDate(item.period.from), L1, y, rowH, { size: 6 });

    drawCell(doc, L2, y, L3 - L2, rowH);
    if (item?.period?.to) putValue(doc, fmtDate(item.period.to), L2, y, rowH, { size: 6 });

    drawCell(doc, L3, y, L4 - L3, rowH);
    if (item?.numberOfHours) putValue(doc, item.numberOfHours, L3, y, rowH, { size: 6.5 });

    drawCell(doc, L4, y, L5 - L4, rowH);
    if (item?.type) putValue(doc, item.type, L4, y, rowH, { size: 5.5 });

    drawCell(doc, L5, y, L6 - L5, rowH);
    if (item?.conductor) putValue(doc, item.conductor, L5, y, rowH, { size: 6 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)"
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  VIII. OTHER INFORMATION
// =================================================================

function drawOtherInformation(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // 3 equal-width columns
  const O0 = X0;
  const O1 = X0 + Math.round(CW / 3);
  const O2 = X0 + Math.round(CW * 2 / 3);
  const O3 = X6;

  // ── Header Row ──
  const headerH = RH + 2;

  // "31. SPECIAL SKILLS and HOBBIES"
  drawCell(doc, O0, y, O1 - O0, headerH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('31.', O0 + 3, y + 7);
  doc.text('SPECIAL SKILLS and HOBBIES', O0 + (O1 - O0) / 2, y + headerH / 2 + 2, { align: 'center' });

  // "32. NON-ACADEMIC DISTINCTIONS / RECOGNITION"
  drawCell(doc, O1, y, O2 - O1, headerH, { fill: LABEL_BG });
  doc.text('32.', O1 + 3, y + 7);
  doc.text('NON-ACADEMIC DISTINCTIONS / RECOGNITION', O1 + (O2 - O1) / 2, y + headerH / 2 - 2, { align: 'center' });
  doc.text('(Write in full)', O1 + (O2 - O1) / 2, y + headerH / 2 + 6, { align: 'center' });

  // "33. MEMBERSHIP IN ASSOCIATION/ORGANIZATION"
  drawCell(doc, O2, y, O3 - O2, headerH, { fill: LABEL_BG });
  doc.text('33.', O2 + 3, y + 7);
  doc.text('MEMBERSHIP IN ASSOCIATION/ORGANIZATION', O2 + (O3 - O2) / 2, y + headerH / 2 - 2, { align: 'center' });
  doc.text('(Write in full)', O2 + (O3 - O2) / 2, y + headerH / 2 + 6, { align: 'center' });

  y += headerH;

  // ── Data Rows (7 rows) ──
  const skills = d.specialSkills || [];
  const distinctions = d.nonAcademicDistinctions || [];
  const memberships = d.membershipInAssociations || [];
  const otherRows = 7;

  for (let i = 0; i < otherRows; i++) {
    const rowH = RH;

    drawCell(doc, O0, y, O1 - O0, rowH);
    if (skills[i]) putValue(doc, skills[i], O0, y, rowH, { size: 6 });

    drawCell(doc, O1, y, O2 - O1, rowH);
    if (distinctions[i]) putValue(doc, distinctions[i], O1, y, rowH, { size: 6 });

    drawCell(doc, O2, y, O3 - O2, rowH);
    if (memberships[i]) putValue(doc, memberships[i], O2, y, rowH, { size: 6 });

    y += rowH;
  }

  // "(Continue on separate sheet if necessary)"
  drawCell(doc, X0, y, CW, RH - 4, { fill: LABEL_BG });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('(Continue on separate sheet if necessary)', X0 + CW / 2, y + (RH - 4) / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);
  y += RH - 4;

  return y;
}

// =================================================================
//  PAGE 4 — QUESTIONS 34-40
// =================================================================

function drawQuestions(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;
  const q = d.questions || {} as PDSData['questions'];

  // Left (question) / Right (answer) split
  const QX = X0;
  const AX = X0 + 320;
  const AXR = X6;

  // Helper: draw YES/NO answer area
  function drawYesNo(
    qY: number, rowH: number,
    isYes: boolean,
    opts?: { detailsLabel?: string; detailsValue?: string; extraLines?: { label: string; value: string }[] }
  ) {
    drawCell(doc, AX, qY, AXR - AX, rowH);

    const cbY = qY + 4;
    drawCheckbox(doc, AX + 15, cbY, isYes);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...BLACK);
    doc.text('YES', AX + 27, cbY + 6);

    drawCheckbox(doc, AX + 100, cbY, !isYes && isYes !== undefined);
    doc.text('NO', AX + 112, cbY + 6);

    if (opts?.detailsLabel !== undefined) {
      const dlabel = opts.detailsLabel || 'If YES, give details:';
      doc.setFontSize(6);
      doc.text(dlabel, AX + 5, cbY + 17);
      if (opts.detailsValue) {
        doc.setFontSize(6.5);
        const labelW = doc.getTextWidth(dlabel);
        doc.text(opts.detailsValue, AX + 7 + labelW, cbY + 17);
      }
    }

    if (opts?.extraLines) {
      let extraY = cbY + 25;
      for (const line of opts.extraLines) {
        doc.setFontSize(6);
        doc.text(line.label, AX + 15, extraY);
        if (line.value) {
          const lw = doc.getTextWidth(line.label);
          doc.setFontSize(6.5);
          doc.text(line.value, AX + 17 + lw, extraY);
        }
        extraY += 9;
      }
    }
  }

  // ── Q34: Related by consanguinity ──
  const q34H = 80;
  drawCell(doc, QX, y, AX - QX, q34H, { fill: LABEL_BG });
  drawCell(doc, AX, y, AXR - AX, q34H);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text('34.', QX + 3, y + 9);
  const q34lines = doc.splitTextToSize(
    'Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed,',
    AX - QX - 25
  );
  q34lines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });

  const q34aTextY = y + 9 + q34lines.length * 8;
  doc.text('a. within the third degree?', QX + 17, q34aTextY);
  doc.text('b. within the fourth degree (for Local Government Unit - Career Employees)?', QX + 17, q34aTextY + 10);

  // 34a YES/NO
  const ans34aY = q34aTextY - 12;
  drawCheckbox(doc, AX + 15, ans34aY, q.q34a === 'YES');
  doc.setFontSize(6.5);
  doc.text('YES', AX + 27, ans34aY + 6);
  drawCheckbox(doc, AX + 100, ans34aY, q.q34a === 'NO');
  doc.text('NO', AX + 112, ans34aY + 6);

  // 34b YES/NO
  const ans34bY = ans34aY + 14;
  drawCheckbox(doc, AX + 15, ans34bY, q.q34b === 'YES');
  doc.text('YES', AX + 27, ans34bY + 6);
  drawCheckbox(doc, AX + 100, ans34bY, q.q34b === 'NO');
  doc.text('NO', AX + 112, ans34bY + 6);

  doc.setFontSize(6);
  doc.text('If YES, give details:', AX + 5, ans34bY + 20);
  if (q.q34aDetails || q.q34bDetails) {
    doc.setFontSize(6.5);
    doc.text(v(q.q34aDetails || q.q34bDetails), AX + 80, ans34bY + 20);
  }
  y += q34H;

  // ── Q35: Administrative offense (a) + Criminally charged (b) ──
  // Single rowspanned question label cell; separate answer/checkbox cells
  const q35aH = 42;
  const q35bH = 55;
  const q35TotalH = q35aH + q35bH;

  // Rowspanned question label cell (left side)
  drawCell(doc, QX, y, AX - QX, q35TotalH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text('35.', QX + 3, y + 9);
  doc.text('a. Have you ever been found guilty of any administrative offense?', QX + 17, y + 9);
  doc.text('b. Have you been criminally charged before any court?', QX + 17, y + q35aH + 9);

  // Q35a answer cell (right side)
  drawYesNo(y, q35aH, q.q35a === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q35aDetails),
  });
  y += q35aH;

  // Q35b answer cell (right side)
  drawYesNo(y, q35bH, q.q35b === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q35bDetails),
    extraLines: [
      { label: 'Date Filed:', value: fmtDate(q.q35bDateFiled) },
      { label: 'Status of Case/s:', value: v(q.q35bStatus) },
    ],
  });
  y += q35bH;

  // ── Q36: Convicted of crime ──
  const q36H = 38;
  drawCell(doc, QX, y, AX - QX, q36H, { fill: LABEL_BG });
  doc.setFontSize(6.5);
  doc.text('36.', QX + 3, y + 9);
  const q36lines = doc.splitTextToSize(
    'Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?',
    AX - QX - 25
  );
  q36lines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });
  drawYesNo(y, q36H, q.q36 === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q36Details),
  });
  y += q36H;

  // ── Q37: Separated from service ──
  const q37H = 46;
  drawCell(doc, QX, y, AX - QX, q37H, { fill: LABEL_BG });
  doc.setFontSize(6.5);
  doc.text('37.', QX + 3, y + 9);
  const q37lines = doc.splitTextToSize(
    'Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?',
    AX - QX - 25
  );
  q37lines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });
  drawYesNo(y, q37H, q.q37 === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q37Details),
  });
  y += q37H;

  // ── Q38: Candidate in election (a) + Resigned for campaign (b) ──
  // Single rowspanned question label cell; separate answer/checkbox cells
  const q38aH = 38;
  const q38bH = 38;
  const q38TotalH = q38aH + q38bH;

  // Rowspanned question label cell (left side)
  drawCell(doc, QX, y, AX - QX, q38TotalH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text('38.', QX + 3, y + 9);
  const q38alines = doc.splitTextToSize(
    'a. Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?',
    AX - QX - 25
  );
  q38alines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });
  const q38blines = doc.splitTextToSize(
    'b. Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?',
    AX - QX - 25
  );
  q38blines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + q38aH + 9 + i * 8);
  });

  // Q38a answer cell (right side)
  drawYesNo(y, q38aH, q.q38a === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q38aDetails),
  });
  y += q38aH;

  // Q38b answer cell (right side)
  drawYesNo(y, q38bH, q.q38b === 'YES', {
    detailsLabel: 'If YES, give details:',
    detailsValue: v(q.q38bDetails),
  });
  y += q38bH;

  // ── Q39: Immigrant / permanent resident ──
  const q39H = 44;
  drawCell(doc, QX, y, AX - QX, q39H, { fill: LABEL_BG });
  doc.setFontSize(6.5);
  doc.text('39.', QX + 3, y + 9);
  const q39lines = doc.splitTextToSize(
    'Have you acquired the status of an immigrant or permanent resident of another country?',
    AX - QX - 25
  );
  q39lines.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });
  drawYesNo(y, q39H, q.q39 === 'YES', {
    detailsLabel: 'If YES, give details (country):',
    detailsValue: v(q.q39Details),
  });
  y += q39H;

  // ── Q40: Indigenous, PWD, Solo Parent ──
  // Intro + a/b/c merged into one rowspanned left label cell; separate answer cells on right
  const q40IntroH = 36;
  const q40aH = 28;
  const q40bH = 28;
  const q40cH = 28;
  const q40TotalH = q40IntroH + q40aH + q40bH + q40cH;

  // Single rowspanned question label cell (left side) spanning intro + a/b/c
  drawCell(doc, QX, y, AX - QX, q40TotalH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text('40.', QX + 3, y + 9);
  const q40intro = doc.splitTextToSize(
    'Pursuant to: (a) Indigenous People\'s Act (RA 8371); (b) Magna Carta for Disabled Persons (RA 7277, as amended); and (c) Expanded Solo Parents Welfare Act (RA 11861), please answer the following items:',
    AX - QX - 25
  );
  q40intro.forEach((line: string, i: number) => {
    doc.text(line, QX + 17, y + 9 + i * 8);
  });

  // Sub-question text within the same label cell
  const q40subY = y + q40IntroH;
  doc.text('a.', QX + 17, q40subY + 9);
  doc.text('Are you a member of any indigenous group?', QX + 27, q40subY + 9);
  doc.text('b.', QX + 17, q40subY + q40aH + 9);
  doc.text('Are you a person with disability?', QX + 27, q40subY + q40aH + 9);
  doc.text('c.', QX + 17, q40subY + q40aH + q40bH + 9);
  doc.text('Are you a solo parent?', QX + 27, q40subY + q40aH + q40bH + 9);

  // Intro answer area (right side, no checkboxes — just empty cell for intro row)
  drawCell(doc, AX, y, AXR - AX, q40IntroH);
  y += q40IntroH;

  // Q40a answer cell (right side)
  drawYesNo(y, q40aH, q.q40a === 'YES', {
    detailsLabel: 'If YES, please specify:',
    detailsValue: v(q.q40aDetails),
  });
  y += q40aH;

  // Q40b answer cell (right side)
  drawYesNo(y, q40bH, q.q40b === 'YES', {
    detailsLabel: 'If YES, please specify ID No:',
    detailsValue: v(q.q40bDetails),
  });
  y += q40bH;

  // Q40c answer cell (right side)
  drawYesNo(y, q40cH, q.q40c === 'YES', {
    detailsLabel: 'If YES, please specify ID No:',
    detailsValue: v(q.q40cDetails),
  });
  y += q40cH;

  return y;
}

// =================================================================
//  41. REFERENCES
// =================================================================

function drawReferences(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;
  const refs = d.references || [];

  // Photo box dimensions
  const photoW = 140;
  const photoX = X6 - photoW;

  // Title row — spans only up to the photo box
  const titleH = 22;
  drawCell(doc, X0, y, photoX - X0, titleH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLACK);
  doc.text('41.', X0 + 3, y + 9);
  doc.text('REFERENCES', X0 + 17, y + 9);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5);
  doc.text('(Person not related by consanguinity or affinity to applicant /appointee)', X0 + 62, y + 9);

  // Column positions — R2 aligns with AX (YES checkbox column from questions)
  const R0 = X0;
  const R1 = R0 + 170;
  const R2 = X0 + 320;       // aligned with AX from questions

  const refRowH = 24; // reference rows
  const refHeaderH = refRowH;
  const refDataRows = 3;
  const refDataH = refDataRows * refRowH;
  const photoOverlapH = 62; // photo extends into declaration area to align with thumbmark
  const photoH = titleH + refHeaderH + refDataH + photoOverlapH;

  // Photo box (spans from title row top through all reference rows)
  const photoPad = 4;
  drawCell(doc, photoX, y, photoW, photoH);

  // Inner table (bordered, with padding): 2 rows — big space + small label
  const pix = photoX + photoPad;
  const piy = y + photoPad;
  const piW = photoW - photoPad * 2;
  const piH = photoH - photoPad * 2;
  const piLabelH = 10; // small PHOTO label row, same as date accomplished
  const piSpaceH = piH - piLabelH;

  // Inner Row 1: big space with passport text (no bg)
  drawCell(doc, pix, piy, piW, piSpaceH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...BLACK);
  doc.text('Passport-sized unfiltered digital', pix + piW / 2, piy + piSpaceH / 2 - 10, { align: 'center' });
  doc.text('picture taken within', pix + piW / 2, piy + piSpaceH / 2 - 3, { align: 'center' });
  doc.text('the last 6 months', pix + piW / 2, piy + piSpaceH / 2 + 4, { align: 'center' });
  doc.text('4.5 cm. X 3.5 cm', pix + piW / 2, piy + piSpaceH / 2 + 11, { align: 'center' });

  // Inner Row 2: PHOTO label with LABEL_BG
  const piLabelY = piy + piSpaceH;
  drawCell(doc, pix, piLabelY, piW, piLabelH, { fill: LABEL_BG });
  doc.setFontSize(6);
  doc.text('PHOTO', pix + piW / 2, piLabelY + piLabelH / 2 + 2, { align: 'center' });

  y += titleH;

  // Header row
  drawCell(doc, R0, y, R1 - R0, refHeaderH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLACK);
  doc.text('NAME', R0 + (R1 - R0) / 2, y + refHeaderH / 2 + 2, { align: 'center' });

  drawCell(doc, R1, y, R2 - R1, refHeaderH, { fill: LABEL_BG });
  doc.text('OFFICE / RESIDENTIAL ADDRESS', R1 + (R2 - R1) / 2, y + refHeaderH / 2 + 2, { align: 'center' });

  drawCell(doc, R2, y, photoX - R2, refHeaderH, { fill: LABEL_BG });
  doc.setFontSize(5);
  doc.text('CONTACT NO. AND/OR', R2 + (photoX - R2) / 2, y + refHeaderH / 2 - 2, { align: 'center' });
  doc.text('EMAIL', R2 + (photoX - R2) / 2, y + refHeaderH / 2 + 6, { align: 'center' });

  y += refHeaderH;

  // Data rows (3 references)
  for (let i = 0; i < refDataRows; i++) {
    const ref = refs[i];
    const rowH = refRowH;

    drawCell(doc, R0, y, R1 - R0, rowH);
    if (ref?.name) putValue(doc, ref.name, R0, y, rowH, { size: 6 });

    drawCell(doc, R1, y, R2 - R1, rowH);
    if (ref?.address) putValue(doc, ref.address, R1, y, rowH, { size: 6 });

    drawCell(doc, R2, y, photoX - R2, rowH);
    if (ref?.telephoneNo || ref?.email) {
      const contact = [ref.telephoneNo, ref.email].filter(Boolean).join(' / ');
      putValue(doc, contact, R2, y, rowH, { size: 5.5 });
    }

    y += rowH;
  }

  // photo box extends below into declaration area — don't add overlap to y

  return y;
}

// =================================================================
//  42. DECLARATION + GOV ID + SIGNATURE + PHOTO
// =================================================================

function drawDeclaration(doc: jsPDF, startY: number, d: PDSData): number {
  let y = startY;

  // Split into left (declaration + gov ID) and right (photo/signature/thumbmark)
  const photoW = 140;
  const rightX = X6 - photoW;
  const declW = rightX - X0;
  const rightW = photoW;

  // Row heights
  const declH = 62;
  const govTitleH = 18;
  const govRowH = 24;
  const pad = 4; // padding between parent border and inner table
  const govInnerH = govTitleH + govRowH * 3;
  const govOuterH = govInnerH + pad * 2;
  const dateRowH = govRowH; // Date Accomplished / Right Thumbmark row
  const smallLabelH = 10;   // reduced height for small label rows (sig/date/thumbmark)

  // ── Declaration text (left) ──
  drawCell(doc, X0, y, declW, declH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text('42.', X0 + 3, y + 9);
  const declText = 'I declare under oath that I have personally accomplished this Personal Data Sheet which is a true, correct, and complete statement pursuant to the provisions of pertinent laws, rules, and regulations of the Republic of the Philippines. I authorize the agency head/authorized representative to verify/validate the contents stated herein. I agree that any misrepresentation made in this document and its attachments shall cause the filing of administrative/criminal case/s against me.';
  const declLines = doc.splitTextToSize(declText, declW - 25);
  declLines.forEach((line: string, i: number) => {
    doc.text(line, X0 + 17, y + 9 + i * 8);
  });

  // ── Right: Right Thumbmark inner table (gov ID area only, photo covers above) ──
  // Photo box from references overlaps the declaration right side
  const thumbParentY = y + declH;
  const thumbParentH = govOuterH;
  drawCell(doc, rightX, thumbParentY, rightW, thumbParentH);

  // Inner table (bordered, with padding from parent): 2 rows
  const rx = rightX + pad;
  const ry = thumbParentY + pad;
  const rInnerW = rightW - pad * 2;
  const rInnerH = thumbParentH - pad * 2;
  const rLabelH = smallLabelH;              // small label row, same as date accomplished
  const rSpaceH = rInnerH - rLabelH;        // big empty space

  // Inner Row 1: big empty space
  drawCell(doc, rx, ry, rInnerW, rSpaceH);

  // Inner Row 2: "Right Thumbmark" label with LABEL_BG
  const rLabelY = ry + rSpaceH;
  drawCell(doc, rx, rLabelY, rInnerW, rLabelH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('Right Thumbmark', rx + rInnerW / 2, rLabelY + rLabelH / 2 + 2, { align: 'center' });

  y += declH;

  // ── Government Issued ID — inner table inside a parent bordered cell with padding ──
  const govOuterW = declW / 2;
  const govInnerW = govOuterW - pad * 2;
  const sigAreaX = X0 + govOuterW;
  const sigAreaW = declW / 2;

  // Parent bordered cell (outer wrapper)
  drawCell(doc, X0, y, govOuterW, govOuterH);

  // Inner table positions (inset by padding)
  const gx = X0 + pad;
  const gy = y + pad;

  // Inner header row (LABEL_BG)
  drawCell(doc, gx, gy, govInnerW, govTitleH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...BLACK);
  doc.text('Government Issued ID', gx + 5, gy + 7);
  doc.setFontSize(4.5);
  doc.text('(i.e.Passport, GSIS, SSS, PRC, Driver\'s License, etc.)', gx + 80, gy + 7);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(5.5);
  doc.text('PLEASE INDICATE ID Number and Date of Issuance', gx + 5, gy + 15);

  // Inner Row 1: Government Issued ID
  const gr1Y = gy + govTitleH;
  drawCell(doc, gx, gr1Y, govInnerW, govRowH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('Government Issued ID:', gx + 5, gr1Y + govRowH / 2 + 2);
  doc.setFontSize(6.5);
  doc.text(v(d.governmentIssuedId), gx + 88, gr1Y + govRowH / 2 + 2);

  // Inner Row 2: ID/License/Passport No.
  const gr2Y = gr1Y + govRowH;
  drawCell(doc, gx, gr2Y, govInnerW, govRowH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('ID/License/Passport No.:', gx + 5, gr2Y + govRowH / 2 + 2);
  doc.setFontSize(6.5);
  doc.text(v(d.governmentIdNo), gx + 95, gr2Y + govRowH / 2 + 2);

  // Inner Row 3: Date/Place of Issuance
  const gr3Y = gr2Y + govRowH;
  drawCell(doc, gx, gr3Y, govInnerW, govRowH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Date/Place of Issuance:', gx + 5, gr3Y + govRowH / 2 + 2);
  doc.setFontSize(6.5);
  doc.text(v(d.governmentIdIssuance), gx + 90, gr3Y + govRowH / 2 + 2);

  // ── Right side: Signature — inner table inside a parent bordered cell with padding ──
  const sigInnerW = sigAreaW - pad * 2;
  const sx = sigAreaX + pad;
  const sy = y + pad;

  // Inner row heights must sum to govInnerH (same as left side)
  const sigRow2H = smallLabelH;         // "Signature (Sign inside the box)" label
  const sigRow3H = govRowH;             // empty space for date value
  const sigRow4H = smallLabelH;         // "Date Accomplished" label
  const sigRow1H = govInnerH - sigRow2H - sigRow3H - sigRow4H; // big space with e-signature text

  // Parent bordered cell (outer wrapper)
  drawCell(doc, sigAreaX, y, sigAreaW, govOuterH);

  // Inner Row 1: big space with e-signature note
  drawCell(doc, sx, sy, sigInnerW, sigRow1H);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(200, 0, 0);
  doc.text('(wet signature/e-signature/digital certificate)', sx + sigInnerW / 2, sy + sigRow1H / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);

  // Inner Row 2: "Signature (Sign inside the box)" label (LABEL_BG)
  const sr2Y = sy + sigRow1H;
  drawCell(doc, sx, sr2Y, sigInnerW, sigRow2H, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('Signature (Sign inside the box)', sx + sigInnerW / 2, sr2Y + sigRow2H / 2 + 2, { align: 'center' });

  // Inner Row 3: empty space for date value
  const sr3Y = sr2Y + sigRow2H;
  drawCell(doc, sx, sr3Y, sigInnerW, sigRow3H);

  // Inner Row 4: "Date Accomplished" label (LABEL_BG)
  const sr4Y = sr3Y + sigRow3H;
  drawCell(doc, sx, sr4Y, sigInnerW, sigRow4H, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('Date Accomplished', sx + sigInnerW / 2, sr4Y + sigRow4H / 2 + 2, { align: 'center' });

  y += govOuterH;

  return y;
}

// =================================================================
//  OATH SECTION (bottom of page 4)
// =================================================================

function drawOathSection(doc: jsPDF, startY: number): number {
  let y = startY + 8;

  // "SUBSCRIBED AND SWORN to before me this _______ ,affiant exhibiting..."
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  const swornPart1 = 'SUBSCRIBED AND SWORN to before me this';
  const swornPart2 = ',affiant exhibiting his/her validly issued government ID as indicated above.';

  // Position left-aligned with some indent
  const swornX = X0 + 40;
  doc.text(swornPart1, swornX, y + 8);
  const p1W = doc.getTextWidth(swornPart1);
  // Blank line for date
  doc.line(swornX + p1W + 3, y + 10, swornX + p1W + 55, y + 10);
  // Continuation after blank
  doc.text(swornPart2, swornX + p1W + 57, y + 8);

  y += 22;

  // ── Wet signature / Person Administering Oath — bordered table with padding ──
  const oathPad = 4;
  const oathBoxW = 240;
  const oathBoxX = X0 + (CW - oathBoxW) / 2;
  const oathLabelH = 12;
  const oathSpaceH = 36;
  const oathBoxH = oathSpaceH + oathLabelH + oathPad * 2;

  // Parent cell (no border)
  drawCell(doc, oathBoxX, y, oathBoxW, oathBoxH, { noBorder: true });

  // Inner positions
  const oix = oathBoxX + oathPad;
  const oiy = y + oathPad;
  const oiW = oathBoxW - oathPad * 2;

  // Inner Row 1: big space with wet signature text
  drawCell(doc, oix, oiy, oiW, oathSpaceH);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(200, 0, 0);
  doc.text('(wet signature/e-signature/digital certificate except for notary public)', oix + oiW / 2, oiy + oathSpaceH / 2 + 2, { align: 'center' });
  doc.setTextColor(...BLACK);

  // Inner Row 2: "Person Administering Oath" label with LABEL_BG
  const oaLabelY = oiy + oathSpaceH;
  drawCell(doc, oix, oaLabelY, oiW, oathLabelH, { fill: LABEL_BG });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...BLACK);
  doc.text('Person Administering Oath', oix + oiW / 2, oaLabelY + oathLabelH / 2 + 2, { align: 'center' });

  y += oathBoxH + 4;

  return y;
}
