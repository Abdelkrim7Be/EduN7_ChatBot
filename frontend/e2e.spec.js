import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function makeMinimalPdf() {
  const stream = 'BT /F1 14 Tf 72 720 Td (EduN7 E2E upload document) Tj ET';
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
  await page.goto(`${BASE}/login`);

  await page.locator('input[type="email"]').fill(process.env.E2E_EMAIL || 'admin@enset.ma');
  await page.locator('input[type="password"]').first().fill(process.env.E2E_PASSWORD || 'Password123!');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.locator('textarea')).toBeEnabled({ timeout: 20000 });

  const pdfPath = path.join(process.cwd(), 'TEST_DOC_e2e.pdf');
  fs.writeFileSync(pdfPath, makeMinimalPdf());

  try {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Ajouter un document' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(pdfPath);

    // TEST_DOC_e2e.pdf already matches the MATIERE_TYPE_TITRE convention, so the
    // rename modal should not appear; click through it if it ever does.
    const confirmBtn = page.getByRole('button', { name: 'Confirmer et envoyer' });
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(page.getByText('TEST_DOC_e2e.pdf').first()).toBeVisible({ timeout: 30000 });

    await page.reload();
    await expect(page.getByText('TEST_DOC_e2e.pdf').first()).toBeVisible({ timeout: 30000 });
  } finally {
    fs.rmSync(pdfPath, { force: true });
  }
});
