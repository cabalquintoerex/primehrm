import jsPDF from 'jspdf';
import type { WESData } from '@/types';

// Folio 8.5 x 13in, matching the PDS output so the attachment prints on the same stock.
const PAGE_W = 612;
const PAGE_H = 936;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_SPACE = 46;

const INSTRUCTIONS = [
  'Include only the work experiences relevant to the position being applied to.',
  'The duration should include start and finish dates, if known, month in abbreviated form, if known, and year in full. For the current position, use the word Present, e.g., 1998-Present. Work experience should be listed from most recent first.',
];

const FIELDS: Array<{ key: keyof WESData['entries'][number]; label: string }> = [
  { key: 'duration', label: 'Duration' },
  { key: 'position', label: 'Position' },
  { key: 'officeUnit', label: 'Name of Office/Unit' },
  { key: 'immediateSupervisor', label: 'Immediate Supervisor' },
  { key: 'agencyAndLocation', label: 'Name of Agency/Organization and Location' },
];

/** Builds the document without saving it, so the layout can be rendered headlessly. */
export function buildWESDoc(data: WESData, printedName = '') {
  const doc = new jsPDF({ unit: 'pt', format: [PAGE_W, PAGE_H] });
  let y = MARGIN;

  const pageFooter = () => {
    doc.setFont('helvetica', 'italic').setFontSize(8);
    doc.text('Attachment to CS Form No. 212', MARGIN, PAGE_H - 30);
  };

  // Break to a new page when the next block won't fit above the footer.
  const need = (h: number) => {
    if (y + h <= PAGE_H - MARGIN - FOOTER_SPACE) return;
    pageFooter();
    doc.addPage();
    y = MARGIN;
  };

  const para = (
    text: string,
    { x = MARGIN, w = CONTENT_W, size = 10, style = 'normal', gap = 0 } = {}
  ) => {
    doc.setFont('helvetica', style).setFontSize(size);
    const lh = size * 1.35;
    (doc.splitTextToSize(text, w) as string[]).forEach((line) => {
      need(lh);
      doc.setFont('helvetica', style).setFontSize(size);
      doc.text(line, x, y);
      y += lh;
    });
    y += gap;
  };

  // "• Label: value" with a bold label and the value wrapping under the label's indent.
  const bulletField = (label: string, value: string) => {
    const size = 10;
    const lh = 14;
    const bx = MARGIN + 12;
    const tx = bx + 12;
    doc.setFontSize(size).setFont('helvetica', 'bold');
    // No value means this bullet is a section heading ("Summary of Actual Duties"), not a
    // label/value pair — the form prints those without a trailing colon.
    const labelText = value ? `${label}: ` : label;
    const labelW = doc.getTextWidth(labelText);
    const valueLines = doc.splitTextToSize(
      value || '',
      CONTENT_W - (tx - MARGIN) - labelW
    ) as string[];

    need(lh);
    doc.setFont('helvetica', 'normal').setFontSize(size);
    doc.text('•', bx, y);
    doc.setFont('helvetica', 'bold');
    doc.text(labelText, tx, y);
    doc.setFont('helvetica', 'normal');
    if (valueLines.length) doc.text(valueLines[0], tx + labelW, y);
    y += lh;

    for (let i = 1; i < valueLines.length; i++) {
      need(lh);
      doc.setFont('helvetica', 'normal').setFontSize(size);
      doc.text(valueLines[i], tx + labelW, y);
      y += lh;
    }
  };

  const subBullet = (text: string) => {
    const size = 10;
    const lh = 14;
    const bx = MARGIN + 32;
    const tx = bx + 12;
    const lines = doc.splitTextToSize(text, CONTENT_W - (tx - MARGIN)) as string[];
    lines.forEach((line, i) => {
      need(lh);
      doc.setFont('helvetica', 'normal').setFontSize(size);
      if (i === 0) doc.text('-', bx, y);
      doc.text(line, tx, y);
      y += lh;
    });
  };

  // Title
  doc.setFont('helvetica', 'bold').setFontSize(14);
  doc.text('WORK EXPERIENCE SHEET', PAGE_W / 2, y, { align: 'center' });
  y += 26;

  // Instructions
  para('Instructions:', { style: 'bold', size: 9 });
  INSTRUCTIONS.forEach((text, i) => {
    para(`${i + 1}. ${text}`, { x: MARGIN + 12, w: CONTENT_W - 12, size: 9, gap: 4 });
  });
  y += 10;

  // Entries
  const entries = data.entries ?? [];
  entries.forEach((entry, idx) => {
    if (idx > 0) y += 8;
    need(60);

    FIELDS.forEach(({ key, label }) => {
      bulletField(label, String(entry[key] ?? ''));
    });

    const accomplishments = (entry.accomplishments ?? []).filter((a) => a.trim());
    if (accomplishments.length) {
      y += 6;
      bulletField('List of Accomplishments and Contributions (if any)', '');
      accomplishments.forEach(subBullet);
    }

    if (entry.summaryOfDuties?.trim()) {
      y += 6;
      bulletField('Summary of Actual Duties', '');
      subBullet(entry.summaryOfDuties.trim());
    }

    y += 10;
  });

  // Signature block
  need(90);
  y += 30;
  const sigW = 220;
  const sigX = PAGE_W - MARGIN - sigW;
  doc.setDrawColor(0).line(sigX, y, sigX + sigW, y);
  y += 12;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text('(Signature over Printed Name', sigX + sigW / 2, y, { align: 'center' });
  y += 11;
  doc.text('of Employee/Applicant)', sigX + sigW / 2, y, { align: 'center' });
  if (printedName) {
    doc.setFont('helvetica', 'bold').setFontSize(10);
    doc.text(printedName, sigX + sigW / 2, y - 26, { align: 'center' });
  }
  y += 26;
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text('Date: ______________', sigX, y);

  pageFooter();
  return doc;
}

export function generateWES(data: WESData, printedName = '') {
  buildWESDoc(data, printedName).save('CS-Form-212-Work-Experience-Sheet.pdf');
}
