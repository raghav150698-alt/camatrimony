import {test} from 'node:test';
import assert from 'node:assert/strict';
import {realpathSync,writeFileSync,mkdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {startAdminPasswordSetup,hashAdminPassword} from './lib/admin-password-setup.mjs';
const require=createRequire(realpathSync(resolve('apps/api/node_modules/wrangler/package.json')));
const {build}=require('esbuild');
const compiled=await build({entryPoints:['apps/api/src/lib/password.ts'],bundle:true,format:'esm',write:false});
mkdirSync('review-artifacts',{recursive:true});
writeFileSync('review-artifacts/password-test-bundle.mjs',compiled.outputFiles[0].text);
const {verifyPassword}=await import('../review-artifacts/password-test-bundle.mjs');
const password='Fixture passphrase 2026!';
test('local reset hash is compatible with the actual Worker password verifier',async()=>{
  const hash=hashAdminPassword(password);
  assert.equal(await verifyPassword(password,hash),true);
  assert.equal(await verifyPassword('Incorrect fixture',hash),false);
  assert.notEqual(hash,hashAdminPassword(password));
});
test('password setup rejects wrong origin, unknown path, CSRF and invalid passwords',async()=>{
  let writes=0;const setup=await startAdminPasswordSetup({applyHash:async()=>{writes++;}});
  const origin=new URL(setup.url).origin;
  try {
    const page=await fetch(setup.url);const html=await page.text();
    assert.equal(page.headers.get('cache-control'),'no-store');
    assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    const csrf=html.match(/name="csrf" value="([^"]+)"/)[1];
    assert.equal((await fetch(origin+'/unknown')).status,404);
    const post=(fields,from=origin)=>fetch(setup.url,{method:'POST',headers:{Origin:from,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});
    assert.equal((await post({csrf,password,confirmation:password},'https://untrusted.example')).status,403);
    assert.equal((await post({csrf:'incorrect',password,confirmation:password})).status,403);
    assert.equal((await post({csrf,password:'short',confirmation:'short'})).status,400);
    assert.equal((await post({csrf,password,confirmation:'Mismatch fixture'})).status,400);
    assert.equal(writes,0);
  } finally {setup.close();}
});
test('one owner submission succeeds; concurrent requests and reuse cannot reset again',async()=>{
  let release,entered,hash,writes=0;
  const started=new Promise(resolve=>{entered=resolve;});
  const waiting=new Promise(resolve=>{release=resolve;});
  const setup=await startAdminPasswordSetup({applyHash:async value=>{writes++;hash=value;entered();await waiting;}});
  try {
    const html=await (await fetch(setup.url)).text();const csrf=html.match(/name="csrf" value="([^"]+)"/)[1];
    const post=()=>fetch(setup.url,{method:'POST',headers:{Origin:new URL(setup.url).origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrf,password,confirmation:password})});
    const first=post();await started;
    assert.equal((await post()).status,409);release();
    const result=await first;assert.equal(result.status,200);assert.doesNotMatch(await result.text(),new RegExp(password));
    assert.equal(writes,1);assert.equal(await verifyPassword(password,hash),true);
    assert.equal((await post()).status,409);
    assert.doesNotMatch(await (await fetch(setup.url)).text(),/<form/);
  } finally {release();setup.close();}
});
test('expired local setup cannot change a password',async()=>{
  const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  const setup=await startAdminPasswordSetup({applyHash:async()=>assert.fail('Must not write'),ttlMs:1000});
  try {now+=1001;assert.equal((await fetch(setup.url)).status,410);}
  finally {Date.now=originalNow;setup.close();}
});
