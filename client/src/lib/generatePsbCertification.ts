import jsPDF from 'jspdf';
import type { PsbMember } from '@/types';

/**
 * HRMPSB Certification of Qualified Applicants — portrait letter, laid out from the reference.
 *
 * Header (logo + Republic / LGU / board name) → CERTIFICATION → body paragraph naming the
 * position and item number → numbered list of qualified applicants **in rank order** →
 * "x – x – x – x – x" terminator → place and date line → signature block (chairperson centred,
 * remaining members in two columns).
 */

/** CSC practice: the certification lists at most the top five qualified applicants. */
const MAX_APPLICANTS = 5;

const PAGE_W = 612; // 8.5in
const PAGE_H = 792; // 11in
const MARGIN = 64;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface CertificationApplicant {
  /** Already formatted "Surname, First Name M." */
  name: string;
}

export interface PsbCertificationData {
  lguName: string;
  /** data: URL for the LGU seal, if one is uploaded */
  lguLogo?: string | null;
  positionTitle: string;
  itemNumber?: string | null;
  officeName?: string | null;
  /** Place line, e.g. "Cebu Capitol, Cebu City" */
  place?: string | null;
  /** Date the board convened; blank leaves the underscore blank in the body */
  boardDate?: string | null;
  applicants: CertificationApplicant[];
  members: PsbMember[];
  /** ids of members recorded absent at signing */
  absentIds?: number[];
}

/** "Chairperson, HRMPSB" → "Chairperson". The form prints the short role under the designation. */
const shortRole = (psbRole?: string | null) => (psbRole ? psbRole.split(',')[0].trim() : 'Member');

const isChair = (member: PsbMember) => /chair/i.test(member.psbRole || '');

export function buildPsbCertificationDoc(data: PsbCertificationData) {
  const doc = new jsPDF({ unit: 'pt', format: [PAGE_W, PAGE_H] });
  let y = MARGIN;

  // ---- Header ----
  if (data.lguLogo) {
    try {
      // Sits left of the board title, which is wide — keep it clear of the text.
      doc.addImage(data.lguLogo, 'PNG', MARGIN - 22, y - 4, 50, 50);
    } catch {
      // A broken/unsupported image must not take the whole certificate down
    }
  }
  doc.setFont('times', 'normal').setFontSize(12);
  doc.text('Republic of the Philippines', PAGE_W / 2, y + 8, { align: 'center' });
  doc.text(data.lguName, PAGE_W / 2, y + 24, { align: 'center' });
  doc.setFont('times', 'bold').setFontSize(13);
  doc.text('HUMAN RESOURCE MERIT PROMOTION & SELECTION BOARD', PAGE_W / 2, y + 41, {
    align: 'center',
  });
  y += 110;

  // ---- Title ----
  doc.setFont('times', 'bold').setFontSize(13);
  doc.text('C E R T I F I C A T I O N', PAGE_W / 2, y, { align: 'center' });
  y += 36;

  // ---- Body ----
  // Mixed weight in one paragraph, so it is composed word by word rather than via splitTextToSize.
  const bodySize = 11;
  const lineH = 16;
  doc.setFontSize(bodySize);

  const segments: Array<{ text: string; bold: boolean }> = [
    {
      text: `This is to certify that after having screened and evaluated the candidates for appointment, pursuant to R.A. No. 7160, on ${
        data.boardDate || '________________'
      }, the Human Resource Merit Promotion and Selection Board has determined the applicants to be qualified for appointment to the position `,
      bold: false,
    },
    { text: data.positionTitle, bold: true },
  ];
  if (data.itemNumber) {
    segments.push({ text: ', Item No. ', bold: false });
    segments.push({ text: `${data.itemNumber},`, bold: true });
  } else {
    segments.push({ text: ',', bold: false });
  }
  if (data.officeName) segments.push({ text: ` ${data.officeName},`, bold: false });
  segments.push({ text: ' to wit:', bold: false });

  // Word-wrap across style changes: flatten to words, then place them, switching font per word.
  const tokens: Array<{ text: string; bold: boolean }> = [];
  segments.forEach((segment) =>
    segment.text
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => tokens.push({ text: word, bold: segment.bold }))
  );

  const indent = 36;
  const maxX = MARGIN + CONTENT_W;
  let x = MARGIN + indent;
  tokens.forEach((token) => {
    doc.setFont('times', token.bold ? 'bold' : 'normal');
    const wordW = doc.getTextWidth(token.text);
    const spaceW = doc.getTextWidth(' ');
    // A token that begins with punctuation belongs to the previous word — pull it back so a
    // style change mid-sentence doesn't print "Civil Engineer III , Item No."
    if (/^[,.;:)]/.test(token.text) && x > MARGIN) x -= spaceW;
    if (x + wordW > maxX) {
      y += lineH;
      x = MARGIN;
    }
    doc.text(token.text, x, y);
    x += wordW + spaceW;
  });
  y += lineH * 2;

  // ---- Ranked applicants (top five) ----
  doc.setFont('times', 'normal').setFontSize(bodySize);
  const listed = data.applicants.slice(0, MAX_APPLICANTS);
  listed.forEach((applicant, i) => {
    doc.text(`${i + 1}.`, MARGIN + 60, y);
    doc.text(applicant.name, MARGIN + 82, y);
    y += lineH;
  });
  if (listed.length === 0) {
    doc.text('(none)', MARGIN + 82, y);
    y += lineH;
  }
  doc.text('x – x – x – x – x', MARGIN + 40, y);
  y += lineH * 2;

  // ---- Place and date ----
  doc.text(`${data.place || ''}, ______________________ .`, MARGIN + 60, y);
  y += 46;

  // ---- Signatures ----
  const chair = data.members.find(isChair);
  const rest = data.members.filter((m) => m !== chair);
  const absent = new Set(data.absentIds || []);

  const signature = (member: PsbMember, cx: number, top: number) => {
    let sy = top;
    if (absent.has(member.id)) {
      doc.setFont('times', 'bold').setFontSize(10);
      doc.text('***ABSENT***', cx, sy, { align: 'center' });
    }
    sy += 13;
    doc.setFont('times', 'bold').setFontSize(11);
    doc.text(member.name, cx, sy, { align: 'center' });
    sy += 14;
    doc.setFont('times', 'normal').setFontSize(10.5);
    if (member.designation) {
      doc.text(member.designation, cx, sy, { align: 'center' });
      sy += 13;
    }
    doc.text(shortRole(member.psbRole), cx, sy, { align: 'center' });
  };

  if (chair) {
    signature(chair, PAGE_W / 2, y);
    y += 76;
  }

  const colX = [MARGIN + CONTENT_W * 0.25, MARGIN + CONTENT_W * 0.75];
  rest.forEach((member, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const top = y + row * 76;
    if (top > PAGE_H - 90) return; // never spill off the page
    signature(member, colX[col], top);
  });

  return doc;
}

export function generatePsbCertification(data: PsbCertificationData) {
  const safe = data.positionTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
  buildPsbCertificationDoc(data).save(`Certification-${safe}.pdf`);
}
