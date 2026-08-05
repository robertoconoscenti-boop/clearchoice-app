import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const outDir = path.resolve('qa-results');
await mkdir(outDir, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, 1200);
  server.once('error', (error) => { clearTimeout(timer); reject(error); });
});

const browser = await chromium.launch({ headless: true });
const results = [];
const bugs = [];
const evidence = [];

function record(name, viewport, passed, details = '') {
  results.push({ name, viewport, status: passed ? 'Pass' : 'Fail', details });
}
function bug(id, severity, title, evidenceText) {
  if (!bugs.some((item) => item.id === id)) bugs.push({ id, severity, title, evidence: evidenceText });
}
async function screenshot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  evidence.push(file);
}
async function clearData(page) {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}
async function startBase(page, { title = 'scegliere tra corso serale e corso online', alternatives = ['Corso serale', 'Corso online'], onePlausible = false } = {}) {
  await page.click('#new-decision');
  const checks = await page.locator('[data-compat]').count();
  for (let i = 0; i < checks; i += 1) await page.locator('[data-compat]').nth(i).check();
  await page.fill('#decision-title', title);
  const altInputs = page.locator('[data-alt]');
  for (let i = 0; i < alternatives.length; i += 1) await altInputs.nth(i).fill(alternatives[i]);
  await page.click('#start-flow');
  await page.check('#no-change');
  await page.fill('#repeated-element', 'Continuo a confrontare gli stessi elementi senza novità.');
  await page.click('#continue');
  await page.click('#add-criterion');
  await page.locator('[data-criterion-label]').first().fill('Compatibilità con il tempo disponibile');
  if (onePlausible) await page.locator('[data-viable]').nth(1).uncheck();
  await page.click('#to-blocker');
}
async function expectOutcome(page, label) {
  await page.waitForSelector('.result');
  const text = (await page.locator('.result .eyebrow').textContent())?.trim();
  if (text !== label) throw new Error(`Esito atteso "${label}", ottenuto "${text}"`);
}
async function runOutcome(page, type) {
  await clearData(page);
  await startBase(page, { onePlausible: type === 'structure' });
  if (type === 'information') {
    await page.fill('#info-question', 'La presenza del venerdì è obbligatoria?');
    await page.check('#info-verifiable');
    await page.check('#info-changes');
  } else if (type === 'defer') {
    await page.fill('#future-text', 'Riceverò la conferma del nuovo orario entro il 30 settembre');
    await page.check('#future-observable');
  } else if (type === 'support') {
    await page.fill('#support-purpose', 'Chiarire con il responsabile se l’orario è negoziabile');
    await page.check('#support-needed');
  } else if (type === 'tradeoff') {
    await page.fill('#trade-a', 'Più crescita personale ma meno tempo libero');
    await page.fill('#trade-b', 'Più tempo libero ma rinuncia al progetto');
  }
  await page.click('#derive');
  const labels = {
    ready: 'Pronto a scegliere',
    information: 'Serve una specifica informazione',
    structure: 'Serve delimitare meglio criteri o alternative',
    tradeoff: 'Serve accettare un trade-off',
    defer: 'Rinvio fino a una condizione definita',
    support: 'Serve supporto esterno',
  };
  await expectOutcome(page, labels[type]);
  return labels[type];
}
async function axeAudit(page, scopeName) {
  await page.addScriptTag({ path: axePath });
  const audit = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
  }));
  const serious = audit.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  await writeFile(path.join(outDir, `axe-${scopeName}.json`), JSON.stringify(audit, null, 2));
  return serious;
}

