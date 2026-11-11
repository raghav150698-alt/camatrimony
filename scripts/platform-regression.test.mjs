import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,writeFileSync,realpathSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(realpathSync(resolve('apps/api/node_modules/wrangler/package.json')));
const {build}=require('esbuild');
const built=await build({entryPoints:['apps/api/src/index.ts'],bundle:true,platform:'neutral',mainFields:['module','main'],conditions:['worker','browser'],format:'esm',write:false});
writeFileSync('review-artifacts/api-test-bundle.mjs',built.outputFiles[0].text);
const {default:app,RateLimiterDO}=await import('../review-artifacts/api-test-bundle.mjs?'+Date.now());
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
for(const name of readdirSync('migrations').filter(n=>n.endsWith('.sql')).sort()){
  try{sql.exec(readFileSync('migrations/'+name,'utf8'));}catch(error){throw new Error(`Migration ${name}: ${error.message}`);}
}
class Statement{
  constructor(query,args=[]){this.query=query;this.args=args;}
  bind(...args){return new Statement(this.query,args);}
  async first(){return sql.prepare(this.query).get(...this.args)||null;}
  async all(){return {success:true,results:sql.prepare(this.query).all(...this.args)};}
  async run(){const r=sql.prepare(this.query).run(...this.args);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
}
const DB={prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}};
const env={DB,AUTH_PROVIDER:'supabase',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public-key',FIREBASE_PROJECT_ID:'fixture',ENVIRONMENT:'production',CORS_ORIGIN:'http://localhost:3000',ADMIN_JWT_SECRET:'fixture-secret-only',BUCKET:{get:async()=>({body:'%PDF-fixture',httpMetadata:{contentType:'application/pdf',cacheControl:'public,max-age=31536000'}})}};
const identities={};let authDown=false;
globalThis.fetch=async(url,options)=>{
  assert.equal(String(url),'https://fixture.supabase.co/auth/v1/user');
  if(authDown)throw new Error('fixture unavailable');
  const token=options.headers.Authorization.replace('Bearer ','');
  return Response.json(identities[token]||{error:'invalid token'},{status:identities[token]?200:401});
};
function seedUser(id,opts={}){
  const email=opts.email||`${id}@example.test`;
  sql.prepare("INSERT INTO users(id,email,phone,status) VALUES(?,?,?,'active')").run(id,email,opts.phone||null);
  sql.prepare(`INSERT INTO profiles(user_id,full_name,gender,age,height,caste,highest_degree,occupation,annual_income,work_location,photos) VALUES(?,?,'Female',26,'165 cm','Brahmin','CA','Accountant','20 LPA','Hyderabad','[]')`).run(id,`${id} Member`);
  identities[id]={id:`auth-${id}`,email,email_confirmed_at:new Date().toISOString(),user_metadata:{role:'super_admin'}};
  sql.prepare("INSERT INTO auth_identities(provider,subject,user_id) VALUES('supabase',?,?)").run(`auth-${id}`,id);
}
for(const id of ['viewer','target','target2','target3','hidden','blocked','outsider'])seedUser(id);
sql.prepare("INSERT INTO admin_accounts(id,username,password_hash,role,is_active,supabase_subject) VALUES('admin-fixture','admin-fixture','unused','super_admin',1,'auth-admin')").run();
identities.admin={id:'auth-admin',email:'admin@example.test',email_confirmed_at:new Date().toISOString()};
const pkg=sql.prepare("INSERT INTO packages(name,price,validity_days,contact_limit,is_active) VALUES('Test',100,30,2,1)").run().lastInsertRowid;
function plan(user='viewer',start="datetime('now','-1 day')",end="datetime('now','+30 day')",balance=2){return Number(sql.prepare(`INSERT INTO user_subscriptions(user_id,package_id,start_date,end_date,contact_limit_balance) VALUES(?,?,${start},${end},?)`).run(user,Number(pkg),balance).lastInsertRowid);}
async function req(path,method='GET',body,token='viewer'){
  const res=await app.request('https://api.example.test/v1'+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},env);
  return {status:res.status,body:await res.json()};
}
let count=0;async function check(label,fn){await fn();console.log('PASS',label);count++;}
await check('unknown, mock and anonymous member tokens rejected',async()=>{for(const token of ['bad','mock-user-review',''])assert.equal((await req('/profile','GET',undefined,token)).status,401);});
await check('Supabase identity resolves original member ID and full biodata excludes contact/docs',async()=>{
  assert.equal((await req('/profile')).body.profile.userId,'viewer');
  const r=await req('/profiles/target');assert.equal(r.status,200);assert.equal(r.body.profile.highestDegree,'CA');assert.equal(r.body.profile.email,undefined);assert.equal(r.body.profile.govtIdFile,undefined);
});
await check('user metadata never grants admin access',async()=>assert.equal((await req('/admin/subscriptions')).status,401));
await check('explicit Supabase admin allow-list accepted',async()=>assert.equal((await req('/admin/auth/validate','GET',undefined,'admin')).status,200));
await check('banned members denied even with valid auth identity',async()=>{sql.exec("UPDATE users SET status='banned' WHERE id='viewer'");assert.equal((await req('/profile')).status,403);sql.exec("UPDATE users SET status='active' WHERE id='viewer'");});
await check('auth outages fail closed',async()=>{authDown=true;assert.equal((await req('/profile')).status,503);authDown=false;});
await check('no-plan unlock rejected without creating contact access',async()=>{assert.equal((await req('/unlocks','POST',{targetUserId:'target'})).status,403);});
const future=plan('viewer',"datetime('now','+1 day')");
await check('future plan cannot spend credits',async()=>{assert.equal((await req('/unlocks','POST',{targetUserId:'target'})).status,403);assert.equal((await req('/payments/subscription')).body.subscription.status,'scheduled');});
sql.exec(`UPDATE user_subscriptions SET status='cancelled' WHERE id=${future}`);
const active=plan();
await check('one contact unlock spends exactly one credit and creates ledger entry',async()=>{
  const r=await req('/unlocks','POST',{targetUserId:'target'});assert.equal(r.status,200);assert.equal(r.body.remainingBalance,1);
  assert.equal(sql.prepare("SELECT count(*) AS n FROM credit_ledger WHERE reason='contact_unlock'").get().n,1);
});
await check('duplicate concurrent unlocks remain free after the first',async()=>{
  const responses=await Promise.all(Array.from({length:5},()=>req('/unlocks','POST',{targetUserId:'target'})));
  for(const r of responses)assert.equal(r.status,200);
  assert.equal(sql.prepare('SELECT contact_limit_balance AS n FROM user_subscriptions WHERE id=?').get(active).n,1);
});
await check('hidden, blocked and missing contacts do not consume credits',async()=>{
  sql.exec("INSERT INTO user_settings(user_id,hide_contact) VALUES('hidden',1)");
  sql.exec("INSERT INTO blocked_users(blocker_id,blocked_id) VALUES('blocked','viewer')");
  assert.equal((await req('/unlocks','POST',{targetUserId:'hidden'})).status,409);
  assert.equal((await req('/unlocks','POST',{targetUserId:'blocked'})).status,404);
  assert.equal(sql.prepare('SELECT contact_limit_balance AS n FROM user_subscriptions WHERE id=?').get(active).n,1);
});
await check('last credit spent once; exhaustion stops new unlocks',async()=>{assert.equal((await req('/unlocks','POST',{targetUserId:'target2'})).status,200);assert.equal((await req('/unlocks','POST',{targetUserId:'target3'})).status,403);});
await check('expiry on same UTC day is respected for ISO timestamps',async()=>{
  sql.exec(`UPDATE user_subscriptions SET contact_limit_balance=2,end_date=strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour') WHERE id=${active}`);
  assert.equal((await req('/unlocks','POST',{targetUserId:'target3'})).status,403);
  const r=await req('/payments/subscription');assert.equal(r.body.subscription.isActive,false);assert.equal(r.body.subscription.contactLimitBalance,0);
});
await check('already unlocked contacts remain free after plan expiry',async()=>assert.equal((await req('/unlocks','POST',{targetUserId:'target'})).body.alreadyUnlocked,true));
await check('credit history is scoped to authenticated member',async()=>{assert.ok((await req('/payments/credits')).body.credits.length>0);assert.equal((await req('/payments/credits','GET',undefined,'outsider')).body.credits.length,0);});
await check('private docs require exact ownership, no public cache',async()=>{
  assert.equal((await req('/uploads?key=target/govt_id/test.pdf')).status,401);
  const r=await app.request('https://api.example.test/v1/uploads?key=viewer/govt_id/test.pdf',{headers:{Authorization:'Bearer viewer'}},env);
  assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');
});
await check('existing email collision cannot take over a legacy profile',async()=>{
  identities.collision={id:'different-auth',email:'viewer@example.test',email_confirmed_at:new Date().toISOString()};
  assert.equal((await req('/profile','GET',undefined,'collision')).status,409);
});

