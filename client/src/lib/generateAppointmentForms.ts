import jsPDF from 'jspdf';
import type { Appointment, PDSData } from '@/types';

/**
 * The three CSC forms issued from an appointment, as PDFs:
 *
 *   CS Form No. 33-A (Revised 2025) — Appointment Form (Regulated)
 *   CS Form No. 32   (Revised 2017) — Oath of Office
 *   CS Form No. 4    (Revised 2025) — Certification of Assumption to Duty
 *
 * Known values print in bold on the form's ruled lines; anything the system does not hold prints
 * as an empty ruled line so it can be written in.
 */

const PAGE_W = 612; // 8.5in
const PAGE_H = 936; // 13in folio, matching the other CSC forms in this app
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Shading taken from the CS Form 33-A source document's shape fills:
 *   #A5A5A5 — top header band (form number + stamp of receipt)
 *   #A6A6A6 — Certification blocks and CSC Notation
 *   #F2F2F2 — DRY SEAL boxes
 * CS Form 32 and CS Form 4 carry no shading in their sources, so they stay plain.
 */
const GREY_PAGE: [number, number, number] = [166, 166, 166];
// The grey field is inset from the page edge — the sheet keeps a white margin around it.
const GREY_X = 30;
const GREY_Y = 22;
const GREY_W = PAGE_W - GREY_X * 2;
const GREY_H = PAGE_H - GREY_Y * 2;
const CARD_X = GREY_X + 14;
const CARD_W = GREY_W - 28;
const GREY_BAND: [number, number, number] = [165, 165, 165];
const GREY_BLOCK: [number, number, number] = [166, 166, 166];
const GREY_SEAL: [number, number, number] = [242, 242, 242];

type Doc = jsPDF;

const newDoc = () => new jsPDF({ unit: 'pt', format: [PAGE_W, PAGE_H] });

/** Appointee's full name, preferring the PDS (the account record has no middle name). */
function fullName(appointment: Appointment, pds: PDSData | null): string {
  if (pds) {
    const joined = [pds.firstName, pds.middleName, pds.surname, pds.nameExtension]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (joined) return joined;
  }
  const applicant = appointment.application?.applicant;
  return applicant ? `${applicant.firstName} ${applicant.lastName}` : '';
}

const fmtDate = (value?: string | null, pattern: 'long' | 'monthDay' | 'yy' | 'year' = 'long') => {
  if (!value) return '';
  const d = new Date(value);
  if (pattern === 'monthDay') return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (pattern === 'yy') return String(d.getFullYear()).slice(2);
  if (pattern === 'year') return String(d.getFullYear());
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Draws a ruled line with the value centred on it. Empty value leaves it blank to write on. */
function ruled(doc: Doc, x: number, y: number, w: number, value?: string | number | null, size = 11) {
  doc.setDrawColor(0).setLineWidth(0.6);
  doc.line(x, y + 2, x + w, y + 2);
  const text = value == null || value === '' ? '' : String(value);
  if (!text) return;
  doc.setFont('times', 'bold').setFontSize(size);
  const fitted = doc.splitTextToSize(text, w - 4)[0] as string;
  doc.text(fitted, x + w / 2, y, { align: 'center' });
}

/** Bold caption under a ruled line — the form sets these bold, not italic. */
function boldCaption(doc: Doc, x: number, y: number, w: number, text: string) {
  doc.setFont('times', 'bold').setFontSize(9);
  doc.text(text, x + w / 2, y, { align: 'center' });
}

/** Small italic caption under a ruled line, e.g. "(Position Title)". */
function caption(doc: Doc, x: number, y: number, w: number, text: string) {
  doc.setFont('times', 'italic').setFontSize(7.5);
  doc.text(text, x + w / 2, y, { align: 'center' });
}

function agencyHeader(doc: Doc, y: number, agency: string, address?: string | null) {
  doc.setFont('times', 'normal').setFontSize(11);
  doc.text('Republic of the Philippines', PAGE_W / 2, y, { align: 'center' });
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text(agency || '(Name of Agency)', PAGE_W / 2, y + 15, { align: 'center' });
  if (address) {
    doc.setFont('times', 'normal').setFontSize(9);
    doc.text(address, PAGE_W / 2, y + 28, { align: 'center' });
  }
  return y + (address ? 44 : 32);
}

/** Boxed section with an optional centred title. Returns the y after the box. */
function boxSection(
  doc: Doc,
  y: number,
  height: number,
  title?: string,
  fill?: [number, number, number]
) {
  doc.setDrawColor(0).setLineWidth(0.6);
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(MARGIN, y, CONTENT_W, height, 'FD');
  } else {
    doc.rect(MARGIN, y, CONTENT_W, height);
  }
  if (title) {
    doc.setFont('times', 'bold').setFontSize(11);
    doc.text(title, PAGE_W / 2, y + 16, { align: 'center' });
  }
  return y + height;
}

