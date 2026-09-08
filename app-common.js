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
  btn.disabled = true;
  try{
    const snap = await db.collection('users').where('username', '==', username).limit(1).get();
    if(snap.empty){
      errEl.textContent = 'No account found with that username.';
      btn.disabled = false;
      return;
    }
    const email = snap.docs[0].data().email;
    await auth.signInWithEmailAndPassword(email, password);
  } catch(e){
    errEl.textContent = e.message;
  } finally {
    btn.disabled = false;
  }
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
  }
}

function doLogout(){
  auth.signOut();
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
      </div>
    `;
    el.appendChild(row);
  });
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
