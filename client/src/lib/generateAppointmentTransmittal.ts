import jsPDF from 'jspdf';

/**
 * CS Form No. 1 (Revised 2025) — Appointment Transmittal and Action Form.
 *
 * Page 1: transmittal table (15 numbered rows) + HRMO certification + remarks box.
 * Page 2: Checklist of Common Requirements, signed by the HRMO and the CSC FO receiving officer.
 *
 * Several columns are intentionally left blank — they are for the CSC Field Office to complete
 * (Appointment Identification No., A/D, Date of Action, Date of Release, Date Received), or hold
 * data this system does not capture (employment status, nature of appointment, publication mode).
 */

const PAGE_W = 936; // 13in landscape folio
const PAGE_H = 612;
const MARGIN = 24;
const CONTENT_W = PAGE_W - MARGIN * 2;

const LABEL_BG: [number, number, number] = [235, 235, 235];

/** Fixed number of appointee rows on the printed form. */
const FORM_ROWS = 15;

export interface TransmittalAppointee {
  lastName: string;
  firstName: string;
  nameExtension?: string;
  middleName?: string;
  positionTitle: string;
  salaryGrade?: number | string | null;
  employmentStatus?: string;
  periodOfEmployment?: string;
  natureOfAppointment?: string;
  dateOfIssuance?: string;
  publicationPeriod?: string;
  publicationMode?: string;
}

export interface TransmittalData {
  agencyName: string;
  cscFieldOffice?: string;
  hrmoName?: string;
  appointees: TransmittalAppointee[];
}

const COLUMNS: Array<{ key: string; width: number }> = [
  { key: 'no', width: 22 },
  { key: 'last', width: 64 },
  { key: 'first', width: 56 },
  { key: 'ext', width: 38 },
  { key: 'middle', width: 56 },
  { key: 'position', width: 90 },
  { key: 'salary', width: 44 },
  { key: 'status', width: 56 },
  { key: 'period', width: 54 },
  { key: 'nature', width: 54 },
  { key: 'issuance', width: 52 },
  { key: 'pubDate', width: 64 },
  { key: 'pubMode', width: 56 },
  { key: 'apptId', width: 52 },
  { key: 'action', width: 30 },
  { key: 'actionDate', width: 50 },
  { key: 'releaseDate', width: 50 },
];

const colX = (index: number) =>
  MARGIN + COLUMNS.slice(0, index).reduce((sum, c) => sum + c.width, 0);
const colW = (from: number, to: number) =>
  COLUMNS.slice(from, to + 1).reduce((sum, c) => sum + c.width, 0);

