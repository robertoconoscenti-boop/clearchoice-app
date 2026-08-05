export const STORAGE_KEY = 'clearchoice:v1:decisions';
export const SCHEMA_VERSION = 1;

function storageAvailable() {
  try {
    const key = '__cc_test__';
    localStorage.setItem(key, key);
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadDecisions() {
  if (!storageAvailable()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDecision(decision) {
  if (!storageAvailable()) return false;
  const all = loadDecisions();
  const index = all.findIndex((item) => item.id === decision.id);
  const next = { ...decision, updatedAt: new Date().toISOString() };
  if (index >= 0) all[index] = next;
  else all.unshift(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return true;
}

export function getDecision(id) {
  return loadDecisions().find((item) => item.id === id) || null;
}

export function deleteDecision(id) {
  if (!storageAvailable()) return false;
  const next = loadDecisions().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return true;
}

export function deleteAllDecisions() {
  if (!storageAvailable()) return false;
  localStorage.removeItem(STORAGE_KEY);
  return true;
}

export function createBackupPayload(decisions = loadDecisions(), appVersion = '0.1.0') {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion,
    decisionCount: decisions.length,
    decisions,
  };
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') return { valid: false, error: 'Backup non valido.' };
  if (payload.schemaVersion !== SCHEMA_VERSION) return { valid: false, error: 'Versione del backup non compatibile.' };
  if (!Array.isArray(payload.decisions)) return { valid: false, error: 'Il backup non contiene un elenco di decisioni valido.' };
  if (payload.decisions.some((d) => !d || typeof d.id !== 'string' || typeof d.title !== 'string')) {
    return { valid: false, error: 'Il backup contiene decisioni non valide.' };
  }
  return { valid: true, error: '' };
}

export function restoreBackupPayload(payload) {
  const validation = validateBackupPayload(payload);
  if (!validation.valid || !storageAvailable()) return validation;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.decisions));
  return { valid: true, error: '' };
}