await check('profile age, custom degree and server-owned verification fields',async()=>{
  assert.equal((await req('/profile','POST',{age:17,gender:'Female'})).status,400);
  assert.equal((await req('/profile','POST',{age:18,gender:'Male'})).status,400);
  assert.equal((await req('/profile','POST',{highestDegree:'Other'})).status,400);
  assert.equal((await req('/profile','POST',{highestDegree:'Master of Public Health',isVerified:true,role:'super_admin'})).status,200);
  const r=await req('/profile');assert.equal(r.body.profile.highestDegree,'Master of Public Health');assert.equal(r.body.profile.isVerified,false);
});
await check('interest accept cannot be overwritten by duplicate sends or responses',async()=>{
  assert.equal((await req('/interests','POST',{receiverId:'outsider'})).status,200);
  const interest=sql.prepare("SELECT id FROM interest_requests WHERE sender_id='viewer' AND receiver_id='outsider'").get();
  assert.equal((await req('/interests/'+interest.id,'PATCH',{status:'accepted'},'outsider')).status,200);
  assert.equal((await req('/interests','POST',{receiverId:'outsider'})).status,200);
  assert.equal(sql.prepare('SELECT status FROM interest_requests WHERE id=?').get(interest.id).status,'accepted');
  assert.equal((await req('/interests/'+interest.id,'PATCH',{status:'declined'},'outsider')).status,409);
});
await check('accepted interest enables chat; third-party reads and blocked chat denied',async()=>{
  assert.equal((await req('/chat','POST',{recipientId:'outsider',content:'Hello'})).status,200);
  assert.equal((await req('/chat?senderId=viewer&recipientId=outsider','GET',undefined,'target')).status,403);
  assert.equal((await req('/chat','POST',{recipientId:'outsider',content:'  '})).status,400);
  assert.equal((await req('/chat','POST',{recipientId:'blocked',content:'Hello'})).status,403);
  assert.equal((await req('/chat/conversations')).body.conversations.length,1);
});
await check('favorites and interests respect hidden profiles, hidden income and private photos',async()=>{
  assert.equal((await req('/favorites','POST',{favoritedUserId:'target'})).status,200);
  sql.exec("INSERT INTO user_settings(user_id,hide_income,photo_visibility) VALUES('target',1,'private')");
  sql.exec(`UPDATE profiles SET photos='["https://api.example.test/v1/uploads?key=target/photos/a.jpg"]' WHERE user_id='target'`);
  const saved=(await req('/favorites')).body.favorites[0];assert.equal(saved.annual_income,null);assert.deepEqual(saved.photos,[]);
  sql.exec("UPDATE user_settings SET hide_profile=1 WHERE user_id='target'");
  assert.equal((await req('/favorites')).body.favorites.length,0);
  assert.equal((await req('/profiles/target')).status,404);
  assert.equal((await req('/interests','POST',{receiverId:'target'})).status,404);
  sql.exec("UPDATE user_settings SET hide_profile=0,photo_visibility='members' WHERE user_id='target'");
});
await check('private member photos use scoped signed links; tampering and privacy changes are denied',async()=>{
  const r=await req('/profiles/target');const url=r.body.profile.photos[0];assert.ok(url.includes('signature='));
  assert.equal((await app.request(url,{},env)).status,200);
  assert.equal((await app.request(url.replace('viewer=viewer','viewer=outsider'),{},env)).status,403);
  assert.equal((await app.request('https://api.example.test/v1/uploads?key=target/photos/a.jpg',{},env)).status,403);
  sql.exec("UPDATE user_settings SET photo_visibility='private' WHERE user_id='target'");
  assert.equal((await app.request(url,{},env)).status,403);
});
await check('admin assignment grants credits and invalid start dates/durations are rejected',async()=>{
  const body={userId:'outsider',packageId:Number(pkg),proofUrl:'fixture-proof',startDate:'2026-02-30'};
  assert.equal((await req('/admin/subscriptions','POST',body,'admin')).status,400);
  assert.equal((await req('/admin/subscriptions','POST',{...body,startDate:undefined,validityDays:1.5},'admin')).status,400);
  const r=await req('/admin/subscriptions','POST',{...body,startDate:undefined},'admin');assert.equal(r.status,200,JSON.stringify(r.body));
  const sub=(await req('/payments/subscription','GET',undefined,'outsider')).body.subscription;
  assert.equal(sub.creditsGranted,2);assert.equal(sub.contactLimitBalance,2);
});
await check('retiring a package preserves paid memberships and payment history',async()=>{
  assert.equal((await req('/admin/packages/'+pkg,'DELETE',undefined,'admin')).status,200);
  assert.ok(sql.prepare('SELECT id FROM user_subscriptions WHERE user_id=?').get('outsider'));
  assert.equal(sql.prepare('SELECT is_active FROM packages WHERE id=?').get(Number(pkg)).is_active,0);
});
await check('new verified Supabase signup creates a member; unverified identities denied',async()=>{
  identities.signup={id:'signup',email:'signup@example.test',email_confirmed_at:new Date().toISOString()};
  assert.equal((await req('/profile','GET',undefined,'signup')).body.profile.userId,'signup');
  identities.unverified={id:'unverified',email:'unverified@example.test'};
  assert.equal((await req('/profile','GET',undefined,'unverified')).status,401);
});

