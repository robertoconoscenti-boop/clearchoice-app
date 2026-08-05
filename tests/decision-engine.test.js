import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveOutcome, OUTCOME, validateReopenChange } from '../lib/decision-engine.js';

function base(){return {compatibility:{individual:true,nonUrgent:true,nonSensitive:true,notExecutionOnly:true,notSeekingRecommendation:true},alternatives:[{label:'A',viability:'plausible'},{label:'B',viability:'plausible'}],criteria:[{label:'Tempo',type:'preference'}],blockerAssessment:{structureIsClear:true,information:{},futureCondition:{},externalSupport:{},tradeoff:{}}};}

test('ferma i casi fuori perimetro',()=>{const d=base();d.compatibility.nonSensitive=false;assert.equal(deriveOutcome(d).type,OUTCOME.OUT_OF_SCOPE);});
test('la struttura ha priorità',()=>{const d=base();d.criteria=[];d.blockerAssessment.information={question:'È obbligatorio?',verifiable:true,changesDecision:true};assert.equal(deriveOutcome(d).type,OUTCOME.STRUCTURE);});
test('informazione determinante prevale sul rinvio',()=>{const d=base();d.blockerAssessment.information={question:'Il venerdì è obbligatorio?',verifiable:true,changesDecision:true};d.blockerAssessment.futureCondition={text:'Esito il 30 settembre',observable:true};assert.equal(deriveOutcome(d).type,OUTCOME.INFORMATION);});
test('rinvio prevale sul supporto',()=>{const d=base();d.blockerAssessment.futureCondition={text:'Esito il 30 settembre',observable:true};d.blockerAssessment.externalSupport={needed:true,purpose:'Chiarire orario con il responsabile',delegatesChoice:false};assert.equal(deriveOutcome(d).type,OUTCOME.DEFER);});
test('supporto prevale sul tradeoff',()=>{const d=base();d.blockerAssessment.externalSupport={needed:true,purpose:'Chiarire orario con il responsabile',delegatesChoice:false};d.blockerAssessment.tradeoff={sideA:'Più crescita, meno tempo',sideB:'Più tempo, meno crescita',accepted:false};assert.equal(deriveOutcome(d).type,OUTCOME.SUPPORT);});
test('riconosce il tradeoff',()=>{const d=base();d.blockerAssessment.tradeoff={sideA:'Più crescita, meno tempo',sideB:'Più tempo, meno crescita',accepted:false};assert.equal(deriveOutcome(d).type,OUTCOME.TRADEOFF);});
test('ready quando non resta un blocco',()=>{assert.equal(deriveOutcome(base()).type,OUTCOME.READY);});
test('riapertura richiede un cambiamento concreto',()=>{assert.equal(validateReopenChange({type:'information',summary:'Ho ricevuto la conferma dell’orario del corso.'}).valid,true);assert.equal(validateReopenChange({type:'information',summary:'forse'}).valid,false);});
