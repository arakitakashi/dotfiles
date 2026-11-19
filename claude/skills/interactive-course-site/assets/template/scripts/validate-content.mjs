#!/usr/bin/env node
/**
 * レッスンの内容と配色を検証する。規則の本体は src/validate.ts にある。
 *
 *   node scripts/validate-content.mjs            error があれば終了コード 1
 *   node scripts/validate-content.mjs --strict   warn も失敗として扱う（公開前の最終確認用）
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

// TypeScript のコース定義をそのまま読み込むために Vite を使う（別途ビルドしない）
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
let issues;
let stats;
try {
  const { course } = await server.ssrLoadModule('/src/content/course.ts');
  const { validateCourse, validateThemes } = await server.ssrLoadModule('/src/validate.ts');
  const css = await readFile(path.join(root, 'src/styles/themes.css'), 'utf8');
  issues = [...validateCourse(course), ...validateThemes(css)];
  const lessons = course.modules.flatMap((m) => m.lessons);
  stats = {
    lessons: lessons.length,
    steps: lessons.reduce((n, l) => n + l.steps.length, 0),
    predicts: lessons.reduce((n, l) => n + l.steps.filter((s) => s.predict).length, 0),
    knobs: lessons.reduce((n, l) => n + l.steps.filter((s) => s.knobs).length, 0),
    terms: Object.keys(course.glossary).length,
  };
} finally {
  await server.close();
}

const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');
for (const i of [...errors, ...warns]) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.where.padEnd(24)} [${i.rule}] ${i.message}`);
console.log(`\n${stats.lessons} レッスン / ${stats.steps} ステップ / 予測 ${stats.predicts} / つまみ ${stats.knobs} / 用語 ${stats.terms}`);
console.log(`error ${errors.length} 件、warn ${warns.length} 件`);
if (errors.length || (strict && warns.length)) process.exitCode = 1;
