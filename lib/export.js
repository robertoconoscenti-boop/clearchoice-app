import { OUTCOME_LABELS } from './decision-engine.js';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportDecisionSheet(decision) {
  const outcome = decision.finalOutcome || {};
  const evidence = (outcome.evidence || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const alternatives = (decision.alternatives || []).filter((a) => a.viability !== 'eliminated')
    .map((a) => `<li>${escapeHtml(a.label)}</li>`).join('');
  const html = `<!doctype html><html lang="it"><meta charset="utf-8"><title>ClearChoice — ${escapeHtml(decision.title)}</title>
  <style>body{font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 24px;color:#182725}h1{font-size:30px}h2{font-size:20px;margin-top:32px}.state{padding:20px;border:1px solid #d5dbd7;border-radius:14px;background:#eef2ef}</style>
  <body><p>ClearChoice · Scheda decisionale</p><h1>${escapeHtml(decision.title)}</h1>
  <div class="state"><strong>${escapeHtml(OUTCOME_LABELS[outcome.type] || outcome.type || '')}</strong><p>${escapeHtml(outcome.reason || '')}</p></div>
  <h2>Alternative rimaste</h2><ul>${alternatives}</ul><h2>Evidenze</h2><ul>${evidence}</ul>
  <p><small>ClearChoice struttura il ragionamento. Non fornisce consulenza e non decide al posto tuo.</small></p></body></html>`;
  download(`clearchoice-${slug(decision.title)}.html`, html, 'text/html;charset=utf-8');
}

export function exportBackup(payload) {
  download(`clearchoice-backup-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function slug(value = 'decisione') {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'decisione';
}
