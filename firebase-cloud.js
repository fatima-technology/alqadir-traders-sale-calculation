// AL QADIR TRADERS SALE — Firebase auth, owner approval and manual cloud backup.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
 getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,
 signOut,setPersistence,browserLocalPersistence,browserSessionPersistence,updateProfile,sendPasswordResetEmail,
 updatePassword,reauthenticateWithCredential,EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
 getFirestore,doc,getDoc,setDoc,serverTimestamp,collection,getDocs,updateDoc,onSnapshot
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const OWNER_UID="wC4l6PFQA8csi1DZTwsQEMuwOAk1";
const $=id=>document.getElementById(id);
let auth,dbCloud,currentUser=null,profile=null,firebaseReady=false,liveUnsub=null,cloudWriteTimer=null,applyingCloud=false,liveSyncEnabled=false;
const COMPANY_DATA_REF=()=>doc(dbCloud,'companies','al-qadir-traders','agency','main');
const CLOUD_MAX_BYTES=850000;
const statusEl=()=> $("aqCloudStatus");
let loginFlow=false;
const boot=(()=>{const el=$('aqBoot');if(!el)return{show(){},step(){},waitCloud(){},done(){}};
 const T={1:['Firebase se connect ho raha hai…','Secure connection ban rahi hai',22],2:['Account verify ho raha hai…','Aapki pehchan check ho rahi hai',58],3:['Business data load ho raha hai…','Sale, stock aur recovery tayyar ho rahi hai',88]};
 let t0=Date.now(),timer=null,fb=null;
 const set=n=>{const [a,b,p]=T[n];$('aqbTitle').textContent=a;$('aqbSub').textContent=b;$('aqbFill').style.width=p+'%';el.querySelectorAll('.aqb-steps li').forEach(li=>{const s=+li.dataset.s;li.className=s<n?'ok':s===n?'on':'';});};
 return{
  show(n=1,loud=false){clearTimeout(timer);clearTimeout(fb);t0=Date.now();el.classList.toggle('quiet',!loud);el.style.display='flex';void el.offsetWidth;el.classList.remove('done');set(n);},
  step:set,
  waitCloud(){set(3);clearTimeout(fb);fb=setTimeout(()=>boot.done(),8000);},
  done(){clearTimeout(fb);if(el.classList.contains('done'))return;$('aqbFill').style.width='100%';el.querySelectorAll('.aqb-steps li').forEach(li=>li.className='ok');const wait=el.classList.contains('quiet')?0:Math.max(0,450-(Date.now()-t0));clearTimeout(timer);timer=setTimeout(()=>{el.classList.add('done');setTimeout(()=>{if(el.classList.contains('done'))el.style.display='none';},500);},wait);}
 };})();
