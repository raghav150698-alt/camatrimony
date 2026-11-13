import {createServer} from 'node:http';
import {randomBytes,pbkdf2Sync} from 'node:crypto';

export function hashAdminPassword(password) {
  const salt=randomBytes(16);
  return `pbkdf2:${salt.toString('base64')}:${pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64')}`;
}

// Local owner-operated setup only. This server is never deployed to the website.
export async function startAdminPasswordSetup({applyHash,onComplete=()=>{},ttlMs=20*60*1000}) {
  const path='/setup/'+randomBytes(24).toString('hex');
  const csrf=randomBytes(24).toString('hex');
  let origin,completed=false,busy=false;
  const expires=Date.now()+ttlMs;
  // Native form POSTs get Origin: null under no-referrer. Preserve the local
  // same-origin submission while withholding referrers from external sites.
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin',
    'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
  const page=(message='',success=false)=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Set admin password · CA Matrimony</title><style>body{margin:0;background:#faf8f5;color:#302722;font:14px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(400px,calc(100% - 80px));background:#fffefa;border:1px solid #e8e1d8;border-radius:18px;padding:32px}small{color:#947448;letter-spacing:1.8px;font-size:9px}h1{font:35px Georgia;margin:16px 0}p{color:#7a6d62;line-height:1.8}label{display:block;font-size:12px;margin:22px 0 9px}input{width:100%;box-sizing:border-box;height:48px;border:1px solid #ded5c9;border-radius:8px;background:#fffefa;padding:12px;font:inherit}button,a{display:block;box-sizing:border-box;text-align:center;width:100%;margin-top:25px;padding:15px;background:#73333e;color:#fffaf4;border:0;border-radius:8px;font:inherit;text-decoration:none;cursor:pointer}.message{padding:12px;background:#f5eee5;border-radius:8px;font-size:12px}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #986448;outline-offset:3px}</style><main><small>CA MATRIMONY · ADMINISTRATION</small><h1>${success?'Password updated.':'Set your password.'}</h1>${message?`<p class="message" role="status">${message}</p>`:''}${success?'<p>Your previous admin sessions have been signed out.</p><a href="https://admin.camatrimonybncn.com/login" rel="noreferrer">Open admin sign in</a>':`<p>Account: <strong>admin</strong><br>admin@camatrimonybncn.com</p><form method="post" action="${path}"><input type="hidden" name="csrf" value="${csrf}"><label for="new-password">New password</label><input id="new-password" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><label for="confirm-password">Confirm new password</label><input id="confirm-password" name="confirmation" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><p>Use at least 12 characters. Enter it here only.</p><button type="submit">Set admin password</button></form>`}</main></html>`;
  const server=createServer(async(req,res)=>{
    const send=(status,html)=>{res.writeHead(status,headers);res.end(html);};
    if(req.headers.host!==new URL(origin).host || req.url!==path)return send(404,'Not found');
    if(completed)return send(req.method==='GET'?200:409,page('Your new password is ready to use.',true));
    if(Date.now()>=expires)return send(410,'This setup page has expired. Ask for a new local setup page.');
    if(req.method==='GET')return send(200,page());
    if(req.method!=='POST')return send(405,'Method not allowed');
    if(req.headers.origin!==origin)return send(403,'Request denied');
    if(!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded'))return send(415,'Unsupported request');
    if(busy)return send(409,'A password update is already in progress.');
    let raw='';
    try {for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>8192)return send(413,'Request too large');}} catch {return send(400,'Invalid request');}
    const form=new URLSearchParams(raw);raw='';
    if(form.get('csrf')!==csrf)return send(403,'Request denied');
    let password=form.get('password')||'';
    if(password.length<12||password.length>128)return send(400,page('Use a password with 12–128 characters.'));
    if(password!==form.get('confirmation'))return send(400,page('The passwords did not match. Please enter them again.'));
    if(busy||completed)return send(409,'A password update has already started.');
    if(Date.now()>=expires)return send(410,'This setup page has expired.');
    busy=true;
    try {
      const hash=hashAdminPassword(password);password='';form.delete('password');form.delete('confirmation');
      await applyHash(hash);completed=true;
      send(200,page('Your new password is ready to use.',true));onComplete();
    } catch {send(500,page('The update could not be completed. Please try again.'));}
    finally {busy=false;password='';}
  });
  server.requestTimeout=30000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  const timeout=setTimeout(()=>{server.close();server.closeIdleConnections();},ttlMs);timeout.unref();
  return {url:origin+path,close:()=>{clearTimeout(timeout);server.close();server.closeIdleConnections();}};
}
