// Shared printable invoice/payment-receipt template.
// Renders an A4 page split into two identical halves: top = Student Copy,
// bottom = Office Copy. Both halves carry signature lines for guardian/student
// and authorized signatory.

export interface InvoiceData {
  receiptNo: string;
  paymentDate: string | Date;
  amount: number;
  discount?: number;
  note?: string;
  paymentMethod?: string;
  collectedBy?: string;
  fee: {
    category: string;
    month?: string;
    description?: string;
    total_fee: number;
    paid_amount?: number;
    due_amount?: number;
  };
  student: {
    name: string;
    class?: string;
    section?: string;
    rollNo?: string;
    fatherName?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
  school: {
    name?: string;
    address?: string;
    contact?: string;
    logoUrl?: string;
  };
}

const fmt = (v: string | number | undefined | null) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

const tk = (n: number | undefined) =>
  `BDT ${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function formatCategory(cat: string): string {
  if (!cat) return 'Fee';
  return cat
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function copyHtml(label: string, d: InvoiceData): string {
  const dateStr = new Date(d.paymentDate).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const logoHtml = d.school.logoUrl
    ? `<img src="${d.school.logoUrl}" alt="logo" class="logo" />`
    : `<div class="logo-placeholder">${(d.school.name || 'S')[0].toUpperCase()}</div>`;

  const totalDue = d.fee.due_amount ?? 0;
  const totalPaid = d.fee.paid_amount ?? 0;

  return `
    <section class="copy">
      <div class="copy-label">${label}</div>
      <header class="head">
        ${logoHtml}
        <div class="head-text">
          <h1>${fmt(d.school.name)}</h1>
          <p>${fmt(d.school.address)}</p>
          <p>${d.school.contact ? 'Contact: ' + d.school.contact : ''}</p>
        </div>
      </header>
      <div class="title-row">
        <div class="title">Money Receipt</div>
        <div class="meta">
          <div><b>Receipt No:</b> ${fmt(d.receiptNo)}</div>
          <div><b>Date:</b> ${dateStr}</div>
        </div>
      </div>
      <table class="info">
        <tr>
          <td class="lbl">Student Name</td>
          <td class="val">${fmt(d.student.name)}</td>
          <td class="lbl">Class / Section</td>
          <td class="val">${fmt(d.student.class)} ${d.student.section ? '/ ' + d.student.section : ''}</td>
        </tr>
        <tr>
          <td class="lbl">Roll</td>
          <td class="val">${fmt(d.student.rollNo)}</td>
          <td class="lbl">Guardian</td>
          <td class="val">${fmt(d.student.guardianName || d.student.fatherName)}</td>
        </tr>
      </table>
      <table class="items">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Description</th>
            <th class="num">Amount (BDT)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="num">1</td>
            <td>
              <b>${formatCategory(d.fee.category)}</b>${d.fee.month ? ' — ' + d.fee.month : ''}
              ${d.fee.description ? '<br/><span class="muted">' + d.fee.description + '</span>' : ''}
              ${d.note ? '<br/><span class="muted">Note: ' + d.note + '</span>' : ''}
            </td>
            <td class="num">${tk(d.amount)}</td>
          </tr>
          ${d.discount && d.discount > 0 ? `
          <tr>
            <td class="num">2</td>
            <td>Discount</td>
            <td class="num">- ${tk(d.discount)}</td>
          </tr>` : ''}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" class="total-lbl">Total Paid</td>
            <td class="num total-val">${tk(d.amount)}</td>
          </tr>
          <tr>
            <td colspan="2" class="muted">Fee Total: ${tk(d.fee.total_fee)} · Paid till date: ${tk(totalPaid)} · Outstanding: ${tk(totalDue)}</td>
            <td class="num"></td>
          </tr>
        </tfoot>
      </table>
      <div class="sign-row">
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-label">Guardian / Student Signature</div>
        </div>
        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-label">Authorized Signatory${d.collectedBy ? ' (' + d.collectedBy + ')' : ''}</div>
        </div>
      </div>
    </section>
  `;
}

export function buildInvoiceHTML(data: InvoiceData): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Money Receipt — ${fmt(data.student.name)}</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; font-size: 11px; }
  .sheet { width: 100%; }
  .copy { padding: 6px 0; border-bottom: 2px dashed #777; margin-bottom: 12px; position: relative; }
  .copy:last-child { border-bottom: none; margin-bottom: 0; }
  .copy-label { position: absolute; top: 6px; right: 0; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #555; border: 1px solid #999; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; }
  .head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
  .head .logo, .head .logo-placeholder { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
  .head .logo-placeholder { display: flex; align-items: center; justify-content: center; background: #eef; color: #335; font-weight: 800; font-size: 22px; }
  .head h1 { margin: 0 0 2px 0; font-size: 17px; letter-spacing: 0.3px; }
  .head p  { margin: 0; font-size: 10.5px; color: #444; }
  .title-row { display: flex; align-items: flex-end; justify-content: space-between; margin: 4px 0 8px; }
  .title { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-bottom: 2px solid #111; padding-bottom: 2px; }
  .meta { font-size: 11px; text-align: right; line-height: 1.5; }
  .info, .items { width: 100%; border-collapse: collapse; }
  .info td { border: 1px solid #999; padding: 4px 6px; font-size: 11px; }
  .info .lbl { width: 18%; background: #f4f4f4; font-weight: 600; color: #333; }
  .info .val { width: 32%; }
  .items { margin-top: 8px; }
  .items th, .items td { border: 1px solid #999; padding: 5px 6px; font-size: 11px; }
  .items th { background: #efefef; text-align: left; font-weight: 700; }
  .items .num { text-align: right; }
  .items td.num:first-child { text-align: center; width: 5%; }
  .items th:nth-child(3), .items td:nth-child(3) { width: 22%; }
  .total-lbl { text-align: right; font-weight: 700; }
  .total-val { font-weight: 700; }
  .muted { color: #555; font-size: 10px; }
  .sign-row { display: flex; gap: 60px; margin-top: 36px; padding: 0 6px; }
  .sign-box { flex: 1; }
  .sign-line { border-bottom: 1px solid #111; height: 24px; }
  .sign-label { font-size: 10px; text-align: center; margin-top: 4px; color: #333; }
  @media print {
    .no-print { display: none !important; }
    .copy { page-break-inside: avoid; }
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
    ${copyHtml('Student Copy', data)}
    ${copyHtml('Office Copy', data)}
  </div>
</body>
</html>`;
}

export function openInvoiceWindow(data: InvoiceData): void {
  const html = buildInvoiceHTML(data);
  const win = window.open('', '_blank');
  if (!win) {
    alert('Allow pop-ups to print the invoice.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { /* ignore */ }
  }, 400);
}