/** Justified-ish paragraph. Returns the y after the last line. */
function paragraph(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  w: number,
  { size = 11, lineH = 18, indent = 0 } = {}
) {
  doc.setFont('times', 'normal').setFontSize(size);
  const first = doc.splitTextToSize(text, w - indent) as string[];
  // Re-wrap so only the first line carries the indent
  let lines = first;
  if (indent) {
    const firstLine = first[0];
    const rest = doc.splitTextToSize(text.slice(firstLine.length).trimStart(), w) as string[];
    lines = [firstLine, ...rest];
  }
  lines.forEach((line, i) => {
    doc.text(line, x + (i === 0 ? indent : 0), y + i * lineH);
  });
  return y + lines.length * lineH;
}

// ===================== CS Form No. 33-A — Appointment Form =====================

export function buildAppointmentFormDoc(appointment: Appointment, pds: PDSData | null): Doc {
  const doc = newDoc();
  const position = appointment.position;
  const lgu = position?.lgu;
  const name = fullName(appointment, pds);
  const office = position?.department?.name || position?.placeOfAssignment || '';
  const salary = position?.monthlySalary
    ? Number(position.monthlySalary).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '';

  // The form is a dark grey page with white bordered cards floating on it.
  const card = (top: number, height: number) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0).setLineWidth(1.4);
    doc.rect(CARD_X, top, CARD_W, height, 'FD');
  };
  const greyPage = () => {
    doc.setFillColor(...GREY_PAGE);
    doc.setDrawColor(0).setLineWidth(1);
    doc.rect(GREY_X, GREY_Y, GREY_W, GREY_H, 'FD');
  };

  // ---------- Page 1 ----------
  greyPage();

  // "For Regulated Agencies" sits above the grey field, top right
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0).setLineWidth(1);
  doc.rect(PAGE_W - 176, 6, 150, 20, 'FD');
  doc.setFont('times', 'bolditalic').setFontSize(10);
  doc.text('For Regulated Agencies', PAGE_W - 101, 20, { align: 'center' });

  const cardTop = GREY_Y + 22;
  const cardH = 690;
  card(cardTop, cardH);

  const L = CARD_X + 26; // inner left
  const R = CARD_X + CARD_W - 26; // inner right
  const innerW = R - L;
  let y = cardTop + 30;

  doc.setFont('times', 'bolditalic').setFontSize(12);
  doc.text('CS Form No. 33-A', L, y);
  doc.setFont('times', 'italic').setFontSize(10);
  doc.text('Revised 2025', L, y + 14);
  doc.setFont('times', 'bolditalic').setFontSize(10);
  doc.text('(Stamp of Date of Receipt)', R, y + 30, { align: 'right' });
  y += 62;

  // Agency header — the name line is ruled, as on the blank form
  doc.setFont('times', 'bold').setFontSize(14);
  doc.text('Republic of the Philippines', CARD_X + CARD_W / 2, y, { align: 'center' });
  y += 20;
  ruled(doc, CARD_X + CARD_W / 2 - 150, y, 300, lgu?.name || '(Name of Agency)', 13);
  y += 20;
  ruled(doc, CARD_X + CARD_W / 2 - 150, y, 300, lgu?.address || '', 10);
  y += 52;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('Mr./Mrs./ Ms.:', L, y);
  ruled(doc, L + 92, y, 230, name, 11);
  y += 30;

  // "You are hereby appointed as ___ ( SG/JG/PG ___ )"
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('You are hereby appointed as', L + 46, y);
  const posX = L + 220;
  const posW = innerW - 220 - 130;
  ruled(doc, posX, y, posW, position?.title, 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('( SG/JG/PG', posX + posW + 4, y);
  ruled(doc, posX + posW + 76, y, 34, position?.salaryGrade ?? '', 11);
  doc.text(')', posX + posW + 114, y);
  boldCaption(doc, posX, y + 12, posW, '(Position Title)');
  y += 34;

  // "under ___ status at the ___"
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('under', L - 20, y);
  ruled(doc, L + 24, y, 190, 'Permanent', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('status at the', L + 222, y);
  ruled(doc, L + 310, y, R - (L + 310), office, 11);
  boldCaption(doc, L + 24, y + 12, 190, '(Permanent, Temporary, etc.)');
  boldCaption(doc, L + 310, y + 12, R - (L + 310), '(Office/Department/Unit)');
  y += 36;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('with a compensation rate of', L - 20, y);
  ruled(doc, L + 150, y, innerW - 300, salary, 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('(Php', R - 130, y);
  ruled(doc, R - 96, y, 84, salary, 11);
  doc.text(')', R - 8, y);
  y += 16;
  doc.text('pesos per month.', L - 20, y);
  y += 40;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('The nature of this appointment is', L + 46, y);
  const natX = L + 250;
  const natW = innerW - 250 - 110;
  ruled(doc, natX, y, natW, '', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('vice', natX + natW + 8, y);
  ruled(doc, natX + natW + 38, y, R - (natX + natW + 38), '', 11);
  boldCaption(doc, natX, y + 12, natW, '(Original, Promotion, etc.)');
  y += 32;

  ruled(doc, L - 20, y, 200, '', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text(', who', L + 184, y);
  ruled(doc, L + 222, y, 150, '', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('with Plantilla Item No.', L + 378, y);
  ruled(doc, L + 508, y, R - (L + 508), position?.itemNumber, 10);
  boldCaption(doc, L - 20, y + 12, 200, '(Transferred, Retired, etc.)');
  y += 30;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('Page', L - 20, y);
  ruled(doc, L + 12, y, 60, '', 11);
  doc.text('.', L + 80, y);
  y += 44;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text(
    'This appointment shall take effect on the date of signing by the appointing officer/authority.',
    L + 46,
    y
  );
  y += 46;

  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('Very truly yours,', R - 150, y, { align: 'center' });
  y += 56;
  ruled(doc, R - 250, y, 250, '', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('Appointing Officer/Authority', R - 125, y + 15, { align: 'center' });
  y += 56;
  ruled(doc, R - 210, y, 180, '', 11);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('Date of Signing', R - 120, y + 15, { align: 'center' });

  // CSC ACTION card
  const actionTop = cardTop + cardH + 16;
  card(actionTop, GREY_Y + GREY_H - actionTop - 16);
  doc.setFont('times', 'bold').setFontSize(12);
  doc.text('CSC ACTION:', L, actionTop + 30);

  // ---------- Page 2 — certifications ----------
  doc.addPage([PAGE_W, PAGE_H]);
  greyPage();

  let cy = GREY_Y + 16;

  // Card A: the HRMO certification AND the publication paragraph share one card
  const certH = 292;
  card(cy, certH);
  doc.setFont('times', 'bold').setFontSize(13);
  doc.text('Certification', CARD_X + CARD_W / 2, cy + 28, { align: 'center' });

  doc.setFont('times', 'normal').setFontSize(11.5);
  let ty = cy + 54;
  (doc.splitTextToSize(
    'This is to certify that all requirements and supporting papers pursuant to the 2025 Omnibus Rules on Appointments and Other Human Resource Actions, have been complied with, reviewed, and found to be in order.',
    innerW
  ) as string[]).forEach((line, i) => doc.text(line, L + (i === 0 ? 40 : 0), ty + i * 19));
  ty += 3 * 19 + 16;

  // Publication paragraph. The blanks are inline, so each line is placed by hand and every
  // segment is kept inside `R` — an earlier version ran past the card border.
  const t = (text: string, x: number, yy: number) => {
    doc.setFont('times', 'normal').setFontSize(11.5);
    doc.text(text, x, yy);
  };

  t('The position was published at', L + 40, ty);
  ruled(doc, L + 200, ty, 190, lgu?.name ? `${lgu.name} website` : '', 10);
  t('from', L + 396, ty);
  ruled(doc, L + 426, ty, R - (L + 426), fmtDate(position?.openDate, 'monthDay'), 10);
  ty += 24;

  t('to', L, ty);
  ruled(doc, L + 20, ty, 90, fmtDate(position?.closeDate, 'monthDay'), 10);
  t(', 20', L + 114, ty);
  ruled(doc, L + 140, ty, 34, fmtDate(position?.openDate, 'yy'), 10);
  t('and posted in three (3) conspicuous places', L + 180, ty);
  ty += 24;

  t('from', L, ty);
  ruled(doc, L + 30, ty, 80, '', 10);
  t('to', L + 116, ty);
  ruled(doc, L + 134, ty, 80, '', 10);
  t(', 20', L + 218, ty);
  ruled(doc, L + 244, ty, 34, '', 10);
  t('in consonance with Republic Act No. 7041.', L + 284, ty);
  ty += 24;

  t('The assessment by the Human Resource Merit Promotion and Selection Board (HRMPSB)', L, ty);
  ty += 24;
  t('started on', L, ty);
  ruled(doc, L + 66, ty, 140, '', 10);
  t(', 20', L + 210, ty);
  ruled(doc, L + 236, ty, 34, '', 10);
  t('.', L + 274, ty);

  ruled(doc, R - 250, cy + certH - 34, 230, '', 11);
  doc.setFont('times', 'bold').setFontSize(11.5);
  doc.text('HRMO', R - 135, cy + certH - 18, { align: 'center' });
  cy += certH + 12;

  // Card B: HRMPSB certification
  const psbH = 160;
  card(cy, psbH);
  doc.setFont('times', 'bold').setFontSize(13);
  doc.text('Certification', CARD_X + CARD_W / 2, cy + 30, { align: 'center' });
  doc.setFont('times', 'normal').setFontSize(11.5);
  doc.text(
    'This  is  to  certify  that  the  appointee  has  been  screened  and  found',
    L + 40,
    cy + 60
  );
  doc.text(
    'qualified by at least the majority of the HRMPSB/Placement Committee during the deliberation held on',
    L,
    cy + 84
  );
  ruled(doc, L, cy + 108, 150, '', 10);
  doc.setFont('times', 'normal').setFontSize(11.5);
  doc.text('.', L + 154, cy + 108);
  ruled(doc, R - 300, cy + psbH - 32, 280, '', 11);
  doc.setFont('times', 'normal').setFontSize(11.5);
  doc.text('Chairperson, HRMPSB/Placement Committee', R - 160, cy + psbH - 16, { align: 'center' });
  cy += psbH + 20;

  // CSC Notation — a bordered GREY block that CONTAINS both the white ruled write-in box and
  // the erasure-warning card. The warning is nested inside it, not a sibling card on the page.
  const noteBoxH = 118;
  const warnBoxH = 74;
  const notationH = 34 + noteBoxH + 12 + warnBoxH + 14;
  doc.setFillColor(...GREY_PAGE);
  doc.setDrawColor(0).setLineWidth(1.4);
  doc.rect(CARD_X, cy, CARD_W, notationH, 'FD');

  doc.setFont('times', 'bold').setFontSize(13);
  doc.text('CSC Notation', CARD_X + CARD_W / 2, cy + 24, { align: 'center' });

  const noteX = CARD_X + 16;
  const noteW = CARD_W - 32;
  const noteTop = cy + 34;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0).setLineWidth(1.2);
  doc.rect(noteX, noteTop, noteW, noteBoxH, 'FD');
  doc.setLineWidth(0.8);
  for (let i = 1; i <= 6; i++) {
    const ly = noteTop + 20 + i * ((noteBoxH - 26) / 7);
    doc.line(noteX + 10, ly, noteX + noteW - 10, ly);
  }

  const warnTop = noteTop + noteBoxH + 12;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0).setLineWidth(1.2);
  doc.rect(noteX, warnTop, noteW, warnBoxH, 'FD');
  doc.setFont('times', 'normal').setFontSize(11.5);
  (doc.splitTextToSize(
    'ANY ERASURE OR ALTERATION ON THE CSC ACTION SHALL NULLIFY OR INVALIDATE THIS APPOINTMENT EXCEPT IF THE ALTERATION WAS AUTHORIZED BY THE COMMISSION.',
    noteW - 76
  ) as string[]).forEach((line, i) =>
    doc.text(line, noteX + 22 + (i === 0 ? 38 : 0), warnTop + 24 + i * 17)
  );
  cy += notationH + 14;

  // Copy distribution + Acknowledgement: one white box inside a grey block, split by a divider
  const ackBlockH = 118;
  doc.setFillColor(...GREY_PAGE);
  doc.setDrawColor(0).setLineWidth(1.4);
  doc.rect(CARD_X, cy, CARD_W, ackBlockH, 'FD');

  const innerX = CARD_X + 16;
  const innerBoxW = CARD_W - 32;
  const innerTop = cy + 14;
  const innerH = ackBlockH - 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0).setLineWidth(1.2);
  doc.rect(innerX, innerTop, innerBoxW, innerH, 'FD');
  const divX = innerX + innerBoxW * 0.5;
  doc.setLineWidth(1.2);
  doc.line(divX, innerTop, divX, innerTop + innerH);

  doc.setFont('times', 'normal').setFontSize(9);
  ['Original Copy            -   for the Agency',
   'Certified True Copy   -   for the Civil Service Commission',
   'Certified True Copy   -   for the Appointee',
  ].forEach((line, i) => doc.text(line, innerX + 14, innerTop + 24 + i * 15));

  const rightW = innerBoxW * 0.5;
  const rightMid = divX + rightW / 2;
  doc.setFont('times', 'bold').setFontSize(10.5);
  doc.text('Acknowledgement', rightMid, innerTop + 18, { align: 'center' });
  doc.setFont('times', 'italic').setFontSize(9.5);
  doc.text('Received original/photocopy of appointment on', divX + 10, innerTop + 40);
  ruled(doc, divX + 196, innerTop + 40, rightW - 206, '', 9);
  ruled(doc, divX + 36, innerTop + 68, rightW - 72, '', 10);
  doc.setFont('times', 'normal').setFontSize(10);
  doc.text('Appointee', rightMid, innerTop + 82, { align: 'center' });

  return doc;
}

// ===================== CS Form No. 32 — Oath of Office =====================

export function buildOathOfOfficeDoc(appointment: Appointment, pds: PDSData | null): Doc {
  const doc = newDoc();
  const position = appointment.position;
  const lgu = position?.lgu;
  const name = fullName(appointment, pds);

  let y = MARGIN;
  doc.setFont('times', 'normal').setFontSize(9);
  doc.text('CS Form No. 32', MARGIN, y);
  doc.text('Revised 2017', MARGIN, y + 11);

  y += 40;
  y = agencyHeader(doc, y, lgu?.name || '', lgu?.address);
  y += 30;

  doc.setFont('times', 'bold').setFontSize(15);
  doc.text('OATH OF OFFICE', PAGE_W / 2, y, { align: 'center' });
  const titleW = doc.getTextWidth('OATH OF OFFICE');
  doc.setLineWidth(0.8).line(PAGE_W / 2 - titleW / 2, y + 3, PAGE_W / 2 + titleW / 2, y + 3);
  y += 44;

  const oath =
    `I, ${name || '________________________'}, having been appointed to the position of ` +
    `${position?.title || '________________________'} in the ${lgu?.name || '________________________'}, ` +
    'do solemnly swear (or affirm) that I will faithfully discharge to the best of my ability the duties ' +
    'of my present position and of all others that I may hereafter hold under the Republic of the ' +
    'Philippines; that I will support and defend the Constitution of the Philippines and will maintain ' +
    'true faith and allegiance thereto; that I will obey the laws, legal orders and decrees promulgated ' +
    'by the duly constituted authorities of the Republic of the Philippines; and that I impose this ' +
    'obligation upon myself voluntarily, without mental reservation or purpose of evasion.';
  y = paragraph(doc, oath, MARGIN, y, CONTENT_W, { indent: 30, lineH: 20 });
  y += 10;

  doc.setFont('times', 'normal').setFontSize(11);
  doc.text('SO HELP ME GOD.', PAGE_W - MARGIN, y, { align: 'right' });
  y += 60;

  ruled(doc, PAGE_W - MARGIN - 240, y, 240, name);
  doc.setFont('times', 'normal').setFontSize(9);
  doc.text('Affiant', PAGE_W - MARGIN - 120, y + 12, { align: 'center' });
  y += 50;

  const oathDate = fmtDate(appointment.oathDate) || '________________';
  doc.setFont('times', 'normal').setFontSize(11);
  doc.text('SUBSCRIBED AND SWORN to before me this', MARGIN, y);
  ruled(doc, MARGIN + 216, y, 160, oathDate);
  doc.text(',', MARGIN + 378, y);
  y += 20;
  doc.text('affiant exhibiting to me the following identification:', MARGIN, y);
  y += 34;

  ['Community Tax Certificate No.:', 'Issued on:', 'Issued at:'].forEach((label) => {
    doc.setFont('times', 'normal').setFontSize(11);
    doc.text(label, MARGIN, y);
    ruled(doc, MARGIN + 170, y, 200, '');
    y += 26;
  });
  y += 40;

  ruled(doc, PAGE_W - MARGIN - 240, y, 240, '');
  doc.setFontSize(9);
  doc.text('Administering Officer', PAGE_W - MARGIN - 120, y + 12, { align: 'center' });

  return doc;
}

// ============ CS Form No. 4 — Certification of Assumption to Duty ============

export function buildAssumptionToDutyDoc(appointment: Appointment, pds: PDSData | null): Doc {
  const doc = newDoc();
  const position = appointment.position;
  const lgu = position?.lgu;
  const name = fullName(appointment, pds);
  const office = position?.department?.name || lgu?.name || '';
  const effective = fmtDate(appointment.appointmentDate);
  const today = new Date();

  let y = MARGIN;
  doc.setFont('times', 'normal').setFontSize(9);
  doc.text('CS Form No. 4', MARGIN, y);
  doc.text('Revised 2025', MARGIN, y + 11);

  y += 46;
  y = agencyHeader(doc, y, lgu?.name || '', lgu?.address);
  y += 34;

  doc.setFont('times', 'bold').setFontSize(14);
  doc.text('CERTIFICATION OF ASSUMPTION TO DUTY', PAGE_W / 2, y, { align: 'center' });
  y += 50;

  // Sentence with inline ruled blanks
  doc.setFont('times', 'normal').setFontSize(11);
  doc.text('This is to certify that Ms./Mr.', MARGIN, y);
  ruled(doc, MARGIN + 150, y, CONTENT_W - 150, name);
  y += 26;
  doc.text('has assumed the duties and responsibilities as', MARGIN, y);
  ruled(doc, MARGIN + 234, y, CONTENT_W - 234, position?.title);
  y += 26;
  doc.text('of', MARGIN, y);
  ruled(doc, MARGIN + 18, y, 300, office);
  doc.text('effective', MARGIN + 324, y);
  ruled(doc, MARGIN + 372, y, CONTENT_W - 372, effective);
  y += 40;

  doc.text('This certification is issued in connection with the issuance of the appointment of', MARGIN + 24, y);
  y += 26;
  doc.text('Ms./Mr.', MARGIN, y);
  ruled(doc, MARGIN + 44, y, 300, name);
  doc.text('as', MARGIN + 350, y);
  ruled(doc, MARGIN + 370, y, CONTENT_W - 370, position?.title);
  y += 40;

  doc.text('Done this', MARGIN + 24, y);
  ruled(doc, MARGIN + 76, y, 44, String(today.getDate()));
  doc.text('day of', MARGIN + 126, y);
  ruled(doc, MARGIN + 164, y, 110, today.toLocaleDateString('en-US', { month: 'long' }));
  ruled(doc, MARGIN + 282, y, 70, String(today.getFullYear()));
  doc.text('in', MARGIN + 360, y);
  ruled(doc, MARGIN + 378, y, CONTENT_W - 378, lgu?.name);
  y += 80;

  ruled(doc, MARGIN, y, 240, '');
  doc.setFont('times', 'normal').setFontSize(10);
  doc.text('Head of Office/Department/Unit', MARGIN, y + 14);
  y += 60;

  doc.setFont('times', 'normal').setFontSize(11);
  doc.text('Attested by:', MARGIN, y);
  y += 50;
  ruled(doc, MARGIN, y, 240, '');
  doc.setFontSize(10);
  doc.text('HRMO', MARGIN + 120, y + 14, { align: 'center' });
  y += 44;

  doc.setFontSize(11);
  doc.text('Date:', MARGIN, y);
  ruled(doc, MARGIN + 36, y, 180, '');
  y += 70;

  doc.setFont('times', 'normal').setFontSize(8.5);
  ['201 file',
   'Admin — For submission to CSC FO within 30 days from the date of assumption of the appointee',
   'COA',
   'CSC',
  ].forEach((line, i) => doc.text(line, MARGIN, y + i * 12));

  return doc;
}

// ===================== save wrappers =====================

const slug = (appointment: Appointment, pds: PDSData | null) =>
  fullName(appointment, pds).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'appointee';

export function generateAppointmentForm(appointment: Appointment, pds: PDSData | null) {
  buildAppointmentFormDoc(appointment, pds).save(`CS-Form-33A-${slug(appointment, pds)}.pdf`);
}

export function generateOathOfOffice(appointment: Appointment, pds: PDSData | null) {
  buildOathOfOfficeDoc(appointment, pds).save(`CS-Form-32-Oath-${slug(appointment, pds)}.pdf`);
}

export function generateAssumptionToDuty(appointment: Appointment, pds: PDSData | null) {
  buildAssumptionToDutyDoc(appointment, pds).save(`CS-Form-4-Assumption-${slug(appointment, pds)}.pdf`);
}
