/* script.js - connect to Apps Script Web App */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzgiw6V4BC_sMhdIBPX120VgxU-zYxUi0lmycNT1U0cyn0NKBriBwjbLKw2wnR9uphfIw/exec';

// audio
const audio = {
  klik: document.getElementById('snd-klik'),
  success: document.getElementById('snd-success'),
  error: document.getElementById('snd-error'),
  welcome: document.getElementById('snd-welcome')
};
function play(name){ try{ audio[name].currentTime=0; audio[name].play(); }catch(e){} }

// ui refs
const loading = document.getElementById('loading');
const login = document.getElementById('login');
const dashboard = document.getElementById('dashboard');
const connectBtn = document.getElementById('connect');
const secretInput = document.getElementById('secret');
const popWelcome = document.getElementById('pop-welcome');

const actions = document.querySelectorAll('.actionBtn');
const tabEntry = document.getElementById('tab-entry');
const tabDb = document.getElementById('tab-db');
const tabCredit = document.getElementById('tab-credit');

const dateInput = document.getElementById('date');
const driverInput = document.getElementById('driver');
const unitInput = document.getElementById('unit');
const segmentBtns = document.querySelectorAll('.segmentBtn');
let selectedPayment = 'Transfer';

const submitBtn = document.getElementById('submit');
const dbList = document.getElementById('dbList');
const dbTotal = document.getElementById('dbTotal');
const filterMonth = document.getElementById('filterMonth');
const filterBtn = document.getElementById('filterBtn');

let role = null; // 'admin' or 'owner'

function show(el){ el.classList.remove('hidden'); el.classList.add('visible'); }
function hide(el){ el.classList.add('hidden'); el.classList.remove('visible'); }

function init(){
  show(loading); hide(login); hide(dashboard);
  setTimeout(()=>{ hide(loading); show(login); }, 900);
}
init();

/* login */
connectBtn.addEventListener('click', ()=>{
  play('klik');
  const code = secretInput.value.trim();
  if(code === 'Bungas03' || code === 'Khai2020'){
    role = (code==='Bungas03') ? 'admin' : 'owner';
    play('success');
    hide(login); show(popWelcome); play('welcome');
    setTimeout(()=>{ hide(popWelcome); show(dashboard); openDefaultTab(); }, 800);
  } else {
    play('error'); showError('Oopsie! Invalid Code');
  }
});

function showError(text){
  const p = document.createElement('div'); p.className='popout';
  p.innerHTML = `<div class="popInner"><div style="font-size:28px;color:var(--dark)">✖</div><p>${text}</p></div>`;
  document.body.appendChild(p);
  setTimeout(()=>p.remove(),1600);
}

/* tabs */
function openDefaultTab(){
  if(role === 'owner'){
    document.querySelector('[data-tab="entry"]').style.display='none';
    openTab('db');
  } else {
    openTab('entry');
  }
}
actions.forEach(btn=>btn.addEventListener('click', ()=>{
  play('klik');
  openTab(btn.dataset.tab);
}));
function openTab(name){
  [tabEntry,tabDb,tabCredit].forEach(x=>x.classList.add('hidden'));
  if(name==='entry') tabEntry.classList.remove('hidden');
  if(name==='db'){ tabDb.classList.remove('hidden'); loadDatabase(); }
  if(name==='credit'){ tabCredit.classList.remove('hidden'); loadInstallments(); }
}

/* segment control */
segmentBtns.forEach(b=>b.addEventListener('click', ()=>{
  play('klik');
  segmentBtns.forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  selectedPayment = b.dataset.val;
}));

/* submit entry */
submitBtn.addEventListener('click', async ()=>{
  play('klik');
  const payload = {
    date: dateInput.value || new Date().toISOString().slice(0,10),
    driver: driverInput.value.trim(),
    unit: unitInput.value.trim(),
    payment: selectedPayment
  };
  if(!payload.driver || !payload.unit){
    play('error'); showError('Data mismatch! Try again :)'); return;
  }
  try{
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await res.json();
    if(j.status === 'success' || j.result === 'success'){
      play('success'); showSuccess('Data entry success!');
      driverInput.value=''; unitInput.value='';
      loadDatabase();
    } else {
      play('error'); showError('Data mismatch! Try again :)');
      console.error(j);
    }
  }catch(e){
    play('error'); showError('Network error :(');
    console.error(e);
  }
});

