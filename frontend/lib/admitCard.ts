// Printable A4 admit-card sheet. 3 cards per page, simple modern layout
// with thin border, monochrome background, photo + bilingual names + IDs +
// dual signature slots (Exam Controller, Principal).

export interface AdmitCardStudent {
  name: string;
  nameBn?: string;
  studentId?: string;
  class?: string;
  section?: string;
  shift?: string;
  group?: string;
  rollNo?: string;
  photoUrl?: string;
}

export interface AdmitCardSchool {
  name?: string;
  address?: string;
  contact?: string;
  logoUrl?: string;
}

export interface AdmitCardOptions {
  examName: string;
  examDate?: string;
  controllerSignatureUrl?: string;
  principalSignatureUrl?: string;
  controllerName?: string;
  principalName?: string;
}

const fmt = (v: string | number | undefined | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cardHtml(s: AdmitCardStudent, school: AdmitCardSchool, opts: AdmitCardOptions): string {
  const photoHtml = s.photoUrl
    ? `<img src="${escapeHtml(s.photoUrl)}" class="photo" alt="photo" />`
    : `<div class="photo placeholder">${escapeHtml((s.name || '?')[0]).toUpperCase()}</div>`;

  const logoHtml = school.logoUrl
    ? `<img src="${escapeHtml(school.logoUrl)}" class="logo" alt="logo" />`
    : `<div class="logo placeholder">${escapeHtml((school.name || 'S')[0]).toUpperCase()}</div>`;

  const ctrlSig = opts.controllerSignatureUrl
    ? `<img src="${escapeHtml(opts.controllerSignatureUrl)}" class="sig-img" alt="signature" />`
    : '';
  const prinSig = opts.principalSignatureUrl
    ? `<img src="${escapeHtml(opts.principalSignatureUrl)}" class="sig-img" alt="signature" />`
    : '';

  return `
  <section class="card">
    <header class="head">
      ${logoHtml}
      <div class="school">
        <h1>${escapeHtml(fmt(school.name))}</h1>
        <p>${escapeHtml(fmt(school.address))}</p>
        ${school.contact ? `<p>Contact: ${escapeHtml(school.contact)}</p>` : ''}
      </div>
    </header>
    <div class="title-bar">
      <span class="title">Admit Card</span>
      <span class="exam">${escapeHtml(opts.examName)}${opts.examDate ? ' — ' + escapeHtml(opts.examDate) : ''}</span>
    </div>
    <div class="body">
      <div class="info">
        <div class="row"><span class="lbl">Name (English)</span><span class="val">${escapeHtml(fmt(s.name))}</span></div>
        <div class="row"><span class="lbl">নাম (বাংলা)</span><span class="val bn">${escapeHtml(fmt(s.nameBn))}</span></div>
        <div class="grid2">
          <div class="row"><span class="lbl">Student ID</span><span class="val mono">${escapeHtml(fmt(s.studentId))}</span></div>
          <div class="row"><span class="lbl">Roll</span><span class="val">${escapeHtml(fmt(s.rollNo))}</span></div>
          <div class="row"><span class="lbl">Class</span><span class="val">${escapeHtml(fmt(s.class))}</span></div>
          <div class="row"><span class="lbl">Section</span><span class="val">${escapeHtml(fmt(s.section))}</span></div>
          <div class="row"><span class="lbl">Shift</span><span class="val">${escapeHtml(fmt(s.shift))}</span></div>
          <div class="row"><span class="lbl">Group</span><span class="val">${escapeHtml(fmt(s.group))}</span></div>
        </div>
      </div>
      <div class="photo-wrap">${photoHtml}</div>
    </div>
    <footer class="foot">
      <div class="sig">
        <div class="sig-line">${ctrlSig}</div>
        <div class="sig-label">Exam Controller${opts.controllerName ? ' · ' + escapeHtml(opts.controllerName) : ''}</div>
      </div>
      <div class="sig">
        <div class="sig-line">${prinSig}</div>
        <div class="sig-label">Principal${opts.principalName ? ' · ' + escapeHtml(opts.principalName) : ''}</div>
      </div>
    </footer>
  </section>`;
}

export function buildAdmitCardHTML(
  students: AdmitCardStudent[],
  school: AdmitCardSchool,
  opts: AdmitCardOptions
): string {
  const cards = students.map((s) => cardHtml(s, school, opts)).join('\n');
  const titleStr = `Admit Cards — ${opts.examName}`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titleStr)}</title>
