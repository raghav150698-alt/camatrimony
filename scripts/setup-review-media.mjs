// Replace only the original placeholder document references in the LOCAL review account.
const base='http://localhost:8787/v1';
const headers={Authorization:'Bearer mock-user-review'};
const profileResponse=await fetch(base+'/profile',{headers});
const profile=(await profileResponse.json()).profile;
if(!profile)throw new Error('Local review profile unavailable');
function pdf(){
 const text='BT /F1 18 Tf 45 745 Td (LOCAL REVIEW SAMPLE) Tj 0 -32 Td /F1 11 Tf (Illustrative document only - not identity or qualification proof.) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
 let out='%PDF-1.4\n';const offsets=[0];
 objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
 const start=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 out+=offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 return out+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
}
const patch={};
for(const [field,type,name] of [['govtIdFile','govt_id','sample-identity-document.pdf'],['degreeFile','degree','sample-education-document.pdf']]){
 if(!/local-review-(id|degree)\.pdf$/.test(profile[field]||''))continue;
 const form=new FormData();form.append('type',type);form.append('file',new Blob([pdf()],{type:'application/pdf'}),name);
 const response=await fetch(base+'/uploads',{method:'POST',headers,body:form});const result=await response.json();
 if(!response.ok||!result.url)throw new Error('Could not create local sample media');patch[field]=result.url;
}
if(Object.keys(patch).length){const response=await fetch(base+'/profile',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!response.ok)throw new Error('Could not attach sample media');}
console.log('Local sample documents ready. Existing uploaded documents preserved.');
