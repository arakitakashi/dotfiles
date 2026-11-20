#!/usr/bin/env node
/**
 * 実際のブラウザで、読者の操作を一通りなぞる。
 *   - キーボードだけで全レッスンを最後まで進められる（予測問題は答えるまで先へ進めない）
 *   - 最後まで進むとレッスンが完了になり、進捗が保存される
 *   - 検索パレット、チートシート、用語集が開く
 *   - 動きを減らす設定では、落ち着いたあとに動き続けるアニメーションがない
 *   - コンソールにエラーが出ない
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
let browser;
try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

try {
  /* ── 1. キーボードだけで完走 ── */
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => failures.push(`例外: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') failures.push(`console.error: ${m.text()}`); });
  await page.goto(base);
  await page.waitForSelector('.tdot');
  const lessons = await page.$$eval('.sidebar .lesson-link', (as) => as.map((a) => a.getAttribute('href').split('/')[1]));

  for (const lesson of lessons) {
    await page.goto(`${base}#/${lesson}/1`);
    await page.waitForTimeout(150);
    const count = await page.$$eval('.tdot', (n) => n.length);
    for (let step = 1; step < count; step++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(60);
      // 解説の部品が潰れていない（表が高さ数 px になる、といった崩れを拾う）
      const squashed = await page.$$eval('.guide__rest:not([hidden]) > *, .predict', (els) => els.filter((n) => n.getBoundingClientRect().height < 16).map((n) => n.className));
      check(squashed.length === 0, `${lesson}#${step + 1}: 解説の部品が潰れている（${squashed.join(', ')}）`);
      if (await page.$('.opt:not([disabled])')) {
        // 未回答のまま → を押しても進まないこと
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(60);
        check(page.url().endsWith(`#/${lesson}/${step + 1}`), `${lesson}#${step + 1}: 予測に答える前に先へ進めてしまう`);
        check(await page.$eval('.guide__rest', (n) => n.hidden), `${lesson}#${step + 1}: 予測に答える前に本文が見えている`);
        await page.focus('.opt:not([disabled])');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(60);
        check(await page.$('.predict__result'), `${lesson}#${step + 1}: 答え合わせが表示されない`);
      }
      check(page.url().endsWith(`#/${lesson}/${step + 1}`), `${lesson}: → キーでステップ ${step + 1} に進めない（現在 ${page.url()}）`);
      const label = await page.getAttribute('.stage-svg', 'aria-label');
      check(label && label.length > 8, `${lesson}#${step + 1}: 図の代替テキストがない`);
    }
    check(await page.$(`.lesson-link.is-done[href="#/${lesson}/1"]`), `${lesson}: 最後まで進んでも完了にならない`);
    check((await page.$$eval('.goals li:not(.is-on)', (n) => n.length)) === 0, `${lesson}: 最後まで進んでもチェックの付かない学習目標がある`);
  }

  // 「次へ」をキーボードで押しても、フォーカスが同じボタンに残る（毎回先頭から辿り直させない）
  await page.goto(`${base}#/${lessons[0]}/1`);
  await page.waitForTimeout(150);
  await page.focus('.guide__nav [data-act="next"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  check(await page.evaluate(() => !!document.activeElement?.closest('.guide')), '「次へ」を押すとフォーカスが解説カードの外へ落ちる');

  // 「本文へ移動」は URL を変えず、ステップも動かさない
  const before = page.url();
  await page.focus('.skip');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  check(page.url() === before, `スキップリンクで URL が変わる（${page.url()}）`);
  check(await page.evaluate(() => document.activeElement?.id === 'guide'), 'スキップリンクで解説カードにフォーカスが移らない');

  // 壊れた URL でも落ちずに表示される
  await page.goto(`${base}#/%E0%A4%A`);
  await page.waitForTimeout(150);
  check(await page.$('.guide__title'), '壊れた URL を開くと何も表示されない');

  // 小さい画面で文字が隠れても、ボタンとナビに名前がある
  const unnamed = await page.$$eval('.tool, .nav a, .iconbtn, .searchbtn', (els) => els.filter((n) => !n.getAttribute('aria-label')).length);
  check(unnamed === 0, `名前（aria-label）のないボタン・リンクが ${unnamed} 個ある`);

  await page.goto(`${base}#/${lessons[lessons.length - 1]}/${await page.$$eval('.tdot', (n) => n.length)}`);
  await page.waitForTimeout(150);

  // 現在地が支援技術に伝わる
  check(await page.$('.tdot[aria-current="step"]'), 'タイムラインの現在地に aria-current がない');
  check(await page.$('.lesson-link[aria-current]'), '目次の現在地に aria-current がない');
  check((await page.textContent('#live'))?.length > 4, 'ステップの変更が live region で告知されない');

  // 動きを減らす設定: 落ち着いたあとに動き続けるものがない
  await page.waitForTimeout(400);
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  check(running === 0, `動きを減らす設定なのに、動き続けるアニメーションが ${running} 個ある`);

  // 再読み込みしても進捗が残り、続きから始まる
  await page.goto(base);
  await page.waitForSelector('.tdot');
  check(await page.$('.lesson-link.is-done'), '再読み込みで進捗が消える');

  /* ── 2. 検索・チートシート・用語集 ── */
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette[open]');
  check((await page.$$eval('.hit', (n) => n.length)) >= lessons.length, '空の検索でレッスン一覧が出ない');
  const firstTerm = await page.evaluate(() => document.querySelector('.guide .term')?.textContent ?? '');
  await page.keyboard.type('zzqqxx');
  await page.waitForTimeout(60);
  check(await page.$('.palette__empty .chipbtn'), '検索 0 件のときに候補の語が出ない');
  await page.keyboard.press('Escape');
  check(!(await page.$('.palette[open]')), 'Esc で検索が閉じない');

  await page.goto(`${base}#/~cheatsheet`);
  await page.waitForTimeout(100);
  check((await page.$$eval('.sheetcard', (n) => n.length)) === lessons.length, 'チートシートに載っていないレッスンがある（recap の takeaways を確認）');
  await page.goto(`${base}#/~glossary`);
  await page.waitForTimeout(100);
  check((await page.$$eval('.gloss', (n) => n.length)) > 0, '用語集が空');
  void firstTerm;
  await page.close();

  /* ── 3. 小さい画面: 横にはみ出さず、図が見えたまま読める ── */
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  phone.on('pageerror', (e) => failures.push(`例外(モバイル): ${e.message}`));
  await phone.goto(`${base}#/${lessons[0]}/2`);
  await phone.waitForTimeout(1800);
  check((await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1, 'モバイルで横にはみ出している');
  await phone.evaluate(() => scrollTo(0, 600));
  await phone.waitForTimeout(200);
  const top = await phone.$eval('.stage', (n) => n.getBoundingClientRect().top);
  check(top >= 0 && top < 120, `モバイルで本文を読み進めると図が画面外に出る（top=${Math.round(top)}）`);
  const scale = await phone.evaluate(() => {
    const svg = document.querySelector('.stage-svg');
    return svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  });
  check(scale >= 0.6, `モバイルで図が小さすぎる（倍率 ${scale.toFixed(2)}）`);
  await phone.close();
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.log('スモークテスト失敗:');
  for (const f of [...new Set(failures)]) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('スモークテスト OK（キーボード完走 / 予測のゲート / 進捗の保存 / 検索 / 動きを減らす設定 / モバイル）');
}