async function desktopMatrix() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', (error) => bug('BROWSER-CONSOLE', 'High', 'Errore JavaScript nel browser', error.message));

  for (const type of ['ready', 'information', 'structure', 'tradeoff', 'defer', 'support']) {
    try {
      const label = await runOutcome(page, type);
      await screenshot(page, `desktop-${type}`);
      record(label, 'Desktop 1440×900', true, 'Percorso UI completo fino alla scheda finale.');
    } catch (error) {
      record(type, 'Desktop 1440×900', false, error.message);
      bug(`OUTCOME-${type.toUpperCase()}`, 'High', `Percorso ${type} non completabile`, error.message);
    }
  }

  try {
    await clearData(page);
    await page.click('#new-decision');
    const checks = page.locator('[data-compat]');
    await checks.nth(0).check();
    await checks.nth(1).check();
    // nonSensitive intentionally remains unchecked
    await checks.nth(3).check();
    await checks.nth(4).check();
    await page.fill('#decision-title', 'scegliere un trattamento medico');
    await page.locator('[data-alt]').nth(0).fill('Trattamento A');
    await page.locator('[data-alt]').nth(1).fill('Trattamento B');
    await page.click('#start-flow');
    const summary = await page.locator('.error-summary').textContent();
    const stored = await page.evaluate(() => localStorage.getItem('clearchoice:v1:decisions'));
    if (!summary?.includes('ambito urgente o sensibile') || stored) throw new Error('Lo stop non ha bloccato il salvataggio o il messaggio non è corretto.');
    await screenshot(page, 'desktop-out-of-scope');
    record('Stop fuori perimetro', 'Desktop 1440×900', true, 'Caso medico bloccato; nessun contenuto decisionale persistito.');
  } catch (error) {
    record('Stop fuori perimetro', 'Desktop 1440×900', false, error.message);
    bug('STOP-SENSITIVE', 'Critical', 'Caso sensibile non bloccato correttamente', error.message);
  }

  try {
    await clearData(page);
    await page.click('#new-decision');
    for (let i = 0; i < 5; i += 1) await page.locator('[data-compat]').nth(i).check();
    await page.fill('#decision-title', 'scegliere tra attività serale e corso online');
    await page.locator('[data-alt]').nth(0).fill('Attività serale');
    await page.locator('[data-alt]').nth(1).fill('Corso online');
    await page.click('#start-flow');
    await page.click('#save-exit');
    await page.locator('[data-open]').first().click();
    await page.waitForSelector('#continue');
    record('Salvataggio e ripresa bozza', 'Desktop 1440×900', true, 'Bozza ripresa al momento 2.');
  } catch (error) {
    record('Salvataggio e ripresa bozza', 'Desktop 1440×900', false, error.message);
    bug('DRAFT-RESUME', 'High', 'Bozza non ripresa correttamente', error.message);
  }

  try {
    await runOutcome(page, 'ready');
    await page.click('#confirm-final');
    await page.click('#reopen');
    await page.selectOption('#change-type', 'information');
    await page.fill('#change-summary', 'È arrivata la conferma ufficiale degli orari del corso');
    await page.click('#confirm-reopen');
    await page.waitForSelector('#continue');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('clearchoice:v1:decisions'))[0]);
    if (stored.status !== 'Draft' || stored.revisions.length !== 1) throw new Error('La revisione non è stata registrata.');
    record('Riapertura con cambiamento valido', 'Desktop 1440×900', true, 'Riapertura al momento 2 con revisione salvata.');
  } catch (error) {
    record('Riapertura con cambiamento valido', 'Desktop 1440×900', false, error.message);
    bug('REOPEN-VALID', 'High', 'Riapertura valida non funzionante', error.message);
  }

  try {
    await runOutcome(page, 'ready');
    await page.click('#confirm-final');
    await page.click('#reopen');
    await page.click('#confirm-reopen');
    const errorText = await page.locator('.error-summary').textContent();
    if (!errorText?.includes('Seleziona un tipo di cambiamento concreto')) throw new Error('Validazione di riapertura assente.');
    record('Riapertura bloccata senza cambiamento', 'Desktop 1440×900', true, 'Il percorso dedicato blocca una riapertura vuota.');

    // Verify no alternative route bypasses the validated reopen path.
    await page.click('#back');
    const bypassed = await page.locator('#derive').isVisible().catch(() => false);
    if (bypassed) {
      bug('CC-QA-001', 'High', 'Decisione conclusa modificabile senza cambiamento validato', 'Dalla schermata di riapertura il pulsante Indietro torna direttamente al momento 4; inoltre la scheda conclusa espone Indietro/Non mi rappresenta.');
      record('Protezione completa della riapertura', 'Desktop 1440×900', false, 'Esiste un percorso alternativo che bypassa la validazione del cambiamento.');
    } else {
      record('Protezione completa della riapertura', 'Desktop 1440×900', true, 'Nessun bypass rilevato.');
    }
  } catch (error) {
    record('Riapertura bloccata senza cambiamento', 'Desktop 1440×900', false, error.message);
  }

  try {
    await runOutcome(page, 'information');
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-sheet');
    const download = await downloadPromise;
    const exportPath = path.join(outDir, await download.suggestedFilename());
    await download.saveAs(exportPath);
    const size = (await import('node:fs/promises')).stat(exportPath).then((s) => s.size);
    if ((await size) < 300) throw new Error('File esportato vuoto o incompleto.');
    record('Export scheda', 'Desktop 1440×900', true, `File ${path.basename(exportPath)} creato.`);
  } catch (error) {
    record('Export scheda', 'Desktop 1440×900', false, error.message);
    bug('EXPORT-SHEET', 'High', 'Export scheda non funzionante', error.message);
  }

  try {
    await runOutcome(page, 'ready');
    await page.click('#confirm-final');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.click('[data-nav="data"]');
    const backupPromise = page.waitForEvent('download');
    await page.click('#backup');
    const backup = await backupPromise;
    const backupPath = path.join(outDir, await backup.suggestedFilename());
    await backup.saveAs(backupPath);

    await page.click('#delete-all');
    const dialogFocused = await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
    if (!dialogFocused) bug('CC-QA-002', 'High', 'Dialog senza gestione iniziale del focus', 'All’apertura del dialog di cancellazione il focus non viene spostato all’interno del dialog.');
    await page.keyboard.press('Escape');
    const escapeClosed = (await page.locator('[role="dialog"]').count()) === 0;
    if (!escapeClosed) bug('CC-QA-003', 'Medium', 'Il tasto Escape non chiude i dialog', 'Il dialog resta aperto dopo Escape.');
    if (!escapeClosed) await page.click('[data-close-dialog]');

    await page.click('#delete-all');
    await page.fill('#delete-confirm-text', 'ELIMINA');
    await page.click('#confirm-delete-all');
    const zero = await page.locator('text=0 decisioni salvate localmente.').count();
    if (!zero) throw new Error('Cancellazione totale non verificata.');
    await page.setInputFiles('#restore-file', backupPath);
    await page.waitForSelector('[role="dialog"]');
    const restoreTitle = await page.locator('#dialog-title').textContent();
    const stillZero = await page.locator('text=0 decisioni salvate localmente.').count();
    const restoreFocused = await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
    if (!restoreTitle?.includes('Ripristinare questo backup') || !stillZero || !restoreFocused) throw new Error('Conferma di ripristino assente, tardiva o senza focus.');
    await page.click('#confirm-restore');
    const restored = await page.locator('text=1 decisioni salvate localmente.').count();
    if (!restored) throw new Error('Ripristino non verificato.');
    record('Backup, eliminazione e ripristino', 'Desktop 1440×900', true, 'Backup JSON scaricato; cancellazione e ripristino confermato completati.');
  } catch (error) {
    record('Backup, eliminazione e ripristino', 'Desktop 1440×900', false, error.message);
    bug('BACKUP-RESTORE', 'High', 'Backup o ripristino non funzionante', error.message);
  }

  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    const serious = await axeAudit(page, 'desktop-home');
    const h1Count = await page.locator('main h1').count();
    if (h1Count !== 1) bug('CC-QA-005', 'Medium', 'Gerarchia H1 non univoca', `La schermata contiene ${h1Count} elementi H1.`);
    if (serious.length) bug('CC-QA-AXE', 'High', 'Violazioni WCAG serious/critical rilevate', serious.map((v) => `${v.id}: ${v.help}`).join('; '));
    record('Accessibilità automatizzata WCAG AA', 'Desktop 1440×900', serious.length === 0, serious.length ? `${serious.length} violazioni serious/critical.` : 'Nessuna violazione serious/critical nella Home.');

    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
    record('Navigazione tastiera e skip link', 'Desktop 1440×900', String(firstFocus).includes('skip-link'), `Primo focus: ${firstFocus}`);
  } catch (error) {
    record('Accessibilità tastiera/focus', 'Desktop 1440×900', false, error.message);
  }

  await context.close();
}

