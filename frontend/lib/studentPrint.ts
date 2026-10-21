import toast from 'react-hot-toast';
import type { Student } from '@/types/student';

export interface SchoolPrintSettings {
  logoUrl?: string;
  contact?: string;
  address?: string;
  nameBn?: string;
}

const STATUS_LABELS: Record<Student['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  left: 'Left',
};

export function printStudentAdmissionForm(
  s: Student,
  schoolName = '',
  schoolSettings?: SchoolPrintSettings | null
): boolean {
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Allow pop-ups to print.');
    return false;
  }

  const fmt = (v: string | number | undefined | null) =>
    v === undefined || v === null || v === '' ? '' : String(v);
  const fmtDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-GB') : '';
  const fmtTk = (n: number | undefined) =>
    n != null ? '৳ ' + n.toLocaleString() : '';

  const schoolNameBn = schoolSettings?.nameBn ?? '';
  const schoolContact = schoolSettings?.contact ?? '';
  const schoolAddress = schoolSettings?.address ?? '';
  const schoolLogo = schoolSettings?.logoUrl ?? '';
  const statusLabel = STATUS_LABELS[s.status] ?? s.status;
  const sid = s.studentId || s._id.slice(-6).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Information - ${s.name}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; font-size: 10.5pt; }
    .page {
      width: 100%;
      min-height: 277mm;
      display: flex;
      flex-direction: column;
    }
    .bn { font-family: 'SolaimanLipi','Kalpurush','Noto Sans Bengali','Segoe UI', sans-serif; }

    /* Header */
    .header {
      display: flex; align-items: center; gap: 14px;
      padding-bottom: 6px;
    }
    .header-logo, .header-logo-placeholder {
      width: 78px; height: 78px; object-fit: contain; flex-shrink: 0;
    }
    .header-logo-placeholder {
      background: #eef; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: bold; color: #335;
    }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 20pt; font-weight: 800; line-height: 1.15; letter-spacing: 0.3px; }
    .header-text h2 { font-size: 16pt; font-weight: 700; line-height: 1.2; margin-top: 2px; color: #222; }
    .header-text p { font-size: 9.5pt; margin-top: 3px; color: #444; }
    .divider-thick { border: none; border-top: 2.5px solid #111; margin: 4px 0 8px; }

    .form-title {
      text-align: center;
      font-size: 13pt; font-weight: 800;
      text-transform: uppercase; letter-spacing: 2px;
      padding: 4px 0;
      border: 1.5px solid #111;
      margin: 6px 0 10px;
    }

    /* ID + photo */
    .id-photo-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; margin-bottom: 8px;
    }
    .id-block { flex: 1; }
    .id-block .id-line { font-size: 11pt; font-weight: 700; padding: 4px 8px; border: 1px solid #111; display: inline-block; min-width: 200px; background: #f6f6f6; }
    .id-block .quick {
      margin-top: 6px; font-size: 9.5pt; color: #333;
    }
    .photo-box {
      width: 30mm; height: 38mm;
      border: 1px solid #555;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0; background: #fafafa;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .photo-placeholder { font-size: 9pt; color: #888; text-align: center; padding: 4px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td { border: 1px solid #444; padding: 4px 7px; vertical-align: middle; }
    .section-hdr {
      background: #e8e8e8;
      font-weight: 800;
      text-align: center;
      font-size: 10.5pt;
      letter-spacing: 1.5px;
      padding: 5px 7px;
      text-transform: uppercase;
    }
    .lbl { width: 24%; font-weight: 600; white-space: nowrap; background: #fafafa; }
    .colon { width: 10px; text-align: center; background: #fafafa; }
    .val { min-height: 18px; }
    table + table { margin-top: 6px; }

    /* Signatures */
    .sig-row {
      margin-top: auto;
      padding-top: 32mm;
      display: flex;
      justify-content: space-between;
      gap: 18px;
    }
    .sig-box { flex: 1; text-align: center; }
    .sig-line { border-top: 1px solid #111; padding-top: 4px; font-size: 10pt; font-weight: 700; }
    .sig-sub { font-size: 9pt; color: #555; }

    .footnote { margin-top: 6mm; font-size: 8.5pt; color: #777; text-align: center; }

    @media print {
      .toolbar { display: none !important; }
    }
    .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 10; }
    .toolbar button { padding: 6px 14px; border: 1px solid #888; background: #fff; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .toolbar button.primary { background: #111; color: #fff; border-color: #111; }
  </style>
</head>
<body>
<div class="toolbar">
  <button onclick="window.print()" class="primary">Print</button>
  <button onclick="window.close()">Close</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="header">
    ${schoolLogo
      ? `<img src="${schoolLogo}" class="header-logo" alt="Logo">`
      : `<div class="header-logo-placeholder">${(schoolName || 'S').charAt(0).toUpperCase()}</div>`
    }
    <div class="header-text">
      <h1>${fmt(schoolName)}</h1>
      ${schoolNameBn ? `<h2 class="bn">${schoolNameBn}</h2>` : ''}
      ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
      ${schoolContact ? `<p>Mobile: ${schoolContact}</p>` : ''}
    </div>
    <div style="width:78px;flex-shrink:0;"></div>
  </div>
  <hr class="divider-thick">

  <!-- Title -->
  <div class="form-title">Student Information</div>

  <!-- ID + Photo row -->
  <div class="id-photo-row">
    <div class="id-block">
      <div class="id-line">Student ID :&nbsp; ${sid}</div>
      <div class="quick">
        <strong>Class:</strong> ${fmt(s.class)}
        &nbsp;·&nbsp; <strong>Section:</strong> ${fmt(s.section)}
        &nbsp;·&nbsp; <strong>Roll:</strong> ${fmt(s.rollNo)}
        &nbsp;·&nbsp; <strong>Session:</strong> ${fmt(s.session)}
        &nbsp;·&nbsp; <strong>Shift:</strong> ${fmt(s.shift)}
        &nbsp;·&nbsp; <strong>Group:</strong> ${fmt(s.group)}
      </div>
    </div>
    <div class="photo-box">
      ${s.photoUrl
        ? `<img src="${s.photoUrl}" alt="Photo">`
        : `<div class="photo-placeholder">Student<br>Photo</div>`
      }
    </div>
  </div>

  <!-- Personal Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Personal Information</td></tr>

    <tr>
      <td class="lbl">Name (English)</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.name)}</td>
    </tr>
    <tr>
      <td class="lbl">নাম (বাংলা)</td>
      <td class="colon">:</td>
      <td class="val bn" colspan="2">${fmt(s.nameBn)}</td>
    </tr>
    <tr>
      <td class="lbl">Date of Birth</td>
      <td class="colon">:</td>
      <td class="val">${fmtDate(s.dateOfBirth)}</td>
      <td class="val"><strong>Gender:</strong>&nbsp; ${fmt(s.gender)}</td>
    </tr>
    <tr>
      <td class="lbl">Birth Reg. No.</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.birthRegNo)}</td>
      <td class="val"><strong>Blood Group:</strong>&nbsp; ${fmt(s.bloodGroup)}</td>
    </tr>
    <tr>
      <td class="lbl">Religion</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.religion)}</td>
      <td class="val"><strong>Status:</strong>&nbsp; ${statusLabel}</td>
    </tr>
  </table>

  <!-- Family Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Family Information</td></tr>

    <tr>
      <td class="lbl">Father's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherName)}</td>
      <td class="val"><strong>Mobile:</strong>&nbsp; ${fmt(s.fatherMobile)}</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherProfession)}</td>
      <td class="val"><strong>Monthly Income:</strong>&nbsp; ${fmtTk(s.fatherMonthlyIncome)}</td>
    </tr>
    <tr>
      <td class="lbl">Mother's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherName)}</td>
      <td class="val"><strong>Mobile:</strong>&nbsp; ${fmt(s.motherMobile)}</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherProfession)}</td>
      <td class="val"><strong>Monthly Income:</strong>&nbsp; ${fmtTk(s.motherMonthlyIncome)}</td>
    </tr>
    <tr>
      <td class="lbl">Guardian Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianName)}</td>
      <td class="val"><strong>Relation:</strong>&nbsp; ${fmt(s.guardianRelation)}</td>
    </tr>
    <tr>
      <td class="lbl">Guardian Phone</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianPhone)}</td>
      <td class="val"><strong>WhatsApp:</strong>&nbsp; ${fmt(s.whatsappNumber)}</td>
    </tr>
    <tr>
      <td class="lbl">Address</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.address)}</td>
    </tr>
  </table>

  <!-- Academic Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Academic Information</td></tr>

    <tr>
      <td class="lbl">Class</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.class)}</td>
      <td class="val"><strong>Section:</strong>&nbsp; ${fmt(s.section)}</td>
    </tr>
    <tr>
      <td class="lbl">Roll No.</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.rollNo)}</td>
      <td class="val"><strong>Shift:</strong>&nbsp; ${fmt(s.shift)}</td>
    </tr>
    <tr>
      <td class="lbl">Group</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.group)}</td>
      <td class="val"><strong>Monthly Fee:</strong>&nbsp; ${fmtTk(s.monthlyFee)}</td>
    </tr>
    <tr>
      <td class="lbl">Admission Date</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmtDate(s.admissionDate)}</td>
    </tr>
  </table>

  <!-- Signatures -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line">Student Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Guardian Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Principal</div>
      <div class="sig-sub">${fmt(schoolName)}</div>
    </div>
  </div>

  <p class="footnote">Generated on ${new Date().toLocaleString('en-GB')} · ${fmt(schoolName)}</p>
</div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
  return true;
}
