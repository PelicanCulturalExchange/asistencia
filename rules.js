/* Reglas de asistencia Pelican — funciones puras, sin DOM.
 * Se usan en la tablet y se prueban con Node (tests/rules.test.js).
 * Ecuador continental: UTC-5 todo el año (sin horario de verano). */
(function (root) {
  'use strict';
  const OFF = -300; // minutos respecto a UTC

  const CFG = {
    START: '09:00', END: '17:45', LUNCH_MIN: 45,
    FINE: 1,                      // USD por hora o fracción de retraso
    EARLY_MIN: 10,                // llegar 10 min antes del inicio da puntos extra
    PTS: { ONTIME: 10, EARLY: 5, STEP: 1, CAP: 10, WEEK: 25 },
    // Rangos por porcentaje de los puntos posibles del mes (así medio tiempo compite justo)
    RANKS: [
      { n: 'Polluelo', p: 0 },
      { n: 'Aleteo', p: 0.35 },
      { n: 'Planeador', p: 0.60, prize: 'Vale de café o snack' },
      { n: 'Pelícano', p: 0.70, prize: 'Comodín: perdona una multa' },
      { n: 'Pelícano Neón', p: 0.85, prize: 'Salir una hora más temprano' },
      { n: 'Mega Pelícano', p: 0.95, prize: 'Medio día de home office' }
    ],
    TEAM_GOAL: 0.9,               // meta de puntualidad del equipo (Pizza Day)
    CHECKLIST: ['Cafetera', 'Platos secos y guardados', 'Luces apagadas', 'Escritorios ordenados', 'Computadoras apagadas']
  };

  const pad = n => String(n).padStart(2, '0');
  const toMin = hhmm => { const p = hhmm.split(':'); return +p[0] * 60 + +p[1]; };
  const loc = ts => new Date(ts + OFF * 60000);
  const ymd = ts => { const d = loc(ts); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const hm = ts => { const d = loc(ts); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
  const hms = ts => { const d = loc(ts); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()); };
  const minOfDay = ts => { const d = loc(ts); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  const tsOf = (date, hhmm) => { const a = date.split('-').map(Number), t = hhmm.split(':').map(Number); return Date.UTC(a[0], a[1] - 1, a[2], t[0], t[1], t[2] || 0) - OFF * 60000; };
  const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dow = s => new Date(s + 'T12:00:00Z').getUTCDay();            // 0 = domingo
  const weekStart = s => addDays(s, -((dow(s) + 6) % 7));              // lunes
  const dayNum = s => Math.floor(new Date(s + 'T12:00:00Z').getTime() / 864e5);

  /* ---- Multa: $1 por hora o fracción. 9:00:59 aún es a tiempo; 9:01 = $1; 10:01 = $2 ---- */
  function lateInfo(start, minuteOfDay) {
    const l = Math.max(0, minuteOfDay - toMin(start));
    return { late: l > 0, lateMin: l, fine: l ? Math.ceil(l / 60) * CFG.FINE : 0 };
  }

  const schedFor = (emp, date) => (emp.sched && emp.sched[dow(date)]) || null;
  function isWorkday(emp, date, ctx) {
    if (emp.boss || !schedFor(emp, date)) return false;
    if (ctx.holidays && ctx.holidays[date]) return false;
    if (ctx.leaves && ctx.leaves[date + '|' + emp.id]) return false;
    return true;
  }
  // Día extra (sábado, domingo o feriado) que el admin activó para todo el equipo
  const extraDay = (date, ctx, emp) => { const x = (ctx.extra && ctx.extra[date]) || null; return x && (!emp || !x.who || x.who.indexOf(emp.id) >= 0) ? x : null; };

  const inMap = (emp, marks) => {
    const by = {};
    marks.forEach(m => { if (m.emp === emp.id && m.type === 'in') by[m.date] = m; });
    return by;
  };

  function streakThrough(emp, by, ctx, date, includeDate) {
    let d = includeDate ? date : addDays(date, -1), n = 0;
    for (let g = 0; g < 400; g++) {
      if (!isWorkday(emp, d, ctx)) { d = addDays(d, -1); continue; }
      const r = by[d];
      if (r && !r.late) { n++; d = addDays(d, -1); } else break;
    }
    return n;
  }

  /* ---- Puntos y racha de una entrada ---- */
  function scoreIn(emp, marks, ctx, ts) {
    const date = ymd(ts), s = schedFor(emp, date), start = s ? s[0] : CFG.START;
    const li = lateInfo(start, minOfDay(ts));
    const by = inMap(emp, marks); by[date] = { late: li.late };
    const streak = li.late ? 0 : streakThrough(emp, by, ctx, date, true);
    let pts = 0, bonus = 0, early = false;
    if (!li.late) {
      early = minOfDay(ts) < toMin(start) - CFG.EARLY_MIN;
      pts = CFG.PTS.ONTIME + (early ? CFG.PTS.EARLY : 0) + Math.min(streak, CFG.PTS.CAP) * CFG.PTS.STEP;
      const wk = weekStart(date), days = [];
      for (let i = 0; i < 5; i++) { const d = addDays(wk, i); if (isWorkday(emp, d, ctx)) days.push(d); }
      if (days.length && days[days.length - 1] === date && days.every(d => d === date || (by[d] && !by[d].late))) { bonus = CFG.PTS.WEEK; pts += bonus; }
    }
    return Object.assign({}, li, { streak, pts, bonus, early });
  }

  function rankFor(pts, maxPts) {
    const pct = maxPts ? pts / maxPts : 0;
    let i = 0;
    CFG.RANKS.forEach((r, k) => { if (pct >= r.p) i = k; });
    const cur = CFG.RANKS[i], next = CFG.RANKS[i + 1] || null;
    return {
      name: cur.n, prize: cur.prize || null, index: i,
      next: next ? { name: next.n, prize: next.prize, need: Math.max(0, Math.ceil(next.p * maxPts) - pts) } : null,
      progress: next ? Math.min(1, Math.max(0, (pct - cur.p) / (next.p - cur.p))) : 1
    };
  }

  function monthWorkInfo(emp, date, ctx) {
    const mo = date.slice(0, 7); let n = 0; const weeks = {};
    for (let d = mo + '-01'; d.slice(0, 7) === mo; d = addDays(d, 1)) {
      if (isWorkday(emp, d, ctx)) { n++; weeks[weekStart(d)] = 1; }
    }
    return { days: n, weeks: Object.keys(weeks).length };
  }

  /* ---- Estado completo de una persona hoy ---- */
  function statsFor(emp, marks, ctx, today) {
    const mine = marks.filter(m => m.emp === emp.id), by = inMap(emp, marks);
    const mo = today.slice(0, 7), wk = weekStart(today);
    const ins = mine.filter(m => m.type === 'in');
    const monthPts = ins.filter(m => m.date.slice(0, 7) === mo).reduce((s, m) => s + (m.pts || 0), 0);
    const weekPts = ins.filter(m => m.date >= wk && m.date <= addDays(wk, 6)).reduce((s, m) => s + (m.pts || 0), 0);
    const mi = monthWorkInfo(emp, today, ctx);
    const maxPts = mi.days * (CFG.PTS.ONTIME + CFG.PTS.EARLY + CFG.PTS.CAP * CFG.PTS.STEP) + mi.weeks * CFG.PTS.WEEK;
    const streak = streakThrough(emp, by, ctx, today, !!by[today]);

    let best = 0, run = 0;
    const dates = Object.keys(by).sort();
    if (dates.length) for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
      if (!isWorkday(emp, d, ctx)) continue;
      if (by[d] && !by[d].late) { run++; best = Math.max(best, run); } else run = 0;
    }
    const onTime = ins.filter(m => !m.late).length, early = ins.filter(m => m.early).length, weeks = ins.filter(m => m.bonus > 0).length;
    const medals = [];
    if (onTime >= 1) medals.push('first');
    [[3, 'r3'], [5, 'r5'], [10, 'r10'], [20, 'r20']].forEach(p => { if (best >= p[0]) medals.push(p[1]); });
    if (early >= 5) medals.push('early');
    if (weeks >= 1) medals.push('week');

    const week = ['L', 'M', 'X', 'J', 'V'].map((l, i) => {
      const d = addDays(wk, i), r = by[d]; let s;
      if (!isWorkday(emp, d, ctx)) s = 'off';
      else if (r) s = r.late ? 'late' : 'ok';
      else s = d === today ? 'today' : (d < today ? 'miss' : 'pending');
      if (d === today && r) s = r.late ? 'late' : 'ok';
      return { d: l, s, today: d === today };
    });

    const td = {}; mine.forEach(m => { if (m.date === today) td[m.type] = m; });
    let status;
    if (!emp.boss && ctx.leaves && ctx.leaves[today + '|' + emp.id]) status = 'permit';
    else if (!emp.boss && !isWorkday(emp, today, ctx) && !extraDay(today, ctx, emp)) status = 'off';
    else if (td.out) status = 'done';
    else if (td.lunch_out && !td.lunch_in) status = 'lunch';
    else if (td.in) status = 'working';
    else status = 'pending';

    return { streak, best, monthPts, weekPts, maxPts, rank: rankFor(monthPts, maxPts), medals, week, status, today: td };
  }

  function teamPunctuality(emps, marks, month) {
    const ids = {}; emps.forEach(e => { if (!e.boss) ids[e.id] = 1; });
    const ins = marks.filter(m => m.type === 'in' && ids[m.emp] && m.date.slice(0, 7) === month);
    const ok = ins.filter(m => !m.late).length;
    return { total: ins.length, ok, pct: ins.length ? ok / ins.length : 1 };
  }

  // Responsable de cierre de la semana: rota entre el personal de planta (la versión final la sortea el servidor sin repetir)
  function closerOfWeek(emps, date) {
    const list = emps.filter(e => e.rot);
    if (!list.length) return null;
    return list[Math.floor(dayNum(weekStart(date)) / 7) % list.length];
  }

  function lunchMinutes(td) { return td.lunch_out && td.lunch_in ? Math.round((td.lunch_in.ts - td.lunch_out.ts) / 60000) : null; }

  const api = { CFG, pad, toMin, ymd, hm, hms, minOfDay, tsOf, addDays, dow, weekStart, dayNum, lateInfo, schedFor, isWorkday, extraDay,
    scoreIn, streakThrough, rankFor, statsFor, teamPunctuality, closerOfWeek, lunchMinutes, inMap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rules = api;
})(typeof window !== 'undefined' ? window : globalThis);
