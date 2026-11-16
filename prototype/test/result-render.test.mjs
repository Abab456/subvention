import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mixed results keep a closed candidate visibly closed', async () => {
  const handlers = {};
  const app = { innerHTML: '', addEventListener(type, handler) { handlers[type] = handler; }, querySelector() { return { focus() {} }; } };
  globalThis.document = { getElementById: () => app, documentElement: { lang: '' } };
  globalThis.location = { search: '?engine=1' };
  try {
    // Redirect module addresses only. Production rendering and normalization run unchanged.
    const evaluator = `export function evaluateProject(input) { return {
      status: 'manual_review', segment: input.segment, figures: null, nextSteps: [],
      candidatePrograms: [{id:'closed-test', name:'Closed stream', status:'program_closed',
        officialUrl:'https://www.quebec.ca/', sourceCheckedAt:null, verificationStatus:'NOT_VERIFIED',
        reasons:['New requests closed in the checked context.'], missingInformation:[]}],
      disclaimer:'Synthetic contract rendering check.' }; }`;
    const engineUrl = 'data:text/javascript;base64,' + Buffer.from(evaluator).toString('base64');
    const source = (await readFile(new URL('../app.mjs', import.meta.url), 'utf8'))
      .replace("from './model.mjs'", `from '${new URL('../model.mjs', import.meta.url).href}'`)
      .replace("import('/engine/index.mjs')", `import('${engineUrl}')`);
    await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    await handlers.click({ target: { closest: () => ({ dataset: { screen: 'results' } }) } });
    const card = app.innerHTML.match(/<article class="program">[\s\S]*?<\/article>/)?.[0];
    assert.ok(card, 'candidate card exists');
    assert.match(card, /Volet fermé pour ce contexte/);
    assert.match(card, /New requests closed/);
    assert.doesNotMatch(card, />Piste à examiner</);
    assert.match(app.innerHTML, /figures: null/);
  } finally {
    delete globalThis.document;
    delete globalThis.location;
  }
});
