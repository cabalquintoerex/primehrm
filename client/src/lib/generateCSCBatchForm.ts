import jsPDF from 'jspdf';
import type { CscPublicationBatch } from '@/types';

// === PAGE DIMENSIONS (landscape folio: 13 x 8.5 inches) ===
const PW = 936; // 13 * 72
const PH = 612; // 8.5 * 72
const ML = 30;  // left margin
const MR = 30;  // right margin
const MT = 25;  // top margin
const CW = PW - ML - MR; // content width

// === FONT SIZES ===
const FS_FORM_ID = 7;
const FS_SMALL = 6;
const FS_BODY = 7;
const FS_HEADER = 9;
const FS_TITLE_BOLD = 10;

// === COLORS ===
const BLACK: [number, number, number] = [0, 0, 0];

// === TABLE COLUMN CONFIG ===
const COL_WIDTHS = [28, 100, 72, 40, 56, 110, 90, 78, 72, 86, 0]; // last col fills remaining
// Columns: No., Position Title, Plantilla Item No., Salary Grade, Monthly Salary, Education, Training, Experience, Eligibility, Competency, Place of Assignment

function getColX(colIndex: number, tableX: number): number {
  let x = tableX;
  for (let i = 0; i < colIndex; i++) x += COL_WIDTHS[i];
  return x;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMoney(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  return doc.splitTextToSize(text, maxWidth);
}

export function generateCSCBatchForm(batch: CscPublicationBatch): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [612, 936] });
  const positions = (batch.positions || []).filter(p => p.status !== 'DRAFT');
  const lguName = batch.lgu?.name || 'LGU';
  const lguAddress = batch.lgu?.address || '';
  const lguContact = batch.lgu?.contactNumber || '';
  const lguEmail = batch.lgu?.email || '';
  const creatorName = batch.creator
    ? `${batch.creator.firstName} ${batch.creator.lastName}`.toUpperCase()
    : '';

  let y = MT;

  // === TOP LEFT: Form ID ===
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_FORM_ID);
  doc.text('CS Form No. 9', ML, y);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FS_SMALL);
  doc.text('Revised 2025', ML, y + 10);

  // === TOP RIGHT: Electronic copy note ===
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FS_SMALL);
  const noteText = 'Electronic copy to be submitted to the CSC FO must be in';
  const noteText2 = 'MS Excel format';
  doc.text(noteText, PW - MR, y, { align: 'right' });
  doc.text(noteText2, PW - MR, y + 8, { align: 'right' });

  // === CENTER HEADER ===
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY);
  doc.text('Republic of the Philippines', PW / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_TITLE_BOLD);
  doc.text(lguName.toUpperCase(), PW / 2, y, { align: 'center' });

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_HEADER);
  doc.text('Request for Publication of Vacant Positions', PW / 2, y, { align: 'center' });

  // === TO: CSC ===
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY);
  doc.text('To: CIVIL SERVICE COMMISSION (CSC)', ML, y);

  // === REQUEST PARAGRAPH ===
  y += 14;
  const requestText = `   We hereby request the publication in the CSC Job Portal of the following vacant positions, which are authorized to be filled at the ${lguName.toUpperCase()}:`;
  const wrappedRequest = wrapText(doc, requestText, CW);
  doc.text(wrappedRequest, ML, y);
  y += wrappedRequest.length * 9;

  // === HRMO INFO (right-aligned) ===
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_BODY);
  doc.text(creatorName, PW - MR, y, { align: 'right' });
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.text('HRMO', PW - MR, y, { align: 'right' });

  // === DATE ===
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_BODY);
  const dateStr = batch.isPublished && batch.publishedAt
    ? formatDate(batch.publishedAt)
    : formatDate(batch.openDate);
  const dateLineX = PW - MR - 120;
  doc.text('Date:', dateLineX, y);
  doc.text(dateStr, dateLineX + 26, y);
  doc.setLineWidth(0.5);
  doc.line(dateLineX + 25, y + 1, PW - MR, y + 1);

  // === TABLE ===
  y += 10;
  const tableX = ML;
  const tableW = CW;
  // Calculate last column width
  const usedWidth = COL_WIDTHS.slice(0, -1).reduce((a, b) => a + b, 0);
  COL_WIDTHS[COL_WIDTHS.length - 1] = tableW - usedWidth;

  // --- Header Row 1: "Qualification Standards" spanning Education through Competency ---
  const headerH1 = 12;
  const qsStartX = getColX(5, tableX); // Education column
  const qsEndX = getColX(10, tableX);  // End of Competency
  const qsWidth = qsEndX - qsStartX;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);

  // Draw "Qualification Standards" merged header
  doc.rect(qsStartX, y, qsWidth, headerH1, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SMALL);
  doc.text('Qualification Standards', qsStartX + qsWidth / 2, y + headerH1 / 2 + 2, { align: 'center' });

  // --- Header Row 2: Column labels ---
  const headerY2 = y + headerH1;
  const headerH2 = 32;

  const colHeaders = [
    'No.',
    'Position Title (Parenthetical\nTitle, if applicable)',
    'Plantilla Item No.',
    'Salary/ Job/\nPay Grade',
    'Monthly Salary',
    'Education',
    'Training',
    'Experience',
    'Eligibility',
    'Competency / Area\nof Specialization/\nResidency\nRequirement (if\napplicable)',
    'Place of Assignment',
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_SMALL);

  for (let i = 0; i < colHeaders.length; i++) {
    const cx = getColX(i, tableX);
    const cw = COL_WIDTHS[i];
    doc.rect(cx, headerY2, cw, headerH2, 'S');

    // For multi-line headers
    const lines = colHeaders[i].split('\n');
    const lineH = 7;
    const totalTextH = lines.length * lineH;
    const startTextY = headerY2 + (headerH2 - totalTextH) / 2 + lineH - 2;
    lines.forEach((line, li) => {
      doc.text(line, cx + cw / 2, startTextY + li * lineH, { align: 'center' });
    });
  }

  // Also draw the top cells for columns 0-4 and 10 that span both header rows
  // Re-draw columns 0-4 and 10 spanning full header height
  for (const i of [0, 1, 2, 3, 4, 10]) {
    const cx = getColX(i, tableX);
    const cw = COL_WIDTHS[i];
    // White fill to clear the border from QS row
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y, cw, headerH1 + headerH2, 'FD');

    // Re-draw text centered in full height
    const lines = colHeaders[i].split('\n');
    const lineH = 7;
    const totalTextH = lines.length * lineH;
    const fullH = headerH1 + headerH2;
    const startTextY = y + (fullH - totalTextH) / 2 + lineH - 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FS_SMALL);
    lines.forEach((line, li) => {
      doc.text(line, cx + cw / 2, startTextY + li * lineH, { align: 'center' });
    });
  }

  // --- DATA ROWS ---
  let dataY = headerY2 + headerH2;
  const cellPad = 3;
  const cellFontSize = 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(cellFontSize);

  for (let idx = 0; idx < positions.length; idx++) {
    const pos = positions[idx];
    const rowData = [
      String(idx + 1),
      pos.title || '',
      pos.itemNumber || '',
      pos.salaryGrade != null ? String(pos.salaryGrade) : '',
      formatMoney(pos.monthlySalary),
      pos.education || '',
      pos.training || '',
      pos.experience || '',
      pos.eligibility || '',
      pos.competency || '',
      pos.placeOfAssignment || '',
    ];

    // Calculate row height based on wrapped text
    let maxLines = 1;
    const wrappedCells: string[][] = [];
    for (let c = 0; c < rowData.length; c++) {
      const cw = COL_WIDTHS[c] - cellPad * 2;
      const wrapped = wrapText(doc, rowData[c], cw);
      wrappedCells.push(wrapped);
      if (wrapped.length > maxLines) maxLines = wrapped.length;
    }
    const rowH = Math.max(18, maxLines * 8 + 4);

    // Check page break
    if (dataY + rowH > PH - 40) {
      doc.addPage();
      dataY = MT;
    }

    // Draw cells
    for (let c = 0; c < rowData.length; c++) {
      const cx = getColX(c, tableX);
      const cw = COL_WIDTHS[c];
      doc.rect(cx, dataY, cw, rowH, 'S');

      // Center-align number columns (0, 3, 4), left-align others
      const isCenter = [0, 3, 4].includes(c);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(cellFontSize);

      if (isCenter) {
        wrappedCells[c].forEach((line, li) => {
          doc.text(line, cx + cw / 2, dataY + 9 + li * 8, { align: 'center' });
        });
      } else {
        wrappedCells[c].forEach((line, li) => {
          doc.text(line, cx + cellPad, dataY + 9 + li * 8);
        });
      }
    }
    dataY += rowH;
  }

  // If no positions, draw one empty row
  if (positions.length === 0) {
    const emptyH = 18;
    for (let c = 0; c < COL_WIDTHS.length; c++) {
      const cx = getColX(c, tableX);
      doc.rect(cx, dataY, COL_WIDTHS[c], emptyH, 'S');
    }
    dataY += emptyH;
  }

  // === FOOTER SECTION ===
  dataY += 8;

  // Check if we need a new page for footer
  if (dataY + 180 > PH) {
    doc.addPage();
    dataY = MT;
  }

  const closeDateStr = formatDate(batch.closeDate);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_SMALL);
  const instrText = `Interested and qualified applicants should signify their interest in writing through an application letter addressed to the head of office. Applicants must attach the following documents to the application letter and send these to the address below not later than`;
  const wrappedInstr = wrapText(doc, instrText, CW);
  doc.text(wrappedInstr, ML, dataY);
  dataY += wrappedInstr.length * 7;

  // Closing date line
  doc.setFont('helvetica', 'bold');
  doc.text(closeDateStr, ML, dataY);
  doc.setLineWidth(0.5);
  doc.line(ML, dataY + 1, ML + 160, dataY + 1);
  dataY += 14;

  // Requirements list
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_SMALL);
  const requirements = [
    '1. Fully accomplished Personal Data Sheet (PDS) with Work Experience Sheet and recent passport-sized or unfiltered digital picture (CS Form No. 212, Revised 2025); digitally signed or electronically signed;',
    '2. Hard copy or electronic copy of Performance rating in the last rating period (if applicable);',
    '3. Hard copy or electronic copy of proof of eligibility/rating/license; and',
    '4. Hard copy or electronic copy of Transcript of Records.',
  ];

  requirements.forEach((req) => {
    const wrapped = wrapText(doc, req, CW - 20);
    doc.text(wrapped, ML + 20, dataY);
    dataY += wrapped.length * 7 + 2;
  });

  dataY += 6;

  // Inclusivity statement (italic)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(FS_SMALL);
  const inclusivity = 'This Office highly encourages all interested and qualified applicants to apply, which include persons with disability (PWD) and members of the indigenous communities, irrespective of sexual orientation and gender identities and/or expression, civil status, religion, and political affiliation.';
  const wrappedIncl = wrapText(doc, inclusivity, CW);
  doc.text(wrappedIncl, ML, dataY);
  dataY += wrappedIncl.length * 7 + 4;

  // EOP statement (italic)
  const eop = 'This Office does not discriminate in the selection of employees based on the aforementioned pursuant to Equal Opportunities for Employment Principle (EOP).';
  const wrappedEop = wrapText(doc, eop, CW);
  doc.text(wrappedEop, ML, dataY);
  dataY += wrappedEop.length * 7 + 8;

  // QUALIFIED APPLICANTS paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_SMALL);
  const qualifiedText = 'QUALIFIED APPLICANTS are advised to hand in or send through courier/email their application to the head of office/ human resource management office/records office, as the case may be:';
  const wrappedQual = wrapText(doc, qualifiedText, CW);
  doc.text(wrappedQual, ML, dataY);
  dataY += wrappedQual.length * 7 + 4;

  // Contact info
  if (lguContact || lguEmail) {
    const contactLine = [lguContact, lguEmail].filter(Boolean).join(' / ');
    doc.setFontSize(FS_SMALL);
    doc.text(contactLine, ML + 40, dataY);
    dataY += 12;
  }

  // Check page break before signatory
  if (dataY + 50 > PH) {
    doc.addPage();
    dataY = MT;
  }

  dataY += 6;

  // Signatory block (centered-left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_BODY);
  doc.text(creatorName, ML + 40, dataY);
  doc.setLineWidth(0.5);
  doc.line(ML + 40, dataY + 1, ML + 40 + doc.getTextWidth(creatorName), dataY + 1);

  dataY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FS_SMALL);
  doc.text('HRMO', ML + 40, dataY);

  dataY += 9;
  if (lguAddress) {
    doc.text(lguAddress, ML + 40, dataY);
    dataY += 8;
  }

  if (lguContact || lguEmail) {
    const contactInfo = [lguContact, lguEmail].filter(Boolean).join(' / ');
    doc.text(contactInfo, ML + 40, dataY);
    dataY += 8;
  }

  // APPLICATIONS WITH INCOMPLETE DOCUMENTS warning
  dataY += 10;
  if (dataY + 12 > PH) {
    doc.addPage();
    dataY = MT;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FS_BODY);
  doc.text('APPLICATIONS WITH INCOMPLETE DOCUMENTS SHALL NOT BE ENTERTAINED.', ML, dataY);

  // Save
  doc.save(`CSC_Form9_Batch_${batch.batchNumber}.pdf`);
}
