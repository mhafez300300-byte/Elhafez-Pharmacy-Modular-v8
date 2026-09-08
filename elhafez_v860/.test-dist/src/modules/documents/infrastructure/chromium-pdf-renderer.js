import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { AppError } from '../../../core/errors/app-error.js';
const run = promisify(execFile);
export class ChromiumPdfRenderer {
    chromiumPath;
    constructor(chromiumPath = process.env.CHROMIUM_PATH?.trim() || '/usr/local/bin/elhafez-chromium') {
        this.chromiumPath = chromiumPath;
    }
    async renderHtml(html) { const dir = await mkdtemp(path.join(tmpdir(), 'elhafez-pdf-')), input = path.join(dir, 'document.html'), output = path.join(dir, 'document.pdf'); try {
        await writeFile(input, html, 'utf8');
        await run(this.chromiumPath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-pdf-header-footer', `--print-to-pdf=${output}`, `file://${input}`], { timeout: 30000, maxBuffer: 1024 * 1024 });
        const pdf = await readFile(output);
        if (pdf.length < 100 || pdf.subarray(0, 4).toString() !== '%PDF')
            throw new Error('invalid pdf');
        return pdf;
    }
    catch (e) {
        throw new AppError('PDF_RENDER_FAILED', 'تعذر إنشاء ملف PDF على الخادم', 500, { reason: e instanceof Error ? e.message : 'unknown' });
    }
    finally {
        await rm(dir, { recursive: true, force: true }).catch(() => { });
    } }
}