function showSuccess(text){
  const p = document.createElement('div'); p.className='popout';
  p.innerHTML = `<div class="popInner"><div style="font-size:28px;color:green">✔</div><p>${text}</p></div>`;
  document.body.appendChild(p);
  setTimeout(()=>p.remove(),1400);
}

/* load database */
async function loadDatabase(monthFilter){
  dbList.innerHTML = '<div class="muted">Loading...</div>';
  try{
    const res = await fetch(APPS_SCRIPT_URL + '?sheet=List_Entry');
    const rows = await res.json();
    let filtered = rows || [];
    if(monthFilter){
      const parts = monthFilter.split('-').map(x=>Number(x));
      const [y,m] = parts;
      filtered = filtered.filter(r=>{
        if(!r['Date']) return false;
        const dt = new Date(r['Date']);
        return dt.getFullYear()===y && (dt.getMonth()+1)===m;
      });
    }
    filtered.sort((a,b)=> new Date(b['Timestamp']) - new Date(a['Timestamp']));
    if(filtered.length===0){ dbList.innerHTML='<div class="muted">No entries</div>'; dbTotal.textContent='Total: 0'; return; }
    dbList.innerHTML='';
    filtered.forEach(r=>{
      const item = document.createElement('div'); item.className='item';
      item.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${r['Date']||''}</strong><div class="muted">${r['Driver_or_PO']||r['Driver']||''} — ${r['Unit']||''}</div></div><div class="muted">${r['Payment_Method']||r['payment']||''}</div></div>`;
      if(role==='admin'){
        const actions = document.createElement('div'); actions.style.marginTop='8px';
        const edit = document.createElement('button'); edit.textContent='Edit'; edit.className='smallBtn';
        const del = document.createElement('button'); del.textContent='Delete'; del.className='smallBtn';
        edit.addEventListener('click', ()=> quickEdit(r));
        del.addEventListener('click', ()=> quickDelete(r));
        actions.appendChild(edit); actions.appendChild(del);
        item.appendChild(actions);
      }
      dbList.appendChild(item);
    });
    dbTotal.textContent = 'Total: ' + filtered.length;
  }catch(e){
    dbList.innerHTML = '<div class="muted">Error loading</div>'; console.error(e);
  }
}

filterBtn.addEventListener('click', ()=> { play('klik'); loadDatabase(filterMonth.value); });

/* installments */
async function loadInstallments(){
  const creditList = document.getElementById('creditList');
  creditList.innerHTML = '<div class="muted">Loading...</div>';
  try{
    const res = await fetch(APPS_SCRIPT_URL + '?sheet=Installments');
    const rows = await res.json();
    creditList.innerHTML = '';
    (rows || []).forEach(r=>{
      const status = (String(r['Status']||'').toLowerCase().includes('paid')) ? '✔ Paid' : '✖ Unpaid';
      const item = document.createElement('div'); item.className='item';
      item.innerHTML = `<div><strong>${r['Month']||''}/${r['Year']||''}</strong> — ${r['Amount']||''}</div><div class="muted">${status}</div>`;
      creditList.appendChild(item);
    });
  }catch(e){ creditList.innerHTML = '<div class="muted">Error</div>'; console.error(e); }
}

/* quick admin edit/delete - minimal (depends on backend support) */
function quickEdit(row){ alert('Admin Edit: please edit directly in Google Sheets for safety.'); }
function quickDelete(row){ if(confirm('Delete this entry?')) alert('Please delete directly in Google Sheets (or implement secure delete).'); }

/* navigation */
document.getElementById('leave').addEventListener('click', ()=>{ play('klik'); location.reload(); });
document.getElementById('refresh').addEventListener('click', ()=>{ play('klik'); loadDatabase(); loadInstallments(); });

/* register service worker */
if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); }