<style>
  @page { size: A4; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; font-size: 11px; }
  .sheet { width: 100%; }

  /* Three cards per A4 page (portrait) */
  .card {
    width: 100%;
    height: 90mm;
    border: 1.2px solid #111;
    border-radius: 4px;
    padding: 6mm 7mm;
    margin-bottom: 5mm;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    background: #fff;
  }
  .card:nth-child(3n) { page-break-after: always; margin-bottom: 0; }

  .head { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #111; padding-bottom: 4px; }
  .head .logo { width: 42px; height: 42px; border-radius: 4px; object-fit: cover; }
  .head .logo.placeholder { display: flex; align-items: center; justify-content: center; background: #eef; color: #335; font-weight: 800; font-size: 18px; }
  .school h1 { margin: 0; font-size: 15px; letter-spacing: 0.3px; }
  .school p { margin: 0; font-size: 10px; color: #444; }

  .title-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #999; margin-bottom: 5px; }
  .title { font-size: 13px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
  .exam { font-size: 11px; font-weight: 600; color: #222; }

  .body { display: flex; flex: 1; gap: 10px; min-height: 0; }
  .info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .info .row { display: flex; gap: 6px; align-items: baseline; padding: 2px 0; border-bottom: 1px dotted #ddd; }
  .info .row .lbl { width: 38%; font-size: 10px; color: #666; font-weight: 600; }
  .info .row .val { flex: 1; font-size: 11.5px; font-weight: 600; color: #111; }
  .info .row .val.mono { font-family: 'Courier New', monospace; letter-spacing: 0.5px; }
  .info .row .val.bn { font-family: 'SolaimanLipi','Kalpurush','Noto Sans Bengali','Segoe UI',sans-serif; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .grid2 .row { border-bottom: 1px dotted #ddd; }
  .grid2 .row .lbl { width: 50%; }

  .photo-wrap { width: 26mm; }
  .photo { width: 100%; height: 32mm; object-fit: cover; border: 1px solid #999; border-radius: 3px; background: #f7f7f7; }
  .photo.placeholder { display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 28px; color: #999; }

  .foot { display: flex; gap: 24px; justify-content: space-between; margin-top: 4px; padding-top: 6px; }
  .sig { flex: 1; text-align: center; }
  .sig-line { border-bottom: 1px solid #111; height: 16px; position: relative; display: flex; align-items: flex-end; justify-content: center; }
  .sig-img { max-height: 14mm; max-width: 100%; object-fit: contain; }
  .sig-label { font-size: 9.5px; margin-top: 3px; color: #333; font-weight: 600; }

  @media print {
    .no-print { display: none !important; }
  }
  .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 10; }
  .toolbar button { padding: 6px 14px; border: 1px solid #888; background: #fff; cursor: pointer; border-radius: 4px; font-size: 12px; }
  .toolbar button.primary { background: #111; color: #fff; border-color: #111; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()" class="primary">Print</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    ${cards}
  </div>
</body>
</html>`;
}

export function openAdmitCardWindow(
  students: AdmitCardStudent[],
  school: AdmitCardSchool,
  opts: AdmitCardOptions
): void {
  const html = buildAdmitCardHTML(students, school, opts);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow pop-ups to print admit cards.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { /* ignore */ }
  }, 500);
}
