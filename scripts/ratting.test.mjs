import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthlyRatting} from '../app/lib/isk-goals.ts';
const row={id:'1',source:'esi',date:'2026-10-01',amount:100,characterId:'1',refType:'bounty_prizes'};
test('Monatswechsel, ESS, Chars und Doppelimporte',()=>{const r=monthlyRatting([row,row,{...row,id:'2',refType:'ess_escrow_transfer',characterId:'2',amount:50},{...row,id:'3',date:'2026-09-30'},{...row,id:'4',date:'2026-11-01'},{...row,id:'5',refType:'player_donation'},{...row,id:'6',source:'manual'}],'2026-10','2026-10-01',['1','2']);assert.equal(r.total,150);assert.equal(r.bounty,100);assert.equal(r.ess,50);assert.equal(r.characters['2'].total,50);});
test('Historischer Monat und leere Monate unabhängig vom Ziel',()=>{assert.equal(monthlyRatting([row],'2026-10','2026-11-15',[]).total,100);assert.equal(monthlyRatting([row],'2026-09','2026-10-01',[]).total,0);});