await check('credit ledger failure rolls back the unlock and debit',async()=>{
  const id=plan('viewer');
  sql.exec("CREATE TRIGGER force_ledger_failure BEFORE INSERT ON credit_ledger WHEN NEW.reason='contact_unlock' BEGIN SELECT RAISE(ABORT,'fixture ledger failure'); END");
  assert.equal((await req('/unlocks','POST',{targetUserId:'target3'})).status,500);
  assert.equal(sql.prepare('SELECT contact_limit_balance AS n FROM user_subscriptions WHERE id=?').get(id).n,2);
  assert.equal(sql.prepare("SELECT count(*) AS n FROM contact_unlocks WHERE user_id='viewer' AND unlocked_user_id='target3'").get().n,0);
  sql.exec('DROP TRIGGER force_ledger_failure');
});
await check('concurrent requests for the last credit cannot overspend',async()=>{
  const sub=sql.prepare("SELECT id FROM user_subscriptions WHERE user_id='viewer' ORDER BY id DESC LIMIT 1").get();
  sql.prepare('UPDATE user_subscriptions SET contact_limit_balance=1 WHERE id=?').run(sub.id);
  const results=await Promise.all([req('/unlocks','POST',{targetUserId:'target3'}),req('/unlocks','POST',{targetUserId:'outsider'})]);
  assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===403).length,1);
  assert.equal(sql.prepare('SELECT contact_limit_balance AS n FROM user_subscriptions WHERE id=?').get(sub.id).n,0);
});
await check('document replacement resets its approval and verified badge',async()=>{
  sql.exec("UPDATE profiles SET govt_id_file='viewer/govt_id/old.pdf',degree_file='viewer/degree/old.pdf',govt_id_status='approved',degree_status='approved',is_verified=1 WHERE user_id='viewer'");
  sql.exec("UPDATE profiles SET govt_id_status='approved',degree_status='approved',is_verified=1 WHERE user_id='viewer'");
  assert.equal((await req('/profile','POST',{govtIdFile:'viewer/govt_id/new.pdf'})).status,200);
  const row=sql.prepare("SELECT govt_id_status,is_verified FROM profiles WHERE user_id='viewer'").get();assert.equal(row.govt_id_status,'pending');assert.equal(row.is_verified,0);
  assert.equal((await req('/profile','POST',{degreeFile:'target/degree/private.pdf'})).status,400);
});
await check('pending/rejected photos are visible only to their owner or review staff',async()=>{
  sql.exec("UPDATE user_settings SET photo_visibility='public' WHERE user_id='target'");
  sql.exec("INSERT INTO photos(user_id,file_url,category,status,visibility) VALUES('target','https://api.example.test/v1/uploads?key=target/photos/a.jpg','profile','rejected','public')");
  assert.equal((await req('/profiles/target')).body.profile.photos.length,0);
  assert.equal((await app.request('https://api.example.test/v1/uploads?key=target/photos/a.jpg',{},env)).status,403);
  assert.equal((await app.request('https://api.example.test/v1/uploads?key=target/photos/a.jpg',{headers:{Authorization:'Bearer target'}},env)).status,200);
});

