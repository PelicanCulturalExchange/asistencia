/* Pelican · Asistencia — app de la tablet (PWA, funciona sin internet).
 * Modo demo: ENDPOINT vacío → datos de prueba guardados en la propia tablet.
 * Pruebas: ?d=2026-10-19&t=08:52 (fecha/hora simuladas), &demo=day (jornada en curso), &bday=1 */
(() => {
'use strict';
const R = window.Rules, CFG = R.CFG, TZ_NAME = 'America/Guayaquil';
const qs = new URLSearchParams(location.search);
const ENDPOINT = (window.PEL_CONFIG && window.PEL_CONFIG.ENDPOINT) || '';   // URL de Apps Script (config.js)
const DEMO = !ENDPOINT;
let OFFICE = 'Oficina Quito';
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- Tiempo ---------------- */
const T = (() => {
  let base = null, real0 = 0, off = 0, okAt = 0;
  if (qs.get('t')) { base = R.tsOf(qs.get('d') || R.ymd(Date.now()), qs.get('t')); real0 = Date.now(); }
  return {
    now: () => base !== null ? base + (Date.now() - real0) : Date.now() + off,
    verified: () => navigator.onLine && (DEMO || Date.now() - okAt < 600000),
    setOffset(o) { off = o; okAt = Date.now(); }
  };
})();
const today = () => R.ymd(T.now());

/* ---------------- Equipo de demostración (en producción viene del panel de administración) ---------------- */
const std = h => ({ 1: h, 2: h, 3: h, 4: h, 5: h });
const FULL = ['09:00', '17:45'];
let TEAM = [
  { id: 'e1', name: 'Mateo', type: 'Planta', sched: std(FULL), lunch: true, rot: true },
  { id: 'e2', name: 'Alejo', type: 'Planta', sched: std(FULL), lunch: true, rot: true },
  { id: 'e3', name: 'Meli', type: 'Planta', sched: std(FULL), lunch: true, rot: true },
  { id: 'e4', name: 'Adrián', type: 'Planta', sched: std(FULL), lunch: true, rot: true },
  { id: 'e5', name: 'Jeff', type: 'Planta', sched: std(FULL), lunch: true, rot: true },
  { id: 'e6', name: 'Naomi', type: 'Medio tiempo', sched: std(['09:00', '13:00']), lunch: false, rot: false },
  { id: 'e7', name: 'Mafer', type: 'Medio tiempo', sched: { 1: ['14:00', '17:45'], 2: ['14:00', '17:45'], 4: ['14:00', '17:45'] }, lunch: false, rot: false },
  { id: 'boss', name: 'Elián', type: 'Dirección', boss: true }
];
let CTX = { holidays: {}, leaves: {}, extra: {} };
if (qs.get('extra')) CTX.extra[qs.get('extra')] = { from: '09:00', to: '13:00' };
if (qs.get('bday')) TEAM[4].bday = (qs.get('d') || R.ymd(Date.now())).slice(5);

const QUOTES = window.Quotes.QUOTES;
const MEDALS = {
  first: ['Primer vuelo', 'i-sun'], r3: ['Racha de 3', 'i-flame'], r5: ['Racha de 5', 'i-flame'], r10: ['Racha de 10', 'i-flame'],
  r20: ['Racha de 20', 'i-flame'], early: ['Madrugador', 'i-clock'], week: ['Semana perfecta', 'i-star']
};
const TYPE_LABEL = { in: 'ENTRADA', lunch_out: 'SALIDA A ALMUERZO', lunch_in: 'REGRESO DE ALMUERZO', out: 'SALIDA' };

/* ---------------- Base local (IndexedDB): las marcas se guardan primero en la tablet ---------------- */
let db;
const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open('pelican-asistencia', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('marks', { keyPath: 'id' });
  r.onsuccess = () => { db = r.result; res(); }; r.onerror = () => rej(r.error);
});
const store = mode => db.transaction('marks', mode).objectStore('marks');
const dbAll = () => new Promise(res => { const q = store('readonly').getAll(); q.onsuccess = () => res(q.result); });
const dbPut = m => new Promise((res, rej) => { const q = store('readwrite').put(m); q.onsuccess = () => res(); q.onerror = () => rej(q.error); });
const dbPutMany = list => new Promise((res, rej) => { const t = db.transaction('marks', 'readwrite'); list.forEach(m => t.objectStore('marks').put(m)); t.oncomplete = res; t.onerror = () => rej(t.error); });

const S = { marks: [], flow: null, quotes: null, jar: null };
const hhmm = min => R.pad(Math.floor(min / 60)) + ':' + R.pad(min % 60);

/* ---------------- Datos de demostración ---------------- */
function rnd(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function seedHistory(date) {
  const out = [], mo = date.slice(0, 7) + '-01';
  TEAM.forEach(e => {
    if (e.boss) return;
    const rand = rnd(e.id), mine = [];
    for (let d = mo; d < date; d = R.addDays(d, 1)) {
      if (!R.isWorkday(e, d, CTX)) continue;
      const base = R.toMin(R.schedFor(e, d)[0]), late = rand() < 0.12;
      const min = late ? base + 3 + Math.floor(rand() * 40) : base - 12 + Math.floor(rand() * 11);
      const ts = R.tsOf(d, hhmm(min)), sc = R.scoreIn(e, mine, CTX, ts);
      const m = { id: `${e.id}|${d}|in`, emp: e.id, date: d, type: 'in', ts, verified: true, synced: true, photo: null, late: sc.late, lateMin: sc.lateMin, fine: sc.fine, pts: sc.pts, bonus: sc.bonus, streak: sc.streak, early: sc.early };
      mine.push(m); out.push(m);
    }
  });
  return out;
}
function seedToday(date, all) {
  const plan = [['e1', 'in', '08:41'], ['e2', 'in', '08:55'], ['e3', 'in', '08:50'], ['e3', 'lunch_out', '13:05'],
    ['e4', 'in', '08:47'], ['e4', 'lunch_out', '12:38'], ['e5', 'in', '09:12'], ['e5', 'lunch_out', '12:30'],
    ['e6', 'in', '08:58'], ['e6', 'out', '13:00']];
  const out = [];
  plan.forEach(([id, type, t]) => {
    const e = TEAM.find(x => x.id === id), ts = R.tsOf(date, t), m = { id: `${id}|${date}|${type}`, emp: id, date, type, ts, verified: true, synced: true, photo: null };
    if (type === 'in') Object.assign(m, R.scoreIn(e, all.concat(out), CTX, ts));
    out.push(m);
  });
  return out;
}

/* ---------------- PIN (se compara con hash: funciona sin internet) ---------------- */
const PINS = {};
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function initPins() {
  if (!DEMO) { TEAM.forEach(e => PINS[e.id] = e.pin); return; }
  for (const e of TEAM) PINS[e.id] = await sha(`pel:${e.id}:1234`); PINS.boss = await sha('pel:boss:0000');
}
const lockOf = id => JSON.parse(localStorage.getItem('pel_lock_' + id) || '{"f":0,"u":0}');
async function checkPin(id, pin) {
  const l = lockOf(id);
  if (l.u > Date.now()) return 'locked';
  if (await sha(`pel:${id}:${pin}`) === PINS[id]) { localStorage.removeItem('pel_lock_' + id); return 'ok'; }
  l.f++; if (l.f >= 5) { l.f = 0; l.u = Date.now() + 300000; }
  localStorage.setItem('pel_lock_' + id, JSON.stringify(l)); return l.u > Date.now() ? 'locked' : 'bad';
}

/* ---------------- Helpers de UI ---------------- */
const initials = n => n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const stkWords = (t, cls) => t.split(' ').map(w => `<span class="stk ${cls || ''}" data-t="${esc(w)}">${esc(w)}</span>`).join(' ');
const go = id => { document.querySelectorAll('.screen').forEach(s => s.classList.remove('on')); $('#' + id).classList.add('on'); S.screen = id; bump(); };
const stats = e => R.statsFor(e, S.marks, CTX, today());
const quoteOfDay = () => window.Quotes.ofDay(R.dayNum(today()), S.quotes);
const quoteHTML = () => { const [t, a] = quoteOfDay(); return `<div class="quote"><div class="eb">Frase del día</div><p>“${esc(t)}”</p><cite>— ${esc(a)}</cite></div>`; };
const fmtMin = m => (m >= 60 ? Math.floor(m / 60) + ' h ' : '') + (m % 60) + ' min';
const hatSVG = '<svg class="hat" viewBox="0 0 34 38"><path d="M17 2 L4 34 H30 Z" fill="#6FB7DA" stroke="#14222A" stroke-width="2" stroke-linejoin="round"/><path d="M11 20 L23 16 M8 28 L26 23" stroke="#F5F8F7" stroke-width="3"/><circle cx="17" cy="3" r="4" fill="#8DD3A2" stroke="#14222A" stroke-width="2"/></svg>';

let idleT = null;
function bump() {
  clearTimeout(idleT);
  if (['s-pin', 's-act', 's-check', 's-cam'].includes(S.screen)) idleT = setTimeout(() => { stopCam(); S.flow = null; home(); }, 90000);
}
document.addEventListener('pointerdown', bump);
document.addEventListener('contextmenu', e => e.preventDefault());

function modal({ title, text, pose, buttons }) {
  const m = $('#modal');
  m.innerHTML = `<div class="mbox">${pose ? `<img src="assets/jay-${pose}.webp" alt="">` : ''}<h2 class="stk-wrap" style="font-size:34px">${stkWords(title)}</h2><p style="font-weight:600;font-size:17px">${esc(text)}</p>
    <div class="row" id="mb"></div></div>`;
  buttons.forEach(b => { const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.onclick = () => { m.classList.remove('on'); b.fn && b.fn(); }; $('#mb').appendChild(el); });
  m.classList.add('on');
}

/* ---------------- HOME ---------------- */
function jarSVG(total) {
  const n = Math.min(Math.floor(total), 28); let coins = '';
  for (let i = 0; i < n; i++) { const row = Math.floor(i / 4), col = i % 4, x = 31 + col * 14 + (row % 2) * 7, y = 112 - row * 10;
    coins += `<circle cx="${x}" cy="${y}" r="8" fill="#8DD3A2" stroke="#14222A" stroke-width="2"/><text x="${x}" y="${y + 3.5}" font-size="10" font-weight="800" text-anchor="middle" fill="#14222A" font-family="Poppins">$</text>`; }
  return `<svg viewBox="0 0 104 128"><rect x="24" y="2" width="56" height="13" rx="6" fill="#C9EAD3" stroke="#14222A" stroke-width="2"/>
  <path d="M20 17h64v9c0 8 8 10 8 22v64a12 12 0 0 1-12 12H24a12 12 0 0 1-12-12V48c0-12 8-14 8-22z" fill="rgba(255,255,255,.08)" stroke="#F5F8F7" stroke-width="3.5"/>${coins}
  <g class="coin-fall"><circle cx="52" cy="40" r="8" fill="#8DD3A2" stroke="#14222A" stroke-width="2"/><text x="52" y="43.5" font-size="10" font-weight="800" text-anchor="middle" fill="#14222A" font-family="Poppins">$</text></g></svg>`;
}
function weekBirthdays() {
  const wk = R.weekStart(today()), days = []; for (let i = 0; i < 7; i++) days.push(R.addDays(wk, i));
  return TEAM.filter(e => e.bday && days.some(d => d.slice(5) === e.bday));
}
function home() {
  S.flow = null;
  const d = today(), team = TEAM.map(e => ({ e, st: stats(e) }));
  const pend = S.marks.filter(m => m.fine > 0 && !m.paid && (S.jar === null || !m.synced)).reduce((s, m) => s + m.fine, 0), jar = (S.jar || 0) + pend;
  const top = team.filter(x => !x.e.boss && x.st.weekPts > 0).sort((a, b) => b.st.weekPts - a.st.weekPts).slice(0, 3);
  const tp = R.teamPunctuality(TEAM, S.marks, d.slice(0, 7)), pct = Math.round(tp.pct * 100);
  const bd = weekBirthdays(), bdIds = bd.map(e => e.id);
  const tiles = team.map(({ e, st }) => {
    const inM = st.today.in, late = inM && inM.late;
    let label = '', cls = 's-' + st.status;
    if (st.status === 'pending') label = 'Entra ' + (R.schedFor(e, d) ? R.schedFor(e, d)[0] : '');
    else if (st.status === 'working') { label = late ? `Tarde · ${R.hm(inM.ts)}` : `✓ ${R.hm(inM.ts)}`; if (late) cls = 's-late'; }
    else if (st.status === 'lunch') label = 'En almuerzo';
    else if (st.status === 'done') label = 'Salió ' + R.hm(st.today.out.ts);
    else if (st.status === 'off') label = 'Libre hoy';
    else if (st.status === 'permit') label = 'Permiso';
    else if (st.status === 'boss') label = 'Dirección';
    return `<button class="tile ${cls}" data-id="${e.id}">${st.streak > 0 ? `<span class="fl"><svg><use href="#i-flame"/></svg>${st.streak}</span>` : ''}
      <div class="av">${bdIds.includes(e.id) ? hatSVG : ''}${esc(initials(e.name))}</div><div class="nm">${esc(e.name)}</div><div class="tp">${esc(e.type)}</div><div class="stt">${esc(label)}</div></button>`;
  }).join('');
  $('#s-home').innerHTML = `
  <div class="top"><div class="logo"><img src="assets/logo.png" alt="Pelican"></div><span class="office">${OFFICE}</span><div class="net" id="net"><i></i><span></span></div></div>
  <div class="home">
    <div class="col">
      <div><div class="clock"><span id="ck">--:--</span><small id="sc"></small></div><div class="date" id="dt"></div></div>
      <div class="banner" id="bn"></div>
      ${R.dow(d) === 5 ? '<div class="banner fri">Hoy es viernes de almuerzo con el Team</div>' : ''}
      ${quoteHTML()}
      <div class="panel jar">${jarSVG(jar)}<div><h3 style="margin:0 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--g1)">Tarro de multas</h3><div class="amt">$${jar}</div><div class="lbl">Lo que llevamos juntos</div></div></div>
    </div>
    <div class="mid">
      <h2 class="h2">¿Quién <em>llegó</em>? Toca tu nombre</h2>
      <div class="lunches" id="lunches"></div>
      <div class="grid">${tiles}</div>
    </div>
    <div class="col col-r">
      <div class="panel top3"><h3>Top de la semana</h3>${top.length ? `<ol>${top.map((x, i) => `<li><span>${i + 1}. ${esc(x.e.name)}</span><span>${x.st.weekPts} pts</span></li>`).join('')}</ol>` : '<div class="empty">Aún sin puntos esta semana</div>'}</div>
      <div class="panel goal"><h3>Pizza Day del equipo</h3><div class="bar"><i style="width:${pct}%"></i><u style="left:${CFG.TEAM_GOAL * 100}%"></u></div>
        <p>${tp.total ? `El equipo va <b>${pct}%</b> de puntualidad. Meta: ${CFG.TEAM_GOAL * 100}%.` : 'Empieza el mes: ¡a llegar a tiempo todos!'}</p></div>
      ${bd.length ? `<div class="panel"><h3>Cumpleaños de la semana</h3>${bd.map(e => `<div class="bday">${esc(e.name)} · ${e.bday.split('-').reverse().join('/')}</div>`).join('')}</div>` : ''}
      <img class="jaycol" src="assets/jay-wave.webp" alt="">
    </div>
  </div>`;
  document.querySelectorAll('.tile').forEach(b => b.onclick = () => tapPerson(TEAM.find(x => x.id === b.dataset.id)));
  go('s-home'); tick();
}

function tick() {
  if (S.screen !== 's-home') return;
  const now = T.now(), d = today(), min = R.minOfDay(now);
  $('#ck').textContent = R.hm(now); $('#sc').textContent = R.hms(now).slice(6);
  $('#dt').textContent = new Intl.DateTimeFormat('es-EC', { timeZone: TZ_NAME, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const b = $('#bn'), ex = R.extraDay(d, CTX), dw = R.dow(d);
  if (ex && (dw === 0 || dw === 6 || CTX.holidays[d])) { b.className = 'banner extra'; b.textContent = `Jornada especial hoy: ${ex.from} a ${ex.to}`; }
  else if (dw === 0 || dw === 6) { b.className = 'banner'; b.textContent = 'Hoy no es día laborable. ¡Descansa!'; }
  else if (min < R.toMin(CFG.START)) { const l = R.toMin(CFG.START) - min; b.className = 'banner ok'; b.textContent = l <= 10 ? `¡Faltan ${l} min! Sentado y listo a las ${CFG.START}` : `Faltan ${l} min para las ${CFG.START}`; }
  else if (min < 12 * 60) { const li = R.lateInfo(CFG.START, min); b.className = 'banner late'; b.textContent = li.fine ? `Ya pasaron las ${CFG.START} · registrar ahora = multa de $${li.fine}` : `Son las ${CFG.START} en punto. ¡Registra ya!`; }
  else if (min < R.toMin(CFG.END)) { const l = R.toMin(CFG.END) - min; b.className = 'banner ok'; b.textContent = `Salida a las ${CFG.END} · faltan ${fmtMin(l)}`; }
  else { b.className = 'banner ok'; b.textContent = 'Jornada terminada. ¡Gracias por el día!'; }
  renderLunches(now); renderNet();
}

function renderLunches(now) {
  const cards = TEAM.map(e => ({ e, st: stats(e) })).filter(x => x.st.status === 'lunch').map(({ e, st }) => {
    const left = CFG.LUNCH_MIN * 60 - Math.floor((now - st.today.lunch_out.ts) / 1000), over = left < 0, a = Math.abs(left);
    const C = 2 * Math.PI * 38, off = over ? 0 : C * (1 - left / (CFG.LUNCH_MIN * 60));
    const cls = over ? 'over' : left <= 300 ? 'low' : '';
    const sub = over ? `Te pasaste ${Math.ceil(a / 60)} min` : `Regresa antes de las ${R.hm(st.today.lunch_out.ts + CFG.LUNCH_MIN * 60000)}`;
    return `<div class="lcard ${cls}"><div class="ring"><svg viewBox="0 0 86 86"><circle class="bg" cx="43" cy="43" r="38"/><circle class="fg" cx="43" cy="43" r="38" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg>
      <b>${over ? '+' : ''}${R.pad(Math.floor(a / 60))}:${R.pad(a % 60)}</b></div><div><div class="nm">${esc(e.name)}</div><div class="sub">${sub}</div></div></div>`;
  });
  $('#lunches').innerHTML = cards.join('');
}

function renderNet() {
  const n = $('#net'); if (!n) return;
  const pend = S.marks.filter(m => !m.synced).length, on = navigator.onLine;
  n.className = 'net' + (on ? '' : ' off');
  n.querySelector('span').textContent = !on ? `Sin internet · se guarda en la tablet${pend ? ` (${pend})` : ''}` : (DEMO ? 'Modo demo' : (pend ? `Sincronizando ${pend}…` : 'En línea'));
}

/* ---------------- Tocar una persona ---------------- */
function tapPerson(e) {
  const st = stats(e);
  if (e.boss) return bossScreen();
  if (st.status === 'done') return modal({ title: 'Jornada cerrada', text: `${e.name}, ya registraste tu salida de hoy. ¡Hasta mañana!`, pose: 'wave', buttons: [{ label: 'Listo' }] });
  if (st.status === 'off') return modal({ title: 'Libre hoy', text: `${e.name}, hoy no tienes jornada programada.`, pose: 'side', buttons: [{ label: 'Listo' }] });
  if (st.status === 'permit') return modal({ title: 'Permiso aprobado', text: `${e.name}, hoy tienes un permiso aprobado. No hace falta registrar.`, pose: 'thumbs', buttons: [{ label: 'Listo' }] });
  S.flow = { emp: e };
  askPin({ id: e.id, name: e.name, title: 'Ingresa tu PIN', onOk: () => chooseAction(e, st) });
}

function bossScreen() {
  const h = R.minOfDay(T.now()), g = h < 720 ? '¡Buen día, jefe!' : h < 1080 ? '¡Buenas tardes, jefe!' : '¡Buenas noches, jefe!';
  $('#s-res').innerHTML = `<div class="res"><div class="main"><div class="hero"><div class="eb">Dirección · sin registro</div><div class="stk-wrap">${stkWords(g.slice(0, -1), '')}<span class="stk g" data-t="Elián!">Elián!</span></div>
    <p>Que tengas una excelente jornada.</p></div>${quoteHTML()}<div class="actions"><button class="btn" id="done">Gracias, Jay</button></div></div>
    <img class="jay" src="assets/jay-open.webp" alt=""></div>`;
  $('#done').onclick = home; go('s-res'); autoHome();
}

/* ---------------- PIN ---------------- */
function askPin({ id, name, title, onOk }) {
  let pin = '', busy = false;
  const draw = () => [...document.querySelectorAll('#dots i')].forEach((d, i) => d.classList.toggle('f', i < pin.length));
  $('#s-pin').innerHTML = `<div class="top"><div class="logo"><img src="assets/logo.png" alt=""></div><span class="office">${OFFICE}</span></div>
    <div class="center"><div class="av">${esc(initials(name))}</div><h2 class="stk-wrap" style="font-size:38px">${stkWords(name, 'g')}</h2>
    <p style="font-weight:600;color:var(--g3)">${esc(title)}</p><div class="dots" id="dots"><i></i><i></i><i></i><i></i></div><div class="msg" id="pm"></div>
    <div class="keys" id="keys"></div><button class="link" id="pc">Cancelar</button></div>`;
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].forEach(v => {
    const b = document.createElement('button'); b.className = 'key' + (v === '⌫' ? ' sm' : ''); b.textContent = v; if (!v) b.style.visibility = 'hidden';
    b.onclick = async () => {
      if (busy) return;
      if (v === '⌫') pin = pin.slice(0, -1); else if (v && pin.length < 4) pin += v;
      draw();
      if (pin.length === 4) {
        busy = true; const r = await checkPin(id, pin);
        if (r === 'ok') { busy = false; return onOk(); }
        $('#pm').textContent = r === 'locked' ? 'Demasiados intentos. Espera 5 minutos.' : 'PIN incorrecto. Intenta otra vez.';
        pin = ''; draw(); busy = false;
      }
    };
    $('#keys').appendChild(b);
  });
  $('#pc').onclick = home; go('s-pin');
}

function chooseAction(e, st) {
  const opts = [];
  if (st.status === 'pending') opts.push(['in', 'Registrar mi entrada']);
  else if (st.status === 'lunch') opts.push(['lunch_in', 'Regresé del almuerzo']);
  else if (st.status === 'working') { if (e.lunch && !st.today.lunch_out) opts.push(['lunch_out', 'Salir a almuerzo']); opts.push(['out', 'Terminar mi jornada']); }
  if (opts.length === 1) return begin(opts[0][0]);
  $('#s-act').innerHTML = `<div class="top"><div class="logo"><img src="assets/logo.png" alt=""></div><span class="office">${OFFICE}</span></div>
    <div class="center"><h2 class="stk-wrap" style="font-size:40px">${stkWords('¿Qué vas a', '')} ${stkWords('registrar?', 'g')}</h2><div class="big-actions" id="ba"></div><button class="link" id="ac">Cancelar</button></div>`;
  opts.forEach(([a, l]) => { const b = document.createElement('button'); b.className = 'btn' + (a === 'out' ? ' blue' : ''); b.textContent = l; b.onclick = () => begin(a); $('#ba').appendChild(b); });
  $('#ac').onclick = home; go('s-act');
}

/* ---------------- Flujo de cada marca ---------------- */
function begin(action) {
  const f = S.flow, e = f.emp; f.action = action;
  if (action !== 'out') return camera();
  const end = (R.extraDay(today(), CTX) && !R.schedFor(e, today())) ? R.extraDay(today(), CTX).to : (R.schedFor(e, today()) || [0, CFG.END])[1];
  if (R.minOfDay(T.now()) < R.toMin(end)) {
    return modal({ title: 'Todavía no es hora', text: `La salida es a las ${end}. No se puede salir antes sin autorización.`, pose: 'point',
      buttons: [{ label: 'Volver', cls: 'ghost', fn: home }, { label: 'Tengo autorización', cls: 'blue', fn: () => askPin({ id: 'boss', name: 'Elián', title: 'PIN de autorización', onOk: () => { f.early = true; checklist(); } }) }] });
  }
  checklist();
}

function checklist() {
  const f = S.flow, e = f.emp, closer = R.closerOfWeek(TEAM, today()), isCloser = closer && closer.id === e.id;
  f.isCloser = !!isCloser; const items = CFG.CHECKLIST.slice(); if (isCloser) items.push('__closer');
  const done = {};
  $('#s-check').innerHTML = `<div class="top"><div class="logo"><img src="assets/logo.png" alt=""></div><span class="office">${OFFICE}</span></div>
    <div class="center" style="width:min(640px,100%)"><h2 class="stk-wrap" style="font-size:42px">${stkWords('¿La oficina quedó', '')} ${stkWords('lista?', 'g')}</h2>
    <div class="check" id="ck2"></div><div class="row"><button class="btn ghost" id="kb">Cancelar</button><button class="btn" id="kn" disabled>Confirmar y continuar</button></div></div>`;
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'chk' + (it === '__closer' ? ' closer' : '');
    b.innerHTML = `<span class="box"><svg><use href="#i-check"/></svg></span><span>${it === '__closer' ? 'Soy responsable de cierre esta semana: verifiqué que la oficina quedó cerrada y limpia' : esc(it)}</span>`;
    b.onclick = () => { done[i] = !done[i]; b.classList.toggle('on', !!done[i]); $('#kn').disabled = !items.every((_, k) => done[k]); };
    $('#ck2').appendChild(b);
  });
  $('#kb').onclick = home; $('#kn').onclick = () => { f.clean = true; camera(); }; go('s-check');
}

/* ---------------- Cámara con barra de datos ---------------- */
let stream = null;
function stopCam() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
async function camera() {
  const f = S.flow; f.photo = null;
  $('#s-cam').innerHTML = `<div class="top"><div class="logo"><img src="assets/logo.png" alt=""></div><span class="office">${OFFICE}</span></div>
    <div class="center" style="width:min(580px,100%)"><h2 class="stk-wrap" style="font-size:38px" id="ct">${stkWords('Mírame y', '')} ${stkWords('sonríe', 'g')}</h2>
    <div class="cam" id="cam"><video id="vid" autoplay playsinline muted></video><img class="shot" id="shot" alt=""><div class="cd" id="cd"></div></div>
    <div class="pre" id="pre"><img id="preimg" alt=""></div><div class="msg" id="cm"></div>
    <div class="row" id="cb"><button class="btn" id="snap">Tomar foto</button></div><button class="link" id="cc">Cancelar</button></div>`;
  $('#snap').onclick = snap; $('#cc').onclick = () => { stopCam(); home(); }; go('s-cam');
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); $('#vid').srcObject = stream; }
  catch (e) { $('#cm').textContent = 'No pude abrir la cámara. Permite el acceso a la cámara en la tablet.'; $('#snap').disabled = true; }
}
function drawBar(x, W, H, info) {
  const bh = Math.round(H * 0.15); x.fillStyle = 'rgba(20,34,42,.88)'; x.fillRect(0, H - bh, W, bh);
  const s = bh / 5.2; x.textBaseline = 'alphabetic';
  x.fillStyle = '#F5F8F7'; x.font = `800 ${s * 1.35}px Poppins, sans-serif`; x.fillText(`${info.label} · ${info.name}`, 14, H - bh + s * 2.1);
  x.font = `600 ${s}px Poppins, sans-serif`; x.fillStyle = '#C9EAD3'; x.fillText(`${info.date}  ${info.time}  (UTC-05)  ·  ${info.office}`, 14, H - bh + s * 3.5);
  x.fillStyle = info.verified ? '#8DD3A2' : '#6FB7DA'; x.fillText(info.verified ? 'HORA VERIFICADA' : 'HORA NO VERIFICADA (sin conexión)', 14, H - bh + s * 4.7);
}
async function snap() {
  $('#snap').disabled = true; const cd = $('#cd'); cd.style.display = 'grid';
  for (let n = 3; n >= 1; n--) { cd.textContent = n; await new Promise(r => setTimeout(r, 750)); }
  cd.style.display = 'none';
  const v = $('#vid'), W = 720, H = Math.round(W * (v.videoHeight || 3) / (v.videoWidth || 4)), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.translate(W, 0); x.scale(-1, 1); x.drawImage(v, 0, 0, W, H); x.setTransform(1, 0, 0, 1, 0, 0);
  const f = S.flow, ts = T.now();
  drawBar(x, W, H, { label: TYPE_LABEL[f.action], name: f.emp.name, office: OFFICE, date: R.ymd(ts), time: R.hms(ts), verified: T.verified() });
  f.photo = c.toDataURL('image/jpeg', 0.72); f.photoTs = ts;
  $('#cam').style.display = 'none'; $('#pre').style.display = 'block'; $('#preimg').src = f.photo;
  $('#ct').innerHTML = stkWords('¿Quedó', '') + ' ' + stkWords('bien?', 'g');
  $('#cb').innerHTML = `<button class="btn ghost" id="redo">Repetir</button><button class="btn" id="send">Registrar</button>`;
  $('#redo').onclick = camera; $('#send').onclick = send;
}

