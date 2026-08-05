import { readFile, writeFile } from 'node:fs/promises';

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(before, after);
}

let app = await readFile('app.js', 'utf8');

app = replaceOnce(
  app,
  "import { loadDecisions, saveDecision, getDecision, deleteDecision, deleteAllDecisions, createBackupPayload, restoreBackupPayload } from './lib/storage.js';",
  "import { loadDecisions, saveDecision, getDecision, deleteDecision, deleteAllDecisions, createBackupPayload, validateBackupPayload, restoreBackupPayload } from './lib/storage.js';",
  'storage import',
);

app = replaceOnce(
  app,
  "const state = { screen: 'home', activeId: null, volatileDecision: null, dialog: null, message: '' };",
  "const state = { screen: 'home', activeId: null, volatileDecision: null, dialog: null, dialogReturnFocus: '', message: '' };",
  'state dialog focus',
);

app = replaceOnce(
  app,
  `function bindGlobal(){\n  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));\n  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>{state.dialog=null;render();}));\n}`,
  `function bindGlobal(){\n  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));\n  document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',closeDialog));\n  if(state.dialog){ bindDialog(); bindDialogA11y(); }\n}\nfunction closeDialog(){\n  const returnFocus=state.dialogReturnFocus;\n  state.dialog=null;\n  state.dialogReturnFocus='';\n  render();\n  if(returnFocus) requestAnimationFrame(()=>document.querySelector(returnFocus)?.focus());\n}\nfunction bindDialogA11y(){\n  const dialog=document.querySelector('[role=\"dialog\"]');\n  if(!dialog)return;\n  const selector='button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])';\n  const focusables=[...dialog.querySelectorAll(selector)].filter(el=>!el.hidden && el.getClientRects().length);\n  const first=focusables[0];\n  const last=focusables[focusables.length-1];\n  requestAnimationFrame(()=>first?.focus());\n  dialog.addEventListener('keydown',event=>{\n    if(event.key==='Escape'){ event.preventDefault(); closeDialog(); return; }\n    if(event.key!=='Tab' || !first || !last)return;\n    if(event.shiftKey && document.activeElement===first){ event.preventDefault(); last.focus(); }\n    else if(!event.shiftKey && document.activeElement===last){ event.preventDefault(); first.focus(); }\n  });\n}`,
  'dialog keyboard support',
);

app = replaceOnce(
  app,
  `  if(d.type==='delete-all') return \`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Eliminare tutti i dati locali?</h2><p>Questa azione non può essere annullata senza un backup.</p><label class="field"><span>Digita ELIMINA</span><input class="input" id="delete-confirm-text"></label><div class="row"><button class="btn btn-danger" id="confirm-delete-all">Elimina tutti i dati</button><button class="btn btn-secondary" data-close-dialog>Annulla</button></div></section></div>\`;\n  return '';`,
  `  if(d.type==='delete-all') return \`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Eliminare tutti i dati locali?</h2><p>Questa azione non può essere annullata senza un backup.</p><label class="field"><span>Digita ELIMINA</span><input class="input" id="delete-confirm-text"></label><div class="row"><button class="btn btn-danger" id="confirm-delete-all">Elimina tutti i dati</button><button class="btn btn-secondary" data-close-dialog>Annulla</button></div></section></div>\`;\n  if(d.type==='restore') return \`<div class="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Ripristinare questo backup?</h2><p>Le decisioni attualmente salvate su questo dispositivo verranno sostituite dai dati del backup.</p><div class="row"><button class="btn btn-primary" id="confirm-restore">Ripristina e sostituisci</button><button class="btn btn-secondary" data-close-dialog>Annulla</button></div></section></div>\`;\n  return '';`,
  'restore confirmation dialog',
);

app = replaceOnce(
  app,
  "function bindDecisionCards(){ document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{const d=getDecision(b.dataset.open);navigate(d.status==='Completed'?'final':momentScreen(d.currentMoment),d.id);})); document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{state.dialog={type:'delete',id:b.dataset.delete};render();bindDialog();})); }",
  "function bindDecisionCards(){ document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{const d=getDecision(b.dataset.open);navigate(d.status==='Completed'?'final':momentScreen(d.currentMoment),d.id);})); document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{state.dialog={type:'delete',id:b.dataset.delete};state.dialogReturnFocus=`[data-delete=\"${b.dataset.delete}\"]`;render();})); }",
  'decision delete dialog opener',
);

