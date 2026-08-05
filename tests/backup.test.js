import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBackupPayload, SCHEMA_VERSION } from '../lib/storage.js';

test('valida un backup compatibile',()=>{const p={schemaVersion:SCHEMA_VERSION,decisions:[{id:'1',title:'Scelta'}]};assert.equal(validateBackupPayload(p).valid,true);});
test('rifiuta una versione incompatibile',()=>{assert.equal(validateBackupPayload({schemaVersion:99,decisions:[]}).valid,false);});
test('rifiuta decisioni prive di id',()=>{assert.equal(validateBackupPayload({schemaVersion:SCHEMA_VERSION,decisions:[{title:'x'}]}).valid,false);});
