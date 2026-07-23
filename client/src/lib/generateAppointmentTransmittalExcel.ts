import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TransmittalData } from './generateAppointmentTransmittal';

/**
 * CS Form No. 1 (Revised 2025) — Appointment Transmittal and Action Form, as a workbook.
 *
 * The Excel version exists because much of this form is filled in by hand: the CSC Field Office
 * columns, employment status, nature of appointment, publication mode, and the dates. The system
 * pre-fills what it knows and leaves the rest as empty bordered cells ready to type into.
 */

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEBEBEB' },
};

const FORM_ROWS = 15;

/** Column widths in Excel units, mirroring the PDF's proportions. */
const COLUMN_WIDTHS = [5, 16, 14, 10, 14, 24, 10, 14, 14, 14, 13, 16, 15, 14, 8, 13, 13];

const REQUIREMENTS = [
  'APPOINTMENT FORM (CS Form No. 33-A, Revised 2025): Original Copy',
  'PLANTILLA OF CASUAL APPOINTMENT (CSC Form No. 34-A, Revised 2025): Original Copy',
  'PERSONAL DATA SHEET (CS Form No. 212, Revised 2025)',
  'PROOF OF ELIGIBILITY - Report of rating/license/certificate of admission to the Bar/certification',
  'POSITION DESCRIPTION FORM (DBM-CSC Form No. 1, Revised 2017)',
  'PANUNUMPA SA KATUNGKULAN (SS Porma Blg. 32, Narebisa 2025)',
  'CERTIFICATE OF ASSUMPTION TO DUTY (CS Form No. 4, Revised 2025)',
];

