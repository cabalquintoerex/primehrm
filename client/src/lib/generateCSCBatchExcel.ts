import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { CscPublicationBatch } from '@/types';

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

// Thin border style for table cells
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

export async function generateCSCBatchExcel(batch: CscPublicationBatch): Promise<void> {
  const positions = (batch.positions || []).filter(p => p.status !== 'DRAFT');
  const lguName = batch.lgu?.name || 'LGU';
  const lguAddress = batch.lgu?.address || '';
  const lguContact = batch.lgu?.contactNumber || '';
  const lguEmail = batch.lgu?.email || '';
  const creatorName = batch.creator
    ? `${batch.creator.firstName} ${batch.creator.lastName}`.toUpperCase()
    : '';
  const closeDateStr = formatDate(batch.closeDate);
  const dateStr = batch.isPublished && batch.publishedAt
    ? formatDate(batch.publishedAt)
    : formatDate(batch.openDate);
  const contactLine = [lguContact, lguEmail].filter(Boolean).join(' / ');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('CS Form 9', {
    pageSetup: { paperSize: 5, orientation: 'landscape' }, // 5 = legal, closest to folio
  });

  // Column widths
  ws.columns = [
    { width: 5 },   // A: No.
    { width: 24 },  // B: Position Title
    { width: 18 },  // C: Plantilla Item No.
    { width: 12 },  // D: Salary Grade
    { width: 15 },  // E: Monthly Salary
    { width: 26 },  // F: Education
    { width: 22 },  // G: Training
    { width: 20 },  // H: Experience
    { width: 18 },  // I: Eligibility
    { width: 24 },  // J: Competency
    { width: 22 },  // K: Place of Assignment
  ];

  let r = 1; // current row (1-based in exceljs)

  // --- Row 1: CS Form No. 9 (left) | Electronic copy note (right) ---
  ws.getCell(`A${r}`).value = 'CS Form No. 9';
  ws.getCell(`A${r}`).font = { bold: true, size: 8 };
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = 'Electronic copy to be submitted to the CSC FO must be in';
  ws.getCell(`J${r}`).font = { italic: true, size: 7 };
  ws.getCell(`J${r}`).alignment = { horizontal: 'right' };
  r++;

  // --- Row 2: Revised 2025 | MS Excel format ---
  ws.getCell(`A${r}`).value = 'Revised 2025';
  ws.getCell(`A${r}`).font = { italic: true, size: 7 };
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = 'MS Excel format';
  ws.getCell(`J${r}`).font = { italic: true, size: 7 };
  ws.getCell(`J${r}`).alignment = { horizontal: 'right' };
  r++;

  // --- Row 3: blank ---
  r++;

  // --- Row 4: Republic of the Philippines ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'Republic of the Philippines';
  ws.getCell(`A${r}`).font = { size: 9 };
  ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
  r++;

  // --- Row 5: LGU NAME (bold) ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = lguName.toUpperCase();
  ws.getCell(`A${r}`).font = { bold: true, size: 11 };
  ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
  r++;

  // --- Row 6: Request for Publication ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'Request for Publication of Vacant Positions';
  ws.getCell(`A${r}`).font = { bold: true, size: 10 };
  ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
  r++;

  // --- Row 7: blank ---
  r++;

  // --- Row 8: To: CSC ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'To: CIVIL SERVICE COMMISSION (CSC)';
  ws.getCell(`A${r}`).font = { size: 9 };
  r++;

  // --- Row 9: blank ---
  r++;

  // --- Row 10: Request paragraph ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = `   We hereby request the publication in the CSC Job Portal of the following vacant positions, which are authorized to be filled at the ${lguName.toUpperCase()}:`;
  ws.getCell(`A${r}`).font = { size: 9 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  r++;

  // --- Row 11: blank ---
  r++;

  // --- Row 12: HRMO name (right) ---
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = creatorName;
  ws.getCell(`J${r}`).font = { bold: true, size: 9 };
  ws.getCell(`J${r}`).alignment = { horizontal: 'right' };
  r++;

  // --- Row 13: HRMO title ---
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = 'HRMO';
  ws.getCell(`J${r}`).font = { size: 9 };
  ws.getCell(`J${r}`).alignment = { horizontal: 'right' };
  r++;

  // --- Row 14: blank ---
  r++;

  // --- Row 15: Date ---
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = `Date: ${dateStr}`;
  ws.getCell(`J${r}`).font = { size: 9 };
  ws.getCell(`J${r}`).alignment = { horizontal: 'right' };
  r++;

  // --- Row 16: blank ---
  r++;

  // --- Row 17: "Qualification Standards" merged header (F-J) ---
  const qsRow = r;
  ws.mergeCells(`F${r}:J${r}`);
  ws.getCell(`F${r}`).value = 'Qualification Standards';
  ws.getCell(`F${r}`).font = { bold: true, size: 9 };
  ws.getCell(`F${r}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell(`F${r}`).border = thinBorder;
  // Apply border to merged area
  for (const col of ['G', 'H', 'I', 'J']) {
    ws.getCell(`${col}${r}`).border = thinBorder;
  }
  r++;

  // --- Row 18: Column headers ---
  const headerRow = r;
  const headers = [
    'No.',
    'Position Title (Parenthetical Title, if applicable)',
    'Plantilla Item No.',
    'Salary/ Job/ Pay Grade',
    'Monthly Salary',
    'Education',
    'Training',
    'Experience',
    'Eligibility',
    'Competency / Area of Specialization/ Residency Requirement (if applicable)',
    'Place of Assignment',
  ];

  const headerRowObj = ws.getRow(r);
  headers.forEach((h, i) => {
    const cell = headerRowObj.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 8 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  ws.getRow(r).height = 40;

  // Merge columns A-E and K across both header rows (qsRow and headerRow)
  // These columns span the QS row and the column header row
  for (const col of ['A', 'B', 'C', 'D', 'E', 'K']) {
    const colIdx = col.charCodeAt(0) - 64; // 1-based
    ws.mergeCells(`${col}${qsRow}:${col}${headerRow}`);
    const cell = ws.getCell(`${col}${qsRow}`);
    cell.value = headers[colIdx - 1];
    cell.font = { bold: true, size: 8 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
    // Also set border on the second row cell of the merge
    ws.getCell(`${col}${headerRow}`).border = thinBorder;
  }
  r++;

  // --- Data rows ---
  const dataStartRow = r;
  positions.forEach((pos, idx) => {
    const dataRow = ws.getRow(r);
    const values = [
      idx + 1,
      pos.title || '',
      pos.itemNumber || '',
      pos.salaryGrade != null ? pos.salaryGrade : '',
      formatMoney(pos.monthlySalary),
      pos.education || '',
      pos.training || '',
      pos.experience || '',
      pos.eligibility || '',
      pos.competency || '',
      pos.placeOfAssignment || '',
    ];
    values.forEach((v, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = v;
      cell.font = { size: 8 };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: [0, 3, 4].includes(i) ? 'center' : 'left',
        vertical: 'middle',
        wrapText: true,
      };
    });
    r++;
  });

  // If no positions, one empty bordered row
  if (positions.length === 0) {
    const emptyRow = ws.getRow(r);
    for (let i = 1; i <= 11; i++) {
      emptyRow.getCell(i).border = thinBorder;
    }
    r++;
  }

  // --- Blank row ---
  r++;

  // --- Footer text ---
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'Interested and qualified applicants should signify their interest in writing through an application letter addressed to the head of office. Applicants must attach the following documents to the application letter and send these to the address below not later than';
  ws.getCell(`A${r}`).font = { size: 8 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  r++;

  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = closeDateStr;
  ws.getCell(`A${r}`).font = { bold: true, size: 8, underline: true };
  r++;

  r++; // blank

  const reqs = [
    '1. Fully accomplished Personal Data Sheet (PDS) with Work Experience Sheet and recent passport-sized or unfiltered digital picture (CS Form No. 212, Revised 2025); digitally signed or electronically signed;',
    '2. Hard copy or electronic copy of Performance rating in the last rating period (if applicable);',
    '3. Hard copy or electronic copy of proof of eligibility/rating/license; and',
    '4. Hard copy or electronic copy of Transcript of Records.',
  ];
  reqs.forEach((req) => {
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = `     ${req}`;
    ws.getCell(`A${r}`).font = { size: 8 };
    ws.getCell(`A${r}`).alignment = { wrapText: true };
    r++;
  });

  r++; // blank

  // Inclusivity
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'This Office highly encourages all interested and qualified applicants to apply, which include persons with disability (PWD) and members of the indigenous communities, irrespective of sexual orientation and gender identities and/or expression, civil status, religion, and political affiliation.';
  ws.getCell(`A${r}`).font = { italic: true, size: 8 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  r++;

  // EOP
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'This Office does not discriminate in the selection of employees based on the aforementioned pursuant to Equal Opportunities for Employment Principle (EOP).';
  ws.getCell(`A${r}`).font = { italic: true, size: 8 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  r++;

  r++; // blank

  // Qualified applicants
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'QUALIFIED APPLICANTS are advised to hand in or send through courier/email their application to the head of office/ human resource management office/records office, as the case may be:';
  ws.getCell(`A${r}`).font = { size: 8 };
  ws.getCell(`A${r}`).alignment = { wrapText: true };
  r++;

  r++; // blank

  if (contactLine) {
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = contactLine;
    ws.getCell(`A${r}`).font = { size: 8 };
    r++;
  }

  r++; // blank

  // Signatory
  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = `     ${creatorName}`;
  ws.getCell(`A${r}`).font = { bold: true, size: 9, underline: true };
  r++;

  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = '     HRMO';
  ws.getCell(`A${r}`).font = { size: 8 };
  r++;

  if (lguAddress) {
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = `     ${lguAddress}`;
    ws.getCell(`A${r}`).font = { size: 8 };
    r++;
  }

  if (contactLine) {
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = `     ${contactLine}`;
    ws.getCell(`A${r}`).font = { size: 8 };
    r++;
  }

  r++; // blank

  ws.mergeCells(`A${r}:K${r}`);
  ws.getCell(`A${r}`).value = 'APPLICATIONS WITH INCOMPLETE DOCUMENTS SHALL NOT BE ENTERTAINED.';
  ws.getCell(`A${r}`).font = { bold: true, size: 9 };

  // Generate and save
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `CSC_Form9_Batch_${batch.batchNumber}.xlsx`);
}
