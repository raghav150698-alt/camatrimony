import {readFileSync,realpathSync,mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {startAdminPasswordSetup} from './lib/admin-password-setup.mjs';

const root=resolve('.');
const privateDir=resolve('private-migration');mkdirSync(privateDir,{recursive:true});
const packageFile=realpathSync(resolve('apps/api/node_modules/wrangler/package.json'));
const info=JSON.parse(readFileSync(packageFile,'utf8'));
const bin=resolve(dirname(packageFile),typeof info.bin==='string'?info.bin:info.bin.wrangler);
async function d1(args){
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[bin,'d1','execute','camatrimony-db','--remote','--json',...args],{
      cwd:root+'/apps/api',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:'54f28bd08ed537166f17438a317ed550',WRANGLER_SEND_METRICS:'false'},windowsHide:true});
    let stdout='';child.stdout.on('data',data=>{stdout+=data;});child.stderr.on('data',()=>{});
    child.on('error',reject);child.on('exit',code=>code===0?resolve(stdout):reject(new Error('Cloudflare update failed')));
  });
  const clean=result.replace(/\x1b\[[0-9;]*m/g,'').trim();
  const start=clean.search(/\[\s*\{\s*"results"/);
  if(start<0)throw new Error('Cloudflare result unavailable');
  return JSON.parse(clean.slice(start));
}
const account="username='admin' AND lower(email)='admin@camatrimonybncn.com' AND is_active=1";
const preflight=await d1(['--command',`SELECT COUNT(*) AS ready FROM admin_accounts WHERE ${account} AND EXISTS(SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='admin_password_revoke_sessions');`]);
if(preflight[0]?.results?.[0]?.ready!==1)throw new Error('Expected active admin account or password-session migration missing. No password changed.');
const setup=await startAdminPasswordSetup({
  async applyHash(hash){
    const file=resolve(privateDir,`admin-password-${randomUUID()}.sql`);
    try {
      // Only a salted PBKDF2 hash goes to Cloudflare. Plaintext is never written or logged.
      writeFileSync(file,`UPDATE admin_accounts SET password_hash='${hash}' WHERE ${account};\nSELECT COUNT(*) AS updated FROM admin_accounts WHERE ${account} AND password_hash='${hash}';\n`,{mode:0o600});
      const result=await d1(['--file',file]);
      if(!result.some(item=>item.results?.some(row=>row.updated===1)))throw new Error('Admin password update not confirmed');
    } finally {try{unlinkSync(file);}catch{}}
  },
  onComplete(){console.log('Admin password updated; previous dedicated admin sessions revoked.');}
});
console.log('Private local password setup (expires in 20 minutes): '+setup.url);