export async function generateAppointmentTransmittalExcel(data: TransmittalData): Promise<void> {
  const wb = new ExcelJS.Workbook();

  // ================= Sheet 1 — the transmittal =================
  const ws = wb.addWorksheet('CSC AP Form No. 1', {
    pageSetup: { paperSize: 5, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  COLUMN_WIDTHS.forEach((width, i) => {
    ws.getColumn(i + 1).width = width;
  });

  ws.getCell('A1').value = 'CS Form No. 1';
  ws.getCell('A1').font = { bold: true, size: 11 };
  ws.getCell('A2').value = 'Revised 2025';
  ws.getCell('A2').font = { size: 9 };

  ws.mergeCells('N1:Q2');
  const regulated = ws.getCell('N1');
  regulated.value = 'For Use of Regulated Agencies Only';
  regulated.font = { bold: true, size: 10 };
  regulated.alignment = { horizontal: 'center', vertical: 'middle' };
  regulated.border = thinBorder;

  ws.mergeCells('C3:L3');
  const title = ws.getCell('C3');
  title.value = 'APPOINTMENT TRANSMITTAL AND ACTION FORM';
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: 'center' };

  ws.getCell('A5').value = 'AGENCY:';
  ws.getCell('A5').font = { bold: true };
  ws.mergeCells('B5:F5');
  ws.getCell('B5').value = data.agencyName || '';
  ws.getCell('B5').border = { bottom: { style: 'thin' } };

  ws.getCell('J5').value = 'CSC FO:';
  ws.getCell('J5').font = { bold: true };
  ws.mergeCells('K5:N5');
  ws.getCell('K5').value = data.cscFieldOffice || '';
  ws.getCell('K5').border = { bottom: { style: 'thin' } };

  ws.getCell('A7').value = 'INSTRUCTIONS:';
  ws.getCell('A7').font = { bold: true, size: 9 };
  [
    '(1)  Fill-out the data needed in the form completely and accurately.',
    '(2)  Do not abbreviate entries in the form.',
    '(3)  Accomplish the Checklist of Common Requirements and sign the certification.',
    '(4)  Submit the duly accomplished form in electronic and printed copy (2 copies) to the CSC Field Office',
    '      together with the original copies of the appointments and supporting documents.',
  ].forEach((line, i) => {
    const cell = ws.getCell(`A${8 + i}`);
    cell.value = line;
    cell.font = { size: 9 };
  });

  ws.getCell('M7').value = "For CSC RO/FO's Use:";
  ws.getCell('M7').font = { bold: true, size: 9 };
  ws.getCell('M8').value = 'Date Received:';
  ws.getCell('M8').font = { size: 9 };
  ws.mergeCells('N8:P8');
  ws.getCell('N8').border = { bottom: { style: 'thin' } };

  // ---- Table header (rows 14-15) ----
  const headTop = 14;
  const headBottom = 15;

  const setHead = (ref: string, text: string, size = 8) => {
    const cell = ws.getCell(ref);
    cell.value = text;
    cell.font = { bold: true, size };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = HEADER_FILL;
    cell.border = thinBorder;
  };

  // Columns spanning both header rows
  const spanBoth: Array<[string, string, string]> = [
    ['A', 'A', 'No.'],
    ['F', 'F', 'POSITION TITLE (indicate parenthetical title, if applicable)'],
    ['G', 'G', 'SALARY/ JOB/ PAY GRADE'],
    ['H', 'H', 'EMPLOYMENT STATUS'],
    ['I', 'I', 'PERIOD OF EMPLOYMENT (for Temporary, Casual/ Contractual) (mm/dd/yyyy to mm/dd/yyyy)'],
    ['J', 'J', 'NATURE OF APPOINTMENT'],
    ['K', 'K', 'DATE OF ISSUANCE (mm/dd/yyyy)'],
  ];
  spanBoth.forEach(([col, , text]) => {
    ws.mergeCells(`${col}${headTop}:${col}${headBottom}`);
    setHead(`${col}${headTop}`, text);
  });

  ws.mergeCells(`B${headTop}:E${headTop}`);
  setHead(`B${headTop}`, 'NAME OF THE APPOINTEE/S', 9);
  ['Last Name', 'First Name', 'Name Extension (Jr. / III)', 'Middle Name'].forEach((label, i) =>
    setHead(`${String.fromCharCode(66 + i)}${headBottom}`, label)
  );

  ws.mergeCells(`L${headTop}:M${headTop}`);
  setHead(`L${headTop}`, 'PUBLICATION', 9);
  setHead(`L${headBottom}`, 'DATE (indicate period of publication, mm/dd/yyyy to mm/dd/yyyy)', 7.5);
  setHead(`M${headBottom}`, 'MODE (CSC Bulletin of Vacant Positions, Agency Website, Newspaper, etc.)', 7.5);

  ws.mergeCells(`N${headTop}:Q${headTop}`);
  setHead(`N${headTop}`, 'CSC ACTION', 9);
  setHead(`N${headBottom}`, 'Appointment Identification No.', 7.5);
  setHead(`O${headBottom}`, 'A - Approved or D - Disapproved', 7.5);
  setHead(`P${headBottom}`, 'Date of Action (mm/dd/yyyy)', 7.5);
  setHead(`Q${headBottom}`, 'Date of Release (mm/dd/yyyy)', 7.5);

  ws.getRow(headTop).height = 30;
  ws.getRow(headBottom).height = 42;

  // ---- Data rows — every cell bordered so blanks are typeable ----
  for (let i = 0; i < FORM_ROWS; i++) {
    const rowIndex = headBottom + 1 + i;
    const appointee = data.appointees[i];
    const row = ws.getRow(rowIndex);
    row.height = 20;

    const values = [
      i + 1,
      appointee?.lastName ?? '',
      appointee?.firstName ?? '',
      appointee?.nameExtension ?? '',
      appointee?.middleName ?? '',
      appointee?.positionTitle ?? '',
      appointee?.salaryGrade ?? '',
      appointee?.employmentStatus ?? '',
      appointee?.periodOfEmployment ?? '',
      appointee?.natureOfAppointment ?? '',
      appointee?.dateOfIssuance ?? '',
      appointee?.publicationPeriod ?? '',
      appointee?.publicationMode ?? '',
      '', // CSC Action — filled by the Field Office
      '',
      '',
      '',
    ];

    values.forEach((value, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = value === '' ? null : value;
      cell.font = { size: 9 };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: ci === 5 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });
  }

  // ---- Certification ----
  const certRow = headBottom + FORM_ROWS + 3;
  ws.mergeCells(`C${certRow}:H${certRow}`);
  ws.getCell(`C${certRow}`).value = 'CERTIFICATION';
  ws.getCell(`C${certRow}`).font = { bold: true, size: 11 };
  ws.getCell(`C${certRow}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`C${certRow + 2}:H${certRow + 2}`);
  ws.getCell(`C${certRow + 2}`).value =
    'This is to certify that the information contained in this form are true, correct, and complete.';
  ws.getCell(`C${certRow + 2}`).font = { size: 10 };
  ws.getCell(`C${certRow + 2}`).alignment = { horizontal: 'center' };

  ws.mergeCells(`D${certRow + 5}:F${certRow + 5}`);
  const hrmoCell = ws.getCell(`D${certRow + 5}`);
  hrmoCell.value = data.hrmoName || '';
  hrmoCell.font = { bold: true, size: 10 };
  hrmoCell.alignment = { horizontal: 'center' };
  hrmoCell.border = { bottom: { style: 'thin' } };

  ws.mergeCells(`D${certRow + 6}:F${certRow + 6}`);
  ws.getCell(`D${certRow + 6}`).value = 'HRMO';
  ws.getCell(`D${certRow + 6}`).alignment = { horizontal: 'center' };
  ws.getCell(`D${certRow + 6}`).font = { size: 10 };

  ws.getCell(`D${certRow + 8}`).value = 'Date:';
  ws.getCell(`D${certRow + 8}`).font = { size: 10 };
  ws.mergeCells(`E${certRow + 8}:F${certRow + 8}`);
  ws.getCell(`E${certRow + 8}`).border = { bottom: { style: 'thin' } };

  // ---- Remarks ----
  const remarksRow = certRow + 11;
  ws.mergeCells(`A${remarksRow}:Q${remarksRow}`);
  ws.getCell(`A${remarksRow}`).value =
    'REMARKS/COMMENTS/RECOMMENDATIONS: (e.g. Reasons for Disapproval of Appointment)';
  ws.getCell(`A${remarksRow}`).font = { bold: true, size: 10 };

  ws.mergeCells(`A${remarksRow + 1}:Q${remarksRow + 4}`);
  const remarksBox = ws.getCell(`A${remarksRow + 1}`);
  remarksBox.border = thinBorder;
  remarksBox.alignment = { vertical: 'top', wrapText: true };

  // ================= Sheet 2 — the checklist =================
  const cs = wb.addWorksheet('Checklist', {
    pageSetup: { paperSize: 5, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  cs.getColumn(1).width = 6;
  cs.getColumn(2).width = 78;
  cs.getColumn(3).width = 16;
  cs.getColumn(4).width = 16;

  cs.mergeCells('A1:D1');
  cs.getCell('A1').value = 'CHECKLIST OF COMMON REQUIREMENTS';
  cs.getCell('A1').font = { bold: true, size: 13 };
  cs.getCell('A1').alignment = { horizontal: 'center' };

  cs.mergeCells('A2:D2');
  cs.getCell('A2').value =
    'Instructions: Put a check if the requirements are complete. If incomplete, use the space provided for remarks.';
  cs.getCell('A2').font = { italic: true, size: 9 };

  const head = cs.getRow(4);
  ['', 'REQUIREMENT', 'HRMO', 'CSC FO'].forEach((label, i) => {
    const cell = head.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = HEADER_FILL;
    cell.border = thinBorder;
  });

  REQUIREMENTS.forEach((requirement, i) => {
    const row = cs.getRow(5 + i);
    row.height = 30;
    row.getCell(1).value = i + 1;
    row.getCell(2).value = requirement;
    [1, 2, 3, 4].forEach((col) => {
      const cell = row.getCell(col);
      cell.border = thinBorder;
      cell.font = { size: 9 };
      cell.alignment = {
        horizontal: col === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });
  });

  const certTop = 5 + REQUIREMENTS.length + 2;
  cs.mergeCells(`A${certTop}:B${certTop + 1}`);
  cs.getCell(`A${certTop}`).value =
    'This is to certify that I have checked the veracity, authenticity, and completeness of all the requirements in support of the appointments submitted.';
  cs.getCell(`A${certTop}`).alignment = { wrapText: true, vertical: 'top' };
  cs.getCell(`A${certTop}`).font = { size: 9 };

  cs.mergeCells(`C${certTop}:D${certTop + 1}`);
  cs.getCell(`C${certTop}`).value =
    'This is to certify that I have checked all the requirements in support of the appointments submitted.';
  cs.getCell(`C${certTop}`).alignment = { wrapText: true, vertical: 'top' };
  cs.getCell(`C${certTop}`).font = { size: 9 };

  const signRow = certTop + 4;
  cs.mergeCells(`A${signRow}:B${signRow}`);
  cs.getCell(`A${signRow}`).border = { bottom: { style: 'thin' } };
  cs.mergeCells(`C${signRow}:D${signRow}`);
  cs.getCell(`C${signRow}`).border = { bottom: { style: 'thin' } };

  cs.mergeCells(`A${signRow + 1}:B${signRow + 1}`);
  cs.getCell(`A${signRow + 1}`).value = 'HRMO';
  cs.getCell(`A${signRow + 1}`).alignment = { horizontal: 'center' };
  cs.getCell(`A${signRow + 1}`).font = { size: 10 };

  cs.mergeCells(`C${signRow + 1}:D${signRow + 1}`);
  cs.getCell(`C${signRow + 1}`).value = 'CSC FO Receiving Officer';
  cs.getCell(`C${signRow + 1}`).alignment = { horizontal: 'center' };
  cs.getCell(`C${signRow + 1}`).font = { size: 10 };

  cs.getCell(`D${signRow + 4}`).value = 'Page 2 of 2';
  cs.getCell(`D${signRow + 4}`).alignment = { horizontal: 'right' };
  cs.getCell(`D${signRow + 4}`).font = { size: 9 };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'CS-Form-1-Appointment-Transmittal.xlsx');
}