export function buildAppointmentTransmittalDoc(data: TransmittalData) {
  const doc = new jsPDF({ unit: 'pt', format: [PAGE_W, PAGE_H], orientation: 'landscape' });

  const cell = (
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    opts: {
      size?: number;
      style?: 'normal' | 'bold' | 'italic';
      align?: 'left' | 'center';
      fill?: [number, number, number];
      valign?: 'top' | 'middle';
      border?: boolean;
    } = {}
  ) => {
    const { size = 5.5, style = 'normal', align = 'center', fill, valign = 'middle', border = true } = opts;
    if (fill) {
      doc.setFillColor(...fill);
      doc.rect(x, y, w, h, 'F');
    }
    if (border) {
      doc.setDrawColor(0).setLineWidth(0.5);
      doc.rect(x, y, w, h);
    }
    if (!text) return;
    doc.setFont('helvetica', style).setFontSize(size);
    let lines = doc.splitTextToSize(String(text), w - 4) as string[];
    const lineH = size * 1.15;
    const fits = Math.max(1, Math.floor((h - 2) / lineH));
    if (lines.length > fits) lines = lines.slice(0, fits);
    let ty = valign === 'middle' ? y + h / 2 - ((lines.length - 1) * lineH) / 2 + size * 0.35 : y + size + 1.5;
    lines.forEach((line) => {
      doc.text(line, align === 'center' ? x + w / 2 : x + 2, ty, { align });
      ty += lineH;
    });
  };

  // ================= PAGE 1 =================
  let y = MARGIN;

  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text('CS Form No. 1', MARGIN, y + 8);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text('Revised 2025', MARGIN, y + 18);

  // "For Use of Regulated Agencies Only" box, top right
  cell(PAGE_W - MARGIN - 150, y, 150, 16, 'For Use of Regulated Agencies Only', { size: 7, style: 'bold' });

  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text('APPOINTMENT TRANSMITTAL AND ACTION FORM', PAGE_W / 2, y + 16, { align: 'center' });
  y += 30;

  // Agency / CSC FO
  doc.setFont('helvetica', 'bold').setFontSize(7.5);
  doc.text('AGENCY:', MARGIN, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.agencyName || '', MARGIN + 52, y + 8);
  doc.setDrawColor(0).line(MARGIN + 48, y + 10, MARGIN + 400, y + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('CSC FO:', MARGIN + 470, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(data.cscFieldOffice || '', MARGIN + 512, y + 8);
  doc.line(MARGIN + 508, y + 10, MARGIN + 760, y + 10);
  y += 20;

  // Instructions (left) and CSC use box (right)
  doc.setFont('helvetica', 'bold').setFontSize(6.5);
  doc.text('INSTRUCTIONS:', MARGIN, y + 7);
  doc.setFont('helvetica', 'normal').setFontSize(6);
  [
    '(1)  Fill-out the data needed in the form completely and accurately.',
    '(2)  Do not abbreviate entries in the form.',
    '(3)  Accomplish the Checklist of Common Requirements and sign the certification.',
    '(4)  Submit the duly accomplished form in electronic and printed copy (2 copies) to the CSC Field Office',
    '       together with the original copies of the appointments and supporting documents.',
  ].forEach((line, i) => doc.text(line, MARGIN + 4, y + 16 + i * 8));

  cell(PAGE_W - MARGIN - 200, y, 200, 46, '', {});
  doc.setFont('helvetica', 'bold').setFontSize(6.5);
  doc.text("For CSC RO/FO's Use:", PAGE_W - MARGIN - 194, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text('Date Received: ______________________', PAGE_W - MARGIN - 194, y + 26);
  y += 56;

  // ---- Table header ----
  const h1 = 26; // group row
  const h2 = 22; // sub-header row
  const headH = h1 + h2;

  const spanCell = (from: number, to: number, text: string, height = headH, size = 5.5) =>
    cell(colX(from), y, colW(from, to), height, text, { size, style: 'bold', fill: LABEL_BG });

  spanCell(0, 0, 'No.');
  cell(colX(1), y, colW(1, 4), h1, 'NAME OF THE APPOINTEE/S', { size: 6, style: 'bold', fill: LABEL_BG });
  ['Last Name', 'First Name', 'Name Extension (Jr. / III)', 'Middle Name'].forEach((label, i) =>
    cell(colX(1 + i), y + h1, COLUMNS[1 + i].width, h2, label, { size: 5.5, style: 'bold', fill: LABEL_BG })
  );
  spanCell(5, 5, 'POSITION TITLE (indicate parenthetical title, if applicable)');
  spanCell(6, 6, 'SALARY/ JOB/ PAY GRADE');
  spanCell(7, 7, 'EMPLOYMENT STATUS');
  spanCell(8, 8, 'PERIOD OF EMPLOYMENT (for Temporary, Casual/ Contractual) (mm/dd/yyyy)', undefined, 4.6);
  spanCell(9, 9, 'NATURE OF APPOINTMENT');
  spanCell(10, 10, 'DATE OF ISSUANCE (mm/dd/yyyy)');
  cell(colX(11), y, colW(11, 12), h1, 'PUBLICATION', { size: 6, style: 'bold', fill: LABEL_BG });
  cell(colX(11), y + h1, COLUMNS[11].width, h2, 'DATE (period of publication)', { size: 4.8, style: 'bold', fill: LABEL_BG });
  cell(colX(12), y + h1, COLUMNS[12].width, h2, 'MODE (Bulletin, Website, Newspaper)', { size: 4.6, style: 'bold', fill: LABEL_BG });
  cell(colX(13), y, colW(13, 16), h1, 'CSC ACTION', { size: 6, style: 'bold', fill: LABEL_BG });
  cell(colX(13), y + h1, COLUMNS[13].width, h2, 'Appointment Identification No.', { size: 4.8, style: 'bold', fill: LABEL_BG });
  cell(colX(14), y + h1, COLUMNS[14].width, h2, 'A - Approved or D - Disapproved', { size: 4.4, style: 'bold', fill: LABEL_BG });
  cell(colX(15), y + h1, COLUMNS[15].width, h2, 'Date of Action (mm/dd/yyyy)', { size: 4.8, style: 'bold', fill: LABEL_BG });
  cell(colX(16), y + h1, COLUMNS[16].width, h2, 'Date of Release (mm/dd/yyyy)', { size: 4.8, style: 'bold', fill: LABEL_BG });
  y += headH;

  // ---- Data rows (always 15, blank ones included) ----
  const rowH = 16;
  for (let i = 0; i < FORM_ROWS; i++) {
    const a = data.appointees[i];
    const values = [
      String(i + 1),
      a?.lastName ?? '',
      a?.firstName ?? '',
      a?.nameExtension ?? '',
      a?.middleName ?? '',
      a?.positionTitle ?? '',
      a?.salaryGrade != null ? String(a.salaryGrade) : '',
      a?.employmentStatus ?? '',
      a?.periodOfEmployment ?? '',
      a?.natureOfAppointment ?? '',
      a?.dateOfIssuance ?? '',
      a?.publicationPeriod ?? '',
      a?.publicationMode ?? '',
      '', // CSC action columns stay blank
      '',
      '',
      '',
    ];
    values.forEach((value, ci) =>
      cell(colX(ci), y, COLUMNS[ci].width, rowH, value, {
        // The publication period is a full date range — it needs to wrap, not clip.
        size: ci === 11 ? 4.8 : 5.5,
        align: ci === 5 ? 'left' : 'center',
      })
    );
    y += rowH;
  }
  y += 14;

  // ---- Certification ----
  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text('CERTIFICATION', MARGIN + 200, y);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text(
    'This is to certify that the information contained in this form are true, correct, and complete.',
    MARGIN + 100,
    y + 14
  );
  y += 42;
  doc.setFont('helvetica', 'bold').setFontSize(8);
  doc.text(data.hrmoName || '', MARGIN + 230, y, { align: 'center' });
  doc.setDrawColor(0).line(MARGIN + 140, y + 3, MARGIN + 320, y + 3);
  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text('HRMO', MARGIN + 230, y + 13, { align: 'center' });
  doc.text('Date:  _________________________________', MARGIN + 140, y + 30);

  // ---- Remarks ----
  const remarksY = y + 40;
  doc.setFont('helvetica', 'bold').setFontSize(7);
  doc.text('REMARKS/COMMENTS/RECOMMENDATIONS: (e.g. Reasons for Disapproval of Appointment)', MARGIN, remarksY);
  cell(MARGIN, remarksY + 5, CONTENT_W, Math.max(24, PAGE_H - MARGIN - remarksY - 12), '', {});

  // ================= PAGE 2 — Checklist =================
  doc.addPage([PAGE_W, PAGE_H], 'landscape');
  y = MARGIN;

  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text('CHECKLIST OF COMMON REQUIREMENTS', PAGE_W / 2, y + 12, { align: 'center' });
  y += 28;

  doc.setFont('helvetica', 'italic').setFontSize(7);
  doc.text(
    'Instructions: Put a check if the requirements are complete. If incomplete, use the space provided for remarks.',
    MARGIN,
    y
  );
  y += 12;

  const wItem = CONTENT_W - 120 - 120;
  cell(MARGIN, y, wItem, 20, 'REQUIREMENT', { size: 7, style: 'bold', fill: LABEL_BG });
  cell(MARGIN + wItem, y, 120, 20, 'HRMO', { size: 7, style: 'bold', fill: LABEL_BG });
  cell(MARGIN + wItem + 120, y, 120, 20, 'CSC FO', { size: 7, style: 'bold', fill: LABEL_BG });
  y += 20;

  const REQUIREMENTS = [
    'APPOINTMENT FORM (CS Form No. 33-A, Revised 2025): Original Copy',
    'PLANTILLA OF CASUAL APPOINTMENT (CSC Form No. 34-A, Revised 2025): Original Copy',
    'PERSONAL DATA SHEET (CS Form No. 212, Revised 2025)',
    'PROOF OF ELIGIBILITY - Report of rating/license/certificate of admission to the Bar/certification',
    'POSITION DESCRIPTION FORM (DBM-CSC Form No. 1, Revised 2017)',
    'PANUNUMPA SA KATUNGKULAN (SS Porma Blg. 32, Narebisa 2025)',
    'CERTIFICATE OF ASSUMPTION TO DUTY (CS Form No. 4, Revised 2025)',
  ];

  REQUIREMENTS.forEach((requirement, i) => {
    const h = 24;
    cell(MARGIN, y, wItem, h, `${i + 1}.   ${requirement}`, { size: 7, align: 'left' });
    cell(MARGIN + wItem, y, 120, h, '', {});
    cell(MARGIN + wItem + 120, y, 120, h, '', {});
    y += h;
  });
  y += 24;

  // Two certifications side by side
  const halfW = CONTENT_W / 2 - 12;
  const certs: Array<[string, string]> = [
    [
      'This is to certify that I have checked the veracity, authenticity, and completeness of all the requirements in support of the appointments submitted.',
      'HRMO',
    ],
    [
      'This is to certify that I have checked all the requirements in support of the appointments submitted.',
      'CSC FO Receiving Officer',
    ],
  ];
  certs.forEach(([text, label], i) => {
    const x = MARGIN + i * (halfW + 24);
    doc.setFont('helvetica', 'normal').setFontSize(7);
    (doc.splitTextToSize(text, halfW) as string[]).forEach((line, li) =>
      doc.text(line, x, y + li * 10)
    );
    const sy = y + 52;
    doc.setDrawColor(0).line(x + 20, sy, x + halfW - 20, sy);
    doc.setFontSize(7);
    doc.text(label, x + halfW / 2, sy + 11, { align: 'center' });
  });

  doc.setFont('helvetica', 'normal').setFontSize(7);
  doc.text('Page 2 of 2', PAGE_W - MARGIN, PAGE_H - MARGIN, { align: 'right' });

  return doc;
}

export function generateAppointmentTransmittal(data: TransmittalData) {
  buildAppointmentTransmittalDoc(data).save('CS-Form-1-Appointment-Transmittal.pdf');
}