const say=(m,ok=false)=>{const e=statusEl();if(e){e.textContent=m;e.style.color=ok?'#137a49':'#b45309';}};
const authMessage=(m,t='error')=>{const e=$('aqAuthMessage');if(e){e.textContent=m;e.className='aq-auth-message show '+t;}};
const clearMsg=()=>{const e=$('aqAuthMessage');if(e){e.textContent='';e.className='aq-auth-message';}};
const err=e=>({
 'auth/invalid-credential':'Email ya password ghalat hai.',
 'auth/email-already-in-use':'Is email par account pehle se bana hua hai.',
 'auth/weak-password':'Password kam az kam 6 characters ka hona chahiye.',
 'auth/invalid-email':'Email address durust nahi hai.',
 'auth/too-many-requests':'Bohat zyada attempts. Kuch dair baad koshish karein.',
 'auth/network-request-failed':'Internet nahi hai. Pehli dafa login ke liye internet zaroori hai; uske baad system offline bhi chalta hai.',
 'auth/operation-not-allowed':'Firebase Console mein Email/Password enable karein.',
 'auth/user-disabled':'Ye account disable kar diya gaya hai.',
 'auth/user-not-found':'Is email par koi account nahi mila.',
 'auth/wrong-password':'Email ya password ghalat hai.',
 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':'Firebase API key ghalat hai — firebase-config.js check karein.'
}[e.code]||e.message||'Authentication error.');
function setGate(v){const g=$('aqAuthGate');if(g)g.hidden=!v;document.body.style.overflow=v?'hidden':'';}
function mode(m){const l=m==='login';$('aqAuthLoginForm').hidden=!l;$('aqAuthRegisterForm').hidden=l;$('aqAuthTabLogin').classList.toggle('active',l);$('aqAuthTabRegister').classList.toggle('active',!l);clearMsg();}
function busy(id,v){const b=$(id);if(!b)return;if(v){b.dataset.old=b.textContent;b.textContent='Please wait…';b.disabled=true;}else{b.textContent=b.dataset.old||b.textContent;b.disabled=false;delete b.dataset.old;}}
function showNotice(title,detail,showSignout=true){
 boot.done();
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
$('aqAuthLoginForm')?.addEventListener('submit',async e=>{e.preventDefault();clearMsg();if(!firebaseReady)return authMessage('Firebase connection unavailable.');loginFlow=true;busy('aqAuthLoginSubmit',true);try{await setPersistence(auth,$('aqAuthRemember')?.checked?browserLocalPersistence:browserSessionPersistence);await signInWithEmailAndPassword(auth,$('aqAuthLoginEmail').value.trim(),$('aqAuthLoginPassword').value);$('aqAuthLoginPassword').value='';}catch(x){loginFlow=false;authMessage(err(x));}finally{busy('aqAuthLoginSubmit',false);}});
$('aqAuthRegisterForm')?.addEventListener('submit',async e=>{
 e.preventDefault();clearMsg();if(!firebaseReady)return authMessage('Firebase connection unavailable.');
 const name=$('aqAuthFullName').value.trim(),email=$('aqAuthRegisterEmail').value.trim(),pw=$('aqAuthRegisterPassword').value,cp=$('aqAuthConfirmPassword').value;
 if(name.length<2)return authMessage('Full name kam az kam 2 characters ka hona chahiye.');
 if(pw.length<6)return authMessage('Password minimum 6 characters hona chahiye.');
 if(pw!==cp)return authMessage('Password aur Confirm Password match nahi karte.');
 loginFlow=true;busy('aqAuthRegisterSubmit',true);
 try{
  await setPersistence(auth,$('aqAuthRemember')?.checked?browserLocalPersistence:browserSessionPersistence);const c=await createUserWithEmailAndPassword(auth,email,pw);await updateProfile(c.user,{displayName:name});
  if(c.user.uid===OWNER_UID){
   await setDoc(doc(dbCloud,'userProfiles',c.user.uid),{uid:c.user.uid,email:c.user.email,requestedName:name,displayName:name,status:'approved',role:'Owner',permissions:{all:true},createdAt:serverTimestamp(),approvedBy:OWNER_UID});
  }else{
   await setDoc(doc(dbCloud,'userProfiles',c.user.uid),{uid:c.user.uid,email:c.user.email,requestedName:name,displayName:name,status:'pending',role:'pending',permissions:{},createdAt:serverTimestamp()});
  }
  $('aqAuthRegisterPassword').value='';$('aqAuthConfirmPassword').value='';
  authMessage(c.user.uid===OWNER_UID?'Owner account initialized.':'Account created. Owner approval required before system access.','ok');
 }catch(x){loginFlow=false;authMessage(err(x));}finally{busy('aqAuthRegisterSubmit',false);}
});
$('aqAuthForgot')?.addEventListener('click',async()=>{clearMsg();const email=$('aqAuthLoginEmail').value.trim();if(!email)return authMessage('Pehle email enter karein.');try{await sendPasswordResetEmail(auth,email);authMessage('Password reset email bhej di gayi hai.','ok');}catch(e){authMessage(err(e));}});

try{
 const app=initializeApp(firebaseConfig);auth=getAuth(app);dbCloud=getFirestore(app);firebaseReady=true;
 window.AQ_FIREBASE={app,auth,db:dbCloud,connected:true};
 addOwnerPanel();
 onAuthStateChanged(auth,async user=>{
  currentUser=user||null;profile=null;
  if(!user){boot.done();setGate(true);hideNotice();$('aqOwnerOpen').style.display='none';return;}
  boot.show(2,loginFlow);loginFlow=false;setGate(false);
  if(user.uid===OWNER_UID){
   try{
    if(navigator.onLine){const ref=doc(dbCloud,'userProfiles',user.uid),s=await getDoc(ref);
    if(!s.exists())await setDoc(ref,{uid:user.uid,email:user.email,requestedName:user.displayName||'Owner',displayName:user.displayName||'Owner',status:'approved',role:'Owner',permissions:{all:true},createdAt:serverTimestamp(),approvedBy:OWNER_UID});}
   }catch(e){console.warn('Owner profile check skipped (offline):',e&&e.code);}
   profile={status:'approved',role:'Owner',permissions:{all:true}};
   hideNotice();$('aqOwnerOpen').style.display='block';
  }else{
   const PK='aq_profile_'+user.uid;
   try{if(!navigator.onLine)throw new Error('offline');const s=await getDoc(doc(dbCloud,'userProfiles',user.uid));profile=s.exists()?s.data():null;if(profile&&profile.status==='approved'){try{localStorage.setItem(PK,JSON.stringify({status:profile.status,role:profile.role,permissions:profile.permissions||{}}));}catch(_){}}else{try{localStorage.removeItem(PK);}catch(_){}}}
   catch(e){try{const c=JSON.parse(localStorage.getItem(PK)||'null');if(c&&c.status==='approved')profile=c;}catch(_){}if(!profile)console.warn('Profile unavailable offline',e&&e.message);}
   $('aqOwnerOpen').style.display='none';
   if(!profile){showNotice('Registration Pending','Your account request is being registered. Please sign out and contact the Owner.');return;}
   if(profile.status!=='approved'){showNotice(profile.status==='suspended'?'Account Suspended':'Waiting for Owner Approval',profile.status==='suspended'?'Your account has been suspended. Contact the Owner.':'Your account has been created. The Owner must approve your account and assign your role before you can access business data.');return;}
   hideNotice();
  }
  const email=$('aqCloudSignedIn');if(email)email.textContent=user.email||'Signed in';const pwe=$('aqPwEmail');if(pwe)pwe.textContent='Account: '+(user.email||'');
  ['aqCloudUpload','aqCloudRestore','aqCloudSignOut','aqCloudLiveStart'].forEach(id=>{const b=$(id);if(b)b.disabled=false;});
  if(user.uid!==OWNER_UID){if(navigator.onLine)boot.waitCloud();else boot.done();startSharedCloudListener();}
  say(user.uid===OWNER_UID?'Signed in as Main Owner. Full access.':'Approved user: '+(profile?.role||'User'),true);
  if(user.uid===OWNER_UID){boot.done();if(navigator.onLine&&localStorage.getItem('aq_live_on')==='1')startSharedCloudListener();}
  pill();
 });
}catch(e){console.error(e);boot.done();setGate(true);authMessage('Firebase setup error: '+e.message);say('Firebase error: '+e.message);}
async function startSharedCloudListener(){
 if(!currentUser||profile?.status!=='approved'||liveUnsub)return;
 try{
  const ref=COMPANY_DATA_REF();
  liveUnsub=onSnapshot(ref,async snap=>{
   if(snap.metadata&&snap.metadata.hasPendingWrites)return;
   if(!snap.exists()){say('Shared cloud data abhi Owner ne initialize nahi kiya.');boot.done();return;}
   const payload=snap.data();
   if(!payload||!payload.data||typeof payload.data!=='object'){boot.done();return;}
   if(payload.ownerUid!==OWNER_UID){say('Cloud data owner verification failed.');boot.done();return;}
   if(isDirty()){
    // Work was done on this device while offline: keep it, safe-copy the cloud version, then upload local changes.
    try{localStorage.setItem('aq_cloud_copy_before_merge',JSON.stringify({savedAt:new Date().toISOString(),payload:payload.data}));}catch(_){}
    liveSyncEnabled=true;boot.done();pushLocalToCloud('Offline changes cloud par sync ho gayi.');return;
   }
   try{if(JSON.stringify(window.AQ_EXPORT_LOCAL_DATA())===JSON.stringify(payload.data)){liveSyncEnabled=true;say('Shared cloud data connected · sab kuch up to date.',true);boot.done();return;}}catch(_){}
   applyingCloud=true;
   try{await window.AQ_REPLACE_LOCAL_DATA(payload.data);liveSyncEnabled=true;say('Shared cloud data connected · latest data loaded.',true);}
   finally{applyingCloud=false;boot.done();}
  },e=>{console.error(e);say('Live cloud read failed: '+(e.code||e.message));boot.done();});
 }catch(e){say('Cloud listener failed: '+(e.code||e.message));}
}
window.aqStartLiveSync=async()=>{
 if(!currentUser||currentUser.uid!==OWNER_UID||profile?.status!=='approved')return say('Shared cloud initialization sirf Main Owner kar sakta hai.');
 const b=$('aqCloudLiveStart');if(b)b.disabled=true;
 try{
  await window.AQ_LOCAL_SAVE_READY;
  const ref=COMPANY_DATA_REF(),existing=await getDoc(ref);
  if(existing.exists()){
   const d=existing.data();
   if(d.ownerUid!==OWNER_UID)throw new Error('Cloud document owner mismatch.');
   if(isDirty()){
    if(!confirm('Is device par offline changes hain jo cloud par nahi gaye. OK = ye changes cloud par upload honge (cloud ki purani copy pehle device par safe rakhi jayegi). Cancel = kuch change na karein.'))return;
    safetyBackup('Offline changes cloud par bhejne se pehle');
    try{localStorage.setItem('aq_cloud_copy_before_merge',JSON.stringify({savedAt:new Date().toISOString(),payload:d.data}));}catch(_){}
    await pushLocalToCloud('Offline changes cloud par sync ho gayi.');
    if(liveUnsub){liveUnsub();liveUnsub=null;}liveSyncEnabled=true;try{localStorage.setItem('aq_live_on','1');}catch(_){}startSharedCloudListener();return;
   }
   if(!confirm('Shared cloud data pehle se mojood hai. OK = cloud data is device par load karein. Cancel = kuch change na karein.'))return;
   const local=window.AQ_EXPORT_LOCAL_DATA();
   const blob=new Blob([JSON.stringify(local,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AL_QADIR_BEFORE_CLOUD_CONNECT.json';a.click();URL.revokeObjectURL(url);
   applyingCloud=true;try{await window.AQ_REPLACE_LOCAL_DATA(d.data);}finally{applyingCloud=false;}
  }else{
   if(!confirm('Pehli dafa local data ko AL QADIR shared cloud par upload karna hai? Pehle local data ka export backup bhi download hoga.'))return;
   const data=window.AQ_EXPORT_LOCAL_DATA(),json=JSON.stringify(data),bytes=new TextEncoder().encode(json).length;
   if(bytes>CLOUD_MAX_BYTES)throw new Error('Data 850 KB se bara hai; single-document sync enable nahi ki ja sakti.');
   const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AL_QADIR_BEFORE_CLOUD_INITIALIZE.json';a.click();URL.revokeObjectURL(url);
   await setDoc(ref,{schemaVersion:1,companyId:'al-qadir-traders',ownerUid:OWNER_UID,data,updatedAt:serverTimestamp(),clientUpdatedAt:new Date().toISOString(),updatedBy:currentUser.uid});
  }
  if(liveUnsub){liveUnsub();liveUnsub=null;}liveSyncEnabled=true;try{localStorage.setItem('aq_live_on','1');}catch(_){}startSharedCloudListener();
  say('Shared cloud connected. Keep this tab online while syncing.',true);
 }catch(e){console.error(e);say('Cloud connect failed: '+(e.code||e.message));}
 finally{if(b)b.disabled=false;}
};
let localVer=0;
const isDirty=()=>{try{return localStorage.getItem('aq_dirty')==='1';}catch(_){return false;}};
const setDirty=v=>{try{v?localStorage.setItem('aq_dirty','1'):localStorage.removeItem('aq_dirty');}catch(_){}pill();};
/* small status pill: always shows whether device changes are safely synced */
function pill(flash){
 let p=document.getElementById('aqSyncPill');
 if(!p){p=document.createElement('div');p.id='aqSyncPill';p.style.cssText='position:fixed;left:12px;bottom:12px;z-index:9500;padding:7px 14px;border-radius:20px;font:700 12px Inter,system-ui,sans-serif;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);display:none;pointer-events:none';document.body.appendChild(p);}
 if(!currentUser){p.style.display='none';return;}
 const off=!navigator.onLine,d=isDirty();
 if(off){p.style.background=d?'#c2410c':'#475569';p.textContent=d?'● Offline — changes is device par safe hain':'● Offline mode';p.style.display='block';}
 else if(d){p.style.background='#b45309';p.textContent='↻ Cloud sync ho raha hai…';p.style.display='block';}
 else if(flash){p.style.background='#15803d';p.textContent='✓ Sab changes cloud par sync';p.style.display='block';clearTimeout(p._t);p._t=setTimeout(()=>{p.style.display='none';},3500);}
 else p.style.display='none';
}
/* safety backups: before cloud data ever replaces local data, keep the device copy (last 2) */
function safetyBackup(reason){
 try{const data=window.AQ_EXPORT_LOCAL_DATA();let l=JSON.parse(localStorage.getItem('aq_safety_backups')||'[]');
  l.unshift({t:new Date().toISOString(),reason,data});while(l.length>2)l.pop();
  try{localStorage.setItem('aq_safety_backups',JSON.stringify(l));}catch(q){l.pop();localStorage.setItem('aq_safety_backups',JSON.stringify(l));}
 }catch(e){console.warn('safety backup skipped',e&&e.name);}
 window.aqListSafety&&window.aqListSafety();
}
if(typeof window.AQ_REPLACE_LOCAL_DATA==='function'&&!window.AQ_REPLACE_LOCAL_DATA.__wrapped){
 const _rep=window.AQ_REPLACE_LOCAL_DATA;
 window.AQ_REPLACE_LOCAL_DATA=async function(d){safetyBackup('Cloud data load hone se pehle ka device data');return _rep.call(this,d);};
 window.AQ_REPLACE_LOCAL_DATA.__wrapped=true;
}
window.aqListSafety=()=>{
 const box=document.getElementById('aqSafetyList');if(!box)return;
 let l=[];try{l=JSON.parse(localStorage.getItem('aq_safety_backups')||'[]');}catch(_){}
 box.innerHTML=l.length?l.map((b,i)=>'<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid #eee"><span class="sub" style="margin:0">'+new Date(b.t).toLocaleString('en-GB')+' &middot; '+b.reason+'</span><button class="btn small secondary" type="button" onclick="aqRestoreSafety('+i+')">Restore this</button></div>').join(''):'<p class="sub">Abhi koi safety backup nahi hai. Cloud data device par load hone se pehle yahan khud save hota hai.</p>';
};
window.aqRestoreSafety=async i=>{
 let l=[];try{l=JSON.parse(localStorage.getItem('aq_safety_backups')||'[]');}catch(_){}
 const b=l[i];if(!b)return;
 if(!confirm('Ye device backup ('+new Date(b.t).toLocaleString('en-GB')+') wapas laga dein? Abhi ka data pehle safety backup mein chala jayega.'))return;
 await window.AQ_REPLACE_LOCAL_DATA(b.data);setDirty(true);window.AQ_CLOUD_SYNC_LOCAL&&window.AQ_CLOUD_SYNC_LOCAL();say('Device backup restore ho gaya.',true);
};

async function pushLocalToCloud(okMsg){
 const ver=localVer;
 const data=window.AQ_EXPORT_LOCAL_DATA(),json=JSON.stringify(data),bytes=new TextEncoder().encode(json).length;
 if(bytes>CLOUD_MAX_BYTES){say('Live sync paused: data 850 KB limit se bara hai.');return;}
 await setDoc(COMPANY_DATA_REF(),{schemaVersion:1,companyId:'al-qadir-traders',ownerUid:OWNER_UID,data,updatedAt:serverTimestamp(),clientUpdatedAt:new Date().toISOString(),updatedBy:currentUser.uid});
 try{localStorage.setItem('aq_last_sync_at',new Date().toISOString())}catch(_){}
 if(ver===localVer){setDirty(false);pill(true);say(okMsg||'All changes synced to shared cloud.',true);}
 else{say('Naye changes aa gaye, dobara sync ho raha hai…');clearTimeout(cloudWriteTimer);cloudWriteTimer=setTimeout(()=>pushLocalToCloud().catch(e=>say('Cloud sync failed: '+(e.code||e.message))),800);}
}
window.AQ_CLOUD_SYNC_LOCAL=()=>{
 if(applyingCloud)return;
 localVer++;setDirty(true);
 if(!navigator.onLine){say('Offline: changes is device par save hain, internet aate hi cloud par sync ho jayengi.');return;}
 if(!liveSyncEnabled||!currentUser||profile?.status!=='approved')return;
 clearTimeout(cloudWriteTimer);
 cloudWriteTimer=setTimeout(async()=>{
  try{await pushLocalToCloud();}catch(e){console.error(e);say('Cloud sync failed: '+(e.code||e.message));}
 },1200);
};
window.addEventListener('online',()=>{
 if(!currentUser||profile?.status!=='approved')return;
 say('Internet wapas aa gaya.',true);
 if(isDirty()&&liveSyncEnabled){pushLocalToCloud('Offline changes cloud par sync ho gayi.').catch(e=>say('Cloud sync failed: '+(e.code||e.message)));}
 else if(!liveUnsub&&(currentUser.uid!==OWNER_UID?true:localStorage.getItem('aq_live_on')==='1'))startSharedCloudListener();
 pill();
});
window.addEventListener('offline',()=>{say('Offline mode: system chal raha hai, data is device par save ho raha hai.');pill();});
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

window.aqChangePassword=async()=>{
 const st=$('aqPwStatus'),set=(m,ok)=>{if(st){st.textContent=m;st.style.color=ok?'#067647':'#b42318';}};
 if(!currentUser)return set('Pehle sign in karein.');
 if(!navigator.onLine)return set('Password badalne ke liye internet zaroori hai.');
 const cur=$('aqPwCurrent').value,n1=$('aqPwNew').value,n2=$('aqPwConfirm').value;
 if(!cur||!n1)return set('Current aur new password enter karein.');
 if(n1.length<8)return set('Naya password kam az kam 8 characters ka ho.');
 if(n1!==n2)return set('New password aur confirm password match nahi karte.');
 if(n1===cur)return set('Naya password purane password se different ho.');
 const b=$('aqPwBtn');if(b)b.disabled=true;
 try{
  await reauthenticateWithCredential(currentUser,EmailAuthProvider.credential(currentUser.email,cur));
  await updatePassword(currentUser,n1);
  ['aqPwCurrent','aqPwNew','aqPwConfirm'].forEach(i=>{const e=$(i);if(e)e.value='';});
  set('Password kamyabi se change ho gaya.',true);
 }catch(e){set((e.code==='auth/wrong-password'||e.code==='auth/invalid-credential')?'Current password ghalat hai.':err(e));}
 finally{if(b)b.disabled=false;}
};
window.aqSendResetLink=async()=>{
 const st=$('aqPwStatus');
 try{if(!currentUser)throw new Error('Pehle sign in karein.');await sendPasswordResetEmail(auth,currentUser.email);if(st){st.textContent='Reset link '+currentUser.email+' par bhej diya gaya hai.';st.style.color='#067647';}}
 catch(e){if(st){st.textContent=e.code?err(e):e.message;st.style.color='#b42318';}}
};
/* Minimal Refresh / Sync / Online status controls. Existing data and cloud engine remain unchanged. */
(()=>{
 const style=document.createElement('style');style.textContent=`#aqQuickSync{position:fixed;right:12px;bottom:14px;z-index:9499;display:flex;align-items:center;gap:7px;padding:8px 10px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;box-shadow:0 5px 20px rgba(15,23,42,.15);font:600 12px system-ui;max-width:calc(100vw - 24px)}#aqQuickSync .aqqs-status{display:flex;align-items:center;gap:5px;white-space:nowrap;color:#475569}#aqQuickSync .aqqs-dot{width:8px;height:8px;border-radius:50%;background:#dc2626;display:inline-block}#aqQuickSync.online .aqqs-dot{background:#16a34a}#aqQuickSync button{border:0;border-radius:8px;padding:8px 10px;background:#eaf0f7;color:#26384b;font-weight:750;cursor:pointer}#aqQuickSync button.sync{background:#167c45;color:#fff}#aqQuickSync button:disabled{opacity:.55;cursor:wait}#aqQuickSync .aqqs-time{display:none;color:#64748b;font-size:10px;font-weight:500}@media(min-width:700px){#aqQuickSync .aqqs-time{display:block}}@media(max-width:420px){#aqQuickSync{gap:5px;padding:6px}#aqQuickSync button{padding:7px 8px;font-size:11px}}`;document.head.appendChild(style);
 const bar=document.createElement('div');bar.id='aqQuickSync';bar.innerHTML=`<span class="aqqs-status"><i class="aqqs-dot"></i><span id="aqqsNet">Offline</span></span><span class="aqqs-time" id="aqqsLast">Last sync: —</span><button type="button" id="aqqsRefresh">↻ Refresh</button><button type="button" class="sync" id="aqqsSync">☁ Sync Now</button>`;document.body.appendChild(bar);
 const net=()=>{const online=navigator.onLine;bar.classList.toggle('online',online);const n=$('aqqsNet');if(n)n.textContent=online?'Online':'Offline';const s=$('aqqsSync');if(s)s.disabled=!online||syncBusy;};
 const showLast=()=>{let t='';try{t=localStorage.getItem('aq_last_sync_at')||''}catch(_){}const el=$('aqqsLast');if(el)el.textContent='Last sync: '+(t?new Date(t).toLocaleString():'—')};
 let syncBusy=false;
 $('aqqsRefresh').onclick=()=>{const b=$('aqqsRefresh');b.disabled=true;b.textContent='Refreshing…';try{if(window.AQ_REFRESH_SYSTEM){const ok=window.AQ_REFRESH_SYSTEM();say(ok?'System refreshed.':'Refresh failed.',!!ok)}else{location.reload()}}catch(e){say('Refresh failed: '+(e.message||e))}finally{setTimeout(()=>{b.disabled=false;b.textContent='↻ Refresh'},500)};showLast();net()};
 $('aqqsSync').onclick=async()=>{if(syncBusy)return;if(!navigator.onLine){say('Offline: internet reconnect hone par sync ho jayegi.');return}if(!currentUser||profile?.status!=='approved'){say('Cloud sync ke liye approved account sign in hona zaroori hai.');return}if(!liveSyncEnabled){say('Shared Cloud Data pehle connect karein; data overwrite se bachane ke liye sync roki gayi.');return}if(!isDirty()){say('Data pehle se cloud ke sath up to date hai.',true);return}syncBusy=true;net();const b=$('aqqsSync');b.textContent='Syncing…';try{await pushLocalToCloud('Manual sync complete.');showLast()}catch(e){say('Sync failed: '+(e.code||e.message));}finally{syncBusy=false;b.textContent='☁ Sync Now';net();showLast()}};
 const autoTick=async()=>{net();showLast();if(navigator.onLine&&currentUser&&profile?.status==='approved'&&liveSyncEnabled&&isDirty()&&!syncBusy){syncBusy=true;net();try{await pushLocalToCloud('Automatic sync complete.');showLast()}catch(e){console.warn('Auto sync check failed',e);say('Automatic sync failed: '+(e.code||e.message))}finally{syncBusy=false;net()}}};
 window.addEventListener('online',()=>{net();autoTick()});window.addEventListener('offline',net);net();showLast();setInterval(autoTick,30000);
})();
