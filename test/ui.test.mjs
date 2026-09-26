import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { loadSession, loadToneCatalog } from '../packages/diagram-gen/src/model.mjs';

// DOM contract tests execute only this repository's own viewer source. They do
// not assert real-browser layout, SVG paint, gesture behavior or OS clipboard access.
const script=await readFile(new URL('../packages/diagram-gen/client/app.js',import.meta.url),'utf8');
const source=await loadSession(fileURLToPath(new URL('../examples/tone-exploration/',import.meta.url)));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function mount(input=source,saved={}){
 const data=structuredClone(input);
 const window=new Window({url:'https://diagram.test/session/',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const downloads=[];let clipboard='';const blobs=new Map();
 window.URL.createObjectURL=blob=>{const id=`blob:fixture-${blobs.size}`;blobs.set(id,blob);return id;};
 window.URL.revokeObjectURL=()=>{};
 window.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({name:this.download,blob:blobs.get(this.href)});};
 Object.defineProperty(window.navigator,'clipboard',{configurable:true,value:{writeText:async text=>{clipboard=text;}}});
 for(const [key,value] of Object.entries(saved))window.localStorage.setItem(key,value);
 window.document.body.innerHTML='<div id="diagram-app"></div><script id="diagram-data" type="application/json"></script>';
 window.document.getElementById('diagram-data').textContent=JSON.stringify(data);
 window.eval(script);
 const query=selector=>{const item=window.document.querySelector(selector);assert.ok(item,`Missing ${selector}`);return item;};
 const click=selector=>query(selector).click();
 const value=(selector,text,event='input')=>{const input=query(selector);input.value=text;input.dispatchEvent(new window.Event(event,{bubbles:true}));};
 const save=()=>{window.dispatchEvent(new window.Event('pagehide'));return Object.fromEntries(Array.from({length:window.localStorage.length},(_,i)=>{const key=window.localStorage.key(i);return [key,window.localStorage.getItem(key)];}));};
 const importRecord=async record=>{const input=query('[data-import-review]');Object.defineProperty(input,'files',{configurable:true,value:[new window.File([JSON.stringify(record)],'review.json',{type:'application/json'})]});input.dispatchEvent(new window.Event('change',{bubbles:true}));await tick();await tick();};
 return {window,data,query,click,value,save,downloads,importRecord,clipboard:()=>clipboard,close:()=>window.happyDOM.close()};
}

test('first round lists ten stable candidates and filters do not renumber them',async()=>{
 const ui=mount();try{
  assert.equal(ui.window.document.querySelectorAll('.dg-card').length,10);
  ui.value('[data-field="search"]','r01-c07');
  assert.equal(ui.window.document.querySelectorAll('.dg-card').length,1);
  assert.equal(ui.query('.dg-candidate-id').textContent,'r01-c07');
  ui.click('[data-action="clear-filters"]');
  assert.equal(ui.window.document.querySelectorAll('.dg-card').length,10);
  ui.click('[data-action="round"][data-id="r02"]');
  assert.equal(ui.window.document.querySelectorAll('.dg-card').length,1);
  assert.equal(ui.query('.dg-candidate-id').textContent,'r02-c01');
 }finally{await ui.close();}
});

test('feedback survives candidate navigation and copying names the exact revision',async()=>{
 const ui=mount();try{
  ui.click('[data-action="inspect"][data-id="r01-c01"]');
  ui.value('[data-note="keep"]','Keep composition and labels.');
  ui.value('[data-note="change"]','Use thinner arrows; keep 日本語 labels.');
  ui.click('[data-action="direction"]');
  ui.click('[data-action="next"]');ui.click('[data-action="previous"]');
  assert.equal(ui.query('[data-note="change"]').value,'Use thinner arrows; keep 日本語 labels.');
  ui.click('[data-action="copy-feedback"]');await tick();
  assert.match(ui.clipboard(),/r01-c01/);assert.match(ui.clipboard(),/Keep composition and labels/);assert.match(ui.clipboard(),/日本語/);assert.match(ui.clipboard(),new RegExp(source.candidates[0].fingerprint));
  const textarea=ui.query('[data-note="change"]');
  textarea.dispatchEvent(new ui.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(ui.query('[data-note="change"]').dataset.candidate,'r01-c01');
 }finally{await ui.close();}
});

test('compare maintains two different candidates and shared zoom survives switching',async()=>{
 const ui=mount();try{
  ui.click('[data-action="compare-toggle"][data-id="r01-c01"]');ui.click('[data-action="compare-toggle"][data-id="r01-c02"]');
  ui.click('[data-action="view"][data-view="compare"]');
  assert.equal(ui.window.document.querySelectorAll('.dg-compare-cell').length,2);
  ui.value('[data-field="compare-candidate"][data-index="0"]','r01-c02','change');
  assert.notEqual(ui.query('[data-index="0"]').value,ui.query('[data-index="1"]').value);
  ui.value('[data-field="zoom"]','150');
  for(const stage of ui.window.document.querySelectorAll('.dg-stage'))assert.equal(stage.dataset.scale,'1.5');
  ui.click('[data-action="view"][data-view="inspect"]');
  assert.equal(ui.query('.dg-stage').dataset.scale,'1.5');
  assert.equal(ui.query('.dg-context-art').style.width,`${source.session.target.width}px`);
  assert.equal(ui.query('.dg-context-art').style.height,`${source.session.target.height}px`);
 }finally{await ui.close();}
});

test('missing dark artwork is explicit and cannot be downloaded as a dark asset',async()=>{
 const data=structuredClone(source);delete data.candidates[0].assets.dark;
 const ui=mount(data);try{
  ui.click('[data-action="inspect"][data-id="r01-c01"]');ui.click('[data-action="theme"][data-value="dark"]');
  assert.match(ui.query('.dg-unavailable').textContent,/Dark asset unavailable/);
  assert.equal(ui.query('[data-action="download-svg"]').disabled,true);
  ui.click('[data-action="theme"][data-value="light"]');ui.click('[data-action="download-svg"]');
  assert.equal(ui.downloads.at(-1).name,'r01-c01-light.svg');
  assert.equal(await ui.downloads.at(-1).blob.text(),source.candidates[0].assets.light);
 }finally{await ui.close();}
});

test('review JSON round trips and foreign-session imports preserve existing feedback',async()=>{
 const ui=mount();let record;
 try{
  ui.click('[data-action="inspect"][data-id="r01-c03"]');ui.value('[data-note="keep"]','The three stages');ui.value('[data-note="change"]','Less decoration');ui.click('[data-action="direction"]');ui.click('[data-action="shortlist-toggle"][data-id="r01-c03"]');
  ui.click('[data-action="download-review"]');record=JSON.parse(await ui.downloads.at(-1).blob.text());
  assert.equal(record.chosenDirection.id,'r01-c03');assert.equal(record.feedback.change,'Less decoration');
 }finally{await ui.close();}
 const restored=mount();try{
  await restored.importRecord(record);
  assert.equal(restored.query('[data-note="keep"]').value,'The three stages');
  assert.equal(restored.query('[data-note="change"]').dataset.candidate,'r01-c03');
  await restored.importRecord({...record,sessionId:'another-session'});
  assert.match(restored.query('.dg-toast').textContent,/Import failed/);
  assert.equal(restored.query('[data-note="change"]').value,'Less decoration');
 }finally{await restored.close();}
});

test('a changed candidate invalidates the earlier feedback fingerprint',async()=>{
 const ui=mount();let saved;
 try{ui.click('[data-action="inspect"][data-id="r01-c01"]');ui.value('[data-note="keep"]','Keep this');ui.click('[data-action="direction"]');saved=ui.save();}finally{await ui.close();}
 const updated=structuredClone(source);updated.candidates[0].fingerprint='new-revision-fingerprint';
 const next=mount(updated,saved);try{
  assert.match(next.query('.dg-stale-notice').textContent,/artwork has changed/);
  next.click('[data-action="copy-feedback"]');await tick();assert.match(next.clipboard(),/ATTENTION/);
  next.click('[data-action="acknowledge"]');assert.equal(next.window.document.querySelector('.dg-stale-notice'),null);
 }finally{await next.close();}
});

test('catalog exposes all 24 tones with concrete recipes',async()=>{
 const data=await loadToneCatalog();const ui=mount(data);try{
  assert.equal(ui.window.document.querySelectorAll('.dg-card').length,24);
  ui.click(`[data-action="inspect"][data-id="${data.candidates[0].id}"]`);
  assert.ok(ui.window.document.body.textContent.includes(data.tones[0].recipe[0]));
 }finally{await ui.close();}
});

test('empty sessions and unavailable clipboard have usable fallbacks',async()=>{
 const empty=structuredClone(source);empty.candidates=[];empty.rounds=empty.rounds.slice(0,1);
 const ui=mount(empty);try{assert.equal(ui.window.document.querySelector('.dg-fatal'),null);ui.click('[data-action="view"][data-view="inspect"]');assert.equal(ui.window.document.querySelector('.dg-fatal'),null);}finally{await ui.close();}
 const full=mount();try{
  Object.defineProperty(full.window.navigator,'clipboard',{configurable:true,value:null});full.window.document.execCommand=()=>false;
  full.click('[data-action="inspect"][data-id="r01-c01"]');full.click('[data-action="copy-feedback"]');await tick();
  assert.match(full.downloads.at(-1).name,/-feedback\.txt$/);
  assert.match(await full.downloads.at(-1).blob.text(),/r01-c01/);
 }finally{await full.close();}
});
