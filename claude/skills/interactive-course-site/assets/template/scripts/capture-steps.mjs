#!/usr/bin/env node
/**
 * 全ステップを撮影する。図は「動かして見る」ものなので、書いたデータが意図どおりの絵になっているかは
 * 目で確かめるしかない。レッスンを書いたら必ずこれを回し、画像を開いて確認する。
 *
 *   node scripts/capture-steps.mjs                         全レッスン・全ステップ（desktop / light）
 *   node scripts/capture-steps.mjs --lesson event-loop     レッスンを絞る
 *   node scripts/capture-steps.mjs --steps 1,5,8           ステップを絞る
 *   node scripts/capture-steps.mjs --viewports desktop,tablet,mobile --themes light,dark
 *   node scripts/capture-steps.mjs --pages                 チートシート・用語集・検索パレットも撮る
 *   node scripts/capture-steps.mjs --reduced               動きを減らす設定で撮る
 *
 * 出力: captures/<viewport>-<theme>/<lesson>-<step>.png
 * 予測問題のあるステップは、回答前（-q）と回答後の 2 枚を撮る。
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const VIEWPORTS = { desktop: [1440, 900], tablet: [1024, 768], mobile: [390, 844] };
const viewports = opt('viewports', 'desktop').split(',');
const themes = opt('themes', 'light').split(',');
const onlyLesson = opt('lesson', null);
const onlySteps = opt('steps', null)?.split(',').map(Number);
const settle = Number(opt('settle', 2600));

const server = await createServer({ root, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];

async function launch() {
  // 手元の Chrome があればそれを使い、なければ Playwright 同梱の Chromium を使う
  try { return await chromium.launch({ channel: 'chrome' }); } catch { return await chromium.launch(); }
}
const browser = await launch();
let shots = 0;
const problems = [];

try {
  for (const vp of viewports) {
    const [width, height] = VIEWPORTS[vp] ?? VIEWPORTS.desktop;
    for (const theme of themes) {
      const dir = path.join(root, 'captures', `${vp}-${theme}`);
      await mkdir(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width, height }, deviceScaleFactor: 2,
        reducedMotion: has('reduced') ? 'reduce' : 'no-preference',
        hasTouch: vp === 'mobile',
      });
      await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* 無視 */ } }, theme);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => problems.push(`[${vp}/${theme}] ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${vp}/${theme}] console: ${m.text()}`); });

      await page.goto(base);
      await page.waitForSelector('.tdot');
      const lessons = await page.$$eval('.sidebar .lesson-link', (as) => as.map((a) => a.getAttribute('href').split('/')[1]));
      for (const lesson of lessons) {
        if (onlyLesson && lesson !== onlyLesson) continue;
        await page.goto(`${base}#/${lesson}/1`);
        await page.waitForTimeout(300);
        const count = await page.$$eval('.tdot', (n) => n.length);
        for (let step = 1; step <= count; step++) {
          if (onlySteps && !onlySteps.includes(step)) continue;
          // 1 つ前から「次へ」で進み、実際の遷移アニメーションを経た状態を撮る
          await page.goto(`${base}#/${lesson}/${step}`);
          await page.waitForTimeout(settle);
          const name = `${lesson}-${String(step).padStart(2, '0')}`;
          const pending = await page.$('.opt:not([disabled])');
          if (pending) {
            await page.screenshot({ path: path.join(dir, `${name}-q.png`) });
            shots++;
            await pending.click();
            await page.waitForTimeout(settle);
          }
          await page.screenshot({ path: path.join(dir, `${name}.png`) });
          shots++;
          // 横にはみ出していないか（小さい画面での崩れを機械的に拾う）
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          if (overflow > 1) problems.push(`[${vp}/${theme}] ${name}: 横に ${overflow}px はみ出している`);
        }
      }
      if (has('pages')) {
        for (const p of ['~cheatsheet', '~glossary']) {
          await page.goto(`${base}#/${p}`);
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(dir, `page-${p.slice(1)}.png`) });
          shots++;
        }
        await page.goto(base);
        await page.waitForTimeout(600);
        await page.keyboard.press('Control+k');
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dir, 'page-search.png') });
        shots++;
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(`${shots} 枚を captures/ に保存しました。`);
if (problems.length) {
  console.log('\n問題が見つかりました:');
  for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
  process.exitCode = 1;
}