async function mobileMatrix() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await context.newPage();
  try {
    await clearData(page);
    await screenshot(page, 'mobile-home');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const undersized = await page.locator('button:visible, input:visible, select:visible, textarea:visible, label.btn:visible').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || el.getAttribute('aria-label') || el.id || el.tagName).trim().slice(0, 80), width: r.width, height: r.height };
    }).filter((r) => r.width < 44 || r.height < 44));
    if (undersized.length) bug('CC-QA-006', 'Medium', 'Target touch inferiori a 44×44 px', JSON.stringify(undersized));
    record('Responsive e target touch', 'Mobile 390×844 touch', !overflow && undersized.length === 0, `Overflow=${overflow}; target piccoli=${undersized.length}.`);

    await runOutcome(page, 'information');
    await screenshot(page, 'mobile-information-final');
    const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    record('Percorso mobile completo', 'Mobile 390×844 touch', !finalOverflow, 'Esito informazione completato senza overflow orizzontale.');

    await page.click('#not-me');
    await page.focus('#info-question');
    const inViewport = await page.locator('#info-question').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    });
    record('Focus campo con viewport mobile', 'Mobile 390×844 touch', inViewport, 'Campo focalizzato resta nel viewport emulato. Tastiera OS non disponibile nel runner headless.');
  } catch (error) {
    record('Matrice mobile', 'Mobile 390×844 touch', false, error.message);
    bug('MOBILE-FLOW', 'High', 'Percorso mobile non completabile', error.message);
  }
  await context.close();
}

async function offlineTest() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#new-decision');
    record('Funzionamento offline dopo prima visita', 'Mobile Chromium', true, 'Home caricata con rete disattivata dopo attivazione service worker.');
    await screenshot(page, 'mobile-offline');
  } catch (error) {
    record('Funzionamento offline dopo prima visita', 'Mobile Chromium', false, error.message);
    bug('OFFLINE', 'Critical', 'PWA non utilizzabile offline dopo la prima visita', error.message);
  }
  await context.close();
}

try {
  await desktopMatrix();
  await mobileMatrix();
  await offlineTest();
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

const summary = {
  generatedAt: new Date().toISOString(),
  browser: 'Chromium via Playwright',
  viewports: ['1440x900 desktop', '390x844 mobile touch emulation'],
  results,
  bugs,
  evidence,
  passed: results.filter((r) => r.status === 'Pass').length,
  failed: results.filter((r) => r.status === 'Fail').length,
};
await writeFile(path.join(outDir, 'report.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.failed > 0 || bugs.some((b) => ['Critical', 'High'].includes(b.severity))) process.exitCode = 1;
