// AL QADIR TRADERS SALE: Firebase Authentication + manual Firestore backup.
// Local IndexedDB remains the primary working store. Cloud upload/restore is explicit.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const statusEl = () => document.getElementById('aqCloudStatus');
const say = (message, good=false) => {
  const el=statusEl(); if(el){el.textContent=message;el.style.color=good?'#137a49':'#b45309';}
};
let auth, dbCloud, currentUser=null, firebaseReady=false;
try {
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app); dbCloud=getFirestore(app);
  await setPersistence(auth,browserLocalPersistence);
  firebaseReady=true;
  window.AQ_FIREBASE={app,auth,db:dbCloud,connected:true};
  onAuthStateChanged(auth,user=>{
    currentUser=user||null;
    const email=document.getElementById('aqCloudEmail');
    if(email && user) email.value=user.email||'';
    const signed=document.getElementById('aqCloudSignedIn');
    if(signed) signed.textContent=user?('Signed in: '+(user.email||'Firebase user')):'Not signed in';
    ['aqCloudUpload','aqCloudRestore','aqCloudSignOut'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=!user;});
    const login=document.getElementById('aqCloudLogin'); if(login)login.disabled=!!user;
    say(user?'Firebase connected. Cloud backup is available.':'Firebase ready. Sign in to use cloud backup.',true);
  });
} catch(error) {
  console.error('[AL QADIR] Firebase setup error:',error);
  window.AQ_FIREBASE={connected:false,error};
  say('Firebase setup error: '+(error.message||error));
}

window.aqFirebaseLogin=async()=>{
  if(!firebaseReady)return say('Firebase initialize nahi hua. Internet aur config check karein.');
  const email=document.getElementById('aqCloudEmail')?.value.trim();
  const password=document.getElementById('aqCloudPassword')?.value;
  if(!email||!password)return say('Email aur password enter karein.');
  try{await signInWithEmailAndPassword(auth,email,password);document.getElementById('aqCloudPassword').value='';say('Login successful.',true);}
  catch(e){say('Login failed: '+(e.code||e.message));}
};
window.aqFirebaseLogout=async()=>{try{await signOut(auth);say('Signed out.');}catch(e){say('Sign out failed: '+e.message);}};
window.aqFirebaseUpload=async()=>{
  if(!currentUser)return say('Pehle Firebase login karein.');
  if(typeof window.AQ_EXPORT_LOCAL_DATA!=='function')return say('Local data bridge unavailable. Page reload karein.');
  if(!confirm('Current browser ka complete business data Firebase cloud par upload karna hai? Existing cloud backup replace ho sakta hai.'))return;
  try{
    await window.AQ_LOCAL_SAVE_READY;
    const snapshot=window.AQ_EXPORT_LOCAL_DATA();
    const json=JSON.stringify(snapshot);
    const bytes=new TextEncoder().encode(json).length;
    if(bytes>850000)return say('Backup '+Math.ceil(bytes/1024)+' KB hai. Firestore single-document limit ke qareeb/bahar hai; upload roka gaya. Data local safe hai.');
    await setDoc(doc(dbCloud,'users',currentUser.uid,'agency','main'),{
      schemaVersion:1, ownerUid:currentUser.uid, data:snapshot,
      updatedAt:serverTimestamp(), clientUpdatedAt:new Date().toISOString()
    });
    say('Cloud backup successful. Size: '+Math.ceil(bytes/1024)+' KB',true);
  }catch(e){console.error(e);say('Cloud upload failed: '+(e.code||e.message));}
};
window.aqFirebaseRestore=async()=>{
  if(!currentUser)return say('Pehle Firebase login karein.');
  if(!confirm('Cloud backup ko is browser ke current data ki jagah restore karna hai? Pehle current local data ka downloadable safety backup banega.'))return;
  try{
    const ref=doc(dbCloud,'users',currentUser.uid,'agency','main');
    const snap=await getDoc(ref);
    if(!snap.exists())return say('Is Firebase account ka cloud backup abhi maujood nahi.');
    const payload=snap.data();
    if(!payload.data||typeof payload.data!=='object')return say('Cloud backup format valid nahi. Local data unchanged hai.');
    const local=window.AQ_EXPORT_LOCAL_DATA();
    const blob=new Blob([JSON.stringify(local,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='AL_QADIR_LOCAL_BEFORE_CLOUD_RESTORE_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
    await window.AQ_REPLACE_LOCAL_DATA(payload.data);
    say('Cloud backup restore ho gaya. Local safety backup download bhi start ho gaya.',true);
  }catch(e){console.error(e);say('Cloud restore failed: '+(e.code||e.message));}
};
