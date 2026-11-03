import assert from 'node:assert/strict';
const base='http://localhost:8787/v1';
const token={Authorization:'Bearer mock-user-review'};
async function api(path,method='GET',data,auth=true){
  const response=await fetch(base+path,{method,headers:{...(auth?token:{}),'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  return {status:response.status,body:await response.json()};
}
const settings=(await api('/user/settings')).body.settings;
const creditsBefore=(await api('/payments/subscription')).body.subscription.contactLimitBalance;
try {
  assert.equal((await api('/profile','GET',undefined,false)).status,401);
  for(const id of ['qa-profile-hidden','qa-profile-inactive']){
    assert.equal((await api('/profiles/'+id)).status,404);
    assert.equal((await api('/profiles/search-by-id?userId='+id)).status,404);
    assert.equal((await api('/unlocks','POST',{targetUserId:id})).status,404);
  }
  assert.equal((await api('/block','POST',{blockedId:'qa-profile-blocked'})).status,200);
  assert.equal((await api('/profiles/qa-profile-blocked')).status,404);
  assert.equal((await api('/profiles/search-by-id?userId=qa-profile-blocked')).status,404);
  assert.equal((await api('/unlocks','POST',{targetUserId:'qa-profile-blocked'})).status,404);
  const catalogue=(await api('/profiles?sortBy=recommended&limit=50')).body.profiles;
  assert.ok(catalogue.every(p=>!p.userId.startsWith('qa-profile-')));
  assert.equal((await api('/payments/subscription')).body.subscription.contactLimitBalance,creditsBefore);
  assert.equal((await api('/user/settings','PATCH',{hideProfile:true,hideContact:true,hideIncome:true})).status,200);
  assert.equal((await api('/user/settings','PATCH',{notifyInterests:false,notifyMessages:true})).status,200);
  const stored=(await api('/user/settings')).body.settings;
  assert.ok(stored.hideProfile&&stored.hideContact&&stored.hideIncome,'partial notification update retains privacy');
  assert.equal((await api('/profiles/mock-user-review','GET',undefined,false)).status,404);
  assert.equal((await api('/profiles/mock-user-review')).status,200);
  const feed=(await api('/notifications')).body.notifications;
  assert.ok(!feed.some(n=>n.title==='QA regression interest'));
  assert.ok(feed.some(n=>n.title==='QA regression message'));
  const profile=(await api('/profiles/review-match-ananya')).body.profile;
  assert.ok(profile.userId&&Array.isArray(profile.photos));
  for(const key of ['govtIdFile','degreeFile','email','paymentProofUrl'])assert.ok(!(key in profile));
  const contacts=(await api('/unlocks')).body.unlocks;
  assert.ok(contacts.some(c=>c.unlocked_user_id==='review-match-ananya'&&c.email),'unlocked contacts survive refresh');
  const form=new FormData();
  form.append('type','govt_id');
  form.append('file',new Blob(['%PDF-1.4\nLOCAL REVIEW SAMPLE - NOT IDENTITY PROOF\n%%EOF'],{type:'application/pdf'}),'review-sample.pdf');
  const uploaded=await fetch(base+'/uploads',{method:'POST',headers:token,body:form});
  assert.equal(uploaded.status,200);
  const upload=await uploaded.json();
  const download=await fetch(upload.url,{headers:token});
  assert.equal(download.status,200);
  assert.ok((await download.text()).includes('LOCAL REVIEW SAMPLE'));
  assert.equal((await fetch(upload.url)).status,401);
  const wrong=new FormData();wrong.append('type','unknown');wrong.append('file',new Blob(['test'],{type:'application/pdf'}),'test.pdf');
  assert.equal((await fetch(base+'/uploads',{method:'POST',headers:token,body:wrong})).status,400);
  const stories=await api('/stories','GET',undefined,false);
  assert.equal(stories.status,200);assert.ok(Array.isArray(stories.body.stories));
  console.log('PASS: profile lookup, visibility, blocks, credits, privacy persistence, notification preferences, private uploads and stories');
} finally {
  await api('/user/settings','PATCH',settings);
  await api('/block?blockedId=qa-profile-blocked','DELETE');
}

