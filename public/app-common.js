/* ============================================================
   FIREBASE SETUP — shared by index.html and admin.html
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyBnQKR9YretBAKgAnUcxunVdpOkKnNlUcg",
  authDomain: "aastuoverload.firebaseapp.com",
  projectId: "aastuoverload",
  storageBucket: "aastuoverload.firebasestorage.app",
  messagingSenderId: "1017679356912",
  appId: "1:1017679356912:web:dd8d0024dd28065d143335",
  measurementId: "G-J06MVDC8H2"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = secondaryApp.auth();
const secondaryDb = secondaryApp.firestore();

let currentUser = null;
let isAdmin = false;

/* ---- full-page loader: hidden once the page knows who is signed in ---- */
function hidePageLoader(){
  const l = document.getElementById('pageLoader');
  if(!l || l.dataset.done) return;
  l.dataset.done = '1';
  l.classList.add('hide');
  setTimeout(()=>l.remove(), 450);
}
setTimeout(hidePageLoader, 8000); // safety net if Firebase never answers

/* ---- tiny spinner injected once, shared by every button on every page ---- */
(function injectSpinnerStyles(){
  const style = document.createElement('style');
  style.textContent = `
    .btn-spinner{
      display:inline-block;width:12px;height:12px;margin-right:7px;
      border:2px solid rgba(255,255,255,0.45);border-top-color:#fff;
      border-radius:50%;animation:btnspin .7s linear infinite;vertical-align:-2px;
    }
    .btn-spinner.dark{
      border:2px solid rgba(36,32,25,0.25);border-top-color:var(--ink,#242019);
    }
    @keyframes btnspin{to{transform:rotate(360deg);}}
  `;
  document.head.appendChild(style);
})();

