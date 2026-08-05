export const OUTCOME = Object.freeze({
  READY: 'ready',
  INFORMATION: 'information',
  STRUCTURE: 'structure',
  TRADEOFF: 'tradeoff',
  DEFER: 'defer',
  SUPPORT: 'support',
  OUT_OF_SCOPE: 'out_of_scope',
});

export const OUTCOME_LABELS = Object.freeze({
  [OUTCOME.READY]: 'Pronto a scegliere',
  [OUTCOME.INFORMATION]: 'Serve una specifica informazione',
  [OUTCOME.STRUCTURE]: 'Serve delimitare meglio criteri o alternative',
  [OUTCOME.TRADEOFF]: 'Serve accettare un trade-off',
  [OUTCOME.DEFER]: 'Rinvio fino a una condizione definita',
  [OUTCOME.SUPPORT]: 'Serve supporto esterno',
  [OUTCOME.OUT_OF_SCOPE]: 'Fuori dal perimetro di ClearChoice',
});

export function compatibilityResult(compatibility = {}) {
  const checks = [
    ['individual', 'La decisione non è principalmente individuale.'],
    ['nonUrgent', 'La decisione richiede una risposta immediata.'],
    ['nonSensitive', 'La decisione riguarda un ambito urgente o sensibile.'],
    ['notExecutionOnly', 'La scelta sembra già presa: il blocco riguarda l’esecuzione.'],
    ['notSeekingRecommendation', 'ClearChoice non può scegliere al posto dell’utente.'],
  ];
  for (const [field, reason] of checks) {
    if (compatibility[field] !== true) return { compatible: false, reason };
  }
  return { compatible: true, reason: '' };
}

export function isSpecificDeterminant(info = {}) {
  const q = String(info.question || '').trim();
  return q.length >= 6 && info.verifiable === true && info.changesDecision === true;
}

export function isObservableCondition(condition = {}) {
  const text = String(condition.text || '').trim();
  if (text.length < 6) return false;
  const vague = /(quando mi sentirò|quando sarò pronto|più sicur|prima o poi|vedremo)/i;
  return !vague.test(text) && (condition.hasDate === true || condition.observable === true);
}

export function isValidExternalSupport(support = {}) {
  const purpose = String(support.purpose || '').trim();
  return purpose.length >= 6 && support.needed === true && support.delegatesChoice !== true;
}

export function hasUnacceptedTradeoff(tradeoff = {}) {
  const a = String(tradeoff.sideA || '').trim();
  const b = String(tradeoff.sideB || '').trim();
  return a.length >= 4 && b.length >= 4 && tradeoff.accepted !== true;
}

export function structureNeedsWork(decision = {}) {
  const plausible = (decision.alternatives || []).filter((a) => a.viability !== 'eliminated');
  const criteria = decision.criteria || [];
  if (plausible.length < 2 || plausible.length > 4) return true;
  if (criteria.length < 1 || criteria.length > 3) return true;
  if (criteria.some((c) => String(c.label || '').trim().length < 3)) return true;
  if (criteria.filter((c) => c.type === 'nonNegotiable' && c.conflict).length > 0) return true;
  return decision.blockerAssessment?.structureIsClear === false;
}

export function deriveOutcome(decision = {}) {
  const compatibility = compatibilityResult(decision.compatibility);
  if (!compatibility.compatible) {
    return { type: OUTCOME.OUT_OF_SCOPE, reason: compatibility.reason, evidence: [] };
  }

  if (structureNeedsWork(decision)) {
    return {
      type: OUTCOME.STRUCTURE,
      reason: 'Alternative o criteri non sono ancora sufficientemente delimitati.',
      evidence: evidenceFor(decision, OUTCOME.STRUCTURE),
    };
  }

  const blocker = decision.blockerAssessment || {};
  if (isSpecificDeterminant(blocker.information)) {
    return {
      type: OUTCOME.INFORMATION,
      reason: 'Una risposta specifica potrebbe cambiare concretamente la scelta.',
      evidence: evidenceFor(decision, OUTCOME.INFORMATION),
    };
  }

  if (isObservableCondition(blocker.futureCondition)) {
    return {
      type: OUTCOME.DEFER,
      reason: 'Ha senso riesaminare la decisione quando si verificherà una condizione osservabile.',
      evidence: evidenceFor(decision, OUTCOME.DEFER),
    };
  }

  if (isValidExternalSupport(blocker.externalSupport)) {
    return {
      type: OUTCOME.SUPPORT,
      reason: 'Serve chiarire un elemento con una persona coinvolta o competente senza delegare la scelta.',
      evidence: evidenceFor(decision, OUTCOME.SUPPORT),
    };
  }

  if (hasUnacceptedTradeoff(blocker.tradeoff)) {
    return {
      type: OUTCOME.TRADEOFF,
      reason: 'Le alternative proteggono priorità diverse e richiedono una rinuncia esplicita.',
      evidence: evidenceFor(decision, OUTCOME.TRADEOFF),
    };
  }

  return {
    type: OUTCOME.READY,
    reason: 'Non è emerso un ulteriore elemento che giustifichi la riapertura dell’analisi.',
    evidence: evidenceFor(decision, OUTCOME.READY),
  };
}

function evidenceFor(decision, type) {
  const plausible = (decision.alternatives || []).filter((a) => a.viability !== 'eliminated');
  const criteria = decision.criteria || [];
  const blocker = decision.blockerAssessment || {};
  const items = [];
  if (type === OUTCOME.STRUCTURE) {
    items.push(`${plausible.length} alternative ancora plausibili`);
    items.push(`${criteria.length} criteri definiti`);
  }
  if (type === OUTCOME.INFORMATION && blocker.information?.question) {
    items.push(blocker.information.question.trim());
  }
  if (type === OUTCOME.DEFER && blocker.futureCondition?.text) {
    items.push(blocker.futureCondition.text.trim());
  }
  if (type === OUTCOME.SUPPORT && blocker.externalSupport?.purpose) {
    items.push(blocker.externalSupport.purpose.trim());
  }
  if (type === OUTCOME.TRADEOFF) {
    if (blocker.tradeoff?.sideA) items.push(blocker.tradeoff.sideA.trim());
    if (blocker.tradeoff?.sideB) items.push(blocker.tradeoff.sideB.trim());
  }
  if (type === OUTCOME.READY) {
    items.push(`${plausible.length} alternative delimitate`);
    items.push(`${criteria.length} criteri prioritari`);
    if (blocker.tradeoff?.accepted) items.push('Trade-off dichiarato come compreso');
  }
  return items.filter(Boolean).slice(0, 3);
}

export function validateReopenChange(change = {}) {
  const allowed = new Set(['information', 'alternative', 'criterion', 'condition', 'tradeoff']);
  const type = String(change.type || '');
  const summary = String(change.summary || '').trim();
  if (!allowed.has(type)) return { valid: false, error: 'Seleziona un tipo di cambiamento concreto.' };
  if (summary.length < 8) return { valid: false, error: 'Descrivi in modo specifico che cosa è cambiato.' };
  const generic = /^(qualcosa|non so|forse|ci ho ripensato|mi sento diversamente)$/i;
  if (generic.test(summary)) return { valid: false, error: 'Il cambiamento è troppo generico per riaprire la decisione.' };
  return { valid: true, error: '' };
}
