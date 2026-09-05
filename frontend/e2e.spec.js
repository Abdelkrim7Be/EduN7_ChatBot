import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function makeMinimalPdf() {
  const stream = 'BT /F1 14 Tf 72 720 Td (ENSET AI E2E upload document) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(body));
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body);
}

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('uploaded document survives a reload', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(`${BASE}/login`);

  await page.locator('input[type="email"]').fill(process.env.E2E_EMAIL || 'admin@enset.ma');
  await page.locator('input[type="password"]').first().fill(process.env.E2E_PASSWORD || 'Password123!');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.locator('textarea')).toBeEnabled({ timeout: 20000 });

  const pdfName = `TEST_DOC_e2e_${Date.now()}.pdf`;
  const pdfPath = path.join(process.cwd(), pdfName);
  fs.writeFileSync(pdfPath, makeMinimalPdf());
  let uploadedDocId = null;

  try {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Ajouter un document' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(pdfPath);

    // The generated filename matches the MATIERE_TYPE_TITRE convention, so the
    // rename modal should not appear; click through it if it ever does.
    const confirmBtn = page.getByRole('button', { name: 'Confirmer et envoyer' });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.getByText(pdfName).first()).toBeVisible({ timeout: 30000 });

    uploadedDocId = await page.evaluate(async (name) => {
      const res = await fetch('/api/documents', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.documents.find((doc) => doc.original_filename === name)?.doc_id ?? null;
    }, pdfName);

    await page.reload();
    await expect(page.getByText(pdfName).first()).toBeVisible({ timeout: 30000 });
  } finally {
    if (uploadedDocId) {
      await page.evaluate(async (docId) => {
        const csrf = document.cookie
          .split('; ')
          .find((entry) => entry.startsWith('ensetai_csrf='))
          ?.split('=')[1];
        await fetch(`/api/documents/${docId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {},
        });
      }, uploadedDocId).catch(() => undefined);
    }
    fs.rmSync(pdfPath, { force: true });
  }
});