await check('staff role grants and revocations apply to Supabase sessions immediately',async()=>{
  assert.equal((await req('/admin/roles','POST',{action:'addAdmin',email:'outsider@example.test',role:'support_agent'},'admin')).status,200);
  assert.equal((await req('/admin/auth/validate','GET',undefined,'outsider')).status,200);
  assert.equal((await req('/admin/packages','POST',{name:'Denied',price:1,validityDays:1,contactLimit:1},'outsider')).status,403);
  assert.equal((await req('/admin/roles','POST',{action:'revokeAdmin',targetUserId:'outsider'},'admin')).status,200);
  assert.equal((await req('/admin/auth/validate','GET',undefined,'outsider')).status,401);
});
await check('contact subscriptions hide checkout details and reject new payment submissions',async()=>{
  env.SUBSCRIPTION_MODE='contact';
  try {
    const settings=await req('/payments/settings','GET',undefined,'');
    assert.equal(settings.body.subscriptionEmail,'support@camatrimonybncn.com');
    assert.equal(settings.body.razorpayEnabled,false);
    assert.equal(settings.body.manualPaymentEnabled,false);
    assert.equal(settings.body.bankAccountDetails,'');
    for(const route of ['/payments/create-order','/payments/manual-proof']) {
      const result=await req(route,'POST',{packageId:Number(pkg),proofUrl:'unused'});
      assert.equal(result.status,403);
      assert.match(result.body.error,/email support@camatrimonybncn.com/);
    }
    assert.equal((await req('/payments/subscription')).status,200);
    assert.equal((await req('/payments/credits')).status,200);
  } finally { delete env.SUBSCRIPTION_MODE; }
});
await check('own report history does not expose another member contact email',async()=>{
  assert.equal((await req('/reports','POST',{reportedId:'target2',reason:'Fixture review',details:'Fixture only'})).status,200);
  const result=await req('/reports');assert.equal(result.status,200);assert.ok(result.body.reports.length);
  assert.ok(result.body.reports.every(report=>!('reported_email' in report)&&!('email' in report)));
  assert.equal((await req('/reports','GET',undefined,'outsider')).body.reports.length,0);
});
await check('deployed SQLite limiter enforces concurrent limits and expires counters',async()=>{
  let alarm=null;let now=Date.now();const originalNow=Date.now;Date.now=()=>now;
  const limiter=new RateLimiterDO({storage:{sql:{exec(query,...args){const rows=sql.prepare(query).all(...args);return {toArray:()=>rows};}},getAlarm:async()=>alarm,setAlarm:async value=>{alarm=value;}}});
  const call=()=>limiter.fetch(new Request('https://limiter.test',{method:'POST',body:JSON.stringify({key:'fixture',windowMs:1000,max:2})})).then(r=>r.json());
  try {
    const results=await Promise.all([call(),call(),call()]);assert.equal(results.filter(r=>r.allowed).length,2);
    now+=1001;assert.equal((await call()).allowed,true);
    now+=1001;await limiter.alarm();assert.equal(sql.prepare('SELECT COUNT(*) n FROM counters').get().n,0);
    assert.equal((await limiter.fetch(new Request('https://limiter.test',{method:'POST',body:JSON.stringify({key:'bad',windowMs:-1,max:2})}))).status,400);
  } finally { Date.now=originalNow; }
});
await check('rate-limit middleware uses trusted IP, denies excess requests and fails closed on outages',async()=>{
  let key='';env.RATE_LIMITER={idFromName:value=>(key=value),get:()=>({fetch:async()=>Response.json({allowed:false,resetAt:Date.now()+60000})})};
  try {
    const denied=await app.request('https://api.example.test/v1/contact',{method:'POST',headers:{'cf-connecting-ip':'192.0.2.10','x-forwarded-for':'spoofed'}},env);
    assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('retry-after'))>0);assert.match(key,/192\.0\.2\.10$/);assert.doesNotMatch(key,/spoofed/);
    env.RATE_LIMITER.get=()=>({fetch:async()=>{throw new Error('outage');}});
    assert.equal((await req('/admin/auth','POST',{username:'fixture',password:'unused'},'')).status,503);
  } finally {delete env.RATE_LIMITER;}
});
console.log(`Completed ${count} integration regressions against an isolated SQLite database.`);