/* ---------------- Guardar la marca ---------------- */
async function send() {
  const f = S.flow, e = f.emp; $('#send').disabled = true; $('#cm').style.color = 'var(--g3)'; $('#cm').textContent = 'Guardando…';
  const ts = T.now(), date = R.ymd(ts), before = stats(e).medals;
  const m = { id: `${e.id}|${date}|${f.action}`, emp: e.id, date, type: f.action, ts, verified: T.verified(), photo: f.photo, synced: false, office: OFFICE };
  const extra = R.extraDay(date, CTX) && !R.isWorkday(e, date, CTX);
  if (f.action === 'in') { if (extra) m.extra = true; else Object.assign(m, R.scoreIn(e, S.marks, CTX, ts)); }
  if (f.action === 'out') { m.clean = true; if (f.early) { m.early = true; m.authBy = 'Elián'; } if (f.isCloser) m.closer = true; if (extra) m.extra = true; }
  if (S.marks.some(x => x.id === m.id)) return home();
  await dbPut(m); S.marks.push(m); stopCam(); syncOutbox();
  result(m, before);
}

/* ---------------- Resultados ---------------- */
function statCards(items) { return `<div class="stats">${items.map(([v, l, ic]) => `<div class="stat"><b>${ic ? `<svg><use href="#${ic}"/></svg>` : ''}${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`; }
function result(m, before) {
  const e = S.flow.emp, st = stats(e), first = e.name, hm = R.hm(m.ts); let hero = '', pose = 'thumbs', extraHTML = '', eb = '', msg = '', late = false;
  if (m.type === 'in') {
    late = !!m.late;
    if (m.extra) { eb = 'Jornada especial'; hero = stkWords('¡Gracias por venir,', '') + ' ' + stkWords(first + '!', 'g'); msg = 'Tu entrada de hoy cuenta como horas extra.'; pose = 'cheer'; }
    else if (late) { const b = Math.ceil(m.lateMin / 60); eb = 'Entrada con retraso'; pose = 'think'; hero = stkWords('Llegaste a las ' + hm, '');
      msg = `Multa de $${m.fine} (${b} ${b === 1 ? 'hora o fracción' : 'horas o fracción'} de retraso). ${DEMO ? 'Queda registrado con tu foto.' : 'Te llegará un correo con el detalle.'} Mañana empiezas una racha nueva.`; }
    else { eb = 'Entrada registrada'; hero = stkWords('¡Llegaste a tiempo,', '') + ' ' + stkWords(first + '!', 'g');
      msg = st.streak >= 2 ? `Llevas ${st.streak} días seguidos llegando a tiempo. Buen trabajo.` : 'Entrada registrada. ¡Vamos por la racha!'; }
    const newM = st.medals.filter(k => !before.includes(k)); if (newM.length) pose = 'cheer';
    const rk = st.rank, fl = [];
    extraHTML = quoteHTML() + (m.extra ? '' : `${statCards([[String(st.streak), 'Racha (días)', 'i-flame'], ['+' + m.pts, 'Puntos de hoy'], [String(st.monthPts), 'Puntos del mes']])}
      <div class="panel"><div class="rk"><span>${esc(rk.name)}${rk.prize ? ` · ${esc(rk.prize)}` : ''}</span><span>${rk.next ? `${rk.next.need} pts para ${esc(rk.next.name)}` : '¡Rango máximo!'}</span></div><div class="bar2"><i id="bar"></i></div></div>
      <div class="duo"><div class="panel"><h3>Tu semana</h3><div class="week">${st.week.map(d => `<div class="day ${d.s}">${d.d}<svg>${d.s === 'ok' ? '<use href="#i-check"/>' : d.s === 'late' ? '<use href="#i-clock"/>' : d.s === 'today' ? '<use href="#i-sun"/>' : ''}</svg></div>`).join('')}</div></div>
      <div class="panel"><h3>Medallas</h3><div class="medals">${Object.keys(MEDALS).map(k => `<div class="medal ${st.medals.includes(k) ? 'got' : ''} ${newM.includes(k) ? 'new' : ''}"><svg><use href="#${MEDALS[k][1]}"/></svg>${MEDALS[k][0]}</div>`).join('')}</div></div></div>`);
    S.barPct = Math.round(st.rank.progress * 100);
  } else if (m.type === 'lunch_out') {
    pose = 'armout'; eb = 'Salida a almuerzo'; hero = stkWords('¡Buen provecho,', '') + ' ' + stkWords(first + '!', 'g');
    msg = `Tienes ${CFG.LUNCH_MIN} minutos. Regresa antes de las ${R.hm(m.ts + CFG.LUNCH_MIN * 60000)}. Tu contador ya corre en la pantalla de inicio.`;
  } else if (m.type === 'lunch_in') {
    const mins = R.lunchMinutes(st.today); pose = 'side'; eb = 'Regreso de almuerzo'; hero = stkWords('¡De vuelta,', '') + ' ' + stkWords(first + '!', 'g');
    msg = mins > CFG.LUNCH_MIN ? `Almorzaste ${mins} min: te pasaste ${mins - CFG.LUNCH_MIN}. Mañana lo cuidamos.` : mins < CFG.LUNCH_MIN ? `Fue un almuerzo corto (${mins} min).` : `Almorzaste justo ${mins} min. ¡Perfecto!`;
  } else {
    const inM = st.today.in, mins = R.lunchMinutes(st.today) || 0, worked = Math.max(0, Math.round((m.ts - inM.ts) / 60000) - mins);
    pose = 'wave'; eb = 'Salida registrada'; hero = stkWords('¡Hasta mañana,', '') + ' ' + stkWords(first + '!', 'g');
    msg = m.closer ? 'Gracias por cerrar la oficina esta semana.' : 'Gracias por dejar la oficina lista.';
    extraHTML = statCards([[R.hm(inM.ts), 'Entrada'], [mins ? mins + ' min' : '—', 'Almuerzo'], [hm, 'Salida']]) + `<div class="panel"><h3>Hoy trabajaste</h3><div class="amt" style="font-size:30px;font-weight:800;color:var(--g1)">${fmtMin(worked)}</div></div>`;
  }
  const offline = !m.verified ? '<p class="empty" style="margin-top:8px">Hora no verificada por internet. Se confirma sola al volver la conexión.</p>' : '';
  $('#s-res').innerHTML = `<div class="res"><div class="main"><div class="hero ${late ? 'late' : ''}"><div class="eb">${eb} · ${hm}</div><div class="stk-wrap">${hero}</div><p>${esc(msg)}</p>${offline}</div>${extraHTML}
    <div class="actions"><button class="btn ghost" id="done">Listo</button></div></div><img class="jay" src="assets/jay-${pose}.webp" alt=""></div>`;
  $('#done').onclick = home; go('s-res');
  if (S.barPct != null && $('#bar')) { const p = S.barPct; setTimeout(() => { $('#bar').style.width = p + '%'; }, 80); }
  if (m.type === 'in' && !late && !m.extra && (stats(e).medals.length > before.length || pose === 'cheer')) confetti(); else if (m.type === 'in' && !late) confetti();
  S.barPct = null; autoHome();
}
let rt; function autoHome() { clearTimeout(rt); rt = setTimeout(home, 22000); }

function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#8DD3A2', '#9BDAAE', '#C9EAD3', '#6FB7DA', '#F5F8F7'];
  const ps = Array.from({ length: 120 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, w: 6 + Math.random() * 7, h: 10 + Math.random() * 8, vy: 2 + Math.random() * 4, vx: -1.5 + Math.random() * 3, r: Math.random() * 6, vr: -.2 + Math.random() * .4, c: cols[Math.floor(Math.random() * cols.length)] }));
  let n = 0; (function t() { x.clearRect(0, 0, c.width, c.height); ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); }); if (++n < 240) requestAnimationFrame(t); else x.clearRect(0, 0, c.width, c.height); })();
}

/* ---------------- Sincronización (se activa cuando exista el backend) ---------------- */
async function syncOutbox() {
  if (DEMO || !navigator.onLine) return;
  for (const m of S.marks.filter(x => !x.synced)) {
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'mark', mark: m, t: localStorage.getItem('pel_dev') || '' }) }).then(r => r.json());
      if (r.ok) { m.synced = true; if (r.now) T.setOffset(r.now - Date.now()); await dbPut(m); }
    } catch (e) { break; }
  }
  renderNet();
}

/* ---------------- Conexión con el servidor (modo real) ---------------- */
const api = body => fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) }).then(r => r.json());
async function enrollIfNeeded() {
  const key = qs.get('enroll'); if (DEMO || !key) return;
  try {
    const r = await api({ action: 'enroll', key, office: qs.get('office') || (window.PEL_CONFIG || {}).OFFICE, name: 'Tablet ' + (qs.get('office') || '') });
    if (r.ok) { localStorage.setItem('pel_dev', r.token); history.replaceState(null, '', location.pathname); }
    else alert('La llave de enlace no es válida o ya se usó.');
  } catch (e) { alert('No pude enlazar la tablet. Revisa la conexión a internet.'); }
}
function applyBoot(b) {
  TEAM = b.team; CTX = b.ctx; S.quotes = b.quotes && b.quotes.length ? b.quotes : null; S.jar = b.jar || 0; OFFICE = 'Oficina ' + b.office;
  if (b.now) T.setOffset(b.now - Date.now());
  TEAM.forEach(e => PINS[e.id] = e.pin);
  const local = S.marks.filter(m => !m.synced), ids = {}; local.forEach(m => ids[m.id] = 1);
  S.marks = b.marks.filter(m => !ids[m.id]).concat(local);
}
async function loadBoot() {
  if (DEMO) return;
  try { applyBoot(JSON.parse(localStorage.getItem('pel_boot') || 'null') || (() => { throw 0; })()); } catch (e) {}
  if (!navigator.onLine) return;
  try {
    const b = await api({ action: 'bootstrap', t: localStorage.getItem('pel_dev') || '' });
    if (b.ok) { localStorage.setItem('pel_boot', JSON.stringify(b)); applyBoot(b); }
    else if (b.error === 'device') document.body.insertAdjacentHTML('beforeend', '<div class="modal on"><div class="mbox"><h2>Tablet sin enlazar</h2><p>Abre el enlace de enlace (con ?enroll=…) en esta tablet.</p></div></div>');
  } catch (e) {}
}

/* ---------------- Arranque ---------------- */
(async () => {
  await openDB(); await enrollIfNeeded();
  let marks = await dbAll();
  if (DEMO) {
    await initPins();
    if (!marks.length) { const d = today(); marks = seedHistory(d); if (qs.get('demo') === 'day') marks = marks.concat(seedToday(d, marks)); await dbPutMany(marks); }
    S.marks = marks;
  } else { S.marks = marks; await loadBoot(); }
  home();
  setInterval(tick, 1000); setInterval(() => { if (S.screen === 's-home') home(); }, 60000); setInterval(syncOutbox, 30000);
  setInterval(async () => { if (!DEMO && S.screen === 's-home') { await loadBoot(); } }, 300000);
  addEventListener('online', () => { renderNet(); syncOutbox(); loadBoot(); }); addEventListener('offline', renderNet);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__pelican = { S, R, T, get TEAM() { return TEAM; } };
})();
})();