app = replaceOnce(
  app,
  "function bindDialog(){ document.querySelector('#confirm-delete')?.addEventListener('click',()=>{deleteDecision(state.dialog.id);state.dialog=null;flash('Decisione eliminata.');}); document.querySelector('#confirm-delete-all')?.addEventListener('click',()=>{if(document.querySelector('#delete-confirm-text').value==='ELIMINA'){deleteAllDecisions();state.dialog=null;flash('Tutti i dati locali sono stati eliminati.');}}); }",
  "function bindDialog(){ document.querySelector('#confirm-delete')?.addEventListener('click',()=>{deleteDecision(state.dialog.id);closeDialog();flash('Decisione eliminata.');}); document.querySelector('#confirm-delete-all')?.addEventListener('click',()=>{if(document.querySelector('#delete-confirm-text').value==='ELIMINA'){deleteAllDecisions();closeDialog();flash('Tutti i dati locali sono stati eliminati.');}}); document.querySelector('#confirm-restore')?.addEventListener('click',()=>{const result=restoreBackupPayload(state.dialog.payload);if(result.valid){closeDialog();flash('Dati ripristinati.');}else flash(result.error);}); }",
  'dialog actions',
);

app = replaceOnce(
  app,
  "renderData.bind=()=>{document.querySelector('#backup').addEventListener('click',()=>{exportBackup(createBackupPayload());flash('Backup creato.');});document.querySelector('#restore-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const payload=JSON.parse(await file.text());const result=restoreBackupPayload(payload);result.valid?flash('Dati ripristinati.'):flash(result.error);}catch{flash('Backup non valido.');}});document.querySelector('#delete-all').addEventListener('click',()=>{state.dialog={type:'delete-all'};render();bindDialog();});};",
  "renderData.bind=()=>{document.querySelector('#backup').addEventListener('click',()=>{exportBackup(createBackupPayload());flash('Backup creato.');});document.querySelector('#restore-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const payload=JSON.parse(await file.text());const validation=validateBackupPayload(payload);if(!validation.valid){flash(validation.error);return;}state.dialog={type:'restore',payload};state.dialogReturnFocus='#backup';render();}catch{flash('Backup non valido.');}});document.querySelector('#delete-all').addEventListener('click',()=>{state.dialog={type:'delete-all'};state.dialogReturnFocus='#delete-all';render();});};",
  'restore confirmation flow',
);

await writeFile('app.js', app);

let qa = await readFile('qa/browser-qa.mjs', 'utf8');
qa = replaceOnce(
  qa,
  `    await page.setInputFiles('#restore-file', backupPath);\n    await page.waitForTimeout(300);\n    const restored = await page.locator('text=1 decisioni salvate localmente.').count();\n    if (!restored) throw new Error('Ripristino non verificato.');\n    record('Backup, eliminazione e ripristino', 'Desktop 1440×900', true, 'Backup JSON scaricato, dati eliminati e ripristinati.');\n\n    const hasRestoreConfirmation = false;\n    if (!hasRestoreConfirmation) bug('CC-QA-004', 'Medium', 'Ripristino sostituisce i dati senza conferma', 'La selezione del file applica immediatamente il backup e sostituisce lo storage locale senza dialog di conferma.');`,
  `    await page.setInputFiles('#restore-file', backupPath);\n    await page.waitForSelector('[role="dialog"]');\n    const restoreTitle = await page.locator('#dialog-title').textContent();\n    const stillZero = await page.locator('text=0 decisioni salvate localmente.').count();\n    const restoreFocused = await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));\n    if (!restoreTitle?.includes('Ripristinare questo backup') || !stillZero || !restoreFocused) throw new Error('Conferma di ripristino assente, tardiva o senza focus.');\n    await page.click('#confirm-restore');\n    const restored = await page.locator('text=1 decisioni salvate localmente.').count();\n    if (!restored) throw new Error('Ripristino non verificato.');\n    record('Backup, eliminazione e ripristino', 'Desktop 1440×900', true, 'Backup JSON scaricato; cancellazione e ripristino confermato completati.');`,
  'restore QA confirmation',
);
await writeFile('qa/browser-qa.mjs', qa);

console.log('Pre-deploy fixes applied.');
