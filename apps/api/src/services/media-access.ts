import type {Env} from '../types';
import {extractUploadKey,getPublicApiBase} from '../lib';

async function signature(env:Env,key:string,viewer:string,expires:string){
  const secret=env.MEDIA_SIGNING_SECRET || env.ADMIN_JWT_SECRET;
  if(!secret)throw new Error('Media signing is not configured');
  const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(JSON.stringify(['profile-photo-v1',key,viewer,expires])));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

export async function signProfilePhotos<T extends {photos?:string[]}>(profile:T,viewer:string|undefined,env:Env,requestUrl:string):Promise<T>{
  if(!profile.photos?.length)return profile;
  const base=getPublicApiBase(env,requestUrl);
  const expires=String(Math.floor(Date.now()/1000)+900);
  return {...profile,photos:(await Promise.all(profile.photos.map(async raw=>{
    // Third-party images are not served by our bucket and never receive member credentials.
    let parsed:URL;
    try{parsed=new URL(raw,`${base}/`);}catch{return null;}
    if(parsed.origin!==new URL(base).origin || !parsed.searchParams.has('key'))return raw;
    const key=extractUploadKey(parsed.searchParams.get('key')!);
    if(!key || key.split('/')[1]!=='photos')return raw;
    if(!await photoReviewed(env.DB,key,viewer))return null;
    if(!viewer)return raw;
    parsed.searchParams.set('viewer',viewer);parsed.searchParams.set('expires',expires);
    parsed.searchParams.set('signature',await signature(env,key,viewer,expires));
    return parsed.href;
  }))).filter((raw):raw is string=>raw!==null)};
}

export async function photoViewer(url:URL,key:string,env:Env):Promise<string|null>{
  const viewer=url.searchParams.get('viewer'),expires=url.searchParams.get('expires'),sig=url.searchParams.get('signature');
  const now=Math.floor(Date.now()/1000);
  if(!viewer||!expires||!sig||!/^\d+$/.test(expires)||Number(expires)<=now||Number(expires)>now+900)return null;
  const expected=await signature(env,key,viewer,expires);
  if(sig.length!==expected.length)return null;
  let diff=0;for(let i=0;i<sig.length;i++)diff|=sig.charCodeAt(i)^expected.charCodeAt(i);
  return diff===0?viewer:null;
}

export async function photoReviewed(db:D1Database,key:string,viewer?:string|null){
  const owner=key.split('/')[0];if(viewer===owner)return true;
  const rows=await db.prepare('SELECT file_url,status FROM photos WHERE user_id=?').bind(owner).all<{file_url:string;status:string}>();
  const record=(rows.results||[]).find(row=>extractUploadKey(row.file_url)===key);
  // Preserve legacy photos that predate the moderation queue.
  return !record || record.status==='approved';
}

export async function maySeePhoto(db:D1Database,owner:string,viewer?:string|null){
  const row=await db.prepare(`SELECT u.status,COALESCE(s.hide_profile,0) AS hidden,COALESCE(s.photo_visibility,'public') AS visibility
    FROM users u LEFT JOIN user_settings s ON s.user_id=u.id WHERE u.id=?`).bind(owner)
    .first<{status:string;hidden:number;visibility:string}>();
  if(!row)return false;
  if(viewer){
    const member=await db.prepare('SELECT status FROM users WHERE id=?').bind(viewer).first<{status:string}>();
    if(!member || ['banned','suspended','deleted'].includes(member.status))return false;
    if(viewer===owner)return true;
  }
  if(row.status!=='active'||row.hidden)return false;
  if(viewer){const blocked=await db.prepare(`SELECT 1 FROM blocked_users WHERE
    (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)`).bind(owner,viewer,viewer,owner).first();if(blocked)return false;}
  if(row.visibility==='public')return true;
  if(!viewer||row.visibility==='private')return false;
  if(row.visibility==='members')return true;
  if(row.visibility!=='premium')return false;
  return !!await db.prepare(`SELECT 1 FROM contact_unlocks WHERE user_id=? AND unlocked_user_id=?
    UNION SELECT 1 FROM interest_requests WHERE status='accepted' AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)) LIMIT 1`)
    .bind(viewer,owner,viewer,owner,owner,viewer).first();
}
