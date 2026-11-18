
const KEY='cc_agency_settlement_v1';
let nsEditingId=null;
const today=()=>document.getElementById('workDate').value||new Date().toISOString().slice(0,10);
const blank=()=>({shops:[],vehicles:[],bookers:[],banks:[],products:[],vehicleSettlements:[],loans:[],vehicleBooker:{},vehicleTx:[],stockTx:[],bookerTx:[],bookerLedger:[],credits:[],bankTx:[],expenses:[],closings:[],dailyInputs:{},agency:'COCA-COLA AGENCY',companyName:'',distributorName:'',brandLogo:'',tabIcons:{}});
let db=loadDB(), editVehicle=null,editBooker=null,editBookerLedger=null;
function loadDB(){try{return {...blank(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return blank()}}
let __dbStore=null,__saveQueue=Promise.resolve(),__storageReady=false;
function openAgencyStore(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new Error('IndexedDB unavailable'));const req=indexedDB.open('AlQadirAgencyDatabase',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('records'))req.result.createObjectStore('records')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Database open failed'))})}
function readAgencyStore(){return new Promise((resolve,reject)=>{const tx=__dbStore.transaction('records','readonly');const req=tx.objectStore('records').get('agency');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function writeAgencyStore(snapshot){return new Promise((resolve,reject)=>{const tx=__dbStore.transaction('records','readwrite');tx.objectStore('records').put(snapshot,'agency');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Database write failed'));tx.onabort=()=>reject(tx.error||new Error('Database write aborted'))})}

function mergeAgencyData(primary,secondary){
 const base={...blank(),...(primary||{})},other=secondary||{};
 Object.keys(blank()).forEach(k=>{
  if(Array.isArray(base[k])&&Array.isArray(other[k])){
   const merged=[...base[k],...other[k]],seen=new Set();
   base[k]=merged.filter((item)=>{const key=item&&typeof item==='object'?(item.id||JSON.stringify(item)):String(item);if(seen.has(key))return false;seen.add(key);return true});
  }else if(base[k]&&other[k]&&typeof base[k]==='object'&&typeof other[k]==='object'&&!Array.isArray(base[k]))base[k]={...other[k],...base[k]};
  else if((base[k]===undefined||base[k]===null)&&other[k]!==undefined)base[k]=other[k];
 });
 return base;
}
function persist(){
 if(typeof recalculateAllClosings==='function'&&document.getElementById('workDate')&&(db.closings||[]).length)recalculateAllClosings();
 __saveQueue=__saveQueue.catch(()=>{}).then(async()=>{
  if(!__storageReady)await __storageInit;
  const snapshot=JSON.parse(JSON.stringify(db));
  if(__dbStore){await writeAgencyStore(snapshot);try{localStorage.setItem(KEY,JSON.stringify(snapshot))}catch(storageErr){console.warn('Local backup mirror unavailable; IndexedDB save is primary.',storageErr)}}
  else localStorage.setItem(KEY,JSON.stringify(snapshot));
  renderAll();
  if(typeof nsRenderSaved==='function')nsRenderSaved();
  return true;
 });
 __saveQueue.catch(err=>{console.error('Agency save failed:',err);alert('Data save nahi hua: '+err.message+'\nBackup download karein; browser data clear na karein.')});
 return __saveQueue;
}
const __storageInit=(async()=>{
 try{
  __dbStore=await openAgencyStore();
  const saved=await readAgencyStore();
  let local=null;try{local=JSON.parse(localStorage.getItem(KEY)||'null')}catch(parseErr){console.warn('Local backup parse failed',parseErr)}
  if(saved&&typeof saved==='object')db=mergeAgencyData(saved,local);
  else if(local&&typeof local==='object')db=mergeAgencyData(local,db);
  if(saved||local)await writeAgencyStore(JSON.parse(JSON.stringify(db)));
  else await writeAgencyStore(JSON.parse(JSON.stringify(db)));
 }catch(err){
  console.warn('IndexedDB unavailable, using local storage',err);__dbStore=null;
  try{const local=JSON.parse(localStorage.getItem(KEY)||'null');if(local&&typeof local==='object')db=mergeAgencyData(db,local)}catch(_){}
 }finally{
  __storageReady=true;renderAll();restoreLastActivePage();loadClosing();renderVehicleLiveCalc();
  if(typeof nsDataLists==='function')nsDataLists();
  if(typeof nsRenderSaved==='function')nsRenderSaved();
 }
})();

function n(id){return Math.max(0,Number(document.getElementById(id).value)||0)}
function val(id){const el=document.getElementById(id);return String(el?.value??'').trim()}
function money(x){return 'Rs. '+(Number(x)||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function sum(a,k){return a.reduce((t,x)=>t+(Number(x[k])||0),0)}
function dayRows(arr){return arr.filter(x=>x.date===today())}
function previousClosingCash(){let d=today();let prev=(db.closings||[]).filter(x=>x.date<d&&Number.isFinite(Number(x.expected))).sort((a,b)=>b.date.localeCompare(a.date))[0];if(!prev)return null;let actual=prev.actual;if(actual!==null&&actual!==undefined&&actual!==''&&Number.isFinite(Number(actual)))return Number(actual)||0;return Number(prev.expected)||0;}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function optList(el,arr,placeholder){let e=document.getElementById(el);if(!e)return;let old=e.value;e.innerHTML=(placeholder?'<option value="">Select...</option>':'')+arr.map(x=>`<option>${esc(x)}</option>`).join('');if(arr.includes(old))e.value=old}
function setWorkingDateValue(d,source='header'){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')))return;const wd=document.getElementById('workDate');if(wd&&wd.value!==d)wd.value=d;try{localStorage.setItem('aq_working_date_v1',d)}catch(e){}const syncIds=source==='vehicle'?['bkDate','bkDateFilter','bkReportFrom','bkReportTo','reportFrom','reportTo','nsReportFrom','nsReportTo']:['bkDate','bkDateFilter','bkReportFrom','bkReportTo','reportFrom','reportTo','nsDate','nsReportFrom','nsReportTo'];syncIds.forEach(id=>{const el=document.getElementById(id);if(el&&el.value!==d)el.value=d});loadClosing();renderAll();nsRenderSaved();const keep=document.getElementById('workDate');if(keep)keep.value=d;}
function setupDate(){const wd=document.getElementById('workDate'),actualToday=new Date().toISOString().slice(0,10);let remembered='';try{remembered=localStorage.getItem('aq_working_date_v1')||''}catch(e){}const initial=/^\d{4}-\d{2}-\d{2}$/.test(remembered)?remembered:actualToday;if(wd)wd.value=initial;['bkDate','bkDateFilter','bkReportFrom','bkReportTo','reportFrom','reportTo','nsDate','nsReportFrom','nsReportTo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=initial});if(wd){wd.disabled=false;wd.readOnly=false;wd.addEventListener('change',()=>setWorkingDateValue(wd.value,'header'));wd.addEventListener('input',()=>{if(wd.value)setWorkingDateValue(wd.value,'header')})}const nd=document.getElementById('nsDate');if(nd){nd.addEventListener('change',()=>{if(nd.value)setWorkingDateValue(nd.value,'vehicle')});}}
document.querySelectorAll('[data-page=\"loans\"]').forEach(b=>b.addEventListener('click',()=>{let e=document.getElementById('loanDate');if(e&&!e.value)e.value=today();['loanReportDate'].forEach(k=>{let q=document.getElementById(k);if(q&&!q.value)q.value=today()})}));
document.querySelectorAll('.menu-toggle').forEach(t=>t.addEventListener('click',()=>{const g=t.closest('.menu-group');const opening=!g.classList.contains('open');document.querySelectorAll('.menu-group').forEach(x=>{x.classList.remove('open');x.querySelector('.menu-toggle')?.setAttribute('aria-expanded','false')});if(opening){g.classList.add('open');t.setAttribute('aria-expanded','true')}}));
function activateNavigationPage(b){
 const apply=()=>{
  document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const page=document.getElementById(b.dataset.page);
  if(page)page.classList.add('active');
  if(b.dataset.reportType){const rt=document.getElementById('reportType');if(rt){rt.value=b.dataset.reportType;buildReport();}}
  renderAll();
  window.scrollTo({top:0,behavior:'smooth'});
  if(innerWidth<=950)b.closest('.menu-group')?.classList.remove('open');
 };
 try{localStorage.setItem('cc_active_page_v1',JSON.stringify({page:b.dataset.page||'dashboard',reportType:b.dataset.reportType||''}))}catch(_){}
 if(document.startViewTransition){try{document.startViewTransition(apply)}catch(_){apply()}}else{apply()}
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>activateNavigationPage(b)));
/* Soft water-drop ripple for interactive controls */
document.addEventListener('pointerdown',e=>{
 const target=e.target.closest('button,.btn,[role="button"],.menu-toggle,.nav');
 if(!target||target.disabled)return;
 const r=target.getBoundingClientRect(),d=Math.max(r.width,r.height)*1.15;
 const wave=document.createElement('span');wave.className='water-ripple';
 wave.style.width=wave.style.height=d+'px';
 wave.style.left=(e.clientX-r.left-d/2)+'px';wave.style.top=(e.clientY-r.top-d/2)+'px';
 target.appendChild(wave);setTimeout(()=>wave.remove(),760);
},true);
function toggleProfileMenu(){const menu=document.getElementById('profileMenu'),btn=document.getElementById('profileTrigger');if(!menu||!btn)return;const open=!menu.classList.contains('show');menu.classList.toggle('show',open);btn.setAttribute('aria-expanded',String(open));}
document.addEventListener('click',e=>{if(!e.target.closest('.profile-wrap')){document.getElementById('profileMenu')?.classList.remove('show');document.getElementById('profileTrigger')?.setAttribute('aria-expanded','false')}});
const AQ_PROFILE_KEY='aq_logged_in_profile_v1';
function getAQProfile(){try{return JSON.parse(localStorage.getItem(AQ_PROFILE_KEY)||'{}')}catch(_){return {}}}
function applyAQProfile(){const p=getAQProfile();const name=(p.name||'Your Name').trim();const designation=(p.designation||'Your Designation').trim();const n=document.getElementById('aqPlateName'),d=document.getElementById('aqPlateDesignation');if(n)n.textContent=name;if(d)d.textContent=designation;const trigger=document.getElementById('profileTrigger');if(trigger)trigger.setAttribute('aria-label','User profile: '+name+' — '+designation)}
function openProfileDetails(){document.getElementById('profileMenu')?.classList.remove('show');const p=getAQProfile();document.getElementById('aqProfileName').value=p.name||'';document.getElementById('aqProfileDesignation').value=p.designation||'';document.getElementById('profileWorkingDate').textContent=document.getElementById('workDate')?.value||'—';document.getElementById('profileModal').classList.add('show')}
function saveAQProfile(){const name=(document.getElementById('aqProfileName')?.value||'').trim();const designation=(document.getElementById('aqProfileDesignation')?.value||'').trim();if(!name||!designation){alert('Display Name aur Designation dono enter karein.');return}try{localStorage.setItem(AQ_PROFILE_KEY,JSON.stringify({name,designation}));applyAQProfile();closeProfileDetails();alert('Profile save ho gaya. Dashboard name plate update ho gayi.')}catch(e){alert('Profile save nahi hua: '+e.message)}}

function closeProfileDetails(){document.getElementById('profileModal')?.classList.remove('show')}
function handleSignOut(){document.getElementById('profileMenu')?.classList.remove('show');alert('Is local browser build mein user authentication/login configured nahi hai. Is liye secure sign-out tabhi enable hoga jab login accounts add kiye jayen. Aapka data safe hai.')}
const THEME_PACK_KEY='aq_theme_pack_v1';
function applyThemePack(t){if(!t)return;const root=document.documentElement;root.style.setProperty('--red',t.primary||'#b51f35');root.style.setProperty('--aq-border',t.border||'#ead6d3');root.style.setProperty('--aq-surface',t.surface||'#fff');document.body.style.fontFamily=t.font||'Inter,Segoe UI,Arial,sans-serif';document.body.style.fontSize=t.fontSize||'14px';document.querySelectorAll('.panel,.menu-group,.nav,.menu-toggle,.btn').forEach(el=>{el.style.borderStyle=t.borderStyle||'solid';el.style.borderColor=t.border||'#ead6d3';el.style.borderRadius=t.radius||'16px'});document.querySelectorAll('.nav span,.menu-toggle span').forEach(el=>{el.classList.toggle('aq-icon-badge',t.iconStyle==='rounded');el.classList.toggle('aq-icon-minimal',t.iconStyle==='minimal')});}
function readThemeControls(){return {font:document.getElementById('themeFont')?.value,fontSize:document.getElementById('themeFontSize')?.value,primary:document.getElementById('themePrimary')?.value,surface:document.getElementById('themeSurface')?.value,border:document.getElementById('themeBorder')?.value,borderStyle:document.getElementById('themeBorderStyle')?.value,radius:document.getElementById('themeRadius')?.value,iconStyle:document.getElementById('themeIconStyle')?.value}}
function saveThemePack(){const t=readThemeControls();try{localStorage.setItem(THEME_PACK_KEY,JSON.stringify(t));applyThemePack(t);const st=document.getElementById('themePackStatus');if(st)st.textContent='Theme successfully applied and saved on this browser.'}catch(e){alert('Theme save nahi ho saki: '+e.message)}}
function resetThemePack(){localStorage.removeItem(THEME_PACK_KEY);const defaults={font:'Inter,Segoe UI,Arial,sans-serif',fontSize:'14px',primary:'#b51f35',surface:'#ffffff',border:'#ead6d3',borderStyle:'solid',radius:'16px',iconStyle:'normal'};Object.entries({themeFont:'font',themeFontSize:'fontSize',themePrimary:'primary',themeSurface:'surface',themeBorder:'border',themeBorderStyle:'borderStyle',themeRadius:'radius',themeIconStyle:'iconStyle'}).forEach(([id,k])=>{const el=document.getElementById(id);if(el)el.value=defaults[k]});applyThemePack(defaults);const st=document.getElementById('themePackStatus');if(st)st.textContent='Default theme restored.'}
function initThemePack(){try{const t=JSON.parse(localStorage.getItem(THEME_PACK_KEY)||'null');if(t){const ids={themeFont:'font',themeFontSize:'fontSize',themePrimary:'primary',themeSurface:'surface',themeBorder:'border',themeBorderStyle:'borderStyle',themeRadius:'radius',themeIconStyle:'iconStyle'};Object.entries(ids).forEach(([id,k])=>{const el=document.getElementById(id);if(el&&t[k])el.value=t[k]});applyThemePack(t)}}catch(e){console.warn('Theme pack load skipped',e)}}
function restoreLastActivePage(){try{const saved=JSON.parse(localStorage.getItem('cc_active_page_v1')||'null');if(!saved||!saved.page)return;const page=document.getElementById(saved.page);const button=document.querySelector('.nav[data-page="'+CSS.escape(saved.page)+'"]'+(saved.reportType? '[data-report-type="'+CSS.escape(saved.reportType)+'"]':''));if(!page||!button)return;document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));button.classList.add('active');page.classList.add('active');if(saved.reportType&&document.getElementById('reportType'))document.getElementById('reportType').value='all';}catch(err){console.warn('Could not restore last page',err)}}
function ensureMasterLists(){['bookers','vehicles','products','banks'].forEach(k=>{if(!Array.isArray(db[k]))db[k]=[];db[k]=db[k].map(x=>String(x??'').trim()).filter(Boolean)})}
function refreshMasterUI(){ensureMasterLists();[['vehicles','vehicleNames'],['bookers','bookerNames'],['banks','bankNames'],['products','productNames']].forEach(([type,hostId])=>{let host=document.getElementById(hostId);if(host)host.innerHTML=namesHTML(type)});[['masterShopBooker',db.bookers],['vBooker',db.bookers],['bName',db.bookers],['bkBooker',db.bookers],['nsBooker',db.bookers],['vName',db.vehicles],['sVehicle',db.vehicles],['nsDriver',db.vehicles],['sItem',db.products],['nsItem',db.products],['bankAccount',db.banks]].forEach(([idv,arr])=>{let el=document.getElementById(idv);if(el){let old=el.value;el.innerHTML='<option value="">Select...</option>'+arr.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(arr.includes(old))el.value=old}});document.querySelectorAll('#nsProducts .ns-prod').forEach(el=>{const old=el.value;el.innerHTML='<option value="">Select product...</option>'+(db.products||[]).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if((db.products||[]).includes(old))el.value=old});if(typeof nsDataLists==='function')nsDataLists()}
function addName(type,input){ensureMasterLists();if(!['bookers','vehicles','products','banks'].includes(type))return alert('Invalid master list.');let field=document.getElementById(input),v=(field?.value||'').trim();if(!v)return alert('Please enter a name.');if(db[type].some(x=>x.toLowerCase()===v.toLowerCase()))return alert('This name already exists.');db[type].push(v);if(field)field.value='';refreshMasterUI();persist()}
function renameName(type,old){ensureMasterLists();let v=prompt('Enter new name:',old);if(!v||!v.trim()||v.trim()===old)return;v=v.trim();if(db[type].some(x=>x.toLowerCase()===v.toLowerCase()))return alert('Name already exists.');db[type]=db[type].map(x=>x===old?v:x);refreshMasterUI();persist()}
function deleteName(type,name){if(!confirm('Remove this name from the selectable list? Existing saved transactions will remain unchanged.'))return;ensureMasterLists();db[type]=db[type].filter(x=>x!==name);refreshMasterUI();persist()}
function namesHTML(type){ensureMasterLists();return db[type].map(x=>`<div class="split" style="padding:9px 0;border-bottom:1px solid #edf0f4"><b>${esc(x)}</b><span><button class="btn small secondary" onclick="renameName('${type}','${esc(x).replace(/'/g,"\\'")}')">Rename</button> <button class="btn small danger" onclick="deleteName('${type}','${esc(x).replace(/'/g,"\\'")}')">Remove</button></span></div>`).join('')||'<p class="muted">No names added yet.</p>'}
function normalizeShopName(v){return String(v||'').trim().replace(/\s+/g,' ')}
function shopMasterFind(name){let q=normalizeShopName(name).toLowerCase();return (db.shops||[]).find(x=>x.name.toLowerCase()===q)}
function upsertMasterShop(name,booker){name=normalizeShopName(name);if(!name)return false;db.shops=db.shops||[];let old=shopMasterFind(name);if(old){if(booker)old.booker=booker;return true}db.shops.push({id:id(),name,booker:booker||''});return true}
function addMasterShop(){let name=normalizeShopName(val('masterShopName')),booker=val('masterShopBooker');if(!name)return alert('Shop name enter karein.');if(shopMasterFind(name))return alert('Ye shop pehle se mojood hai.');upsertMasterShop(name,booker);document.getElementById('masterShopName').value='';persist()}
function renderShopMaster(){let rows=db.shops||[],q=(document.getElementById('shopMasterSearch')?.value||'').toLowerCase();let shown=rows.filter(x=>(x.name+' '+x.booker).toLowerCase().includes(q));let host=document.getElementById('shopMasterRows');if(!host)return;host.innerHTML=shown.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.booker||'Unassigned')}</td><td><button class="btn small secondary" onclick="editMasterShop('${x.id}')">Edit</button> <button class="btn small danger" onclick="deleteMasterShop('${x.id}')">Remove</button></td></tr>`).join('')||'<tr><td colspan="3" class="empty">No shops added. Upload CSV or add manually.</td></tr>';document.getElementById('shopMasterCount').textContent=rows.length+' Shops';document.getElementById('shopMasterOptions').innerHTML=rows.map(x=>`<option value="${esc(x.name)}"></option>`).join('')}
function editMasterShop(key){let x=(db.shops||[]).find(z=>z.id===key);if(!x)return;let name=prompt('Shop name:',x.name);if(name===null)return;name=normalizeShopName(name);if(!name)return;let booker=prompt('Booker name (must match Booker list):',x.booker||'');if(booker===null)return;booker=booker.trim();if(booker&&!db.bookers.includes(booker))return alert('Pehle Names & Settings mein ye Booker add karein.');if(db.shops.some(z=>z.id!==key&&z.name.toLowerCase()===name.toLowerCase()))return alert('Shop already exists.');x.name=name;x.booker=booker;persist()}
function deleteMasterShop(key){if(!confirm('Shop Master se ye shop remove karni hai? Purani transactions delete nahi hongi.'))return;db.shops=(db.shops||[]).filter(x=>x.id!==key);persist()}
function applyShopBooker(input,target){let sh=shopMasterFind(input.value);if(!sh||!sh.booker)return;let el=typeof target==='string'?document.getElementById(target):target;if(el)el.value=sh.booker}
function parseCSVLine(line,delimiter=','){let out=[],cur='',quoted=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++}else if(c==='"')quoted=!quoted;else if(c===delimiter&&!quoted){out.push(cur.trim());cur=''}else cur+=c}out.push(cur.trim());return out}
async function importShopMaster(e){
 const input=e.target, file=input.files&&input.files[0]; if(!file)return;
 const finish=()=>{input.value=''};
 const parseLine=(line,sep)=>{let a=[],v='',q=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'&&q&&line[i+1]==='"'){v+='"';i++}else if(c==='"')q=!q;else if(c===sep&&!q){a.push(v.trim());v=''}else v+=c}a.push(v.trim());return a};
 const addRows=async(rows)=>{
  if(!Array.isArray(rows)||!rows.length)throw Error('File mein rows nahi milin');
  const clean=x=>String(x??'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[\s_-]+/g,' ');
  let head=(rows[0]||[]).map(clean);
  let si=head.findIndex(x=>['shop','shop name','shopname','customer','customer name','outlet','outlet name','party','party name','name'].includes(x));
  let bi=head.findIndex(x=>['booker','booker name','order booker','salesman','salesman name'].includes(x));
  let header=si>=0||bi>=0;
  if(!header){si=0;bi=(rows[0]||[]).length>1?1:-1}else if(si<0)si=0;
  db.shops=db.shops||[];db.bookers=db.bookers||[];
  let added=0,updated=0,skipped=0;
  for(let i=header?1:0;i<rows.length;i++){
   const row=rows[i]||[],shop=normalizeShopName(row[si]??''),booker=bi>=0?String(row[bi]??'').trim():'';
   if(!shop||/^(shop name|shop|customer name)$/i.test(shop)){skipped++;continue}
   if(booker&&!db.bookers.includes(booker))db.bookers.push(booker);
   const exists=!!shopMasterFind(shop);upsertMasterShop(shop,booker);if(exists)updated++;else added++;
  }
  if(!added&&!updated)throw Error('Koi valid Shop Name nahi mila. Pehle column mein Shop Name hona chahiye.');
  await persist();
  alert('Upload successful!\\nNew shops: '+added+'\\nUpdated shops: '+updated+'\\nSkipped rows: '+skipped+'\\nTotal shops: '+db.shops.length);
 };
 try{
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(['xlsx','xls'].includes(ext)){
   if(typeof XLSX==='undefined'){const ready=await (window.__xlsxLoadPromise||Promise.resolve(false));if(!ready||typeof XLSX==='undefined')throw Error('Excel reader load nahi hua. Internet on karke refresh karein.')}
   const buffer=await file.arrayBuffer(),wb=XLSX.read(buffer,{type:'array'}),sheet=wb.Sheets[wb.SheetNames[0]];
   await addRows(XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false}));
  }else{
   const raw=(await file.text()).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
   const lines=raw.split('\n').filter(x=>x.trim());if(!lines.length)throw Error('CSV file empty hai.');
   const sample=lines.slice(0,5).join('\n'),seps=[',',';','\t','|'];
   const sep=seps.sort((a,b)=>parseLine(sample,b).length-parseLine(sample,a).length)[0];
   await addRows(lines.map(line=>parseLine(line,sep)));
  }
 }catch(err){console.error('Shop import error:',err);alert('Upload mein masla: '+(err&&err.message?err.message:'Unknown error'))}
 finally{finish()}
}
function downloadShopTemplate(){downloadText('shop,booker\nShop One,Booker One\nShop Two,Booker Two','Shop_Master_Template.csv','text/csv')}
function exportShopMaster(){let rows=['shop,booker',...(db.shops||[]).map(x=>'"'+x.name.replace(/"/g,'""')+'","'+(x.booker||'').replace(/"/g,'""')+'"')];downloadText(rows.join('\n'),'Shop_Master.csv','text/csv')}
function downloadText(text,name,type){let blob=new Blob([text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href)}
let __defaultFaviconHref='';function applySavedFavicon(){const src=db.faviconData||'';const original=document.getElementById('appFavicon');if(!__defaultFaviconHref)__defaultFaviconHref=(original&&original.getAttribute('data-default-href'))||(original&&original.getAttribute('href'))||'www/assets/aq-favicon.png';document.querySelectorAll('link[rel~=icon],link[rel="shortcut icon"]').forEach(x=>x.remove());const link=document.createElement('link');link.id='appFavicon';link.rel='icon';const mime=(src.match(/^data:([^;,]+)/)||[])[1]||'image/png';link.type=mime;link.href=src||__defaultFaviconHref;link.setAttribute('data-managed-favicon','1');document.head.appendChild(link);const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type=mime;shortcut.href=link.href;document.head.appendChild(shortcut);const preview=document.getElementById('faviconPreview');if(preview)preview.src=src||__defaultFaviconHref}async function saveFavicon(input){const file=input&&input.files&&input.files[0];if(!file)return;if(file.size>512*1024){alert('Favicon file 512 KB se chhoti honi chahiye.');input.value='';return;}if(!/^image\/(png|jpeg|x-icon|vnd.microsoft.icon)$/.test(file.type)&&!file.name.toLowerCase().endsWith('.ico')){alert('Sirf PNG, JPG ya ICO file upload karein.');input.value='';return;}const reader=new FileReader();reader.onload=async()=>{try{db.faviconData=String(reader.result||'');await persist();applySavedFavicon();alert('Chrome tab favicon save ho gaya. Agar purana icon nazar aaye to Ctrl+Shift+R karein.');}catch(err){alert('Favicon save nahi hua: '+(err&&err.message?err.message:'Unknown error'));}};reader.onerror=()=>alert('Favicon file read nahi ho saki.');reader.readAsDataURL(file)}async function resetFavicon(){if(!confirm('Default AL QADIR favicon restore karna hai?'))return;delete db.faviconData;try{await persist();applySavedFavicon();alert('Default favicon restore ho gaya.');}catch(err){alert('Default icon restore nahi hua: '+err.message)}}
function saveAgency(){db.agency=val('agencyName')||'COCA-COLA AGENCY';db.companyName=val('companyName');db.distributorName=val('distributorName');persist();alert('Business information saved.') }
function loadBrandLogo(e){const f=e.target.files&&e.target.files[0];if(!f)return;if(!f.type.startsWith('image/'))return alert('Please select an image file.');const rd=new FileReader();rd.onload=()=>{db.brandLogo=String(rd.result||'');persist()};rd.readAsDataURL(f)}
function removeBrandLogo(){db.brandLogo='';persist() }
function renderBranding(){const logo=document.getElementById('headerLogo');if(logo)logo.innerHTML=db.brandLogo?`<img src="${db.brandLogo}" alt="Company logo" style="width:100%;height:100%;object-fit:contain;border-radius:10px">`:'AQ';const h=document.getElementById('headerCompany'),d=document.getElementById('headerDistributor');if(h)h.textContent=db.companyName||db.agency||'COCA-COLA AGENCY';if(d)d.textContent=db.distributorName||'Daily Distribution • Settlement • Cash Control';const c=document.getElementById('companyName'),dn=document.getElementById('distributorName'),a=document.getElementById('agencyName'),pr=document.getElementById('brandLogoPreview');if(c)c.value=db.companyName||'';if(dn)dn.value=db.distributorName||'';if(a)a.value=db.agency||'COCA-COLA AGENCY';if(pr)pr.innerHTML=db.brandLogo?`<img src="${db.brandLogo}" alt="Logo preview" style="max-width:130px;max-height:70px;object-fit:contain">`:'No logo uploaded'}
function clearVehicleForm(){['vSales','vRecovery','vCredit','vDiscount','vExpense','vBank','vCash','vShort','vNotes'].forEach(x=>document.getElementById(x).value='');['vRecovery','vCredit','vDiscount','vExpense','vBank','vCash','vShort'].forEach(x=>document.getElementById(x).value='');editVehicle=null}
function clearStockForm(){['sItem','sLoaded','sReturn','sUnit','sNotes'].forEach(x=>document.getElementById(x).value='');document.getElementById('sReturn').value=''}
function saveStock(){let vehicle=val('sVehicle')||val('vName'),item=val('sItem'),loaded=n('sLoaded'),ret=n('sReturn');if(!vehicle)return alert('Vehicle / Driver selection is mandatory.');if(!item)return alert('Product / stock item name is mandatory.');if(loaded<=0)return alert('Enter loaded stock quantity.');if(ret>loaded)return alert('Returned quantity cannot be greater than loaded quantity.');db.stockTx.push({id:id(),date:today(),vehicle,item,loaded,returned:ret,unit:val('sUnit'),notes:val('sNotes')});clearStockForm();renderStock();persist()}
function stockForDay(){return dayRows(db.stockTx)}
function stockSummary(){let map={};stockForDay().forEach(x=>{let k=x.item.toLowerCase()+'|'+(x.unit||'');if(!map[k])map[k]={item:x.item,unit:x.unit,loaded:0,returned:0};map[k].loaded+=Number(x.loaded)||0;map[k].returned+=Number(x.returned)||0});return Object.values(map).map(x=>({...x,net:x.loaded-x.returned}))}
function copyStockReport(){let rows=stockSummary();if(!rows.length)return alert('No stock entries found for this date.');let txt='PRODUCT\tTOTAL LOADED\tTOTAL RETURNED\tNET STOCK\tUNIT\n'+rows.map(x=>[x.item,x.loaded,x.returned,x.net,x.unit].join('\t')).join('\n')+'\n\nGRAND NET STOCK\t'+rows.reduce((a,x)=>a+x.net,0);if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>alert('Combined net stock copied. Paste it into your Stock Report System.')).catch(()=>fallbackCopy(txt))}else fallbackCopy(txt)}
function fallbackCopy(txt){let t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand('copy');alert('Combined net stock copied.')}catch(e){alert('Copy failed. Please select and copy manually.')}t.remove()}
function renderStock(){let a=stockForDay();document.getElementById('stockRows').innerHTML=a.map(x=>`<tr><td>${esc(x.vehicle)}</td><td>${esc(x.item)}</td><td class="num">${x.loaded}</td><td class="num">${x.returned}</td><td class="num"><b>${x.loaded-x.returned}</b></td><td>${esc(x.unit)}</td><td><button class="btn small danger" onclick="del('stockTx','${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No stock entries for selected date.</td></tr>';let rows=stockSummary();document.getElementById('stockSummaryRows').innerHTML=productBoxStrip(rows);document.getElementById('stockLoadedTotal').textContent=a.reduce((t,x)=>t+x.loaded,0);document.getElementById('stockReturnTotal').textContent=a.reduce((t,x)=>t+x.returned,0);document.getElementById('stockNetTotal').textContent=a.reduce((t,x)=>t+x.loaded-x.returned,0)}
function markMoneyFormulaField(el){if(!el||el.dataset.moneyFormula==='1')return;let label=el.closest('.field')?.querySelector('label')?.textContent||'',idv=el.id||'',cls=el.className||'';let moneyField=/amount|cash|sale|sales|credit|recovery|expense|bank|discount|balance|payment|collection|investment|tax|price|cost|pkr|rs\\.?/i.test(label+' '+idv+' '+cls);if(!moneyField)return;el.dataset.moneyFormula='1';el.setAttribute('inputmode','decimal');if(el.type==='number')el.type='text';el.setAttribute('autocomplete','off')}
function evaluateMoneyFormula(el){if(!el||el.dataset.moneyFormula!=='1')return;let v=el.value.trim();if(!v||!/[+*/()-]/.test(v))return;try{if(!/^[0-9.()+*/\\s-]+$/.test(v))return;let result=Function('"use strict";return ('+v+')')();if(Number.isFinite(result)){el.value=String(Math.round((result+Number.EPSILON)*1000000)/1000000);el.dispatchEvent(new Event('input',{bubbles:true}))}}catch(e){el.setCustomValidity('Formula check karein');el.reportValidity();setTimeout(()=>el.setCustomValidity(''),1800)}}
function setupMathInputs(){document.querySelectorAll('.field input').forEach(markMoneyFormulaField);document.addEventListener('focusin',e=>{if(e.target.matches('.field input'))markMoneyFormulaField(e.target)});document.addEventListener('change',e=>{if(e.target.matches('.field input'))evaluateMoneyFormula(e.target)},true);document.addEventListener('keydown',e=>{if(e.target.matches('.field input')&&e.target.dataset.moneyFormula==='1'&&e.key==='Enter'){evaluateMoneyFormula(e.target);e.target.blur()}})}
function filterSettlementVehicles(){
 const booker=val('vBooker'),sel=document.getElementById('vName');
 const linked=db.vehicles.filter(v=>!booker||linkedBooker(v)===booker);
 const opts=linked.length?linked:(!booker?db.vehicles:[]);
 const prior=sel.value;sel.innerHTML='<option value="">Select Driver / Vehicle</option>'+opts.map(v=>`<option>${esc(v)}</option>`).join('');
 if(opts.includes(prior))sel.value=prior;
 const stockSel=document.getElementById('sVehicle');if(stockSel){stockSel.innerHTML=sel.innerHTML;stockSel.value=sel.value||'';}
 renderVehicleShopLedger();renderVehicleProductSummary();
}
function productBoxStrip(rows,mode='net'){if(!rows.length)return '<p class="sub">No product stock entries for selected date.</p>';return '<div class="product-box-strip">'+rows.map(x=>{let qty=mode==='net'?x.net:mode==='loaded'?x.loaded:x.returned;return '<div class="product-stock-box"><div class="product-stock-name">'+esc(x.item)+'</div><div class="product-stock-qty">'+qty+'</div><div class="product-stock-unit">'+esc(x.unit||'')+'</div></div>'}).join('')+'</div>'}
function renderVehicleProductSummary(){const host=document.getElementById('vehicleProductSummary');if(!host)return;const vehicle=val('vName');let map={};stockForDay().filter(x=>!vehicle||x.vehicle===vehicle).forEach(x=>{let k=x.item.toLowerCase()+'|'+(x.unit||'');if(!map[k])map[k]={item:x.item,unit:x.unit,loaded:0,returned:0,net:0};map[k].loaded+=Number(x.loaded)||0;map[k].returned+=Number(x.returned)||0;map[k].net+=(Number(x.loaded)||0)-(Number(x.returned)||0)});let rows=Object.values(map);host.innerHTML=rows.length?productBoxStrip(rows):'<p class="sub">Selected driver ke liye abhi product entry nahi hai.</p>';}
function renderVehicleShopLedger(){
 const host=document.getElementById('vehicleShopLedger');if(!host)return;
 const booker=val('vBooker'),vehicle=val('vName');
 const rows=dayRows(db.credits).filter(x=>(!booker||x.party===booker||x.party===vehicle)&&(!vehicle||!x.vehicle||x.vehicle===vehicle));
 const recovery=rows.filter(x=>x.type==='recovery').reduce((a,x)=>a+(Number(x.amount)||0),0);
 const credit=rows.filter(x=>x.type==='new').reduce((a,x)=>a+(Number(x.amount)||0),0);
 const opening=rows.filter(x=>x.type==='opening').reduce((a,x)=>a+(Number(x.amount)||0),0);
 const summary=document.getElementById('vehicleCreditSummary');if(summary)summary.innerHTML=`<div class="cash-summary-card"><div class="cash-summary-label">Market Credit / Aaj ka Udhaar</div><div class="cash-summary-value">${money(credit)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Market Recovery / Wasooli</div><div class="cash-summary-value">${money(recovery)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Opening / Adjustment</div><div class="cash-summary-value">${money(opening)}</div></div><div class="cash-summary-card cash-summary-final"><div class="cash-summary-label">Net Market Credit</div><div class="cash-summary-value">${money(credit+opening-recovery)}</div></div>`;
 if(document.getElementById('vRecovery'))document.getElementById('vRecovery').value=recovery.toFixed(2);
 if(document.getElementById('vCredit'))document.getElementById('vCredit').value=credit.toFixed(2);
 host.innerHTML=rows.length?`<table><thead><tr><th>Shop Name</th><th>Transaction</th><th>Reference</th><th class="num">Amount (PKR)</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.shop)}</td><td>${x.type==='new'?'MARKET CREDIT':x.type==='recovery'?'RECOVERY':'OPENING BALANCE'}</td><td>${esc(x.notes||'—')}</td><td class="num">${money(x.amount)}</td></tr>`).join('')}</tbody></table>`:'<p class="sub">Selected Booker / Driver ke liye is date par Market Credit ya Recovery record nahi mila.</p>';
 renderVehicleRecovery();renderVehicleLiveCalc();
}
function renderVehicleRecovery(){const host=document.getElementById('vehicleRecoveryRows');if(!host)return;const b=val('vBooker'),v=val('vName');const rows=dayRows(db.credits).filter(x=>x.type==='recovery'&&(!b||x.party===b||x.party===v)&&(!v||!x.vehicle||x.vehicle===v));host.innerHTML=rows.map(x=>`<tr><td>${esc(x.shop)}</td><td>${esc(x.party)}</td><td>${esc(x.notes||'—')}</td><td class="num">${money(x.amount)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No recovery references for selected driver.</td></tr>';}
function addSettlementLine(type,data={}){const host=document.getElementById(type==='expense'?'settlementExpenses':type==='bank'?'settlementBanks':'settlementAdjustments');if(!host)return;const row=document.createElement('div');row.className='form-grid settlement-line';row.style.cssText='padding:9px 0;border-bottom:1px solid #edf0f4;align-items:end';if(type==='expense')row.innerHTML=`<div class="field"><label>Expense Name</label><input class="line-name" placeholder="Fuel / Food / Loading / Other" value="${esc(data.name||'')}"></div><div class="field"><label>Amount (PKR)</label><input class="line-amount" type="number" min="0" step=".01" placeholder="0" value="${Number(data.amount)||''}"></div><div class="field"><label>Reference / Detail</label><input class="line-ref" placeholder="Optional" value="${esc(data.ref||'')}"></div>`;else if(type==='bank')row.innerHTML=`<div class="field"><label>Bank / Account</label><input class="line-name" placeholder="Bank name / account" value="${esc(data.name||'')}"></div><div class="field"><label>Deposit Amount (PKR)</label><input class="line-amount" type="number" min="0" step=".01" placeholder="0" value="${Number(data.amount)||''}"></div><div class="field"><label>Slip / Reference</label><input class="line-ref" placeholder="Deposit slip no." value="${esc(data.ref||'')}"></div>`;else row.innerHTML=`<div class="field"><label>Adjustment Type</label><select class="line-type"><option ${data.type==='Credit'?'selected':''}>Credit</option><option ${data.type==='Recovery'?'selected':''}>Recovery</option><option ${data.type==='Staff'?'selected':''}>Staff</option><option ${data.type==='Company'?'selected':''}>Company</option><option ${data.type==='Other'?'selected':''}>Other</option></select></div><div class="field"><label>Effect on Cash</label><select class="line-direction"><option value="add" ${data.direction==='add'?'selected':''}>Add to cash</option><option value="deduct" ${data.direction!=='add'?'selected':''}>Deduct from cash</option></select></div><div class="field"><label>Amount (PKR)</label><input class="line-amount" type="number" min="0" step=".01" placeholder="0" value="${Number(data.amount)||''}"></div><div class="field"><label>Reason / Reference</label><input class="line-ref" placeholder="Required detail" value="${esc(data.ref||'')}"></div>`;const del=document.createElement('button');del.className='btn small danger';del.type='button';del.textContent='Remove';del.onclick=()=>{row.remove();renderVehicleLiveCalc()};row.appendChild(del);host.appendChild(row);row.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',renderVehicleLiveCalc));renderVehicleLiveCalc();}
function readSettlementLines(type){const host=document.getElementById(type==='expense'?'settlementExpenses':type==='bank'?'settlementBanks':'settlementAdjustments');return [...host.querySelectorAll('.settlement-line')].map(r=>({name:r.querySelector('.line-name')?.value||r.querySelector('.line-type')?.value||'',type:r.querySelector('.line-type')?.value||'',direction:r.querySelector('.line-direction')?.value||'',amount:Number(r.querySelector('.line-amount')?.value)||0,ref:r.querySelector('.line-ref')?.value||''})).filter(x=>x.amount||x.name||x.ref);}
function renderVehicleLiveCalc(){const host=document.getElementById('vehicleLiveCalc');if(!host)return;const expenses=readSettlementLines('expense').reduce((a,x)=>a+x.amount,0),banks=readSettlementLines('bank').reduce((a,x)=>a+x.amount,0),adjust=readSettlementLines('adjust');const adj=adjust.reduce((a,x)=>a+(x.direction==='add'?x.amount:-x.amount),0);const sales=n('vSales'),recovery=n('vRecovery'),credit=n('vCredit'),discount=n('vDiscount'),short=n('vShort'),cash=n('vCash');const expected=sales+recovery-credit-expenses-banks-discount-short;const diff=expected-cash;const final=diff-adj;host.innerHTML=`<div class="cash-summary-card"><div class="cash-summary-label">Total Sale + Recovery − Credit</div><div class="cash-summary-value">${money(sales+recovery-credit)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Expenses + Bank + Discount + Shortage</div><div class="cash-summary-value">${money(expenses+banks+discount+short)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Expected Cash Counter</div><div class="cash-summary-value">${money(expected)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Actual Cash Counter PKR</div><div class="cash-summary-value">${money(cash)}</div></div><div class="cash-summary-card"><div class="cash-summary-label">Difference Before Adjustment</div><div class="cash-summary-value">${money(diff)}</div></div><div class="cash-summary-card cash-summary-final"><div class="cash-summary-label">${Math.abs(final)<0.005?'MATCH':'FINAL DIFFERENCE'}</div><div class="cash-summary-value">${money(final)}</div></div>`;}
function clearVehicleForm(){['vSales','vDiscount','vShort','vCash','vNotes'].forEach(x=>document.getElementById(x).value='');['settlementExpenses','settlementBanks','settlementAdjustments'].forEach(x=>document.getElementById(x).innerHTML='');addSettlementLine('expense');addSettlementLine('bank');editVehicle=null;renderVehicleLiveCalc()}
function saveVehicle(){let name=val('vName'),booker=val('vBooker');if(!booker)return alert('Please select Booker first.');if(!name)return alert('Vehicle / Driver selection is required.');if(!db.stockTx.some(x=>x.date===today()&&x.vehicle===name))return alert('Product entry for this vehicle is required before saving settlement.');let expenses=readSettlementLines('expense'),banks=readSettlementLines('bank'),adjustments=readSettlementLines('adjust');let row={id:editVehicle||id(),date:today(),name,booker,sales:n('vSales'),recovery:n('vRecovery'),credit:n('vCredit'),discount:n('vDiscount'),expense:expenses.reduce((a,x)=>a+x.amount,0),expenses,bank:banks.reduce((a,x)=>a+x.amount,0),banks,cash:n('vCash'),short:n('vShort'),adjustments,notes:val('vNotes')};let i=db.vehicleTx.findIndex(x=>x.id===row.id);if(i>=0)db.vehicleTx[i]=row;else db.vehicleTx.push(row);clearVehicleForm();persist()}
function editV(idv){let x=db.vehicleTx.find(z=>z.id===idv);if(!x)return;editVehicle=x.id;document.getElementById('vBooker').value=x.booker||linkedBooker(x.name)||'';filterSettlementVehicles();document.getElementById('vName').value=x.name;document.getElementById('sVehicle').value=x.name;[['vSales','sales'],['vDiscount','discount'],['vShort','short'],['vCash','cash'],['vNotes','notes']].forEach(([a,b])=>document.getElementById(a).value=x[b]||'');document.getElementById('settlementExpenses').innerHTML='';document.getElementById('settlementBanks').innerHTML='';document.getElementById('settlementAdjustments').innerHTML='';(x.expenses||[{name:'Expenses',amount:x.expense||0}]).forEach(y=>addSettlementLine('expense',y));(x.banks||[{name:'Bank',amount:x.bank||0}]).forEach(y=>addSettlementLine('bank',y));(x.adjustments||[]).forEach(y=>addSettlementLine('adjust',y));document.querySelector('[data-page="vehicles"]').click();renderVehicleLiveCalc()}
function vehicleDue(x){const exp=x.expenses?.reduce((a,z)=>a+(Number(z.amount)||0),0)??x.expense??0,bank=x.banks?.reduce((a,z)=>a+(Number(z.amount)||0),0)??x.bank??0,adj=(x.adjustments||[]).reduce((a,z)=>a+(z.direction==='add'?1:-1)*(Number(z.amount)||0),0);return x.sales+x.recovery-x.credit-x.discount-exp-bank-x.cash-x.short-adj}
function clearBookerForm(){['bCollection','bOld','bBank','bCash','bExpense','bNotes'].forEach(x=>document.getElementById(x).value='');['bOld','bBank','bCash','bExpense'].forEach(x=>document.getElementById(x).value='');editBooker=null}
function clearBookerLedgerForm(preserveBooker=true){
 const selected=preserveBooker?val('bkBooker'):'';
 ['bkShop','bkCredit','bkRecovery'].forEach(k=>{const e=document.getElementById(k);if(e)e.value=''});
 const b=document.getElementById('bkBooker');if(b)b.value=selected;
 editBookerLedger=null;
 const title=document.getElementById('bookerLedgerFormTitle');if(title)title.textContent='Booker Credit / Recovery Entry';
 const save=document.getElementById('bkSaveBtn');if(save)save.textContent='Save Entry';
}
function saveBookerLedger(){
 const date=val('bkDate'),booker=val('bkBooker'),shop=val('bkShop'),credit=n('bkCredit'),recovery=n('bkRecovery');
 if(!date)return alert('Date select karein.');
 if(!booker)return alert('Booker name select karein.');
 if(!shop.trim())return alert('Shop name enter karein.');
 if(credit<0||recovery<0||(!credit&&!recovery))return alert('Credit ya Recovery mein amount enter karein.');
 db.bookerLedger=db.bookerLedger||[];
 const row={id:editBookerLedger||id(),date,booker,shop:shop.trim(),credit,recovery};
 const index=db.bookerLedger.findIndex(x=>x.id===row.id);
 if(index>=0)db.bookerLedger[index]=row;else db.bookerLedger.push(row);
 const filter=document.getElementById('bkDateFilter');if(filter)filter.value=date;
 const reportFrom=document.getElementById('bkReportFrom');if(reportFrom&&!reportFrom.value)reportFrom.value=date;
 const reportTo=document.getElementById('bkReportTo');if(reportTo&&!reportTo.value)reportTo.value=date;
 clearBookerLedgerForm(true);persist();renderBookers();
}
function editBookerLedgerEntry(recordId){
 const x=(db.bookerLedger||[]).find(r=>r.id===recordId);if(!x)return alert('Booker Settlement entry nahi mili.');
 editBookerLedger=x.id;
 const set=(id,value)=>{const e=document.getElementById(id);if(e)e.value=value??''};
 set('bkDate',x.date);set('bkBooker',x.booker);set('bkShop',x.shop);set('bkCredit',x.credit);set('bkRecovery',x.recovery);
 const title=document.getElementById('bookerLedgerFormTitle');if(title)title.textContent='Edit Booker Settlement Entry';
 const save=document.getElementById('bkSaveBtn');if(save)save.textContent='Update Entry';
 document.querySelector('[data-page="bookers"]')?.click();
 document.getElementById('bkDate')?.scrollIntoView({behavior:'smooth',block:'center'});
}
function deleteBookerLedger(recordId){if(!confirm('Is Booker Settlement entry ko delete karna hai?'))return;db.bookerLedger=(db.bookerLedger||[]).filter(x=>x.id!==recordId);persist();renderBookers();}
function bookerSettlementReportHtml(filters={}){
 const all=(db.bookerLedger||[]).filter(r=>(!filters.from||r.date>=filters.from)&&(!filters.to||r.date<=filters.to)&&(!filters.booker||String(r.booker||'').toLowerCase()===filters.booker.toLowerCase())&&(!filters.recordId||r.id===filters.recordId)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.booker||'').localeCompare(b.booker||'')||(a.shop||'').localeCompare(b.shop||''));
 const safe=v=>esc(v==null?'':String(v)),fmt=v=>nsMoney(Number(v)||0),company=db.companyName||db.agency?.name||'AL QADIR TRADERS',distributor=db.distributorName||'';
 if(!all.length)return '<!doctype html><html><head><meta charset="utf-8"><title>Booker Settlement</title></head><body style="font:14px Arial;padding:30px">No Booker Settlement records found for selected filters.</body></html>';
 const dates=[...new Set(all.map(x=>x.date))].sort(),sum=(rows,k)=>rows.reduce((t,r)=>t+(Number(r[k])||0),0);
 const dayHtml=dates.map(date=>{
  const rows=all.filter(x=>x.date===date),credit=sum(rows,'credit'),recovery=sum(rows,'recovery');
  const body=rows.map((x,i)=>`<tr><td>${i+1}</td><td>${safe(x.booker)}</td><td>${safe(x.shop)}</td><td class="num">${fmt(x.credit)}</td><td class="num">${fmt(x.recovery)}</td><td class="num">${fmt((Number(x.credit)||0)-(Number(x.recovery)||0))}</td></tr>`).join('');
  return `<section class="day"><h2>${safe(date)} — Daily Booker Settlement</h2><table><thead><tr><th>#</th><th>Booker</th><th>Shop</th><th class="num">Market Credit</th><th class="num">Recovery</th><th class="num">Net</th></tr></thead><tbody>${body}</tbody><tfoot><tr><th colspan="3">Daily Subtotal</th><th class="num">${fmt(credit)}</th><th class="num">${fmt(recovery)}</th><th class="num">${fmt(credit-recovery)}</th></tr></tfoot></table></section>`;
 }).join('');
 const showGrand=!!(filters.from&&filters.to&&filters.from!==filters.to);
 const grandCredit=sum(all,'credit'),grandRecovery=sum(all,'recovery');
 const selectedBookers=[...new Set(all.map(x=>x.booker))].join(', ');
 return `<!doctype html><html><head><meta charset="utf-8"><title>Booker Settlement Report</title><style>*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#202a34;margin:14mm}.brand{text-align:center;border-bottom:2px solid #17324d;padding-bottom:8px}.company{font-size:18px;font-weight:800}.dist{font-size:11px;margin-top:3px}h1{text-align:center;font-size:18px;margin:12px 0 5px;color:#17324d}.meta{text-align:center;margin:5px 0 12px;color:#475569}.range{text-align:center;font-weight:bold;margin-bottom:14px}h2{font-size:14px;color:#17324d;border-bottom:1px solid #9aa8b5;padding-bottom:5px;margin:18px 0 7px}table{width:100%;border-collapse:collapse;margin:5px 0 12px;font-size:10px}th,td{padding:6px;text-align:left;border-bottom:1px solid #d9e0e6}thead th{background:#f1f4f7;border-top:1px solid #b9c4ce}.num{text-align:right}.day{break-inside:avoid-page}.grand{margin-top:20px;border-top:3px double #17324d;padding-top:8px}.grandline{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e4e9ee;font-weight:bold}.toolbar{text-align:right;margin-bottom:10px}.toolbar button{padding:8px 13px;background:#17324d;color:white;border:0;border-radius:4px}@media print{.toolbar{display:none}@page{size:A4 portrait;margin:10mm}body{margin:0}.day{break-inside:auto}tr{break-inside:avoid}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><div class="brand"><div class="company">${safe(company)}</div>${distributor?`<div class="dist">Distributor: ${safe(distributor)}</div>`:''}</div><h1>BOOKER SETTLEMENT REPORT</h1><div class="range">${showGrand?`Period: ${safe(filters.from)} to ${safe(filters.to)}`:`Date: ${safe(filters.from||dates[0])}`}</div><div class="meta">Booker(s): ${safe(selectedBookers)}</div>${dayHtml}${showGrand?`<div class="grand"><h2>GRAND TOTAL — COMPLETE PERIOD</h2><div class="grandline"><span>Market Credit</span><b>${fmt(grandCredit)}</b></div><div class="grandline"><span>Recovery</span><b>${fmt(grandRecovery)}</b></div><div class="grandline"><span>Net Balance</span><b>${fmt(grandCredit-grandRecovery)}</b></div></div>`:''}</body></html>`;
}
function openBookerSettlementReport(filters={},autoPrint=false){
 const html=bookerSettlementReportHtml(filters),w=window.open('','_blank');if(!w)return alert('Report window blocked. Browser mein pop-ups allow karein.');
 w.document.open();w.document.write(html);w.document.close();if(autoPrint)setTimeout(()=>{w.focus();w.print()},450);
}
function viewBookerLedgerEntry(recordId){const x=(db.bookerLedger||[]).find(r=>r.id===recordId);if(!x)return alert('Booker Settlement entry nahi mili.');openBookerSettlementReport({from:x.date,to:x.date,booker:x.booker,recordId:recordId},false);}
function printBookerLedgerEntry(recordId){const x=(db.bookerLedger||[]).find(r=>r.id===recordId);if(!x)return alert('Booker Settlement entry nahi mili.');const html=bookerSettlementReportHtml({from:x.date,to:x.date,booker:x.booker,recordId:recordId});const w=window.open('','_blank');if(!w)return alert('Report window blocked. Browser mein pop-ups allow karein.');w.document.open();w.document.write(html);w.document.close();setTimeout(()=>{w.focus();w.print()},450);}
function printBookerSettlementSelection(){
 const from=val('bkReportFrom')||val('bkDateFilter')||today(),to=val('bkReportTo')||from,booker=val('bkReportBooker');
 if(from>to)return alert('From Date, To Date se baad ki nahi ho sakti.');
 openBookerSettlementReport({from,to,booker},false);
}
function clearCreditForm(){['cShop','cAmount','cNotes'].forEach(x=>document.getElementById(x).value='')}
function saveCredit(){let shop=val('cShop'),amount=n('cAmount'),type=val('cType'),party=val('cParty');if(!shop)return alert('Shop name is mandatory.');if(!party)return alert('Select the vehicle or booker name.');if(!amount)return alert('Enter amount.');db.credits.push({id:id(),date:today(),shop,party,type,amount,notes:val('cNotes')});clearCreditForm();persist()}
function creditTotals(shop){let a=db.credits.filter(x=>x.shop.toLowerCase()===shop.toLowerCase());return {opening:sum(a.filter(x=>x.type==='opening'),'amount'),fresh:sum(a.filter(x=>x.type==='new'),'amount'),recovery:sum(a.filter(x=>x.type==='recovery'),'amount')}}
function saveBank(){let amount=n('bankAmount');if(!amount)return alert('Enter amount.');let type=val('bankType');db.bankTx.push({id:id(),date:today(),type,account:val('bankAccount'),amount,by:val('bankBy'),ref:val('bankRef'),notes:val('bankNotes')});['bankAmount','bankBy','bankRef','bankNotes'].forEach(x=>document.getElementById(x).value='');persist()}
function cancelExpenseEdit(){['eEditId','eTitle','eCategory','eAmount','eBy','eNotes'].forEach(k=>{let e=document.getElementById(k);if(e)e.value=''});let t=document.getElementById('expenseFormTitle');if(t)t.textContent='New Expense Entry';let b=document.getElementById('expenseSaveBtn');if(b)b.textContent='Save Expense';let c=document.getElementById('expenseCancelBtn');if(c)c.style.display='none';}
function editExpense(key){let x=(db.expenses||[]).find(r=>r.id===key);if(!x)return alert('Expense entry nahi mili.');[['eEditId','id'],['eTitle','title'],['eCategory','category'],['eAmount','amount'],['eMethod','method'],['eBy','by'],['eNotes','notes']].forEach(([a,b])=>{let e=document.getElementById(a);if(e)e.value=x[b]??''});let t=document.getElementById('expenseFormTitle');if(t)t.textContent='Edit Expense Entry';let b=document.getElementById('expenseSaveBtn');if(b)b.textContent='Update Expense';let c=document.getElementById('expenseCancelBtn');if(c)c.style.display='inline-flex';document.getElementById('eTitle').scrollIntoView({behavior:'smooth',block:'center'});}
function saveExpense(){let title=val('eTitle').trim(),amount=n('eAmount'),category=val('eCategory').trim(),editId=val('eEditId');if(!title||!amount||amount<=0)return alert('Enter expense title and valid amount.');if(!category)return alert('Expense category select ya type karein.');db.expenses=db.expenses||[];let row={id:editId||id(),date:editId?((db.expenses.find(x=>x.id===editId)||{}).date||today()):today(),title,category,amount,method:val('eMethod'),by:val('eBy'),notes:val('eNotes')};let i=db.expenses.findIndex(x=>x.id===row.id);if(i>=0)db.expenses[i]=row;else db.expenses.push(row);cancelExpenseEdit();persist();}
function del(type,idv){if(!confirm('Delete this record permanently?'))return;db[type]=db[type].filter(x=>x.id!==idv);persist();if(type==='loans'){renderLoans();renderClosing()}}
function getDaily(){let v=dayRows(db.vehicleTx),b=dayRows(db.bookerTx),e=dayRows(db.expenses),bt=dayRows(db.bankTx);let bankIn=sum(bt.filter(x=>x.type==='deposit'),'amount'),cashOnline=sum(bt.filter(x=>x.type==='cashOnline'),'amount'),companyOnline=sum(bt.filter(x=>['company','onlineOut'].includes(x.type)),'amount'),bankOut=sum(bt.filter(x=>x.type==='other'),'amount'),withdraw=sum(bt.filter(x=>x.type==='withdraw'),'amount'),onlineReceived=sum(bt.filter(x=>x.type==='onlineIn'),'amount');let vs=(db.vehicleSettlements||[]).filter(x=>x.date===today());let newVehicleCash=vs.reduce((t,x)=>t+(Number(x.remaining)||0),0);return {v,b,e,bt,bankIn,cashOnline,companyOnline,bankOut,withdraw,onlineReceived,vehicleCash:sum(v,'cash')+newVehicleCash,bookerCash:sum(b,'cash'),cashExpense:sum(e.filter(x=>x.method==='cash'),'amount'),bankExpense:sum(e.filter(x=>x.method==='bank'),'amount'),sales:sum(v,'sales'),oldRecovery:sum(v,'recovery')+sum(b,'old'),newCredit:sum(v,'credit'),discount:sum(v,'discount')+sum(vs,'discount'),vehicleBank:sum(v,'bank'),bookerBank:sum(b,'bank'),bookerCollection:sum(b,'collection'),vehicleShort:sum(v,'short'),vehicleExpense:sum(v,'expense'),bookerExpense:sum(b,'expense')}}
function loanPartyKey(v){return String(v||'').trim().toLowerCase()}
function cancelLoanEdit(){['loanEditId','loanParty','loanAmount','loanRef'].forEach(k=>{let e=document.getElementById(k);if(e)e.value=''});let f=document.getElementById('loanFormTitle');if(f)f.textContent='New Loan Entry';let b=document.getElementById('loanSaveBtn');if(b)b.textContent='Save Loan Entry';let c=document.getElementById('loanCancelBtn');if(c)c.style.display='none'}
function editLoan(key){let x=(db.loans||[]).find(r=>r.id===key);if(!x)return alert('Loan entry nahi mili.');document.getElementById('loanEditId').value=x.id;document.getElementById('loanDate').value=x.date||today();document.getElementById('loanType').value=x.type||'in';document.getElementById('loanParty').value=x.party||'';document.getElementById('loanAmount').value=x.amount||'';document.getElementById('loanRef').value=x.ref||'';document.getElementById('loanFormTitle').textContent='Edit Loan Entry';document.getElementById('loanSaveBtn').textContent='Update Loan Entry';document.getElementById('loanCancelBtn').style.display='inline-flex';document.getElementById('loanDate').scrollIntoView({behavior:'smooth',block:'center'})}
function saveLoan(){let date=val('loanDate')||today(),type=val('loanType'),party=val('loanParty').trim(),amount=n('loanAmount'),ref=val('loanRef'),editId=val('loanEditId');if(!party)return alert('Loan kis se liya / kis ko return kiya? Party ka naam enter karein.');if(!amount||amount<=0)return alert('Loan amount enter karein.');db.loans=db.loans||[];if(editId){let i=db.loans.findIndex(x=>x.id===editId);if(i<0)return alert('Loan entry nahi mili.');db.loans[i]={...db.loans[i],date,type,party,amount,ref}}else db.loans.push({id:id(),date,type,party,amount,ref});cancelLoanEdit();persist();renderLoans();renderClosing()}
function renderLoans(){db.loans=db.loans||[];let a=db.loans.filter(x=>x.date===today()),ins=a.filter(x=>x.type==='in').reduce((t,x)=>t+(Number(x.amount)||0),0),outs=a.filter(x=>x.type==='return').reduce((t,x)=>t+(Number(x.amount)||0),0);let cards=document.getElementById('loanCards');if(cards)cards.innerHTML=[['Today Loan Cash In',ins],['Today Loan Return',outs],['Today Net Cash Impact',ins-outs]].map(x=>`<div class="metric"><div class="k">${x[0]}</div><div class="v">${money(x[1])}</div></div>`).join('');let names=[...new Set(db.loans.map(x=>String(x.party||'').trim()).filter(Boolean))];let dl=document.getElementById('loanPartyOptions');if(dl)dl.innerHTML=names.map(x=>`<option value="${esc(x)}"></option>`).join('');let rows=document.getElementById('loanRows');if(rows)rows.innerHTML=[...db.loans].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.party||'Not specified')}</td><td>${x.type==='in'?'Loan Cash In':'Loan Return'}</td><td class="num">${money(x.amount)}</td><td>${esc(x.ref||'')}</td><td><button class="btn small outline" onclick="printLoanEntry('${x.id}')">Print</button> <button class="btn small secondary" onclick="editLoan('${x.id}')">Edit</button> <button class="btn small danger" onclick="del('loans','${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No loan entries.</td></tr>'}
function loanReportHtml(filters={}){let all=(db.loans||[]).filter(x=>(!filters.date||x.date===filters.date)&&(!filters.recordId||x.id===filters.recordId)).sort((a,b)=>String(a.party||'').localeCompare(String(b.party||'')));if(!all.length)return '<!doctype html><html><body style="font:16px Arial;padding:30px">No loan records found for selected date.</body></html>';const company=db.companyName||db.agency?.name||'AL QADIR TRADERS',distributor=db.distributorName||'',safe=v=>esc(v==null?'':String(v)),fmt=v=>money(Number(v)||0),sum=(a)=>a.reduce((t,x)=>t+(Number(x.amount)||0),0),received=sum(all.filter(x=>x.type==='in')),returned=sum(all.filter(x=>x.type==='return')),body=all.map(x=>`<tr><td>${safe(x.party||'Not specified')}</td><td>${x.type==='in'?'LOAN CASH IN':'LOAN RETURN'}</td><td>${safe(x.ref||'—')}</td><td class="num">${fmt(x.amount)}</td></tr>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><title>Daily Loan Settlement</title><style>*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#202a34;margin:14mm}.brand{text-align:center;border-bottom:2px solid #17324d;padding-bottom:8px}.company{font-size:18px;font-weight:800}.dist{font-size:11px;margin-top:3px}h1{text-align:center;font-size:18px;margin:12px 0 5px;color:#17324d}.meta{text-align:center;margin:5px 0 14px;color:#475569}.range{text-align:center;font-weight:bold;margin-bottom:14px}h2{font-size:14px;color:#17324d;border-bottom:1px solid #9aa8b5;padding-bottom:5px;margin:18px 0 7px}table{width:100%;border-collapse:collapse;margin:5px 0 12px;font-size:10px}th,td{padding:7px 6px;text-align:left;border-bottom:1px solid #d9e0e6}th{background:#f1f4f7;border-top:1px solid #b9c4ce}.num{text-align:right}.total td{font-weight:800;border-top:1px solid #667788}.summary{margin:16px 0 8px auto;width:55%;border-top:2px solid #17324d;padding-top:6px}.line{display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid #e4e9ee}.line strong{font-size:12px}.toolbar{text-align:right;margin-bottom:10px}.toolbar button{padding:8px 13px;background:#a71932;color:white;border:0;border-radius:4px}@media print{.toolbar{display:none}@page{size:A4 portrait;margin:10mm}body{margin:0}tr{break-inside:avoid}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><div class="brand"><div class="company">${safe(company)}</div>${distributor?`<div class="dist">Distributor: ${safe(distributor)}</div>`:''}</div><h1>DAILY LOAN SETTLEMENT</h1><div class="range">Date: ${safe(all[0].date||filters.date||'')}</div><div class="meta">Total Entries: ${all.length}</div><h2>TRANSACTION DETAILS</h2><table><thead><tr><th>Loan From / Paid To</th><th>Transaction Type</th><th>Reference / Note</th><th class="num">Amount</th></tr></thead><tbody>${body}<tr class="total"><td colspan="3">Daily Loan Cash In</td><td class="num">${fmt(received)}</td></tr><tr class="total"><td colspan="3">Daily Loan Return</td><td class="num">${fmt(returned)}</td></tr></tbody></table><div class="summary"><div class="line"><span>Total Loan Cash In</span><strong>${fmt(received)}</strong></div><div class="line"><span>Total Loan Return</span><strong>${fmt(returned)}</strong></div><div class="line"><span>NET CASH IMPACT</span><strong>${fmt(received-returned)}</strong></div></div></body></html>`}
function openLoanReport(filters={},autoPrint=false){let w=window.open('','_blank');if(!w)return alert('Report window blocked. Browser mein pop-ups allow karein.');w.document.open();w.document.write(loanReportHtml(filters));w.document.close();if(autoPrint)setTimeout(()=>{w.focus();w.print()},450)}
function printLoanEntry(key){let x=(db.loans||[]).find(r=>r.id===key);if(!x)return alert('Loan entry nahi mili.');openLoanReport({date:x.date,recordId:key},true)}
function printLoanSelection(){let date=document.getElementById('loanReportDate')?.value||today();openLoanReport({date},false)}
function clearLoanReportFilters(){let d=today();if(document.getElementById('loanReportDate'))document.getElementById('loanReportDate').value=d}
function sumLoanForDate(date){let a=(db.loans||[]).filter(x=>x.date===date);let legacy=db.dailyInputs?.[date]||{};return {in:a.filter(x=>x.type==='in').reduce((t,x)=>t+(Number(x.amount)||0),0)+(Number(legacy.loanCashIn)||0),out:a.filter(x=>x.type==='return').reduce((t,x)=>t+(Number(x.amount)||0),0)+(Number(legacy.loanReturn)||0)}}
function ahmadCarryBefore(date){return Object.entries(db.dailyInputs||{}).reduce((t,[d,x])=>d<date?t+(Number(x?.ahmadKhata)||0):t,0)}
function saithCarryBefore(date){let total=0;Object.entries(db.dailyInputs||{}).forEach(([d,x])=>{if(d<date)total+=(Number(x?.otherOut)||0)});(db.bankTx||[]).forEach(x=>{if(x.date<date&&['saithBank','saithOnline'].includes(x.type))total-=Number(x.amount)||0});return total}
function getInputs(){let saved=db.dailyInputs[today()]||{};let carried=previousClosingCash();return {...{opening:carried===null?0:carried,otherIn:0,loanCashIn:0,loanReturn:0,otherOut:0,officeDiscount:0,advanceTax:0,ahmadKhata:0,actual:'',reason:''},...saved,opening:carried!==null?carried:(Number(saved.opening)||0)}}
function cashCalc(){let d=getDaily(),i=getInputs(),loan=sumLoanForDate(today());let bankDeposits=d.bankIn+d.vehicleBank+d.bookerBank;let cashOnline=d.cashOnline||0;let expCash=d.cashExpense+d.vehicleExpense+d.bookerExpense;let tax=Number(i.advanceTax)||0;let loanCashIn=loan.in,loanReturn=loan.out;let totalCashReceived=d.vehicleCash+d.bookerCash+Number(i.otherIn)+loanCashIn+d.withdraw;let totalBankPayments=bankDeposits+cashOnline;let companyOnline=d.companyOnline||0;let ahmadToday=Number(i.ahmadKhata)||0;let expected=Number(i.opening)+d.sales+totalCashReceived-d.newCredit-d.discount-expCash-tax-totalBankPayments-Number(i.otherOut)-ahmadToday-loanReturn;return {d,i,bankDeposits,cashOnline,expCash,tax,loanCashIn,loanReturn,totalCashReceived,totalBankPayments,companyOnline,expected,actual:i.actual===''?null:Number(i.actual),difference:i.actual===''?null:Number(i.actual)-expected}}
function renderCarryBalance(){let c=cashCalc();let opening=document.getElementById('carryOpeningValue'),current=document.getElementById('carryCurrentValue'),date=document.getElementById('carryBalanceDate');if(opening)opening.textContent=money(c.i.opening);if(current)current.textContent=money(c.actual===null?c.expected:c.actual);if(date)date.textContent='Working date: '+today();}
function renderClosing(){let c=cashCalc();renderCarryBalance();let cards=[['Opening cash',c.i.opening],['Vehicle cash handed',c.d.vehicleCash],['Booker cash handed',c.d.bookerCash],['Vehicle Settlement Discount',-c.d.discount],['Loan Cash In',c.loanCashIn],['Loan Return',-c.loanReturn],['Bank cash deposits',-c.bankDeposits],['Cash Online',-c.cashOnline],['Cash expenses',-c.expCash],['Advance tax',-c.tax],['Saith Cash handed over',-Number(c.i.otherOut)],['Ahmad new cash handed over',-Number(c.i.ahmadKhata||0)],['Cash In Hand',c.expected],['Actual counted',c.actual??0]];let host=document.getElementById('closingCards');if(host)host.innerHTML=cards.map((x,i)=>`<div class="metric"><div class="k">${x[0]}</div><div class="v">${money(x[1])}</div></div>`).join('');let diff=c.difference;let carry=ahmadCarryBefore(today()),ahmadNew=Number(c.i.ahmadKhata)||0,saith=saithCarryBefore(today())+Number(c.i.otherOut||0);let ac=document.getElementById('ahmadKhataCarry');if(ac)ac.value=money(carry);let an=document.getElementById('ahmadKhataClosing');if(an)an.value=money(carry+ahmadNew);let sh=document.getElementById('saithHolding');if(sh)sh.value=money(saith);let breakdown=document.getElementById('cashBreakdown');if(breakdown)breakdown.innerHTML=`<div class="totals"><span>Ahmad previous balance: <b>${money(carry)}</b></span><span>Ahmad total holding: <b>${money(carry+ahmadNew)}</b></span><span>Saith pending holding: <b>${money(saith)}</b></span><span>Cash In Hand: <b>${money(c.expected)}</b></span><span>Actual cash: <b>${c.actual===null?'Not entered':money(c.actual)}</b></span><span>Difference: <b style="color:${diff===null?'#687386':diff<0?'#c21b32':'#138a52'}">${diff===null?'Pending':money(diff)}</b></span></div><p class="sub">${diff===null?'Enter actual counted cash to complete closing.':diff<-.005?'Cash shortage: '+money(-diff):diff>.005?'Cash excess: '+money(diff):'Cash matched exactly.'}</p>`}
function recalculateAllClosings(){let wd=document.getElementById('workDate');if(!wd)return;let restore=wd.value;let rows=[...(db.closings||[])].sort((a,b)=>a.date.localeCompare(b.date));rows.forEach(row=>{wd.value=row.date;let c=cashCalc();row.opening=c.i.opening;row.expected=c.expected;row.difference=row.actual===null||row.actual===undefined||row.actual===''?null:Number(row.actual)-c.expected;});wd.value=restore;}
function recalculateFutureClosings(fromDate){let wd=document.getElementById('workDate');if(!wd)return;let restore=wd.value;let later=(db.closings||[]).filter(x=>x.date>fromDate).sort((a,b)=>a.date.localeCompare(b.date));later.forEach(row=>{wd.value=row.date;let c=cashCalc();row.opening=c.i.opening;row.expected=c.expected;row.difference=row.actual===null||row.actual===undefined||row.actual===''?null:Number(row.actual)-c.expected;});wd.value=restore;}
function saveClosing(){let date=today();let prior=db.dailyInputs[date]||{};db.dailyInputs[date]={...prior,opening:getInputs().opening,otherIn:prior.otherIn||0,otherOut:n('otherOut'),advanceTax:n('advanceTax'),ahmadKhata:n('ahmadKhataAmount'),actual:document.getElementById('actualCash').value===''?'':n('actualCash'),reason:val('diffReason')};let c=cashCalc();let old=db.closings.findIndex(x=>x.date===date);let row={date,opening:c.i.opening,expected:c.expected,actual:c.actual,difference:c.difference,reason:c.i.reason};if(old>=0)db.closings[old]=row;else db.closings.push(row);recalculateFutureClosings(date);persist();alert('Daily closing saved. Later closing balances have been recalculated.')}
function loadClosing(){let x=getInputs();document.getElementById('openingCash').value=x.opening;document.getElementById('otherOut').value=x.otherOut;document.getElementById('advanceTax').value=x.advanceTax||0;document.getElementById('ahmadKhataAmount').value=x.ahmadKhata||0;document.getElementById('actualCash').value=x.actual;document.getElementById('diffReason').value=x.reason;let ld=document.getElementById('loanDate');if(ld)ld.value=today();let lr=document.getElementById('loanReportDate');if(lr&&!lr.value)lr.value=today();renderClosing();renderLoans()}
const NS_DENOMS=[5000,1000,500,100,50,20,10,5];
function nsEl(id){return document.getElementById(id)}
function nsFormulaValue(raw){let t=String(raw??'').replace(/\s+/g,'');if(!t)return 0;if(!/^[0-9.]+(?:[+-][0-9.]+)*$/.test(t))return Number(t)||0;let parts=t.match(/[+-]?[0-9.]+/g)||[];let total=0;for(let part of parts){let n=Number(part);if(!Number.isFinite(n))return 0;total+=n}return total}
function nsNum(id){let v=id==='nsRoundCash'?nsFormulaValue(nsEl(id)?.value):Number(nsEl(id)?.value);return Math.max(0,Number(v)||0)}
function nsMoney(v){return 'Rs. '+(Number(v)||0).toLocaleString('en-PK',{minimumFractionDigits:2,maximumFractionDigits:2})}
function nsOptions(id,arr){let el=nsEl(id);if(!el)return;let old=el.value;el.innerHTML='<option value="">Select...</option>'+arr.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');if(arr.includes(old))el.value=old}
function nsDataLists(){let b=nsEl('nsBookerOptions'),d=nsEl('nsDriverOptions');if(b)b.innerHTML=[...new Set([...(db.bookers||[]),...(db.vehicleSettlements||[]).map(x=>x.booker).filter(Boolean)])].map(x=>'<option value="'+esc(x)+'"></option>').join('');if(d)d.innerHTML=[...new Set([...(db.vehicles||[]),...(db.vehicleSettlements||[]).map(x=>x.driver).filter(Boolean)])].map(x=>'<option value="'+esc(x)+'"></option>').join('')}
function nsInit(){if(!nsEl('nsDate'))return;const d=nsEl('workDate')?.value||new Date().toISOString().slice(0,10);if(!nsEl('nsDate').value)nsEl('nsDate').value=d;if(nsEl('nsReportFrom')&&!nsEl('nsReportFrom').value)nsEl('nsReportFrom').value=d;if(nsEl('nsReportTo')&&!nsEl('nsReportTo').value)nsEl('nsReportTo').value=d;nsDataLists();nsCashBuild();nsRenderSaved();if(!nsEl('nsProducts').children.length)nsAddProduct()}
function nsShowSaveFeedback(message){let toast=nsEl('nsSaveToast'),btn=nsEl('nsSaveButton'),status=nsEl('nsSaveInlineStatus');if(status){status.textContent=message;status.classList.add('saved')}if(btn){btn.classList.remove('save-success');void btn.offsetWidth;btn.classList.add('save-success');setTimeout(()=>btn.classList.remove('save-success'),1800)}if(toast){toast.innerHTML='<span class="check">✓</span><span>'+message+'</span>';toast.classList.add('show');clearTimeout(window.__nsToastTimer);window.__nsToastTimer=setTimeout(()=>toast.classList.remove('show'),3200)}}
function nsNormalizeRoundCash(){let e=nsEl('nsRoundCash');if(!e)return;let v=nsFormulaValue(e.value);if(String(e.value).trim()&&Number.isFinite(v))e.value=String(v);nsCalc()}
function nsCashBuild(){let h=nsEl('nsCashNotes');if(!h||h.children.length)return;h.innerHTML=NS_DENOMS.map((d,i)=>'<div class="ns-denom-row"><div class="field"><label>Rs. '+d.toLocaleString('en-PK')+' NOTES (QTY)</label><input type="number" min="0" step="1" id="nsNote'+i+'" placeholder="0" oninput="nsCashLineTotal('+i+');nsCalc()"></div><div class="ns-denom-total" id="nsDenomTotal'+i+'">Rs. 0</div></div>').join('')}
function nsCashLineTotal(i){let qty=Number(nsEl('nsNote'+i)?.value)||0,amount=NS_DENOMS[i]*qty,el=nsEl('nsDenomTotal'+i);if(el)el.textContent=nsMoney(amount);return amount}
function nsRow(kind){let idv=id(),title={credit:'Shop Credit',recovery:'Shop Recovery',bank:'Bank Deposit',discount:'Discount Detail',expense:'Expense Detail'}[kind];let shop=['credit','recovery'].includes(kind);let detail=kind==='bank'?('<div class="field"><label>Bank Name / Account</label><input class="ns-name" list="bankNameOptions" placeholder="e.g. HBL / Meezan Bank"></div><div class="field"><label>Deposit Slip / Reference</label><input class="ns-ref" placeholder="Optional deposit slip no."></div>'):('<div class="field"><label>'+(shop?'Shop Name':title)+'</label>'+(shop?'<input class="ns-name" list="shopMasterOptions" placeholder="Shop name">':'<input class="ns-name" placeholder="'+title+'">')+'</div>'+(shop?'<div class="field"><label>Ref</label><input class="ns-ref" placeholder="Invoice / receipt ref"></div>':''));return '<div class="form-grid ns-line" data-kind="'+kind+'" data-row="'+idv+'" style="border-bottom:1px solid var(--line);padding:10px 0">'+detail+'<div class="field"><label>Amount (PKR)</label><input class="ns-amount" type="number" min="0" step=".01" oninput="nsCalc()"></div><div class="field" style="align-self:end"><button class="btn small danger" type="button" onclick="this.closest(\'.ns-line\').remove();nsCalc()">Remove</button></div></div>'}
function nsAddLine(kind){let host=nsEl('ns'+kind.charAt(0).toUpperCase()+kind.slice(1));if(host)host.insertAdjacentHTML('beforeend',nsRow(kind));nsCalc()}
function nsUpdateProductTotals(){let rows=[...document.querySelectorAll('#nsProducts .ns-product')],tot={loaded:0,returned:0,net:0};rows.forEach(r=>{let include=r.querySelector('.ns-count-total')?.checked!==false;if(!include)return;let loaded=Number(r.querySelector('.ns-loaded')?.value)||0,returned=Number(r.querySelector('.ns-return')?.value)||0;tot.loaded+=loaded;tot.returned+=returned;tot.net+=loaded-returned});[['nsTotalLoaded',tot.loaded],['nsTotalReturned',tot.returned],['nsTotalNet',tot.net]].forEach(([idv,v])=>{let el=nsEl(idv);if(el)el.textContent=Number(v.toFixed(3)).toLocaleString('en-PK')});return tot}

function nsAddProduct(){let host=nsEl('nsProducts');if(!host)return;let idv=id();host.insertAdjacentHTML('beforeend','<div class="form-grid ns-product" data-row="'+idv+'"><div class="field"><label>SKU / PRODUCT</label><select class="ns-prod" onchange="nsProductSelected(this)"><option value="">Select product...</option>'+(db.products||[]).map(x=>'<option value=\"'+esc(x)+'\">'+esc(x)+'</option>').join('')+'</select></div><div class="field"><label>LOADED QTY</label><input class="ns-loaded" type="number" min="0" step="any" placeholder="0" oninput="nsProductNet(this)"></div><div class="field"><label>RETURN QTY</label><input class="ns-return" type="number" min="0" step="any" placeholder="0" oninput="nsProductNet(this)"></div><div class="field"><label>NET QTY</label><input class="ns-net" type="number" readonly placeholder="0" tabindex="-1"></div><div class="field"><label>UNIT</label><input class="ns-unit" placeholder="Case / Bottle / Piece"></div><div class="field ns-count-field"><label>COUNT IN TOTAL?</label><label class="ns-count-toggle"><input class="ns-count-total" type="checkbox" checked onchange="nsUpdateProductTotals()"><span>Include</span></label></div><div class="field" style="align-self:end"><button class="btn small danger" type="button" onclick="this.closest(\'.ns-product\').remove();nsUpdateProductTotals()">Remove</button></div></div>');nsUpdateProductTotals()}
function nsProductSelected(sel){nsUpdateProductTotals();let host=nsEl('nsProducts'),rows=[...host.querySelectorAll('.ns-product')],hasBlank=rows.some(r=>!r.querySelector('.ns-prod')?.value);if(sel.value&&!hasBlank)nsAddProduct()}
function nsProductNet(el){let r=el.closest('.ns-product'),loaded=Number(r.querySelector('.ns-loaded').value)||0,ret=Number(r.querySelector('.ns-return').value)||0;r.querySelector('.ns-net').value=(loaded-ret).toString();nsUpdateProductTotals()}
function nsCollect(kind){return [...document.querySelectorAll('#ns'+kind.charAt(0).toUpperCase()+kind.slice(1)+' .ns-line')].map(r=>({name:r.querySelector('.ns-name')?.value.trim()||'',ref:r.querySelector('.ns-ref')?.value.trim()||'',amount:Number(r.querySelector('.ns-amount')?.value)||0})).filter(x=>x.name||x.amount)}
function nsTotals(){let credit=nsCollect('credit').reduce((a,x)=>a+x.amount,0),recovery=nsCollect('recovery').reduce((a,x)=>a+x.amount,0),bank=nsCollect('bank').reduce((a,x)=>a+x.amount,0),discount=nsCollect('discount').reduce((a,x)=>a+x.amount,0),expense=nsCollect('expense').reduce((a,x)=>a+x.amount,0),summary=nsNum('nsSummary');return {summary,credit,recovery,bank,discount,expense,remaining:summary-credit+recovery-bank-discount-expense}}
function nsCalc(){if(!nsEl('nsCalculation'))return;NS_DENOMS.forEach((d,i)=>nsCashLineTotal(i));let t=nsTotals(),cash=NS_DENOMS.reduce((a,d,i)=>a+d*(Number(nsEl('nsNote'+i)?.value)||0),0)+nsNum('nsOtherCash')+nsNum('nsRoundCash'),diff=cash-t.remaining;nsEl('nsCalculation').innerHTML=[['Summary Amount',t.summary],['Market Credit',-t.credit],['Recovery',t.recovery],['Bank',-t.bank],['Extra Discount',-t.discount],['Expenses',-t.expense],['Remaining Balance',t.remaining]].map(x=>'<div class="cash-card"><span>'+x[0]+'</span><b>'+nsMoney(x[1])+'</b></div>').join('');nsEl('nsCashResult').innerHTML='<div class="cash-card"><span>Total Counted Cash</span><b>'+nsMoney(cash)+'</b></div>';nsEl('nsDifference').innerHTML='<div class="cash-card"><span>Expected Remaining</span><b>'+nsMoney(t.remaining)+'</b></div><div class="cash-card"><span>Counted Cash</span><b>'+nsMoney(cash)+'</b></div><div class="cash-card"><span>Difference (Cash − Expected)</span><b>'+nsMoney(diff)+'</b></div>';let ok=Math.abs(diff)<0.005;nsEl('nsMatchStatus').textContent=ok?'MATCH':'DIFFERENCE';nsEl('nsMatchStatus').style.background=ok?'#dcfce7':'#fee2e2';nsEl('nsMatchStatus').style.color=ok?'#166534':'#991b1b';return {t,cash,diff,ok}}
function nsRenderSaved(){let all=db.vehicleSettlements||[],selected=nsEl('nsDate')?.value||nsEl('workDate')?.value||'',rows=selected?all.filter(x=>x.date===selected):all;if(nsEl('nsSavedCount'))nsEl('nsSavedCount').textContent=rows.length+' records for '+(selected||'all dates');if(nsEl('nsSavedRows'))nsEl('nsSavedRows').innerHTML=rows.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x=>'<tr data-settlement-id="'+esc(x.id)+'"><td>'+esc(x.date)+'</td><td>'+esc(x.booker)+'</td><td>'+esc(x.driver)+'</td><td class="num">'+nsMoney(x.summary)+'</td><td class="num">'+nsMoney(x.remaining)+'</td><td class="num">'+nsMoney(x.cash)+'</td><td>'+(x.match?'MATCH':'DIFFERENCE')+'</td><td><button class="btn small outline" onclick="viewBookerDriverSettlement(\''+x.id+'\')">View</button> <button class="btn small green" onclick="downloadVehicleSettlementPDF(\''+x.id+'\')">PDF</button> <button class="btn small outline" onclick="printBookerDriverSettlement(\''+x.id+'\')">Print</button> <button class="btn small secondary" onclick="nsEdit(\''+x.id+'\')">Edit</button> <button class="btn small danger" onclick="nsDelete(\''+x.id+'\')">Delete</button></td></tr>').join('')}
async function nsSave(){
 const status=nsEl('nsSaveInlineStatus'),btn=nsEl('nsSaveButton');
 const say=(msg,bad=false)=>{if(status){status.textContent=msg;status.classList.toggle('saved',!bad);status.style.background=bad?'#fee2e2':'#e8f7ef';status.style.color=bad?'#991b1b':'#137a49'}};
 try{
  let driver=(nsEl('nsDriver')?.value||'').trim(),booker=(nsEl('nsBooker')?.value||'').trim(),date=nsEl('nsDate')?.value;
  if(!booker||!driver||!date){say('Save nahi hua: Booker, Driver aur Date zaroori hain.',true);alert('Save nahi hua. Booker, Driver aur Date teeno enter karein.');return}
  let c=nsCalc();if(!c){say('Save nahi hua: calculation panel load nahi hua.',true);alert('Calculation panel nahi mila. Page refresh karke dobara try karein.');return}
  let products=[...document.querySelectorAll('#nsProducts .ns-product')].map(r=>({product:r.querySelector('.ns-prod')?.value||'',loaded:Number(r.querySelector('.ns-loaded')?.value)||0,returned:Number(r.querySelector('.ns-return')?.value)||0,net:Number(r.querySelector('.ns-net')?.value)||0,unit:r.querySelector('.ns-unit')?.value.trim()||'',includeInTotal:r.querySelector('.ns-count-total')?.checked!==false})).filter(x=>x.product||x.loaded||x.returned);
  if(!products.length){say('Save nahi hua: kam az kam aik product select karein.',true);alert('Kam az kam aik Product Detail select karein.');return}
  let wasEditing=!!nsEditingId;
  let record={id:nsEditingId||id(),booker,driver,date,products,...c.t,cash:c.cash,notes:{credit:nsCollect('credit'),recovery:nsCollect('recovery'),bank:nsCollect('bank'),discount:nsCollect('discount'),expense:nsCollect('expense')},cashNotes:NS_DENOMS.map((d,i)=>({denomination:d,quantity:Number(nsEl('nsNote'+i)?.value)||0})),otherCash:nsNum('nsOtherCash'),roundCash:nsNum('nsRoundCash'),match:c.ok,createdAt:nsEditingId?(db.vehicleSettlements.find(x=>x.id===nsEditingId)?.createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:nsEditingId?new Date().toISOString():undefined};
  db.bookers=db.bookers||[];db.vehicles=db.vehicles||[];
  if(!db.bookers.some(x=>x.toLowerCase()===booker.toLowerCase()))db.bookers.push(booker);
  if(!db.vehicles.some(x=>x.toLowerCase()===driver.toLowerCase()))db.vehicles.push(driver);
  db.vehicleSettlements=db.vehicleSettlements||[];
  if(nsEditingId){let idx=db.vehicleSettlements.findIndex(x=>x.id===record.id);if(idx<0){say('Save failed: edit record nahi mila.',true);alert('Record nahi mila. Saved Entries refresh karein.');return}db.vehicleSettlements[idx]=record}else db.vehicleSettlements.push(record);
  say('Saving to device...',false);if(btn){btn.disabled=true;btn.textContent='Saving...'}
  await persist();
  nsDataLists();nsRenderSaved();nsClear();
  nsShowSaveFeedback(wasEditing?'Settlement Successfully Updated!':'SETTLEMENT SAVED SUCCESSFULLY!');
  let savedRow=document.querySelector('#nsSavedRows tr[data-settlement-id="'+record.id+'"]');
  if(savedRow){savedRow.classList.add('ns-just-saved');savedRow.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>savedRow.classList.remove('ns-just-saved'),5000)}
  if(!c.ok){say('Saved — CASH DIFFERENCE: '+nsMoney(c.diff),true);if(status)status.style.color='#92400e'}
  if(nsEl('reportOutput')&&nsEl('reportFrom')?.value&&nsEl('reportTo')?.value)buildReport();
  try{if(__dbStore){let tx=__dbStore.transaction('records','readwrite');tx.objectStore('records').delete('vehicleSettlementDraft')}else sessionStorage.removeItem('alqadir_vehicle_settlement_draft_v1')}catch(draftErr){console.warn('Could not clear saved draft',draftErr)}
 }catch(err){console.error('Settlement save failed:',err);say('SAVE ERROR: '+(err?.message||String(err)),true);alert('Entry save nahi hui. Wajah: '+(err?.message||String(err))+'\nAapki form entry clear nahi ki gayi.')}
 finally{if(btn){btn.disabled=false;btn.textContent=nsEditingId?'Update Settlement':'Save Settlement'}}
}
function nsEdit(key){let x=(db.vehicleSettlements||[]).find(r=>r.id===key);if(!x)return alert('Settlement record nahi mila.');nsClear();nsEditingId=key;nsDataLists();nsEl('nsDriver').value=x.driver||'';nsEl('nsBooker').value=x.booker||'';nsEl('nsDate').value=x.date||'';nsEl('nsSummary').value=Number(x.summary)||0;nsEl('nsOtherCash').value=Number(x.otherCash)||'';if(nsEl('nsRoundCash'))nsEl('nsRoundCash').value=Number(x.roundCash)||'';(x.products||[]).forEach((p,i)=>{if(i)nsAddProduct();let r=nsEl('nsProducts').children[i];if(!r)return;r.querySelector('.ns-prod').value=p.product||'';r.querySelector('.ns-loaded').value=p.loaded||'';r.querySelector('.ns-return').value=p.returned||'';r.querySelector('.ns-net').value=(Number(p.net)||0)?p.net:'';r.querySelector('.ns-unit').value=p.unit||'';let countBox=r.querySelector('.ns-count-total');if(countBox)countBox.checked=p.includeInTotal!==false});if((x.products||[]).length&&![...nsEl('nsProducts').querySelectorAll('.ns-product')].some(r=>!r.querySelector('.ns-prod').value))nsAddProduct();nsUpdateProductTotals();['credit','recovery','bank','discount','expense'].forEach(k=>{let host=nsEl('ns'+k.charAt(0).toUpperCase()+k.slice(1));host.innerHTML='';(x.notes?.[k]||[]).forEach(item=>{nsAddLine(k);let r=host.lastElementChild;if(r.querySelector('.ns-name'))r.querySelector('.ns-name').value=item.name||'';if(r.querySelector('.ns-ref'))r.querySelector('.ns-ref').value=item.ref||'';r.querySelector('.ns-amount').value=item.amount||0})});(x.cashNotes||[]).forEach((n,i)=>{if(nsEl('nsNote'+i))nsEl('nsNote'+i).value=Number(n.quantity)||'';nsCashLineTotal(i)});nsCalc();nsEl('nsSaveButton').textContent='Update Settlement';if(nsEl('nsSaveInlineStatus')){nsEl('nsSaveInlineStatus').textContent='Editing saved entry';nsEl('nsSaveInlineStatus').classList.remove('saved')}if(nsEl('nsDate'))nsEl('nsDate').value=x.date||'';document.querySelector('[data-page=vehicles]')?.click();nsRenderSaved();nsEl('nsBooker')?.scrollIntoView?.({behavior:'smooth',block:'center'});}
function nsDelete(key){if(!confirm('Ye saved settlement delete karna hai? Is settlement ki Stock, Credit aur Recovery daily report se bhi entries delete ho jayengi.'))return;if(nsEditingId===key)nsClear();db.vehicleSettlements=(db.vehicleSettlements||[]).filter(x=>x.id!==key);persist();nsRenderSaved();if(nsEl('reportOutput')&&nsEl('reportFrom').value&&nsEl('reportTo').value)buildReport()}
function nsClear(){nsEditingId=null;if(nsEl('nsSaveButton'))nsEl('nsSaveButton').textContent='Save Settlement';if(nsEl('nsDriver'))nsEl('nsDriver').value='';if(nsEl('nsBooker'))nsEl('nsBooker').value='';if(nsEl('nsSaveInlineStatus')){nsEl('nsSaveInlineStatus').textContent='Not saved yet';nsEl('nsSaveInlineStatus').classList.remove('saved')}['nsSummary','nsOtherCash','nsRoundCash'].forEach(x=>{if(nsEl(x))nsEl(x).value=''});['nsCredit','nsRecovery','nsBank','nsDiscount','nsExpense','nsProducts'].forEach(x=>{if(nsEl(x))nsEl(x).innerHTML=''});NS_DENOMS.forEach((d,i)=>{if(nsEl('nsNote'+i))nsEl('nsNote'+i).value='';nsCashLineTotal(i)});nsAddProduct();nsUpdateProductTotals();nsCalc()}
function printNewVehicleSettlement(){window.print()}
function renderAll(){applySavedFavicon();ensureMasterLists();db.vehicleSettlements=db.vehicleSettlements||[];db.shops=db.shops||[];nsDataLists();db.credits.forEach(x=>{if(x.shop&&!shopMasterFind(x.shop))upsertMasterShop(x.shop,x.party&&db.bookers.includes(x.party)?x.party:'')});optList('masterShopBooker',db.bookers,true);renderShopMaster();optList('vBooker',db.bookers,true);optList('vName',db.vehicles,true);optList('sVehicle',db.vehicles,true);filterSettlementVehicles();optList('sItem',db.products,true);optList('bName',db.bookers,true);optList('bkBooker',db.bookers,true);optList('vrParty',[...db.vehicles,...db.bookers],true);optList('cParty',['Office',...db.vehicles,...db.bookers],true);optList('bankAccount',db.banks,true);let bankNameOptions=document.getElementById('bankNameOptions');if(bankNameOptions)bankNameOptions.innerHTML=(db.banks||[]).map(x=>`<option value="${esc(x)}"></option>`).join('');renderBranding();refreshMasterUI();renderDashboard();renderVehicles();renderVehicleRecovery();renderStock();renderBookers();renderCredit();renderBanks();renderLoans();renderExpenses();renderClosing();renderCarryBalance();renderClosingHistory()}
function saveAhmadKhata(value){let amount=Math.max(0,Number(value)||0);let e=document.getElementById('ahmadKhataAmount');if(e)e.value=amount;renderClosing();}
 nsInit();
function nsDraftFields(){return [...document.querySelectorAll('#vehicles .ns-step input, #vehicles .ns-step select, #vehicles .ns-step textarea')].filter(e=>!['nsAutoSaveEvery','nsAutoSaveEnabled'].includes(e.id)&&e.type!=='button'&&e.type!=='submit')}
function nsCaptureDraft(){let fields=nsDraftFields();return {savedAt:new Date().toISOString(),fields:fields.map((e,i)=>({i,id:e.id||'',value:e.type==='checkbox'?e.checked:e.value,type:e.type})),fieldCount:fields.length}}
async function nsReadDraft(){await __storageInit;if(__dbStore)return new Promise((resolve,reject)=>{let tx=__dbStore.transaction('records','readonly'),r=tx.objectStore('records').get('vehicleSettlementDraft');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});try{return JSON.parse(sessionStorage.getItem('alqadir_vehicle_settlement_draft_v1')||'null')}catch(_){return null}}
async function nsWriteDraft(draft){await __storageInit;if(__dbStore)return new Promise((resolve,reject)=>{let tx=__dbStore.transaction('records','readwrite');tx.objectStore('records').put(draft,'vehicleSettlementDraft');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Draft backup failed'));tx.onabort=()=>reject(tx.error||new Error('Draft backup aborted'))});sessionStorage.setItem('alqadir_vehicle_settlement_draft_v1',JSON.stringify(draft))}
async function nsRestoreDraft(){try{let draft=await nsReadDraft();if(!draft)return;let fields=nsDraftFields();(draft.fields||[]).forEach(x=>{let e=x.id?nsEl(x.id):fields[x.i];if(!e||e.type!==x.type)return;if(e.type==='checkbox')e.checked=!!x.value;else e.value=x.value});nsUpdateProductTotals();nsCalc();let h=nsEl('nsAutoSaveHealth');if(h)h.textContent='Recovered unsaved draft from '+new Date(draft.savedAt).toLocaleString();}catch(err){console.warn('Draft restore issue',err);let h=nsEl('nsAutoSaveHealth');if(h)h.textContent='Draft restore issue: '+err.message}}
async function nsAutoSaveDraft(){let h=nsEl('nsAutoSaveHealth');if(!nsEl('nsAutoSaveEnabled')?.checked){if(h)h.textContent='Auto-save paused';return}try{let draft=nsCaptureDraft();await nsWriteDraft(draft);if(h)h.textContent='Draft backed up: '+new Date().toLocaleTimeString();}catch(err){if(h)h.textContent='Backup error: '+err.message;console.error('Draft backup failed',err)}}
let __nsAutoSaveTimer=null;
function nsStartAutoSave(){clearInterval(__nsAutoSaveTimer);let every=Number(nsEl('nsAutoSaveEvery')?.value)||30;__nsAutoSaveTimer=setInterval(nsAutoSaveDraft,every*1000);let h=nsEl('nsAutoSaveHealth');if(h)h.textContent='Auto-save timer: every '+every+' seconds';}
function nsSystemHealthCheck(){let e=nsEl('nsSystemHealth');if(!e)return;let storage=!!window.localStorage&&!!window.indexedDB;e.textContent='System: active · Storage: '+(storage?'available':'limited')+' · '+new Date().toLocaleTimeString();e.style.color=storage?'#137a49':'#b45309'}
nsRestoreDraft().then(()=>{nsStartAutoSave();});nsEl('nsAutoSaveEvery')?.addEventListener('change',nsStartAutoSave);nsEl('nsAutoSaveEnabled')?.addEventListener('change',()=>{if(nsEl('nsAutoSaveEnabled').checked)nsStartAutoSave();else{clearInterval(__nsAutoSaveTimer);nsAutoSaveDraft()}});setInterval(nsSystemHealthCheck,5000);nsSystemHealthCheck();


function renderAhmadKhata(){renderClosing()}
function renderDashboard(){
 let d=getDaily(),c=cashCalc(),date=today();
 const dateLabel=document.getElementById('dashboardDateLabel');if(dateLabel)dateLabel.textContent=date;

 const parties=[...db.bookers];
 let groups=parties.map(booker=>{
  let vehicles=db.vehicles.filter(v=>linkedBooker(v)===booker);
  let vtx=d.v.filter(x=>vehicles.includes(x.name));
  let btx=d.b.filter(x=>x.name===booker);
  let ledger=db.credits.filter(x=>x.date===date&&x.party===booker);
  let credit=ledger.some(x=>x.type==='new')?sum(ledger.filter(x=>x.type==='new'),'amount'):sum(vtx,'credit');
  let recovery=ledger.some(x=>x.type==='recovery')?sum(ledger.filter(x=>x.type==='recovery'),'amount'):(sum(vtx,'recovery')+sum(btx,'old'));
  let sales=sum(vtx,'sales')+sum(btx,'collection');
  let discount=sum(vtx,'discount');
  let bank=sum(vtx,'bank')+sum(btx,'bank');
  let expense=sum(vtx,'expense')+sum(btx,'expense');
  let cash=sum(vtx,'cash')+sum(btx,'cash');
  let remaining=sales+recovery-credit-discount-bank-expense-cash;
  return {name:booker,vehicles:vehicles.join(', '),sales,credit,recovery,discount,bank,expense,cash,remaining};
 });
 // Drivers without a linked booker remain visible as independent rows.
 db.vehicles.filter(v=>!linkedBooker(v)).forEach(v=>{
  let x=d.v.filter(t=>t.name===v),ledger=db.credits.filter(t=>t.date===date&&t.party===v);
  let credit=ledger.some(t=>t.type==='new')?sum(ledger.filter(t=>t.type==='new'),'amount'):sum(x,'credit');
  let recovery=ledger.some(t=>t.type==='recovery')?sum(ledger.filter(t=>t.type==='recovery'),'amount'):sum(x,'recovery');
  let sales=sum(x,'sales'),discount=sum(x,'discount'),bank=sum(x,'bank'),expense=sum(x,'expense'),cash=sum(x,'cash');
  groups.push({name:v,vehicles:v,sales,credit,recovery,discount,bank,expense,cash,remaining:sales+recovery-credit-discount-bank-expense-cash});
 });
 // Include the newer Booker / Driver Settlement module in the Dashboard.
 (db.vehicleSettlements||[]).filter(x=>x.date===date).forEach(x=>{
  let key=x.booker||x.driver,group=groups.find(g=>g.name===key);
  if(!group){group={name:key,vehicles:x.driver||'',sales:0,credit:0,recovery:0,discount:0,bank:0,expense:0,cash:0,remaining:0};groups.push(group)}
  group.sales+=Number(x.summary)||0;
  group.credit+=Number(x.credit)||0;
  group.recovery+=Number(x.recovery)||0;
  group.discount+=Number(x.discount)||0;
  group.bank+=Number(x.bank)||0;
  group.expense+=Number(x.expense)||0;
  group.cash+=Number(x.cash)||0;
  group.remaining+=Number(x.remaining)||0;
 });
 groups=groups.filter(x=>[x.sales,x.credit,x.recovery,x.discount,x.bank,x.expense,x.cash].some(v=>Math.abs(Number(v)||0)>0.000001));
 const fmt=x=>money(x);
 document.getElementById('dashBookerRows').innerHTML=groups.map(x=>`<tr><td><b>${esc(x.name)}</b>${x.vehicles?`<div class="muted">${esc(x.vehicles)}</div>`:''}</td><td class="num">${fmt(x.sales)}</td><td class="num">${fmt(x.credit)}</td><td class="num">${fmt(x.recovery)}</td><td class="num">${fmt(x.discount)}</td><td class="num">${fmt(x.bank)}</td><td class="num">${fmt(x.expense)}</td><td class="num"><b>${fmt(x.remaining)}</b></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No bookers or drivers configured.</td></tr>';
 const gt=k=>groups.reduce((a,x)=>a+(Number(x[k])||0),0);
 document.getElementById('dashBookerFoot').innerHTML=`<tr><td class="total-label">ALL BOOKERS / DRIVERS TOTAL</td>${['sales','credit','recovery','discount','bank','expense','remaining'].map(k=>`<td class="num">${fmt(gt(k))}</td>`).join('')}</tr>`;

const officeCredits=db.credits.filter(x=>x.date===date&&x.party==='Office');
 const officeBankTx=d.bt.filter(x=>['company','other','deposit','withdraw'].includes(x.type));
 const officeDiscount=Number(c.i.officeDiscount)||0, tax=c.tax||0;
 const officeCredit=sum(officeCredits.filter(x=>x.type==='new'),'amount');
 const officeRecovery=sum(officeCredits.filter(x=>x.type==='recovery'),'amount');
 const officeBank=officeBankTx.reduce((total,x)=>total+(x.type==='withdraw'?-Number(x.amount):Number(x.amount)),0);
 const officeExpense=sum(d.e,'amount')+tax;
 const bookCredit=gt('credit'),bookRecovery=gt('recovery'),bookDiscount=gt('discount'),bookBank=gt('bank'),bookExpense=gt('expense');
 const allDiscount=bookDiscount+officeDiscount,allBank=bookBank+officeBank,allExpense=bookExpense+officeExpense;
 const totalCredit=bookCredit+officeCredit,totalRecovery=bookRecovery+officeRecovery;
 const totalCashReceived=d.vehicleCash+d.bookerCash+d.oldRecovery+Number(c.i.otherIn);
 const saithCash=Number(c.i.otherOut)||0, ahmadKhata=Number(c.i.ahmadKhata)||0;
 const cashBeforeHandover=Number(c.i.opening)+d.sales+totalCashReceived-totalCredit-allDiscount-allExpense-tax-c.totalBankPayments;
 const cashInHand=cashBeforeHandover-saithCash-ahmadKhata;
 const rows=[
  ['Today Opening Balance',fmt(c.i.opening),''],
  ['Total Sales / Summary',fmt(d.sales),''],
  ['Total Cash Received (including Booker / Driver Recovery)',fmt(totalCashReceived),''],
  ['Total Market Credit (Udhaar)',fmt(totalCredit),''],
  ['Extra Discount',fmt(allDiscount),''],
  ['Total Expenses',fmt(allExpense),''],
  ['Advance Tax / S-Tax',fmt(tax),''],
  ['Company Online Payments',fmt(c.companyOnline),''],
  ['Total Bank Payments',fmt(c.totalBankPayments),''],
  ['Saith Cash (Owner Handover)',fmt(saithCash),''],
  ['Ahmad Khata',fmt(ahmadKhata),''],
  ['CASH IN HAND',fmt(cashInHand),'total']
 ];
 document.getElementById('dashReconciliation').innerHTML=rows.map((r,i)=>`<div class="cash-summary-card ${i===rows.length-1?'cash-summary-final':''}"><div class="cash-summary-label">${r[0]}</div><div class="cash-summary-value">${r[1]}</div></div>`).join('');
 const officeRows=officeCredits.length+officeBankTx.length+d.e.length;
 const expected=cashInHand,actual=c.i.actual===''?null:Number(c.i.actual),diff=actual===null?null:actual-expected;
 document.getElementById('checks').innerHTML=[['Booker / driver rows',groups.length+' listed'],['Office direct transactions',officeRows+' entries'],['Expected remaining cash',fmt(expected)],['Actual counted cash',actual===null?'Not entered':fmt(actual)],['Cash difference',diff===null?'Pending':diff<0?'Short by '+fmt(-diff):diff>0?'Excess '+fmt(diff):'Matched']].map(x=>`<p style="border-bottom:1px solid #edf0f4;padding:7px 0;margin:0"><span>${x[0]}</span><b style="float:right">${x[1]}</b></p>`).join('');
}
function saveVehicleRecovery(){let party=val('vrParty'),shop=val('vrShop').trim(),amount=n('vrAmount');if(!party||!shop||amount<=0)return alert('Booker / Driver, Shop Name aur Recovery Amount zaroori hain.');db.credits.push({id:id(),date:today(),shop,party,vehicle:db.vehicles.includes(party)?party:db.vehicles.find(v=>linkedBooker(v)===party)||'',type:'recovery',amount,notes:val('vrNotes')});['vrShop','vrAmount','vrNotes'].forEach(k=>document.getElementById(k).value='');persist()}
function renderVehicleRecovery(){const host=document.getElementById('vehicleRecoveryRows');if(!host)return;const b=val('vBooker'),v=val('vName');const rows=dayRows(db.credits).filter(x=>x.type==='recovery'&&(!b||x.party===b||x.party===v)&&(!v||!x.vehicle||x.vehicle===v));host.innerHTML=rows.map(x=>`<tr><td>${esc(x.shop)}</td><td>${esc(x.party)}</td><td>${esc(x.notes||'—')}</td><td class="num">${money(x.amount)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No recovery references for selected driver.</td></tr>'}
function renderVehicles(){let a=dayRows(db.vehicleTx);document.getElementById('vehicleCount').textContent=a.length+' records';document.getElementById('vehicleRows').innerHTML=a.map(x=>`<tr><td>${esc(x.name)}</td><td class="num">${money(x.sales)}</td><td class="num">${money(x.recovery)}</td><td class="num">${money(x.credit)}</td><td class="num">${money(x.discount)}</td><td class="num">${money(x.expense)}</td><td class="num">${money(x.bank)}</td><td class="num">${money(x.cash)}</td><td class="num">${money(vehicleDue(x))}</td><td><button class="btn small outline" onclick="printSavedVehicleSettlement('${x.id}')">Print</button> <button class="btn small secondary" onclick="editV('${x.id}')">Edit</button> <button class="btn small danger" onclick="del('vehicleTx','${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="10" class="empty">No records for selected date.</td></tr>'}
function renderBookers(){
 db.bookerLedger=db.bookerLedger||[];
 const filter=document.getElementById('bkDateFilter'),date=filter?.value||today();
 const rows=db.bookerLedger.filter(x=>x.date===date).sort((a,b)=>(a.booker||'').localeCompare(b.booker||'')||(a.shop||'').localeCompare(b.shop||''));
 const host=document.getElementById('bookerRows');
 if(host)host.innerHTML=rows.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.booker)}</td><td>${esc(x.shop)}</td><td class="num">${money(x.credit)}</td><td class="num">${money(x.recovery)}</td><td><button class="btn small outline" onclick="viewBookerLedgerEntry('${x.id}')">View</button> <button class="btn small secondary" onclick="editBookerLedgerEntry('${x.id}')">Edit</button> <button class="btn small outline" onclick="printBookerLedgerEntry('${x.id}')">Print / PDF</button> <button class="btn small danger" onclick="deleteBookerLedger('${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Is date ki koi Booker Settlement entry nahi.</td></tr>';
 const totals=document.getElementById('bookerLedgerTotals');
 if(totals)totals.innerHTML=`<tr><th colspan="3">TOTAL</th><th class="num">${money(sum(rows,'credit'))}</th><th class="num">${money(sum(rows,'recovery'))}</th><th></th></tr>`;
 const reportBooker=document.getElementById('bkReportBooker');
 if(reportBooker){const old=reportBooker.value;reportBooker.innerHTML='<option value="">All Bookers</option>'+(db.bookers||[]).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');if((db.bookers||[]).includes(old))reportBooker.value=old;}
}
function renderCredit(){let q=(document.getElementById('creditSearch')?.value||'').toLowerCase();let shops=[...new Set(db.credits.map(x=>x.shop))].filter(s=>s.toLowerCase().includes(q));document.getElementById('creditRows').innerHTML=shops.map(s=>{let t=creditTotals(s);return `<tr><td>${esc(s)}</td><td class="num">${money(t.opening)}</td><td class="num">${money(t.fresh)}</td><td class="num">${money(t.recovery)}</td><td class="num"><b>${money(t.opening+t.fresh-t.recovery)}</b></td><td><button class="btn small secondary" onclick="filterCreditShop('${esc(s).replace(/'/g,"\'")}')">History</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No shops found.</td></tr>';let h=dayRows(db.credits);document.getElementById('creditHistory').innerHTML=h.map(x=>`<tr><td>${x.date}</td><td>${esc(x.shop)}</td><td>${esc(x.party)}</td><td>${x.type}</td><td class="num">${money(x.amount)}</td><td>${esc(x.notes)}</td><td><button class="btn small danger" onclick="del('credits','${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No credit entries for selected date.</td></tr>'}
function filterCreditShop(s){document.getElementById('creditSearch').value=s;renderCredit()}
function renderBanks(){let manual=dayRows(db.bankTx);let automatic=[];(db.vehicleTx||[]).filter(x=>x.date===today()).forEach(v=>{let lines=(v.banks||[]).filter(z=>Number(z.amount)>0);if(lines.length)lines.forEach(z=>automatic.push({date:v.date,type:'Vehicle Auto Deposit',account:z.name||z.type||'Bank',by:v.name||v.booker,amount:Number(z.amount)||0,ref:z.ref||'Vehicle settlement',auto:true}));else if(Number(v.bank)>0)automatic.push({date:v.date,type:'Vehicle Auto Deposit',account:'Bank (specify in vehicle entry)',by:v.name||v.booker,amount:Number(v.bank)||0,ref:'Vehicle settlement',auto:true})});(db.vehicleSettlements||[]).filter(x=>x.date===today()).forEach(v=>{let lines=v.notes?.bank||[];lines.filter(z=>Number(z.amount)>0).forEach(z=>automatic.push({date:v.date,type:'Vehicle Auto Deposit',account:z.name||z.type||'Bank',by:v.driver||v.booker,amount:Number(z.amount)||0,ref:z.ref||'Vehicle settlement',auto:true}))});let all=[...automatic,...manual];let d=getDaily();let daily=document.getElementById('bankDailySummary');if(daily)daily.innerHTML=[['Cash Deposit (manual + vehicle/booker)',d.bankIn+d.vehicleBank+d.bookerBank],['Cash Online',d.cashOnline],['Total Physical Cash Out',d.bankIn+d.cashOnline+d.vehicleBank+d.bookerBank],['Company Online Payments',d.companyOnline]].map(x=>`<div class="metric"><div class="k">${x[0]}</div><div class="v">${money(x[1])}</div></div>`).join('');document.getElementById('bankRows').innerHTML=all.map(x=>{let label=x.type==='cashOnline'?'Cash Online — cash to online':x.type==='deposit'?'Cash Deposit':x.type;return `<tr><td>${x.date}</td><td>${esc(label)}</td><td>${esc(x.account)}</td><td>${esc(x.by||'')}</td><td class="num">${money(x.amount)}</td><td>${esc(x.ref||'')}</td><td>${x.auto?'<span class="pill">Auto</span>':`<button class="btn small danger" onclick="del('bankTx','${x.id}')">Delete</button>`}</td></tr>`}).join('')||'<tr><td colspan="7" class="empty">No bank transactions for selected date.</td></tr>';document.getElementById('bankSummary').innerHTML=db.banks.map(a=>{let x=all.filter(t=>t.account===a);let dep=sum(x.filter(t=>['deposit','Vehicle Auto Deposit','onlineIn','saithBank','saithOnline'].includes(t.type)),'amount'),online=sum(x.filter(t=>t.type==='cashOnline'),'amount'),co=sum(x.filter(t=>['company','onlineOut'].includes(t.type)),'amount'),w=sum(x.filter(t=>t.type==='withdraw'),'amount'),other=sum(x.filter(t=>t.type==='other'),'amount');return `<tr><td>${esc(a)}</td><td class="num">${money(dep)}</td><td class="num">${money(online)}</td><td class="num">${money(co)}</td><td class="num">${money(w)}</td><td class="num">${money(dep+online+w-co-other)}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Add bank accounts in Settings.</td></tr>'}
function renderExpenses(){let a=dayRows(db.expenses||[]),cash=a.filter(x=>x.method==='cash').reduce((t,x)=>t+(Number(x.amount)||0),0),bank=a.filter(x=>x.method==='bank').reduce((t,x)=>t+(Number(x.amount)||0),0),total=cash+bank,discount=(db.vehicleTx||[]).filter(x=>x.date===today()).reduce((t,x)=>t+(Number(x.discount)||0),0)+(db.vehicleSettlements||[]).filter(x=>x.date===today()).reduce((t,x)=>t+(Number(x.discount)||0),0);let sumHost=document.getElementById('expenseSummary');if(sumHost)sumHost.innerHTML=[['Total Extra Expenses',total],['Cash Expenses',cash],['Bank Expenses',bank],['Vehicle Settlement Discount',discount]].map(([k,v])=>`<div class="metric"><div class="k">${k}</div><div class="v">${money(v)}</div></div>`).join('');let host=document.getElementById('expenseRows');if(host)host.innerHTML=a.map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.category)}</td><td>${x.method==='cash'?'Physical cash':'Bank account'}</td><td>${esc(x.by)}</td><td class="num">${money(x.amount)}</td><td>${esc(x.notes)}</td><td><button class="btn small outline" onclick="printSavedExpense('${x.id}')">Print</button> <button class="btn small secondary" onclick="editExpense('${x.id}')">Edit</button> <button class="btn small danger" onclick="del('expenses','${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No expenses for selected date.</td></tr>'}
function expensePrintRows(arr){return `<table><thead><tr><th>#</th><th>Expense Title</th><th>Category</th><th>Payment</th><th>Paid By / Ref</th><th>Notes</th><th class="num">Amount (Rs.)</th></tr></thead><tbody>${arr.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.title)}</td><td>${esc(x.category)}</td><td>${x.method==='cash'?'Physical Cash':'Bank Account'}</td><td>${esc(x.by||'—')}</td><td>${esc(x.notes||'—')}</td><td class="num">${money(x.amount)}</td></tr>`).join('')||'<tr><td colspan="7">No expense entries</td></tr>'}</tbody></table>`}
function printSavedExpense(key){let x=(db.expenses||[]).find(r=>r.id===key);if(!x)return alert('Expense entry nahi mili.');let boxes=`<div class="pgrid"><div class="pbox"><small>Date</small><b>${esc(x.date)}</b></div><div class="pbox"><small>Category</small><b>${esc(x.category)}</b></div><div class="pbox"><small>Amount</small><b>${money(x.amount)}</b></div><div class="pbox"><small>Payment Method</small><b>${x.method==='cash'?'Physical Cash':'Bank Account'}</b></div><div class="pbox"><small>Paid By / Reference</small><b>${esc(x.by||'—')}</b></div></div>`;settlementPrintShell('Daily Expense Entry',`Individual expense · ${esc(x.date)} · ${esc(x.title)}`,`<h2>Expense Details</h2>${boxes}${expensePrintRows([x])}<p><b>Notes:</b> ${esc(x.notes||'—')}</p>`);}
function printExpenseReport(){let date=today(),arr=(db.expenses||[]).filter(x=>x.date===date),cash=arr.filter(x=>x.method==='cash').reduce((t,x)=>t+(Number(x.amount)||0),0),bank=arr.filter(x=>x.method==='bank').reduce((t,x)=>t+(Number(x.amount)||0),0),discount=(db.vehicleTx||[]).filter(x=>x.date===date).reduce((t,x)=>t+(Number(x.discount)||0),0)+(db.vehicleSettlements||[]).filter(x=>x.date===date).reduce((t,x)=>t+(Number(x.discount)||0),0),total=cash+bank;let boxes=`<div class="pgrid"><div class="pbox"><small>Date</small><b>${date}</b></div><div class="pbox"><small>Total Extra Expenses</small><b>${money(total)}</b></div><div class="pbox"><small>Cash Expenses</small><b>${money(cash)}</b></div><div class="pbox"><small>Bank Expenses</small><b>${money(bank)}</b></div><div class="pbox"><small>Vehicle Settlement Discount</small><b>${money(discount)}</b></div></div>`;settlementPrintShell('Daily Expense Report',`Daily expenses and vehicle discount summary · ${date}`,`<h2>Daily Summary</h2>${boxes}<h2>Expense Details</h2>${expensePrintRows(arr)}`);}
function renderClosingHistory(){document.getElementById('closingHistory').innerHTML=[...db.closings].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${x.date}</td><td class="num">${money(x.opening)}</td><td class="num">${money(x.expected)}</td><td class="num">${x.actual===null?'—':money(x.actual)}</td><td class="num">${x.difference===null?'—':money(x.difference)}</td><td>${esc(x.reason)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No saved closings yet.</td></tr>'}

function settlementPrintShell(title,subtitle,sections){
 const escP=v=>esc(v??'—');
 const html=`<div id="singleSettlementPrint"><style>
 #singleSettlementPrint{display:none;font-family:Arial,sans-serif;color:#17212b;background:#fff;padding:22px}
 #singleSettlementPrint h1{font-size:22px;margin:0 0 5px;color:#12344a}
 #singleSettlementPrint .psub{font-size:12px;color:#526273;margin-bottom:18px}
 #singleSettlementPrint h2{font-size:14px;margin:18px 0 8px;border-bottom:2px solid #d6e1e9;padding-bottom:5px}
 #singleSettlementPrint .pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
 #singleSettlementPrint .pbox{border:1px solid #d8e0e7;border-radius:6px;padding:8px}
 #singleSettlementPrint .pbox small{display:block;color:#64748b;font-size:10px;margin-bottom:4px}
 #singleSettlementPrint .pbox b{font-size:13px}
 #singleSettlementPrint table{width:100%;border-collapse:collapse;font-size:11px;margin:7px 0 12px}
 #singleSettlementPrint th,#singleSettlementPrint td{border:1px solid #cbd5df;padding:6px;text-align:left}
 #singleSettlementPrint th{background:#edf3f7}
 #singleSettlementPrint .num{text-align:right}
 #singleSettlementPrint .pfoot{margin-top:22px;border-top:1px solid #cbd5df;padding-top:8px;font-size:10px;color:#64748b}
 @media print{body.single-print-mode>*:not(#singleSettlementPrint){display:none!important}#singleSettlementPrint{display:block!important;position:absolute;inset:0;width:auto;padding:8mm} @page{size:A4 portrait;margin:8mm}}
 </style><h1>${title}</h1><div class="psub">${subtitle}</div>${sections}<div class="pfoot">Printed on ${new Date().toLocaleString()} · Al Qadir Traders</div></div>`;
 document.getElementById('singleSettlementPrint')?.remove();
 document.body.insertAdjacentHTML('beforeend',html);
 document.body.classList.add('single-print-mode');
 const cleanup=()=>{document.body.classList.remove('single-print-mode');document.getElementById('singleSettlementPrint')?.remove();window.removeEventListener('afterprint',cleanup)};
 window.addEventListener('afterprint',cleanup);
 setTimeout(()=>window.print(),150);
}
function printSavedVehicleSettlement(key){
 const x=(db.vehicleTx||[]).find(r=>r.id===key);if(!x)return alert('Vehicle settlement record nahi mila.');
 const stock=(db.stockTx||[]).filter(r=>r.date===x.date&&r.vehicle===x.name);
 const rows=(arr,cols,render)=>`<table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${arr.map(render).join('')||`<tr><td colspan="${cols.length}">No entries</td></tr>`}</tbody></table>`;
 const box=(label,value)=>`<div class="pbox"><small>${label}</small><b>${value}</b></div>`;
 const summary=`<div class="pgrid">${box('Date',esc(x.date))}${box('Booker',esc(x.booker))}${box('Vehicle / Driver',esc(x.name))}${box('Total Sales',money(x.sales))}${box('Market Recovery',money(x.recovery))}${box('Market Credit',money(x.credit))}${box('Discount',money(x.discount))}${box('Expenses',money(x.expense))}${box('Bank Deposits',money(x.bank))}${box('Cash Counted',money(x.cash))}${box('Shortage',money(x.short))}${box('Unsettled / Difference',money(vehicleDue(x)))}</div>`;
 const product=rows(stock,['Product','Loaded','Returned','Net','Unit'],r=>`<tr><td>${esc(r.item)}</td><td class="num">${r.loaded}</td><td class="num">${r.returned}</td><td class="num">${Number(r.loaded||0)-Number(r.returned||0)}</td><td>${esc(r.unit)}</td></tr>`);
 const lineRows=(arr)=>rows(arr||[],['Detail','Amount'],r=>`<tr><td>${esc(r.name||r.title||'—')}${r.ref?' · Ref: '+esc(r.ref):''}</td><td class="num">${money(r.amount)}</td></tr>`);
 const adjust=rows(x.adjustments||[],['Adjustment','Direction','Amount','Reference'],r=>`<tr><td>${esc(r.name||'Adjustment')}</td><td>${esc(r.direction||'—')}</td><td class="num">${money(r.amount)}</td><td>${esc(r.ref||r.notes||'—')}</td></tr>`);
 settlementPrintShell('Vehicle Settlement',`Individual saved settlement · ${esc(x.date)} · ${esc(x.name)}`,
 `<h2>Settlement Summary</h2>${summary}<h2>Product Stock Details</h2>${product}<h2>Expenses</h2>${lineRows(x.expenses)}<h2>Bank Deposits</h2>${lineRows(x.banks)}<h2>Adjustments</h2>${adjust}<p><b>Notes:</b> ${esc(x.notes||'—')}</p>`);
}

function vehicleSettlementReportHtml(filters={}){
 const all=(db.vehicleSettlements||[]).filter(r=>(!filters.from||r.date>=filters.from)&&(!filters.to||r.date<=filters.to)&&(!filters.booker||String(r.booker||'').toLowerCase()===filters.booker.toLowerCase())&&(!filters.driver||String(r.driver||'').toLowerCase()===filters.driver.toLowerCase())).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.booker||'').localeCompare(b.booker||''));
 if(!all.length)return '<!doctype html><html><body style="font:16px Arial;padding:30px">No settlement records found for selected filters.</body></html>';
 const company=db.companyName||db.agency?.name||'AL QADIR TRADERS',distributor=db.distributorName||'',fmt=n=>nsMoney(Number(n)||0),safe=v=>esc(v==null?'':String(v));
 const dates=[...new Set(all.map(r=>r.date))].sort();
 const sum=(rows,k)=>rows.reduce((t,r)=>t+(Number(r[k])||0),0);
 const products=rows=>{const m={};rows.forEach(r=>(r.products||[]).forEach(p=>{if(p.includeInTotal===false)return;const key=(p.product||'')+'|'+(p.unit||'');if(!m[key])m[key]={product:p.product||'',unit:p.unit||'',loaded:0,returned:0,net:0};m[key].loaded+=Number(p.loaded)||0;m[key].returned+=Number(p.returned)||0;m[key].net+=Number(p.net??((Number(p.loaded)||0)-(Number(p.returned)||0)))||0}));return Object.values(m)};
 const table=(heads,rows)=>`<table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${heads.length}">No entries</td></tr>`}</tbody></table>`;
 const detailRows=(rows,k)=>rows.flatMap(r=>(r.notes?.[k]||[]).map(v=>({date:r.date,booker:r.booker,driver:r.driver,name:v.name||v.shop||'—',ref:v.ref||'—',amount:Number(v.amount)||0})));
 const section=(date,rows)=>{
  const ps=products(rows),pRows=ps.map(p=>`<tr><td>${safe(p.product)}</td><td class="num">${p.loaded}</td><td class="num">${p.returned}</td><td class="num">${p.net}</td><td>${safe(p.unit)}</td></tr>`).join('');
  const moneyRows=k=>detailRows(rows,k).map(v=>`<tr><td>${safe(v.name)}</td><td>${safe(v.booker)}</td><td>${safe(v.ref)}</td><td class="num">${fmt(v.amount)}</td></tr>`).join('');
  const lineTotal=k=>detailRows(rows,k).reduce((a,v)=>a+v.amount,0);
  const plain=k=>rows.map(r=>`<div class="sumline"><span>${safe(r.booker)} — ${k}</span><b>${fmt(r[k])}</b></div>`).join('');
  const cashNotes=rows.reduce((t,r)=>t+(Number(r.cash)||0),0);
  const summary=`<div class="sumline"><span>Summary Amount</span><b>${fmt(sum(rows,'summary'))}</b></div><div class="sumline"><span>Market Credit</span><b>${fmt(lineTotal('credit'))}</b></div><div class="sumline"><span>Recovery</span><b>${fmt(lineTotal('recovery'))}</b></div><div class="sumline"><span>Bank</span><b>${fmt(lineTotal('bank'))}</b></div><div class="sumline"><span>Discount</span><b>${fmt(lineTotal('discount'))}</b></div><div class="sumline"><span>Expenses</span><b>${fmt(lineTotal('expense'))}</b></div><div class="sumline"><span>Remaining Balance</span><b>${fmt(sum(rows,'remaining'))}</b></div><div class="sumline"><span>Counted Cash</span><b>${fmt(cashNotes)}</b></div>`;
  const bookers=[...new Set(rows.map(r=>r.booker))];
  return `<section class="day"><h2>${safe(date)} — Daily Settlement</h2><div class="meta">${bookers.length===1?'Booker: '+safe(bookers[0]):'Bookers: '+safe(bookers.join(', '))} &nbsp; | &nbsp; Drivers: ${safe([...new Set(rows.map(r=>r.driver))].join(', '))}</div><h3>Product Summary</h3>${table(['Product','Loaded','Returned','Net','Unit'],pRows)}<h3>Booker-wise Summary</h3>${rows.map(r=>`<div class="sumline"><span>${safe(r.booker)} / ${safe(r.driver)} — Summary Amount</span><b>${fmt(r.summary)}</b></div>`).join('')}<h3>Market Credit — Shop-wise</h3>${table(['Shop Name','Booker','Reference','Amount'],moneyRows('credit')+`<tr class="total"><td colspan="3">Daily Credit Total</td><td class="num">${fmt(lineTotal('credit'))}</td></tr>`)}<h3>Recovery — Shop-wise</h3>${table(['Shop Name','Booker','Reference','Amount'],moneyRows('recovery')+`<tr class="total"><td colspan="3">Daily Recovery Total</td><td class="num">${fmt(lineTotal('recovery'))}</td></tr>`)}<h3>Bank Payments</h3>${table(['Bank / Detail','Booker','Reference','Amount'],moneyRows('bank')+`<tr class="total"><td colspan="3">Daily Bank Total</td><td class="num">${fmt(lineTotal('bank'))}</td></tr>`)}<h3>Discounts</h3>${table(['Detail','Booker','Reference','Amount'],moneyRows('discount')+`<tr class="total"><td colspan="3">Daily Discount Total</td><td class="num">${fmt(lineTotal('discount'))}</td></tr>`)}<h3>Expenses</h3>${table(['Expense','Booker','Reference','Amount'],moneyRows('expense')+`<tr class="total"><td colspan="3">Daily Expense Total</td><td class="num">${fmt(lineTotal('expense'))}</td></tr>`)}<h3>Daily Financial Summary</h3>${summary}</section>`;
 };
 const grand={summary:sum(all,'summary'),credit:0,recovery:0,bank:0,discount:0,expense:0,remaining:sum(all,'remaining'),cash:sum(all,'cash')};
 ['credit','recovery','bank','discount','expense'].forEach(k=>grand[k]=detailRows(all,k).reduce((a,v)=>a+v.amount,0));
 const dayHtml=dates.map(d=>section(d,all.filter(r=>r.date===d))).join('');
 const grandHtml=Object.entries({ 'Summary Amount':grand.summary,'Market Credit':grand.credit,'Recovery':grand.recovery,'Bank':grand.bank,'Discount':grand.discount,'Expenses':grand.expense,'Remaining Balance':grand.remaining,'Counted Cash':grand.cash}).map(([k,v])=>`<div class="sumline"><span>${k}</span><b>${fmt(v)}</b></div>`).join('');
 const showGrand=!!(filters.from&&filters.to&&filters.from!==filters.to);
 return `<!doctype html><html><head><meta charset="utf-8"><title>Vehicle Settlement Report</title><style>*{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#202a34;margin:14mm}.brand{text-align:center;border-bottom:2px solid #17324d;padding-bottom:8px}.company{font-size:18px;font-weight:800}.dist{font-size:11px;margin-top:3px}h1{text-align:center;font-size:18px;margin:12px 0 5px;color:#17324d}.meta{text-align:center;margin:5px 0 10px;color:#475569}.range{text-align:center;font-weight:bold;margin-bottom:14px}h2{font-size:14px;color:#17324d;border-bottom:1px solid #9aa8b5;padding-bottom:5px;margin:18px 0 7px}h3{font-size:11px;margin:12px 0 5px;color:#263b50}table{width:100%;border-collapse:collapse;margin:5px 0 9px;font-size:10px}th,td{padding:5px 6px;text-align:left;border-bottom:1px solid #d9e0e6}th{background:#f1f4f7;border-top:1px solid #b9c4ce}.num{text-align:right}.total td{font-weight:800;border-top:1px solid #667788}.sumline{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e4e9ee}.day{break-inside:avoid-page}.grand{margin-top:20px;border-top:3px double #17324d;padding-top:8px}.toolbar{text-align:right;margin-bottom:10px}.toolbar button{padding:8px 13px;background:#a71932;color:white;border:0;border-radius:4px}@media print{.toolbar{display:none}@page{size:A4 portrait;margin:10mm}body{margin:0}.day{break-inside:auto}tr{break-inside:avoid}}</style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div><div class="brand"><div class="company">${safe(company)}</div>${distributor?`<div class="dist">Distributor: ${safe(distributor)}</div>`:''}</div><h1>VEHICLE SETTLEMENT REPORT</h1><div class="range">${showGrand?`Period: ${safe(filters.from||dates[0])} to ${safe(filters.to||dates[dates.length-1])}`:`Date: ${safe(filters.from||dates[0])}`}</div>${dayHtml}${showGrand?`<div class="grand"><h2>GRAND TOTAL — COMPLETE PERIOD</h2>${grandHtml}</div>`:''}</body></html>`;
}
function vehicleReportHtml(x){return vehicleSettlementReportHtml({from:x.date,to:x.date,booker:x.booker,driver:x.driver});}
function openVehicleReport(filters,autoPrint=false){const html=vehicleSettlementReportHtml(filters),w=window.open('','_blank');if(!w)return alert('Report window blocked. Browser mein pop-ups allow karein.');w.document.open();w.document.write(html);w.document.close();if(autoPrint)setTimeout(()=>{w.focus();w.print()},450)}
function viewBookerDriverSettlement(key){const x=(db.vehicleSettlements||[]).find(r=>r.id===key);if(!x)return alert('Settlement record nahi mila.');openVehicleReport({from:x.date,to:x.date,booker:x.booker,driver:x.driver},false)}
function downloadVehicleSettlementPDF(key){const x=(db.vehicleSettlements||[]).find(r=>r.id===key);if(!x)return alert('Settlement record nahi mila.');openVehicleReport({from:x.date,to:x.date,booker:x.booker,driver:x.driver},true)}
function printBookerDriverSettlement(key){const x=(db.vehicleSettlements||[]).find(r=>r.id===key);if(!x)return alert('Settlement record nahi mila.');openVehicleReport({from:x.date,to:x.date,booker:x.booker,driver:x.driver},true)}
function clearVehicleReportFilters(){const d=nsEl('nsDate')?.value||today();['nsReportBooker','nsReportDriver'].forEach(k=>{if(nsEl(k))nsEl(k).value=''});if(nsEl('nsReportFrom'))nsEl('nsReportFrom').value=d;if(nsEl('nsReportTo'))nsEl('nsReportTo').value=d}
function printWorkingDateSettlement(){const date=nsEl('nsDate')?.value||nsEl('workDate')?.value||today();openVehicleReport({from:date,to:date},true)}
function printVehicleSettlementSelection(){const from=nsEl('nsReportFrom')?.value||nsEl('nsDate')?.value||today(),to=nsEl('nsReportTo')?.value||from,booker=(nsEl('nsReportBooker')?.value||'').trim(),driver=(nsEl('nsReportDriver')?.value||'').trim();if(from>to)return alert('From Date, To Date se baad ki nahi ho sakti.');openVehicleReport({from,to,booker,driver},false)}
function printPage(){
 const active=document.querySelector('.page.active');
 if(!active){window.print();return;}
 const old=document.getElementById('professionalPrintRoot');if(old)old.remove();
 const root=document.createElement('div');root.id='professionalPrintRoot';
 const clone=active.cloneNode(true);clone.classList.add('professional-print-content');
 clone.querySelectorAll('button,.no-print,[data-no-print="true"]').forEach(el=>el.remove());
 clone.querySelectorAll('.page-head').forEach(el=>el.remove());
 clone.querySelectorAll('input,select,textarea').forEach(el=>{
   if(el.type==='hidden')return;
   const value=el.tagName==='SELECT'?(el.selectedOptions[0]?.textContent||''):el.value;
   const span=document.createElement('span');span.className='print-field-value';span.textContent=value||'—';el.replaceWith(span);
 });
 const pageNames={dashboard:'Daily Dashboard',vehicles:'Vehicle Settlement Report',bookers:'Booker Settlement Report',credit:'Market Credit Ledger',banks:'Bank & Company Report',loans:'Loan Management Report',expenses:'Daily Expense Report',closing:'Daily Cash Closing Report',shops:'Shop Master List',bookerMaster:'Booker Master List',driverMaster:'Driver / Vehicle Master List',productMaster:'Product Master List',bankMaster:'Bank Master List',settings:'Business Settings',reports:'Business Report'};
 let title=pageNames[active.id]||'Business Report';
 if(active.id==='reports'){
   const sel=document.getElementById('reportType');
   if(sel&&sel.selectedOptions[0])title=sel.selectedOptions[0].textContent+' Report';
 }
 const agency=(db&&db.agency&&db.agency.name)||'AL QADIR TRADERS';
 const dateFrom=document.getElementById('reportFrom')?.value||document.getElementById('nsDate')?.value||document.getElementById('bkDate')?.value||document.getElementById('closingDate')?.value||'';
 const dateTo=document.getElementById('reportTo')?.value||dateFrom;
 const dateLabel=dateFrom?(dateTo&&dateTo!==dateFrom?dateFrom+' to '+dateTo:dateFrom):((document.getElementById('workingDate')?.value)||new Date().toLocaleDateString());
 const header=document.createElement('header');header.className='print-report-header';
 const logo=(db&&db.agency&&db.agency.logo)||'';
 header.innerHTML='<div class="print-brand">'+(logo?'<img class="print-logo" alt="Business logo">':'<div class="print-logo-placeholder">AQ</div>')+'<div><div class="print-company"></div><div class="print-company-sub">COCA-COLA COMPANY • DAILY DISTRIBUTION & SETTLEMENT</div></div></div><div class="print-report-title"></div><div class="print-report-meta"></div>';
 header.querySelector('.print-company').textContent=agency;
 header.querySelector('.print-report-title').textContent=title;
 header.querySelector('.print-report-meta').textContent='Report Period: '+dateLabel+'   |   Generated: '+new Date().toLocaleString();
 if(logo)header.querySelector('img').src=logo;
 root.appendChild(header);root.appendChild(clone);
 const footer=document.createElement('footer');footer.className='print-report-footer';footer.textContent='AL QADIR TRADERS  •  Computer Generated Report  •  Please verify figures with original entries';root.appendChild(footer);
 document.body.appendChild(root);
 const cleanup=()=>{root.remove();window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup);
 setTimeout(()=>window.print(),120);
}
function exportBackup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='CocaCola-Agency-Backup-'+today()+'.json';a.click();URL.revokeObjectURL(a.href)}
function restoreBackup(ev){let f=ev.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.vehicleTx||!x.credits)throw Error('Invalid backup');if(!confirm('Restore backup? Current local data will be replaced.'))return;db={...blank(),...x};persist();alert('Backup restored.')}catch(e){alert('Could not restore: '+e.message)}};r.readAsText(f);ev.target.value=''}
function clearAll(){if(!confirm('This will permanently delete all records saved in this browser. Download a backup first. Continue?'))return;if(!confirm('Final confirmation: delete ALL local agency data?'))return;db=blank();persist()}
function buildReport(){let from=val('reportFrom'),to=val('reportTo'),type=val('reportType');
 if(type==='vehicleDaily'){
  const all=(db.vehicleSettlements||[]).filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.booker||'').localeCompare(b.booker||'')||(a.driver||'').localeCompare(b.driver||''));
  const days=[...new Set(all.map(x=>x.date))];
  const money=v=>nsMoney(v).replace(/^Rs\.\s*/,'');
  const dailyPages=days.map(day=>{
   const recs=all.filter(x=>x.date===day), inp=db.dailyInputs?.[day]||{};
   const sum=k=>recs.reduce((a,x)=>a+(Number(x[k])||0),0);
   const totalSummary=sum('summary'),credit=sum('credit'),debit=sum('recovery'),discount=sum('discount'),bank=sum('bank'),expense=sum('expense');
   const denom=[5000,1000,500,100,50,20,10,5].map(d=>({d,q:recs.reduce((a,x)=>a+(x.cashNotes||[]).filter(n=>Number(n.denomination)===d).reduce((b,n)=>b+(Number(n.quantity)||0),0),0)}));
   const counted=denom.reduce((a,x)=>a+x.d*x.q,0)+recs.reduce((a,x)=>a+(Number(x.otherCash)||0)+(Number(x.roundCash)||0),0);
   const loanIn=Number(inp.loanCashIn)||0,loanOut=Number(inp.loanReturn)||0;
   const rows=recs.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.booker||'—')} / ${esc(x.driver||'—')}</td><td class="num">${money(x.summary)}</td><td class="num">${money(x.credit)}</td><td class="num">${money(x.recovery)}</td><td class="num">${money(x.discount)}</td><td class="num">${money(x.bank)}</td><td class="num">${money(x.expense)}</td></tr>`).join('');
   const totalRow=`<tr class="grand"><th colspan="2">TOTAL</th><th>${money(totalSummary)}</th><th>${money(credit)}</th><th>${money(debit)}</th><th>${money(discount)}</th><th>${money(bank)}</th><th>${money(expense)}</th></tr>`;
   const cashRows=[['Yesterday Cash / Opening',Number(inp.opening)||0],['Total Today Summary Cash',totalSummary],['Cash Credit',credit],['Cash Debit / Recovery',debit],['Extra Discount',discount],['Expense',expense],['Bank Cash',bank],['Loan Cash In',loanIn],['Loan Return',loanOut],['Cash In Hand (calculated)',(Number(inp.opening)||0)+totalSummary-credit+debit-discount-expense-bank+loanIn-loanOut]];
   const denRows=denom.map(x=>`<tr><td>${x.d.toLocaleString('en-PK')}</td><td class="num">${x.q}</td><td class="num">${money(x.d*x.q)}</td></tr>`).join('');
   return `<section class="vehicle-daily-onepage"><header class="vd-head"><div class="vd-brand">${esc(db.companyName||'Al Qadir Trader')} <span>(CocaCola Company)</span></div><div class="vd-date">Date: ${esc(day)}</div></header><table class="vd-main"><thead><tr><th>PSO / DRIVER</th><th>SUMMARY</th><th>CREDIT</th><th>DEBIT</th><th>DISCOUNT</th><th>BANK</th><th>EXPENSE</th></tr></thead><tbody>${rows||'<tr><td colspan="7">No vehicle entries</td></tr>'}</tbody><tfoot>${totalRow}</tfoot></table><div class="vd-lower"><div><h3>CASH &amp; LEDGER SUMMARY</h3><table class="vd-summary">${cashRows.map(([k,v])=>`<tr><td>${k}</td><td class="num">${money(v)}</td></tr>`).join('')}<tr><td>Actual Cash Counted</td><td class="num">${money(inp.actual===''||inp.actual==null?counted:inp.actual)}</td></tr><tr><td>Cash Difference</td><td class="num">${money((Number(inp.actual===''||inp.actual==null?counted:inp.actual)||0)-((Number(inp.opening)||0)+totalSummary-credit+debit-discount-expense-bank+loanIn-loanOut))}</td></tr></table></div><div><h3>CASH DENOMINATION &amp; OTHER BREAKDOWN</h3><table class="vd-denom"><thead><tr><th>NOTE</th><th>QTY</th><th>AMOUNT</th></tr></thead><tbody>${denRows}<tr><th colspan="2">TOTAL CASH</th><th class="num">${money(counted)}</th></tr></tbody></table></div></div><footer class="vd-foot">AL QADIR TRADERS · Daily combined vehicle &amp; cash report</footer></section>`;
  }).join('');
  const css=`<style>.vehicle-daily-onepage{background:#fff;color:#17212b;padding:12px;margin:0 auto 16px;max-width:900px;font-family:Arial,sans-serif}.vd-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #234e70;padding:0 2px 9px;margin-bottom:10px}.vd-brand{font-size:19px;font-weight:900;color:#234e70}.vd-brand span{font-size:13px;font-weight:400;font-style:italic;color:#555}.vd-date{font-size:10px;font-weight:700}.vd-main,.vd-summary,.vd-denom{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}.vd-main th,.vd-main td,.vd-summary td,.vd-denom th,.vd-denom td{border:1px solid #c4ccd3;padding:5px 4px}.vd-main thead th,.vd-lower h3{background:#234e70;color:#fff}.vd-main th{text-align:center}.vd-main td.num,.vd-main th:not(:first-child){text-align:right}.vd-main td:nth-child(2){text-align:left}.vd-main tfoot .grand{background:#dce7ef;font-weight:900}.vd-lower{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.vd-lower h3{font-size:10px;text-align:center;margin:0;padding:6px}.vd-summary td:first-child{font-weight:600}.vd-summary td.num,.vd-denom td.num,.vd-denom th.num{text-align:right}.vd-foot{text-align:center;font-size:8px;color:#667788;margin-top:9px}@media print{@page{size:A4 portrait;margin:7mm}body{background:#fff!important}.vehicle-daily-onepage{max-width:none;padding:0;margin:0;break-after:page;page-break-after:always}.vehicle-daily-onepage:last-child{break-after:auto;page-break-after:auto}.vd-main,.vd-summary,.vd-denom{font-size:8px}.vd-main th,.vd-main td,.vd-summary td,.vd-denom th,.vd-denom td{padding:4px 3px}.vd-lower{gap:8px;margin-top:12px}}</style>`;
  document.getElementById('reportOutput').innerHTML=css+(dailyPages||'<p class="empty">Selected date range mein koi saved vehicle settlement nahi mila.</p>');
  return;
 }
 if(type==='dailySale'){
  const all=(db.vehicleSettlements||[]).filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||(a.booker||'').localeCompare(b.booker||'')||(a.driver||'').localeCompare(b.driver||''));
  const days=[...new Set(all.map(x=>x.date))];
  const fmt=v=>nsMoney(Number(v)||0).replace(/^Rs\.?\s*/,'');
  const pages=days.map(day=>{
   const recs=all.filter(x=>x.date===day), inp=db.dailyInputs?.[day]||{};
   const total=k=>recs.reduce((a,x)=>a+(Number(x[k])||0),0);
   const summary=total('summary'),credit=total('credit'),debit=total('recovery'),discount=total('discount'),bank=total('bank'),expense=total('expense');
   const denom=[5000,1000,500,100,75,50,20,10].map(d=>({d,q:recs.reduce((a,x)=>a+(x.cashNotes||[]).filter(n=>Number(n.denomination)===d).reduce((b,n)=>b+(Number(n.quantity)||0),0),0)}));
   const denominationTotal=denom.reduce((a,x)=>a+x.d*x.q,0);
   const extraCash=recs.reduce((a,x)=>a+(Number(x.otherCash)||0)+(Number(x.roundCash)||0),0);
   const counted=denominationTotal+extraCash;
   const loan=db.loans?.filter(x=>x.date===day)||[];
   const loanIn=loan.filter(x=>x.type==='in').reduce((a,x)=>a+(Number(x.amount)||0),0)+(Number(inp.loanCashIn)||0);
   const loanReturn=loan.filter(x=>x.type==='return').reduce((a,x)=>a+(Number(x.amount)||0),0)+(Number(inp.loanReturn)||0);
   const actual=inp.actual===''||inp.actual==null?counted:Number(inp.actual)||0;
   const rows=recs.map(x=>{const stockReturn=(x.products||[]).reduce((a,p)=>a+(Number(p.returned)||0),0);return `<tr><td>${esc(x.booker||'—')} / ${esc(x.driver||'—')}</td><td class="num">${fmt(x.summary)}</td><td class="num">${stockReturn.toLocaleString('en-PK')}</td><td class="num">${fmt(x.summary)}</td><td class="num">${fmt(x.credit)}</td><td class="num">${fmt(x.recovery)}</td><td class="num">${fmt(x.discount)}</td><td class="num">${fmt(x.bank)}</td><td class="num">${fmt(x.expense)}</td></tr>`}).join('');
   const totalRow=`<tr class="grand"><th>TOTAL</th><th>${fmt(summary)}</th><th>${recs.reduce((a,x)=>a+(x.products||[]).reduce((b,p)=>b+(Number(p.returned)||0),0),0).toLocaleString('en-PK')}</th><th>${fmt(summary)}</th><th>${fmt(credit)}</th><th>${fmt(debit)}</th><th>${fmt(discount)}</th><th>${fmt(bank)}</th><th>${fmt(expense)}</th></tr>`;
   const cashRows=[['YESTERDAY CASH / OPENING',inp.opening],['TOTAL TODAY SUMMARY CASH',summary],['CASH CREDIT / وصول',credit],['CASH DEBIT / اُدھار',debit],['EXTRA DISCOUNT',discount],['EXPENSE',expense],['BANK CASH',bank],['CASH IN HAND (COUNTED)',actual],['MIX CASH / OTHER CASH',extraCash]];
   const cashTable=cashRows.map(([k,v])=>`<tr><td>${k}</td><td class="num">${fmt(v)}</td></tr>`).join('');
   const denRows=denom.map(x=>`<tr><td>${x.d.toLocaleString('en-PK')}</td><td class="num">${x.q}</td><td class="num">${fmt(x.d*x.q)}</td></tr>`).join('');
   return `<section class="daily-sale-onepage"><header class="ds-head"><div class="ds-brand">${esc(db.companyName||'Al Qadir Trader')} <span>(Coca-Cola Company)</span></div><div class="ds-date">Date: ${esc(day)}</div></header><table class="ds-main"><thead><tr><th>PSO / DRIVER</th><th>SUMMARY</th><th>STOCK RETURN</th><th>SUMMARY</th><th>CREDIT</th><th>DEBIT</th><th>DISCOUNT</th><th>BANK</th><th>EXPENSE</th></tr></thead><tbody>${rows||'<tr><td colspan="9">No vehicle settlements</td></tr>'}</tbody><tfoot>${totalRow}</tfoot></table><div class="ds-lower"><div><h3>CASH &amp; LEDGER SUMMARY</h3><table class="ds-cash">${cashTable}<tr><td>LOAN CASH IN</td><td class="num">${fmt(loanIn)}</td></tr><tr><td>LOAN RETURN</td><td class="num">${fmt(loanReturn)}</td></tr><tr><td>COMPANY ONLINE</td><td class="num">${fmt((db.bankTx||[]).filter(x=>x.date===day&&['company','onlineIn','onlineOut'].includes(x.type)).reduce((a,x)=>a+(Number(x.amount)||0),0))}</td></tr><tr><td>MONTHLY EXPENSE</td><td class="num">${fmt((db.expenses||[]).filter(x=>x.date===day&&x.category==='Monthly').reduce((a,x)=>a+(Number(x.amount)||0),0))}</td></tr><tr><td>S-TAX</td><td class="num">${fmt(inp.advanceTax)}</td></tr></table></div><div><h3>CASH DENOMINATION &amp; OTHER BREAKDOWN</h3><table class="ds-denom"><thead><tr><th>NOTE</th><th>QTY</th><th>AMOUNT</th></tr></thead><tbody>${denRows}<tr><td>OTHER / COINS</td><td class="num">—</td><td class="num">${fmt(extraCash)}</td></tr><tr class="grand"><th colspan="2">TOTAL CASH</th><th class="num">${fmt(counted)}</th></tr></tbody></table></div></div><footer class="ds-foot">AL QADIR TRADERS · DAILY SALE REPORT</footer></section>`;
  }).join('');
  const css=`<style>.daily-sale-onepage{background:#fff;color:#17212b;padding:4px;margin:0 auto 16px;max-width:760px;font-family:Arial,sans-serif}.ds-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #234e70;padding:0 2px 7px;margin-bottom:8px}.ds-brand{font-size:19px;font-weight:900;color:#234e70}.ds-brand span{font-size:13px;font-weight:400;font-style:italic;color:#555}.ds-date{font-size:10px;font-weight:700}.ds-main,.ds-cash,.ds-denom{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}.ds-main th,.ds-main td,.ds-cash td,.ds-denom th,.ds-denom td{border:0;border-bottom:1px solid #d7dde3;padding:4px 3px}.ds-main thead th,.ds-lower h3{background:#234e70;color:#fff}.ds-main th{text-align:center}.ds-main td:first-child{text-align:left}.ds-main td.num,.ds-main th:not(:first-child){text-align:right}.ds-main tfoot .grand,.ds-denom .grand{background:#dce7ef;font-weight:900}.ds-lower{display:grid;grid-template-columns:1fr;gap:10px;margin-top:10px}.ds-lower h3{font-size:10px;text-align:center;margin:0;padding:6px}.ds-cash td:first-child{font-weight:600}.ds-cash td.num,.ds-denom td.num,.ds-denom th.num{text-align:right}.ds-foot{text-align:center;font-size:8px;color:#667788;margin-top:8px}@media print{@page{size:A4 portrait;margin:9mm}body{background:#fff!important}.daily-sale-onepage{max-width:none;padding:0;margin:0;break-after:page;page-break-after:always}.daily-sale-onepage:last-child{break-after:auto;page-break-after:auto}.ds-main,.ds-cash,.ds-denom{font-size:7px}.ds-main th,.ds-main td,.ds-cash td,.ds-denom th,.ds-denom td{padding:3px 2px}.ds-lower{gap:7px;margin-top:8px}}
/* Professional report printing: screen UI remains unchanged */
#professionalPrintRoot{display:none}
@media print{
 @page{size:A4 portrait;margin:9mm}
 body>*:not(#professionalPrintRoot){display:none!important}
 #professionalPrintRoot{display:block!important;color:#17212b!important;background:#fff!important;font-family:Arial,Helvetica,sans-serif!important;font-size:10pt!important;line-height:1.3!important}
 #professionalPrintRoot *{box-sizing:border-box!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}
 .print-report-header{border-bottom:3px solid #b71932;padding:0 0 9px;margin:0 0 12px}
 .print-brand{display:flex;align-items:center;gap:12px;margin-bottom:8px}
 .print-logo,.print-logo-placeholder{width:40px;height:40px;object-fit:contain;border-radius:0}
 .print-logo-placeholder{display:flex;align-items:center;justify-content:center;background:transparent;color:#b71932;font-size:20pt;font-weight:800;border-bottom:2px solid #b71932}
 .print-company{font-size:19pt;font-weight:800;color:#173f63;letter-spacing:.3px}
 .print-company-sub{font-size:8pt;color:#536575;letter-spacing:1px}
 .print-report-title{font-size:15pt;font-weight:800;text-transform:uppercase;color:#b71932;margin:5px 0}
 .print-report-meta{font-size:8.5pt;color:#475569}
 .professional-print-content{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;background:#fff!important}
 .professional-print-content .panel,.professional-print-content .notice,.professional-print-content .cards,.professional-print-content .grid,.professional-print-content .grid2{break-inside:avoid;box-shadow:none!important}
 .professional-print-content .panel{border:0!important;border-radius:0!important;border-bottom:1px solid #d9e0e6!important;margin:0 0 10px!important;padding:4px 0 8px!important;background:transparent!important}
 .professional-print-content h2,.professional-print-content h3{color:#173f63!important;margin:5px 0 7px!important}
 .professional-print-content table{width:100%!important;border-collapse:collapse!important;font-size:8.5pt!important;}
 .professional-print-content th{background:#edf2f6!important;color:#173f63!important;font-weight:700!important;border-bottom:2px solid #234e70!important}
 .professional-print-content th,.professional-print-content td{border:0!important;border-bottom:1px solid #d9e0e6!important;padding:5px 6px!important;vertical-align:top!important}
 .professional-print-content tr{break-inside:avoid!important}
 .professional-print-content .cards{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
 .professional-print-content .card{border:0!important;border-bottom:1px solid #d9e0e6!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
 .professional-print-content .form-grid{gap:5px 10px!important}
 .professional-print-content .field{min-width:0!important}
 .professional-print-content label{font-weight:700!important;color:#475569!important}
 .print-field-value{display:inline-block;min-height:18px;padding:2px 4px;border-bottom:1px solid #d5dde5;color:#17212b!important;white-space:pre-wrap;overflow-wrap:anywhere}
 .print-report-footer{border-top:1px solid #cbd5df;margin-top:12px;padding-top:5px;text-align:center;color:#64748b;font-size:7.5pt}
}

/* Al Qadir Traders premium office theme + subtle brand watermark */
:root{--aq-burgundy:#9f1028;--aq-red:#d51c35;--aq-gold:#c49a55;--aq-wood:#5a3828}
body{background:linear-gradient(135deg,#f8f5f1 0%,#f3f4f6 52%,#fff8f5 100%)}
main{position:relative;isolation:isolate}
main:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:linear-gradient(rgba(250,248,245,.91),rgba(250,248,245,.94)),url("www/assets/aq-office-dashboard.png");background-size:cover;background-position:center;background-attachment:fixed;opacity:.30}
.menu-rail{background-image:linear-gradient(rgba(255,255,255,.91),rgba(250,247,243,.94)),url("www/assets/aq-office-dashboard.png");background-size:cover;background-position:center}
.menu-group{background:rgba(255,255,255,.88);backdrop-filter:blur(7px);border-color:#eadfd3}
.menu-toggle{background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(248,241,235,.94))}
.btn,.nav,.menu-toggle{position:relative;overflow:hidden}
.water-ripple{position:absolute;border-radius:50%;pointer-events:none;z-index:8;transform:scale(0);background:radial-gradient(circle,rgba(255,255,255,.52) 0%,rgba(255,255,255,.20) 38%,rgba(213,28,53,.12) 60%,transparent 72%);border:1px solid rgba(255,255,255,.75);animation:aqWaterRipple .72s ease-out forwards}
@keyframes aqWaterRipple{0%{transform:scale(.04);opacity:.9}65%{opacity:.5}100%{transform:scale(1);opacity:0}}
::view-transition-old(root){animation:aqScreenClose .28s ease-in both}
::view-transition-new(root){animation:aqScreenOpen .38s cubic-bezier(.2,.75,.25,1) both}
@keyframes aqScreenOpen{from{clip-path:circle(0% at 50% 50%);opacity:.75}to{clip-path:circle(150% at 50% 50%);opacity:1}}
@keyframes aqScreenClose{from{clip-path:circle(150% at 50% 50%);opacity:1}to{clip-path:circle(0% at 50% 50%);opacity:.6}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}::view-transition-old(root),::view-transition-new(root){animation:none}}

/* Compact menu, red/white navigation borders and profile controls */
.menu-group{margin:7px 0;background:rgba(255,255,255,.96)!important;border:1px solid #e8c6cb!important;border-radius:12px!important;box-shadow:0 2px 8px rgba(159,16,40,.07)!important;overflow:hidden!important}
.menu-toggle{min-height:42px!important;height:42px!important;padding:9px 11px!important;flex:0 0 42px!important;border:1px solid #f0d7da!important;border-radius:10px!important;background:linear-gradient(110deg,#fff 0%,#fff7f8 100%)!important;color:#94142a!important}
.menu-group.open{height:auto!important;min-height:0!important;background:rgba(255,248,249,.97)!important;border-color:#dba3ad!important}
.menu-group.open .menu-toggle{height:42px!important;min-height:42px!important;background:linear-gradient(100deg,#b51f35,#d93a50)!important;color:#fff!important}
.menu-options{padding:5px 6px 7px!important;background:rgba(255,255,255,.92);gap:2px!important}
.nav{border:1px solid transparent!important;transform:none!important;transition:background .18s,border-color .18s,color .18s!important}
.nav:hover{transform:translateY(-1px)!important;border-color:#e7aeb7!important;background:#fff1f3!important;box-shadow:0 2px 7px rgba(181,31,53,.10)!important}
.nav.active{border-color:#9f1028!important;background:linear-gradient(100deg,#a9112a,#d92340)!important;color:#fff!important}
.profile-wrap{position:relative}
.profile-trigger{display:flex;align-items:center;gap:7px;border:1px solid #ffffff80;background:#ffffff18;color:#fff;border-radius:12px;padding:5px 10px;font-weight:750;cursor:pointer}
.profile-avatar,.profile-modal-avatar{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#fff;color:#a61029;font-size:11px;font-weight:950;border:2px solid #ffe4e8}
.profile-menu{display:none;position:absolute;right:0;top:calc(100% + 8px);min-width:160px;padding:6px;background:#fff;border:1px solid #e8c6cb;border-radius:12px;box-shadow:0 12px 32px #40101c25;z-index:200}
.profile-menu.show{display:grid;animation:menuDrop .16s ease-out}
.profile-menu button{border:0;background:#fff;text-align:left;padding:10px;border-radius:8px;color:#8f1429;cursor:pointer;font-weight:700}
.profile-menu button:hover{background:#fff0f2}
.profile-modal-backdrop{display:none;position:fixed;inset:0;background:#17070b80;z-index:500;align-items:center;justify-content:center;padding:16px}
.profile-modal-backdrop.show{display:flex}
.profile-modal{position:relative;background:#fff;border:1px solid #e8c6cb;border-radius:18px;padding:26px;width:min(420px,100%);box-shadow:0 22px 70px #0004;text-align:center}
.profile-modal-close{position:absolute;right:12px;top:8px;border:0;background:transparent;font-size:26px;cursor:pointer;color:#a61029}
.profile-modal-avatar{width:64px;height:64px;margin:12px auto;font-size:20px;background:#a61029;color:#fff}
.profile-info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0dadd;text-align:left;font-size:13px}
.theme-controls{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:12px;margin:14px 0}
.theme-controls .field{margin:0}.theme-controls input[type=color]{width:100%;height:40px;padding:3px;border:1px solid #e8c6cb;border-radius:9px;background:#fff}
.theme-controls select{width:100%;min-height:38px;border:1px solid #e8c6cb;border-radius:9px;padding:7px;background:#fff}
.aq-icon-badge{display:inline-grid!important;place-items:center;background:#fff0f2;border:1px solid #e9b9c1;border-radius:8px;padding:3px}
.aq-icon-minimal{background:transparent!important;border:0!important;box-shadow:none!important}
@media(max-width:950px) and (pointer:coarse){.theme-controls{grid-template-columns:repeat(2,minmax(120px,1fr))}.profile-trigger-label{display:none}}

/* Live user identity on the office desk nameplate */
.aq-office-hero{position:relative;width:100%;line-height:0}
.aq-live-nameplate{position:absolute;left:37.9%;top:68%;width:13.0%;height:6.0%;min-height:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:2px 5px;box-sizing:border-box;line-height:1.05;text-align:center;overflow:hidden;background:linear-gradient(115deg,#65101c,#a51b2c 48%,#5a0c18);border:1.5px solid #d6b36f;border-radius:3px;box-shadow:0 2px 5px #0008,inset 0 0 0 1px #e8c98a55;color:#fff}
.aq-live-nameplate strong{font-family:Georgia,serif;font-size:clamp(7px,1.05vw,14px);font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000}
.aq-live-nameplate span{font-family:Arial,sans-serif;font-size:clamp(5px,.56vw,8px);font-weight:800;letter-spacing:.5px;color:#f0d39b;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.profile-modal .field{text-align:left;margin:12px 0}
.profile-modal .field input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #e8c6cb;border-radius:9px}

/* Correct desk plaque alignment and compact profile icon */
.aq-live-nameplate{left:37.9%!important;top:68%!important;width:13%!important;height:6%!important;min-height:24px!important}
.profile-trigger.profile-icon-only{width:42px;height:42px;justify-content:center;padding:4px;border-radius:50%;background:#ffffff22;border:1px solid #ffffff9c}
.profile-trigger.profile-icon-only .profile-avatar{width:30px;height:30px;font-size:19px;line-height:1;border:0;background:#fff;color:#a61029}
</style>`;
  document.getElementById('reportOutput').innerHTML=css+(pages||'<p class="empty">Selected dates mein koi saved vehicle settlement nahi mila.</p>');
  return;
 }
 let sections=[];const add=(title,rows,cols,fn)=>{if(type!=='all'&&type!==title.toLowerCase())return;let data=rows.filter(x=>x.date>=from&&x.date<=to);sections.push(`<h3>${title} (${data.length})</h3><div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${data.map(fn).join('')||`<tr><td colspan="${cols.length}" class="empty">No records</td></tr>`}</tbody></table></div>`)};
add('Stock',db.stockTx,['Date','Product','Booker','Vehicle / Driver','Loaded','Returned','Net','Unit'],x=>`<tr><td>${x.date}</td><td>${esc(x.item)}</td><td>${esc(x.booker||linkedBooker(x.vehicle))}</td><td>${esc(x.vehicle)}</td><td class="num">${x.loaded}</td><td class="num">${x.returned}</td><td class="num">${x.loaded-x.returned}</td><td>${esc(x.unit)}</td></tr>`);
add('Vehicles',db.vehicleTx,['Date','Vehicle','Sales','Old recovery','New credit','Discount','Expense','Bank','Cash','Unsettled'],x=>`<tr><td>${x.date}</td><td>${esc(x.name)}</td>${[x.sales,x.recovery,x.credit,x.discount,x.expense,x.bank,x.cash,vehicleDue(x)].map(v=>`<td class="num">${money(v)}</td>`).join('')}</tr>`);
add('Bookers',db.bookerTx,['Date','Booker','Collection','Bank','Cash','Expenses','Unsettled'],x=>`<tr><td>${x.date}</td><td>${esc(x.name)}</td>${[x.collection,x.bank,x.cash,x.expense,x.collection-x.bank-x.cash-x.expense].map(v=>`<td class="num">${money(v)}</td>`).join('')}</tr>`);
add('Credit',db.credits,['Date','Shop','Party','Type','Amount'],x=>`<tr><td>${x.date}</td><td>${esc(x.shop)}</td><td>${esc(x.party)}</td><td>${x.type}</td><td class="num">${money(x.amount)}</td></tr>`);
add('Banks',db.bankTx,['Date','Type','Account','By','Amount'],x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${esc(x.account)}</td><td>${esc(x.by)}</td><td class="num">${money(x.amount)}</td></tr>`);
add('Expenses',db.expenses,['Date','Title','Category','Method','Amount'],x=>`<tr><td>${x.date}</td><td>${esc(x.title)}</td><td>${esc(x.category)}</td><td>${x.method}</td><td class="num">${money(x.amount)}</td></tr>`);
add('Closing',db.closings,['Date','Opening','Expected','Actual','Difference','Reason'],x=>`<tr><td>${x.date}</td>${[x.opening,x.expected,x.actual??0,x.difference??0].map(v=>`<td class="num">${money(v)}</td>`).join('')}<td>${esc(x.reason)}</td></tr>`);
if(type==='all'||type==='vehicleDaily'||type==='dailySale'){let settlements=(db.vehicleSettlements||[]).filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>a.date.localeCompare(b.date));let byDate=[...new Set(settlements.map(x=>x.date))];let dailyHtml=byDate.map(day=>{let recs=settlements.filter(x=>x.date===day),stock={},creditRows={},dash={};recs.forEach(x=>{let dk=x.booker+'|'+x.driver;if(!dash[dk])dash[dk]={booker:x.booker,driver:x.driver,summary:0,credit:0,recovery:0,bank:0,discount:0,expense:0,remaining:0,cash:0};let d=dash[dk];['summary','credit','recovery','bank','discount','expense','remaining','cash'].forEach(k=>d[k]+=Number(x[k])||0);(x.products||[]).forEach(p=>{let k=(p.product||'')+'|'+(p.unit||'');if(!stock[k])stock[k]={product:p.product||'',loaded:0,returned:0,net:0,unit:p.unit||''};stock[k].loaded+=Number(p.loaded)||0;stock[k].returned+=Number(p.returned)||0;stock[k].net+=Number(p.net??((Number(p.loaded)||0)-(Number(p.returned)||0)))||0});['credit','recovery'].forEach(k=>(x.notes?.[k]||[]).forEach(n=>{let key=[x.booker,n.name||'',n.ref||''].join('|');if(!creditRows[key])creditRows[key]={booker:x.booker,shop:n.name||'',ref:n.ref||'',credit:0,recovery:0};creditRows[key][k]+=Number(n.amount)||0}))});let stockRows=Object.values(stock),cr=Object.values(creditRows),ds=Object.values(dash);let total=(key,arr)=>arr.reduce((a,x)=>a+(Number(x[key])||0),0);return `<div class="panel"><h3>Daily Settlement Report — ${day}</h3><h4>Booker / Driver Summary</h4><div class="table-wrap"><table><thead><tr><th>Booker</th><th>Driver</th><th>Summary Amount</th><th>Credit</th><th>Recovery</th><th>Bank</th><th>Extra Discount</th><th>Expense</th><th>Remaining</th><th>Cash</th></tr></thead><tbody>${ds.map(x=>`<tr><td>${esc(x.booker)}</td><td>${esc(x.driver)}</td>${['summary','credit','recovery','bank','discount','expense','remaining','cash'].map(k=>`<td class="num">${money(x[k])}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="10" class="empty">No settlement</td></tr>'}</tbody><tfoot><tr><th colspan="2">Daily Total</th>${['summary','credit','recovery','bank','discount','expense','remaining','cash'].map(k=>`<th class="num">${money(total(k,ds))}</th>`).join('')}</tr></tfoot></table></div><h4>Stock Report — Product-wise Total (Loaded − Return)</h4><div class="table-wrap"><table><thead><tr><th>Product</th><th>Loaded</th><th>Return Stock</th><th>Net Sale</th><th>Unit</th></tr></thead><tbody>${stockRows.map(x=>`<tr><td>${esc(x.product)}</td><td class="num">${x.loaded}</td><td class="num">${x.returned}</td><td class="num">${x.net}</td><td>${esc(x.unit)}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No stock entries</td></tr>'}</tbody></table></div><h4>Stock Detail — Booker / Driver-wise</h4><div class="table-wrap"><table><thead><tr><th>Booker</th><th>Driver</th><th>Product</th><th>Loaded</th><th>Return Stock</th><th>Net</th><th>Unit</th></tr></thead><tbody>${recs.flatMap(x=>(x.products||[]).map(p=>`<tr><td>${esc(x.booker)}</td><td>${esc(x.driver)}</td><td>${esc(p.product)}</td><td class="num">${p.loaded||0}</td><td class="num">${p.returned||0}</td><td class="num">${p.net??((Number(p.loaded)||0)-(Number(p.returned)||0))}</td><td>${esc(p.unit)}</td></tr>`)).join('')||'<tr><td colspan="7" class="empty">No stock entries</td></tr>'}</tbody></table></div><h4>Market Credit & Recovery — Shop-wise</h4><div class="table-wrap"><table><thead><tr><th>Date</th><th>Booker</th><th>Shop Name</th><th>Ref</th><th>Credit</th><th>Recovery</th></tr></thead><tbody>${cr.map(x=>`<tr><td>${day}</td><td>${esc(x.booker)}</td><td>${esc(x.shop)}</td><td>${esc(x.ref)}</td><td class="num">${money(x.credit)}</td><td class="num">${money(x.recovery)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No market credit / recovery entries</td></tr>'}</tbody><tfoot><tr><th colspan="4">Daily Total</th><th class="num">${money(total('credit',cr))}</th><th class="num">${money(total('recovery',cr))}</th></tr></tfoot></table></div></div>`}).join('');sections.push(`<h3>${type==='dailySale'?'Daily Sale Reports':'Vehicle Settlement Daily Reports'} (${byDate.length} dates)</h3>${dailyHtml||'<p class="empty">Selected dates mein Vehicle Settlement records nahi mile.</p>'}`)}
document.getElementById('reportOutput').innerHTML=`<div class="report-document-head"><div class="report-brand-line">${esc(db.companyName||'AL QADIR TRADERS')}</div><div class="report-doc-title">${type==='dailySale'?'DAILY SALE REPORT — DISTRIBUTOR':(type==='vehicleDaily'?'VEHICLE SETTLEMENT DAILY REPORT':'SALE WORKING & MANAGEMENT REPORT')}</div><div class="report-meta">Reporting Period: <b>${from}</b> to <b>${to}</b> <span>Generated: ${new Date().toLocaleString()}</span></div></div>`+(sections.join('<div class="report-section-gap"></div>')||'<p class="empty">No records found for the selected period.</p>')+`<div class="report-document-foot">AL QADIR TRADERS · CONFIDENTIAL BUSINESS REPORT</div>`}
function exportCSV(){let from=val('reportFrom'),to=val('reportTo');
let rows=[['date','booker','shop','ref','credit','recovery']];
db.credits.filter(x=>x.date>=from&&x.date<=to&&['new','recovery'].includes(x.type)).forEach(x=>{
rows.push([x.date,x.party||'',x.shop||'',x.notes||'',x.type==='new'?x.amount:'',x.type==='recovery'?x.amount:'']);
});
if(rows.length===1){alert('Selected dates mein Market Credit ya Recovery records nahi mile.');return;}
let csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
let blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
a.href=URL.createObjectURL(blob);a.download=`Market-Credit-Recovery-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(a.href)}
function exportCombinedStockCSV(){let rows=[['Product','Total Loaded','Total Returned','Net Stock','Unit']];
stockSummary().forEach(x=>rows.push([x.item,x.loaded,x.returned,x.net,x.unit]));
if(rows.length===1){alert('Selected working date par stock entries nahi hain.');return;}
let csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
let blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
a.href=URL.createObjectURL(blob);a.download=`Combined-Vehicle-Stock-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)}

function linkedBooker(vehicle){return db.vehicleBooker?.[vehicle]||''}
function addBulkStockRow(){
 const body=document.getElementById('bulkStockRows'),tr=document.createElement('tr');
 tr.innerHTML=`<td><select class="bs-product"><option value="">Select product</option>${db.products.map(x=>`<option>${esc(x)}</option>`).join('')}</select></td><td><select class="bs-vehicle" onchange="this.closest('tr').querySelector('.bs-booker').value=linkedBooker(this.value)"><option value="">Select vehicle</option>${db.vehicles.map(x=>`<option>${esc(x)}</option>`).join('')}</select></td><td><input class="bs-booker" placeholder="Auto / manual booker" list="bookerDatalist"></td><td><input class="bs-loaded" type="number" min="0" step="any" placeholder="0"></td><td><input class="bs-return" type="number" min="0" step="any"></td><td><input class="bs-unit" placeholder="Case / Bottle / Piece"></td><td><button class="btn small danger" onclick="this.closest('tr').remove()">Remove</button></td>`;
 body.appendChild(tr);
}
function saveAllBulkStock(){
 const rows=[...document.querySelectorAll('#bulkStockRows tr')];if(!rows.length)return alert('Pehle product rows add karein.');
 let pending=[];
 for(const tr of rows){
  let item=tr.querySelector('.bs-product').value,vehicle=tr.querySelector('.bs-vehicle').value,booker=tr.querySelector('.bs-booker').value.trim(),loaded=Number(tr.querySelector('.bs-loaded').value)||0,returned=Number(tr.querySelector('.bs-return').value)||0,unit=tr.querySelector('.bs-unit').value.trim();
  if(!item||!vehicle||loaded<=0)return alert('Har row mein Product, Vehicle aur Loaded quantity zaroori hain.');
  if(returned>loaded)return alert('Return quantity loaded se zyada nahi ho sakti.');
  pending.push({id:id(),date:today(),item,vehicle,booker:booker||linkedBooker(vehicle),loaded,returned,unit,notes:''});
 }
 db.stockTx.push(...pending);document.getElementById('bulkStockRows').innerHTML='';renderStock();persist();alert(pending.length+' stock rows saved successfully.');
}
function addBulkCreditRow(){
 const body=document.getElementById('bulkCreditRows'),tr=document.createElement('tr'),d=today();
 tr.innerHTML=`<td><input class="bc-date" type="date" value="${d}"></td><td><select class="bc-booker"><option value="">Select booker</option>${['Office',...db.bookers].map(x=>`<option>${esc(x)}</option>`).join('')}</select></td><td><input class="bc-shop" list="shopMasterOptions" placeholder="Select / type shop" onchange="applyShopBooker(this,this.closest('tr').querySelector('.bc-booker'))"></td><td><input class="bc-ref" placeholder="Invoice / receipt ref"></td><td><input class="bc-credit" type="number" min="0" step=".01" placeholder="0"></td><td><input class="bc-recovery" type="number" min="0" step=".01" placeholder="0"></td><td><button class="btn small danger" onclick="this.closest('tr').remove()">Remove</button></td>`;
 body.appendChild(tr);
}
function saveAllBulkCredits(){
 const rows=[...document.querySelectorAll('#bulkCreditRows tr')];if(!rows.length)return alert('Pehle shop rows add karein.');
 let pending=[];
 for(const tr of rows){
  let date=tr.querySelector('.bc-date').value,party=tr.querySelector('.bc-booker').value,shop=tr.querySelector('.bc-shop').value.trim(),ref=tr.querySelector('.bc-ref').value.trim(),credit=Number(tr.querySelector('.bc-credit').value)||0,recovery=Number(tr.querySelector('.bc-recovery').value)||0;
  if(!date||!party||!shop||(!credit&&!recovery))return alert('Har row mein Date, Booker, Shop aur Credit ya Recovery amount zaroori hai.');
  if(credit)pending.push({id:id(),date,shop,party,type:'new',amount:credit,notes:ref});
  if(recovery)pending.push({id:id(),date,shop,party,type:'recovery',amount:recovery,notes:ref});
 }
 db.credits.push(...pending);document.getElementById('bulkCreditRows').innerHTML='';persist();alert(pending.length+' credit / recovery transactions saved.');
}
function exportReportExcel(){
 const from=val('reportFrom'),to=val('reportTo'),type=val('reportType');
 let rows=[];
 const inRange=x=>x.date>=from&&x.date<=to;
 if(type==='stock'){
  rows=[['Product','Booker','Vehicle / Driver','Total Loaded','Total Returned','Net Stock','Unit']];
  const filtered=db.stockTx.filter(inRange),totals={};
  filtered.forEach(x=>{
   rows.push([x.item,x.booker||linkedBooker(x.vehicle),x.vehicle,x.loaded,x.returned,x.loaded-x.returned,x.unit]);
   let k=x.item+'|'+(x.unit||'');if(!totals[k])totals[k]={item:x.item,unit:x.unit,loaded:0,returned:0};
   totals[k].loaded+=Number(x.loaded)||0;totals[k].returned+=Number(x.returned)||0;
  });
  rows.push([],['ALL BOOKERS PRODUCT TOTAL','','','','','','']);
  Object.values(totals).forEach(x=>rows.push([x.item,'ALL BOOKERS','',x.loaded,x.returned,x.loaded-x.returned,x.unit]));
  downloadCSV(rows,`Combined-Product-Stock-${from}-to-${to}.csv`);return;
 }
 if(type==='credit'){
  rows=[['date','booker','shop','ref','credit','recovery']];
  db.credits.filter(x=>inRange(x)&&['new','recovery'].includes(x.type)).forEach(x=>rows.push([x.date,x.party,x.shop,x.notes||'',x.type==='new'?x.amount:'',x.type==='recovery'?x.amount:'']));
  downloadCSV(rows,`Market-Credit-Recovery-${from}-to-${to}.csv`);return;
 }
 rows=[['Date','Type','Name / Shop / Product','Booker / Vehicle / Detail','Reference','Amount','Loaded','Return','Net']];
 const add=(date,type,name,detail,ref,amount,loaded='',returned='',net='')=>rows.push([date,type,name,detail,ref,amount,loaded,returned,net]);
 if(type==='all'||type==='vehicles')db.vehicleTx.filter(inRange).forEach(x=>add(x.date,'Vehicle',x.name,'Sales / settlement',x.notes||'',x.sales));
 if(type==='all'||type==='bookers')db.bookerTx.filter(inRange).forEach(x=>add(x.date,'Booker',x.name,'Collection',x.notes||'',x.collection));
 if(type==='all'||type==='banks')db.bankTx.filter(inRange).forEach(x=>add(x.date,'Bank',x.account,x.type,x.ref,x.amount));
 if(type==='all'||type==='expenses')db.expenses.filter(inRange).forEach(x=>add(x.date,'Expense',x.title,x.category,x.by,x.amount));
 if(type==='all'||type==='closing')db.closings.filter(inRange).forEach(x=>add(x.date,'Cash Closing','Agency','Expected / actual',x.reason,x.actual??'', '', '', x.difference??''));
 if(type==='all')db.credits.filter(inRange).forEach(x=>add(x.date,x.type==='new'?'Market Credit':x.type==='recovery'?'Recovery':'Opening Balance',x.shop,x.party,x.notes,x.amount));
 if(type==='all')db.stockTx.filter(inRange).forEach(x=>add(x.date,'Product Stock',x.item,(x.booker||linkedBooker(x.vehicle))+' / '+x.vehicle,x.unit,'',x.loaded,x.returned,x.loaded-x.returned));
 downloadCSV(rows,`Agency-${type}-Excel-Report-${from}-to-${to}.csv`);
}
function downloadCSV(rows,filename){
 const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}

setupDate();renderAll();restoreLastActivePage();loadClosing();setupMathInputs();document.querySelectorAll('#vehicles input').forEach(el=>el.addEventListener('input',renderVehicleLiveCalc));document.querySelectorAll('#vehicles select').forEach(el=>el.addEventListener('change',renderVehicleLiveCalc));addSettlementLine('expense');addSettlementLine('bank');renderVehicleLiveCalc();
try{initThemePack();applyAQProfile()}catch(e){console.warn(e)}
