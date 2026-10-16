import { signRenderToken, type RenderKind } from '@row/shared/render-token';
import { chromium, type Browser } from 'playwright-core';
import { env } from './env.ts';

let browser: Browser | undefined;

async function getBrowser() {
  if (browser?.isConnected()) return browser;
  browser = await chromium.launch(env.browserPath ? { executablePath: env.browserPath } : {});
  browser.on('disconnected', () => (browser = undefined));
  return browser;
}

export async function closeBrowser() {
  await browser?.close().catch(() => {});
  browser = undefined;
}

/** แคป #render-root ของหน้า /render/{kind}/{id} (ป้องกันด้วย token ลงนามอายุสั้น) เป็น PNG */
export async function renderPng(kind: RenderKind, id: string, field?: 'main' | 'sub'): Promise<Buffer> {
  const token = signRenderToken(env.renderSecret, kind, id);
  const ctx = await (await getBrowser()).newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1.5,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok'
  });
  try {
    // รูปใน Discord: ธีมมืด ภาษาไทย เวลากิลด์ (Bangkok)
    await ctx.addCookies(
      ['app-theme=dark', 'locale=th', 'tz=Asia%2FBangkok'].map((c) => {
        const [name, value] = c.split('=') as [string, string];
        return { name, value, url: env.webUrl };
      })
    );
    const page = await ctx.newPage();
    const res = await page.goto(`${env.webUrl}/render/${kind}/${id}?token=${encodeURIComponent(token)}${field ? `&field=${field}` : ''}`, {
      waitUntil: 'networkidle',
      timeout: 30_000
    });
    if (!res?.ok()) throw new Error(`render page returned ${res?.status()}`);
    return await page.locator('#render-root').screenshot({ type: 'png' });
  } finally {
    await ctx.close();
  }
}
