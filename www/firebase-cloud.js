// AL QADIR TRADERS SALE — Firebase auth, owner approval and manual cloud backup.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
 getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,
 signOut,setPersistence,browserLocalPersistence,updateProfile,sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
 getFirestore,doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const OWNER_UID="wC4l6PFQA8csi1DZTwsQEMuwOAk1";
const $=id=>document.getElementById(id);
let auth,dbCloud,currentUser=null,profile=null,firebaseReady=false;
const statusEl=()=> $("aqCloudStatus");
const say=(m,ok=false)=>{const e=statusEl();if(e){e.textContent=m;e.style.color=ok?'#137a49':'#b45309';}};
const authMessage=(m,t='error')=>{const e=$('aqAuthMessage');if(e){e.textContent=m;e.className='aq-auth-message show '+t;}};
const clearMsg=()=>{const e=$('aqAuthMessage');if(e){e.textContent='';e.className='aq-auth-message';}};
const err=e=>({
 'auth/invalid-credential':'Email ya password ghalat hai.',
 'auth/email-already-in-use':'Is email par account pehle se bana hua hai.',
 'auth/weak-password':'Password kam az kam 6 characters ka hona chahiye.',
 'auth/invalid-email':'Email address durust nahi hai.',
 'auth/too-many-requests':'Bohat zyada attempts. Kuch dair baad koshish karein.',
 'auth/network-request-failed':'Internet connection check karein.',
 'auth/operation-not-allowed':'Firebase Console mein Email/Password enable karein.'
}[e.code]||e.message||'Authentication error.');
function setGate(v){const g=$('aqAuthGate');if(g)g.hidden=!v;document.body.style.overflow=v?'hidden':'';}
function mode(m){const l=m==='login';$('aqAuthLoginForm').hidden=!l;$('aqAuthRegisterForm').hidden=l;$('aqAuthTabLogin').classList.toggle('active',l);$('aqAuthTabRegister').classList.toggle('active',!l);clearMsg();}
function busy(id,v){const b=$(id);if(!b)return;if(v){b.dataset.old=b.textContent;b.textContent='Please wait…';b.disabled=true;}else{b.textContent=b.dataset.old||b.textContent;b.disabled=false;delete b.dataset.old;}}
function showNotice(title,detail,showSignout=true){
 let el=$('aqAccessNotice');if(!el){el=document.createElement('div');el.id='aqAccessNotice';el.style.cssText='position:fixed;inset:0;z-index:999998;background:linear-gradient(135deg,#07122e,#160b38);display:flex;align-items:center;justify-content:center;padding:20px;color:#fff;font-family:system-ui';document.body.appendChild(el);}
 el.innerHTML=`<div style="width:min(440px,100%);padding:30px;border:1px solid #4269a8;border-radius:20px;background:#101d43;text-align:center;box-shadow:0 0 35px #006caa55"><div style="font-size:38px;margin-bottom:12px">🔐</div><h2 style="margin:0 0 10px">${title}</h2><p style="color:#c5d5f4;line-height:1.6">${detail}</p>${showSignout?'<button id="aqNoticeLogout" style="margin-top:15px;padding:12px 24px;border:0;border-radius:30px;background:linear-gradient(90deg,#773cff,#00bfe5);color:white;font-weight:700;cursor:pointer">Sign Out</button>':''}</div>`;
 el.style.display='flex';$('aqNoticeLogout')?.addEventListener('click',()=>signOut(auth));
}
function hideNotice(){const e=$('aqAccessNotice');if(e)e.style.display='none';}
function addOwnerPanel(){
 if($('aqOwnerPanel'))return;
 const p=document.createElement('section');p.id='aqOwnerPanel';p.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99990;width:min(560px,calc(100vw - 32px));max-height:80vh;overflow:auto;background:#101a35;color:#f4f7ff;border:1px solid #4777bb;border-radius:16px;box-shadow:0 12px 45px #0008;padding:16px;font:14px system-ui;display:none';
 p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:17px">Owner — User Management</b><div style="font-size:12px;color:#a9c4eb">Approve registrations and assign access</div></div><button id="aqOwnerClose" style="background:#26385d;color:white;border:0;border-radius:8px;padding:7px 12px">Close</button></div><div id="aqOwnerUsers" style="margin-top:14px">Loading users…</div>`;
 document.body.appendChild(p);$('aqOwnerClose').onclick=()=>p.style.display='none';
 const b=document.createElement('button');b.id='aqOwnerOpen';b.textContent='User Management';b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99989;border:0;border-radius:24px;padding:12px 18px;background:linear-gradient(90deg,#743bff,#00bde8);color:white;font-weight:800;box-shadow:0 5px 24px #00bde855;cursor:pointer;display:none';
 b.onclick=()=>{p.style.display='block';loadUsers();};document.body.appendChild(b);
}
const moduleNames=['Dashboard','Sales','Invoices','Stock','Market Credit','Recovery','Expenses','Reports','User Management','Settings'];
const actions=['view','add','edit','delete','approve','export','print'];
async function loadUsers(){
 const root=$('aqOwnerUsers');if(!root)return;root.textContent='Loading users…';
 try{
  const snap=await getDocs(collection(dbCloud,'userProfiles'));
  const users=snap.docs.map(d=>({id:d.id,...d.data()}));
  if(!users.length){root.textContent='No registered users yet.';return;}
  root.innerHTML='';
  users.sort((a,b)=>(a.status==='pending'?-1:1)-(b.status==='pending'?-1:1));
  for(const u of users){
   const card=document.createElement('div');card.style.cssText='padding:12px;margin:10px 0;border:1px solid #344c78;border-radius:12px;background:#17264a';
   const heading=document.createElement('div');heading.style.cssText='display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap';
   const who=document.createElement('div');who.innerHTML=`<b>${escapeHtml(u.requestedName||u.displayName||'Unnamed')}</b><div style="font-size:12px;color:#abc2e8">${escapeHtml(u.email||u.id)}</div>`;
   const state=document.createElement('span');state.textContent=(u.status||'unknown').toUpperCase();state.style.cssText='font-size:11px;padding:4px 8px;border-radius:20px;background:'+(u.status==='approved'?'#145b43':u.status==='pending'?'#76551b':'#673044');
   heading.append(who,state);card.append(heading);
   if(u.id===OWNER_UID){const own=document.createElement('p');own.textContent='Main Owner — Full Access';own.style.color='#8be7ff';card.append(own);root.append(card);continue;}
   const name=document.createElement('input');name.value=u.displayName||u.requestedName||'';name.placeholder='Display name';name.style.cssText=inputStyle();card.append(name);
   const role=document.createElement('input');role.value=u.role&&u.role!=='pending'?u.role:'';role.placeholder='Role e.g. Admin, Booker, KPO';role.style.cssText=inputStyle();card.append(role);
   const permTitle=document.createElement('div');permTitle.textContent='Module permissions';permTitle.style.cssText='font-weight:700;margin:9px 0 5px';card.append(permTitle);
   const perms={...(u.permissions||{})};
   const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px';
   for(const mod of moduleNames){const line=document.createElement('label');line.style.cssText='font-size:12px;color:#d8e6ff;display:flex;gap:5px;align-items:center;flex-wrap:wrap';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!(perms[mod]?.view);cb.dataset.mod=mod;line.append(cb,document.createTextNode(mod));grid.append(line);}
   card.append(grid);
   const detail=document.createElement('details');detail.style.marginTop='8px';const sum=document.createElement('summary');sum.textContent='Advanced actions (Add/Edit/Delete/Approve/Export/Print)';detail.append(sum);
   const advanced=document.createElement('div');advanced.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin-top:8px';
   for(const mod of moduleNames){for(const act of actions.filter(x=>x!=='view')){const line=document.createElement('label');line.style.cssText='font-size:11px;display:flex;gap:4px;align-items:center;color:#d8e6ff';
     const cb=document.createElement('input');cb.type='checkbox';cb.dataset.mod=mod;cb.dataset.act=act;cb.checked=!!(perms[mod]?.[act]);line.append(cb,document.createTextNode(mod+' — '+act));advanced.append(line);}}
   detail.append(advanced);card.append(detail);
   const save=document.createElement('button');save.textContent=u.status==='approved'?'Save Permissions':'Approve & Assign Access';save.style.cssText='margin-top:12px;padding:10px 14px;border:0;border-radius:20px;background:linear-gradient(90deg,#743bff,#00bde8);color:white;font-weight:700;cursor:pointer;width:100%';
   save.onclick=async()=>{
    const pms={};grid.querySelectorAll('input').forEach(cb=>{if(cb.checked){pms[cb.dataset.mod]=pms[cb.dataset.mod]||{};pms[cb.dataset.mod].view=true;}});
    advanced.querySelectorAll('input').forEach(cb=>{if(cb.checked){pms[cb.dataset.mod]=pms[cb.dataset.mod]||{};pms[cb.dataset.mod][cb.dataset.act]=true;}});
    if(!name.value.trim()||!role.value.trim())return alert('Display name aur role enter karein.');
    save.disabled=true;
    try{await updateDoc(doc(dbCloud,'userProfiles',u.id),{displayName:name.value.trim(),role:role.value.trim(),permissions:pms,status:'approved',approvedBy:OWNER_UID,approvedAt:serverTimestamp()});alert('User approved / permissions updated.');loadUsers();}
    catch(e){alert('Save failed: '+(e.code||e.message));save.disabled=false;}
   };
   const suspend=document.createElement('button');suspend.textContent=u.status==='suspended'?'Reactivate':'Suspend';suspend.style.cssText='margin:8px 0 0 8px;padding:9px 13px;border:1px solid #8a5570;border-radius:18px;background:transparent;color:#ffd5e2;cursor:pointer';
   suspend.onclick=async()=>{try{await updateDoc(doc(dbCloud,'userProfiles',u.id),{status:u.status==='suspended'?'approved':'suspended'});loadUsers();}catch(e){alert('Update failed: '+e.message);}};
   const row=document.createElement('div');row.append(save,suspend);card.append(row);root.append(card);
  }
 }catch(e){root.textContent='Could not load users: '+(e.code||e.message);}
}
function inputStyle(){return 'width:100%;padding:9px;margin-top:8px;border-radius:8px;border:1px solid #46628d;background:#0b1633;color:white;box-sizing:border-box'}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$('aqAuthTabLogin')?.addEventListener('click',()=>mode('login'));
$('aqAuthTabRegister')?.addEventListener('click',()=>mode('register'));
$('aqAuthGoRegister')?.addEventListener('click',()=>mode('register'));
$('aqAuthGoLogin')?.addEventListener('click',()=>mode('login'));
document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const i=$(b.dataset.toggle);if(i){i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Show':'Hide';}}));
$('aqAuthLoginForm')?.addEventListener('submit',async e=>{e.preventDefault();clearMsg();if(!firebaseReady)return authMessage('Firebase connection unavailable.');busy('aqAuthLoginSubmit',true);try{await signInWithEmailAndPassword(auth,$('aqAuthLoginEmail').value.trim(),$('aqAuthLoginPassword').value);$('aqAuthLoginPassword').value='';}catch(x){authMessage(err(x));}finally{busy('aqAuthLoginSubmit',false);}});
$('aqAuthRegisterForm')?.addEventListener('submit',async e=>{
 e.preventDefault();clearMsg();if(!firebaseReady)return authMessage('Firebase connection unavailable.');
 const name=$('aqAuthFullName').value.trim(),email=$('aqAuthRegisterEmail').value.trim(),pw=$('aqAuthRegisterPassword').value,cp=$('aqAuthConfirmPassword').value;
 if(name.length<2)return authMessage('Full name kam az kam 2 characters ka hona chahiye.');
 if(pw.length<6)return authMessage('Password minimum 6 characters hona chahiye.');
 if(pw!==cp)return authMessage('Password aur Confirm Password match nahi karte.');
 busy('aqAuthRegisterSubmit',true);
 try{
  const c=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(c.user,{displayName:name});
  if(c.user.uid===OWNER_UID){
   await setDoc(doc(dbCloud,'userProfiles',c.user.uid),{uid:c.user.uid,email:c.user.email,requestedName:name,displayName:name,status:'approved',role:'Owner',permissions:{all:true},createdAt:serverTimestamp(),approvedBy:OWNER_UID});
  }else{
   await setDoc(doc(dbCloud,'userProfiles',c.user.uid),{uid:c.user.uid,email:c.user.email,requestedName:name,displayName:name,status:'pending',role:'pending',permissions:{},createdAt:serverTimestamp()});
  }
  $('aqAuthRegisterPassword').value='';$('aqAuthConfirmPassword').value='';
  authMessage(c.user.uid===OWNER_UID?'Owner account initialized.':'Account created. Owner approval required before system access.','ok');
 }catch(x){authMessage(err(x));}finally{busy('aqAuthRegisterSubmit',false);}
});
$('aqAuthForgot')?.addEventListener('click',async()=>{clearMsg();const email=$('aqAuthLoginEmail').value.trim();if(!email)return authMessage('Pehle email enter karein.');try{await sendPasswordResetEmail(auth,email);authMessage('Password reset email bhej di gayi hai.','ok');}catch(e){authMessage(err(e));}});

try{
 const app=initializeApp(firebaseConfig);auth=getAuth(app);dbCloud=getFirestore(app);await setPersistence(auth,browserLocalPersistence);firebaseReady=true;
 window.AQ_FIREBASE={app,auth,db:dbCloud,connected:true};
 addOwnerPanel();
 onAuthStateChanged(auth,async user=>{
  currentUser=user||null;profile=null;
  if(!user){setGate(true);hideNotice();$('aqOwnerOpen').style.display='none';return;}
  setGate(false);
  if(user.uid===OWNER_UID){
   const ref=doc(dbCloud,'userProfiles',user.uid),s=await getDoc(ref);
   if(!s.exists())await setDoc(ref,{uid:user.uid,email:user.email,requestedName:user.displayName||'Owner',displayName:user.displayName||'Owner',status:'approved',role:'Owner',permissions:{all:true},createdAt:serverTimestamp(),approvedBy:OWNER_UID});
   profile={status:'approved',role:'Owner',permissions:{all:true}};
   hideNotice();$('aqOwnerOpen').style.display='block';
  }else{
   try{const s=await getDoc(doc(dbCloud,'userProfiles',user.uid));profile=s.exists()?s.data():null;}catch(e){console.error(e);}
   $('aqOwnerOpen').style.display='none';
   if(!profile){showNotice('Registration Pending','Your account request is being registered. Please sign out and contact the Owner.');return;}
   if(profile.status!=='approved'){showNotice(profile.status==='suspended'?'Account Suspended':'Waiting for Owner Approval',profile.status==='suspended'?'Your account has been suspended. Contact the Owner.':'Your account has been created. The Owner must approve your account and assign your role before you can access business data.');return;}
   hideNotice();
  }
  const email=$('aqCloudSignedIn');if(email)email.textContent=user.email||'Signed in';
  ['aqCloudUpload','aqCloudRestore','aqCloudSignOut'].forEach(id=>{const b=$(id);if(b)b.disabled=false;});
  say(user.uid===OWNER_UID?'Signed in as Main Owner. Full access.':'Approved user: '+(profile?.role||'User'),true);
 });
}catch(e){console.error(e);setGate(true);authMessage('Firebase setup error: '+e.message);say('Firebase error: '+e.message);}
window.aqFirebaseLogout=()=>signOut(auth);
window.aqFirebaseUpload=async()=>{
 if(!currentUser||profile?.status!=='approved')return say('Owner approval required.');
 if(typeof window.AQ_EXPORT_LOCAL_DATA!=='function')return say('Local data bridge unavailable.');
 if(!confirm('Local business data ka cloud backup upload karna hai?'))return;
 try{const snapshot=window.AQ_EXPORT_LOCAL_DATA(),json=JSON.stringify(snapshot),bytes=new TextEncoder().encode(json).length;if(bytes>850000)return say('Backup 850 KB se bara hai. Upload roka gaya.');
 await setDoc(doc(dbCloud,'users',currentUser.uid,'agency','main'),{schemaVersion:1,ownerUid:currentUser.uid,data:snapshot,updatedAt:serverTimestamp(),clientUpdatedAt:new Date().toISOString()});say('Cloud backup successful: '+Math.ceil(bytes/1024)+' KB',true);
 }catch(e){say('Cloud upload failed: '+(e.code||e.message));}
};
window.aqFirebaseRestore=async()=>{
 if(!currentUser||profile?.status!=='approved')return say('Owner approval required.');
 if(!confirm('Cloud backup restore karna hai? Current local data pehle JSON safety file mein download hoga.'))return;
 try{const s=await getDoc(doc(dbCloud,'users',currentUser.uid,'agency','main'));if(!s.exists())return say('Cloud backup nahi mila.');
 const local=window.AQ_EXPORT_LOCAL_DATA(),blob=new Blob([JSON.stringify(local,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AL_QADIR_BEFORE_RESTORE.json';a.click();URL.revokeObjectURL(url);
 await window.AQ_REPLACE_LOCAL_DATA(s.data().data);say('Cloud restore complete. Safety backup downloaded.',true);
 }catch(e){say('Cloud restore failed: '+(e.code||e.message));}
};