function setBtnBusy(btn, label, dark){
  if(!btn) return;
  if(btn.dataset.busy === '1') return; // already busy, don't clobber saved original
  btn.dataset.busy = '1';
  btn.dataset.origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="btn-spinner${dark ? ' dark' : ''}"></span>${label}`;
}

function clearBtnBusy(btn){
  if(!btn) return;
  btn.disabled = false;
  if(btn.dataset.busy === '1'){
    btn.innerHTML = btn.dataset.origHtml;
    delete btn.dataset.busy;
    delete btn.dataset.origHtml;
  }
}

async function submitAuth(){
  const username = document.getElementById('auth_username').value.trim();
  const password = document.getElementById('auth_password').value;
  const errEl = document.getElementById('authErr');
  errEl.style.color = 'var(--err)';
  errEl.textContent = '';
  if(!username || !password){
    errEl.textContent = 'Enter both username and password.';
    return;
  }
  const btn = document.getElementById('authSubmitBtn');
  setBtnBusy(btn, 'Signing in…');
  try{
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    if(snap.empty){
      errEl.textContent = 'No account found with that username.';
      return;
    }
    const email = snap.docs[0].data().email;
    await auth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged takes it from here and swaps the screen
  } catch(e){
    errEl.textContent = friendlyAuthError(e);
  } finally {
    clearBtnBusy(btn);
  }
}

function friendlyAuthError(e){
  const code = e && e.code ? e.code : '';
  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-email'].includes(code)){
    return 'Wrong username or password. Please check and try again.';
  }
  if(code === 'auth/too-many-requests'){
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return e.message;
}

async function forgotPassword(){
  const username = document.getElementById('auth_username').value.trim();
  const errEl = document.getElementById('authErr');
  errEl.style.color = 'var(--err)';
  errEl.textContent = '';
  if(!username){
    errEl.textContent = 'Enter your username above first, then click "Forgot password?".';
    return;
  }
  const link = document.querySelector('.forgot[onclick="forgotPassword()"]');
  const origLinkText = link ? link.textContent : null;
  if(link){ link.textContent = 'Sending…'; link.style.pointerEvents = 'none'; }
  try{
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    if(snap.empty){
      errEl.textContent = 'No account found with that username.';
      return;
    }
    const email = snap.docs[0].data().email;
    await auth.sendPasswordResetEmail(email);
    errEl.style.color = 'var(--good)';
    errEl.textContent = 'Password reset email sent.';
  } catch(e){
    errEl.textContent = e.message;
  } finally {
    if(link){ link.textContent = origLinkText; link.style.pointerEvents = ''; }
  }
}

async function doLogout(btn){
  setBtnBusy(btn, 'Logging out…', true);
  try{
    await auth.signOut();
    // onAuthStateChanged will swap the screen back to the sign-in gate
  } finally {
    clearBtnBusy(btn);
  }
}

/* ---- small shared utilities ---- */
function num(v){ const n = parseFloat(v); return isNaN(n) ? 0 : n; }

function esc(s){
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function fmtDate(ts){
  if(!ts || !ts.toDate) return '';
  return ts.toDate().toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
}

function renderRecordList(containerId, docs, showOwner){
  const el = document.getElementById(containerId);
  if(docs.length === 0){
    el.innerHTML = '<div class="record-empty">No records yet.</div>';
    return;
  }
  el.innerHTML = '';
  docs.forEach(doc=>{
    const d = doc.data();
    const gross = (num(d.rate) * num(d.overload)).toLocaleString(undefined,{maximumFractionDigits:2});
    const row = document.createElement('div');
    row.className = 'record-row';
    row.innerHTML = `
      <div class="meta">
        <b>${esc(d.name || '(no name)')}</b>
        <span>${esc(d.college||'')} ${d.college && d.dept ? '·' : ''} ${esc(d.dept||'')}</span>
        <span>${gross} Birr</span>
        <span>${fmtDate(d.createdAt)}</span>
        ${showOwner ? `<span>${esc(d.ownerEmail||'')}</span>` : ''}
      </div>
            <div class="rec-actions">
        <button onclick="loadRecordById('${doc.id}')">Load</button>
        <button onclick="deleteRecordById('${doc.id}','${containerId}')" style="background:var(--err);">Delete</button>
      </div>
    `;
    el.appendChild(row);
  });
}

async function deleteRecordById(id, containerId){
  if(!confirm('Delete this saved contract permanently? This cannot be undone.')) return;
  try{
    await db.collection('contracts').doc(id).delete();
    if(containerId === 'myRecordList' && typeof loadMyRecords === 'function'){
      loadMyRecords();
    } else if(typeof loadAdminRecords === 'function'){
      loadAdminRecords();
    }
  } catch(e){
    alert('Could not delete: ' + e.message);
  }
}

/* ---- number → words, used by the payment section and the PDF ---- */
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function threeDigitsToWords(n){
  let s = '';
  if(n >= 100){
    s += ONES[Math.floor(n/100)] + ' Hundred';
    n %= 100;
    if(n > 0) s += ' ';
  }
  if(n >= 20){
    s += TENS[Math.floor(n/10)];
    if(n % 10 > 0) s += '-' + ONES[n % 10];
  } else if(n > 0){
    s += ONES[n];
  }
  return s;
}

function integerToWords(n){
  if(n === 0) return 'Zero';
  const scales = [['', 1], ['Thousand', 1000], ['Million', 1000000], ['Billion', 1000000000]];
  let parts = [];
  let remaining = Math.floor(n);
  for(let i = scales.length - 1; i >= 0; i--){
    const [name, size] = scales[i];
    const chunk = Math.floor(remaining / size);
    if(chunk > 0){
      parts.push(threeDigitsToWords(chunk) + (name ? ' ' + name : ''));
      remaining %= size;
    }
  }
  return parts.join(' ');
}

function birrToWords(amount){
  const birr = Math.floor(amount);
  const cents = Math.round((amount - birr) * 100);
  let words = integerToWords(birr) + ' Birr';
  if(cents > 0){
    words += ' and ' + integerToWords(cents) + ' Cents';
  }
  return words + ' Only';
}