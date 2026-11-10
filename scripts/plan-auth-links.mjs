import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
// Offline planner only. Use trusted Firebase and Supabase AUTH exports, never profile contact fields.
const [firebasePath,supabasePath,outPath]=process.argv.slice(2);
if(!firebasePath||!supabasePath||!outPath)throw new Error('Usage: node scripts/plan-auth-links.mjs firebase-auth.json supabase-auth.json private-migration/auth-links.sql');
const privateDir=resolve('private-migration');const output=resolve(outPath);const rel=relative(privateDir,output);
if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error('Write migration plans inside ignored private-migration/.');
const firebase=JSON.parse(readFileSync(firebasePath,'utf8'));const supabase=JSON.parse(readFileSync(supabasePath,'utf8'));
const oldUsers=Array.isArray(firebase)?firebase:firebase.users;const newUsers=Array.isArray(supabase)?supabase:supabase.users;
if(!Array.isArray(oldUsers)||!Array.isArray(newUsers))throw new Error('Expected auth user exports as arrays or {users:[]}');
const email=u=>u.email?.trim().toLowerCase();const phone=u=>String(u.phoneNumber||u.phone||'').replace(/\D/g,'');
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const links=[];let unmatched=0,ambiguous=0;const used=new Set();
for(const user of oldUsers){
  if(!user.localId && !user.uid)throw new Error('Firebase auth export must include localId or uid.');
  const matches=newUsers.filter(n=>(user.emailVerified===true&&email(user)&&n.email_confirmed_at&&email(n)===email(user))
    ||(phone(user)&&n.phone_confirmed_at&&phone(n)===phone(user)));
  const ids=[...new Set(matches.map(n=>n.id))];
  if(!ids.length){unmatched++;continue;}
  if(ids.length!==1||!ids[0]||used.has(ids[0])){ambiguous++;continue;}
  used.add(ids[0]);links.push({subject:ids[0],member:user.localId||user.uid,disabled:user.disabled===true});
}
if(ambiguous)throw new Error(`${ambiguous} ambiguous account matches. Resolve these before generating links.`);
const rows=links.map(l=>`INSERT INTO auth_identities(provider,subject,user_id) SELECT 'supabase',${quote(l.subject)},${quote(l.member)} WHERE EXISTS(SELECT 1 FROM users WHERE id=${quote(l.member)});`);
for(const l of links.filter(l=>l.disabled))rows.push(`UPDATE users SET status='suspended' WHERE id=${quote(l.member)} AND status!='banned';`);
mkdirSync(privateDir,{recursive:true});writeFileSync(output,'-- PRIVATE AUTH LINK PLAN: review against live D1 before applying.\n'+rows.join('\n')+'\n');
console.log(`Planned ${links.length} verified account links; ${unmatched} unmatched Firebase accounts. No remote data changed.`);
