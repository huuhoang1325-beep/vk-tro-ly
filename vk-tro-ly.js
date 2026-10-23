// Trợ lý Vạn Kiếp Tu Tiên — mức 1 (chỉ tính toán, không tự bấm).
// Chạy bên trong trang game: tự tải code hiện tại của game và dùng lại các hàm tính toán của chính game.
const TOOL_VER = '2.0.0';

(() => {
  if (window.__vkTroLy) { window.__vkTroLy.show(); return; }
  const S = window.__vkTroLy = { core: null, best: null, abort: false };

  // ───────────────────────── 1. Nạp lõi game ─────────────────────────
  // Tìm hàm theo "dấu vân tay" trong code (tên hàm bị rút gọn và đổi sau mỗi bản cập nhật).
  const ANCHORS = {
    eJ:  [/\.doDung\)!=null&&/, 'mô phỏng trận'],
    Vr:  ['drugResistTran:{}', 'chỉ số nhân vật khi đánh'],
    Ga:  [/muc\?\?"thuong",\w=\w\.canh_gioi/, 'dựng quái'],
    Rt:  [/\.kinhMach,\w=new Set\(\w\.huyetThem\)/, 'tính kinh mạch'],
    Tp:  ['.khuon.split(', 'khuôn kinh mạch'],
    al:  [/\(\w\.hinh\?\?\[\],\w\.xoay\)/, 'ô của mảnh'],
    Jh:  ['Món này đã có trên kinh mạch', 'kiểm tra chỗ đặt'],
    kR:  ['pillOptions:', 'tỉ lệ đột phá'],
    Hon: [/\.tran_phai\)\{if\(\w\.tang!=="dai_tong_mon"/, 'Tàng Kinh Các'],
    wr:  ['["chưa có sư môn"]', 'điều kiện thăng cấp'],
    Kn:  [/\.flags\.mon_phai;if\(typeof \w=="string"\)/, 'sư môn'],
    ke:  [/\.thoNguyen;return \w\+Math\.round\(\w\*\(\w\.lifespanBonusPct/, 'thọ nguyên'],
    Rsn: ['"inner_disciple":"core_disciple";', 'đối thủ khảo hạch'],
    ko:  [/return \w\.run\.tamMa;/, 'quái từ nhân vật'],
    Qn:  [/\[0\]\.ten:`\$\{/, 'tên cảnh giới'],
    mf:  [/\.world\.distance\(\w\.run\.viTri,\w\)\*\w\.yearsPerUnit/, 'thời gian đi đường'],
    Nin: [/\.qua_cua\|\|\w\.treo_thuong\|\|\w\.bien_co\|\|/, 'tiện ích ở một nơi'],
    H1:  [/\|ke\|\$\{\w\}\|\$\{\w\}`,\{sizeFactor:/, 'hàng trong tiệm'],
  };
  const REGEX_NAMES = {
    rn: [/function ([\w$]+)\(t\)\{return [\w$]+\[Math\.max\(0,Math\.min\([\w$]+,t\)\)\]\}/, 'bảng cảnh giới'],
    fn: [/class ([\w$]+)\{constructor\(n\)\{this\.state=n\}static fromSeed/, 'bộ số ngẫu nhiên'],
    No: [/const ([\w$]+)=\["Tạp dịch","Ngoại môn"/, 'tên cấp bậc tông môn'],
    E1: [/function ([\w$]+)\(t,n,e,i=0\)\{return [\w$]+\(t,n,e,[\w$]+\(t,n,"buy",i\)\)\}/, 'giá mua'],
    gP: [/if\(!([\w$]+)\(t,n\)\)throw new Error\("Nơi đó còn phủ mây/, 'vùng đã khám phá'],
  };

  // Hàm cho tính năng phụ: thiếu thì chỉ tính năng đó tắt, phần còn lại vẫn chạy.
  const ANCHORS_OPT = {
    to:  [/tuViNam:[\w$]+\(t,!!n\.song_tu\)/, 'thông tin bế quan'],
    qw:  [/\.untilExhausted&&!/, 'tu vi còn thiếu'],
    Nb:  [/return [\w$]+\(t\.run\.nhanVat,i,o,n\.tuViNam\/\(/, 'tu vi theo số năm'],
    Di:  ['hi.cultivationSpeed}', 'tốc độ tu luyện'],
    jan: ['{ten:"Trường thi",diem:0}', 'thi nghề'],
    bb:  ['"đã tới bậc cao nhất"];const', 'điều kiện thi nghề'],
    Lu:  ['Tay nghề còn kém quá xa', 'luyện chế'],
    Pw:  [/\{ten:`Chỉ số \(/, 'điểm luyện chế'],
    Rrn: [/\.treoThuong&&\w\.nam-\w\.treoThuong\.nam</, 'bảng treo thưởng'],
    KI:  [/\.namBongLoc\)\),\[\w,\w\]=/, 'bổng lộc'],
    KS:  ['"đã được tiến cử"', 'tiến cử'],
  };
  const REGEX_OPT = {
    IP: [/function ([\w$]+)\(t,n,e,i=0\)\{return [\w$]+\(t,n,e,i,[\w$]+\(t,n,"sell",i\)\)\}/, 'giá bán'],
  };

  function findFn(src, anchor) {
    let idx = -1, count = 0;
    if (typeof anchor === 'string') {
      idx = src.indexOf(anchor);
      if (idx >= 0) count = src.indexOf(anchor, idx + 1) >= 0 ? 2 : 1;
    } else {
      const re = new RegExp(anchor.source, 'g'); let m;
      while ((m = re.exec(src))) { if (count === 0) idx = m.index; count++; if (count > 1) break; }
    }
    if (count !== 1) return null;
    const j = src.lastIndexOf('function ', idx);
    if (j < 0 || idx - j > 1500) return null;
    const m = /^function ([\w$]+)\(/.exec(src.slice(j, j + 80));
    return m ? m[1] : null;
  }

  async function loadCore(progress) {
    const g = window.game;
    if (!g || !g.env || !g.env.content) throw new Error('Chưa thấy game. Hãy mở trang game, đợi tải xong rồi bấm lại dấu trang.');
    const tag = document.querySelector('script[type=module][src*="/assets/index-"]');
    if (!tag) throw new Error('Không tìm thấy file code chính của game.');
    const url = tag.src, base = url.slice(0, url.lastIndexOf('/') + 1);
    progress('Đang tải code game…');
    let src = await (await fetch(url)).text();
    const names = {}, missing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS)) { const n = findFn(src, a); if (n) names[k] = n; else missing.push(label); }
    for (const [k, [re, label]] of Object.entries(REGEX_NAMES)) { const m = re.exec(src); if (m) names[k] = m[1]; else missing.push(label); }
    if (names.Tp) {
      const m = new RegExp(`function ([\\w$]+)\\(t,n\\)\\{return ${names.Tp.replace(/\$/g, '\\$')}\\(([\\w$]+)\\(t,n\\)\\)\\}`).exec(src);
      if (m) names.xo = m[1]; else missing.push('lưới kinh mạch');
    }
    const optMissing = [];
    for (const [k, [a, label]] of Object.entries(ANCHORS_OPT)) { const n = findFn(src, a); if (n) names[k] = n; else optMissing.push(label); }
    for (const [k, [re, label]] of Object.entries(REGEX_OPT)) { const m = re.exec(src); if (m) names[k] = m[1]; else optMissing.push(label); }
    { const m = /,([\w$]+)=\(t,n,e\)=>t\.world\.info\(e\)\.capNen-[\w$]+\(n\.nhanVat\),([\w$]+)=t=>[\w$]+\.find\(n=>t<=n\.max\)/.exec(src); if (m) { names.ua = m[1]; names.is = m[2]; } else optMissing.push('độ nguy hiểm'); }
    let PO = 30; { const m = /,PO=([\w$]+)[,;]/.exec(src); if (m) { const v = new RegExp('[,; ]' + m[1].replace(/\$/g, '\\$') + '=(\\d+(?:\\.\\d+)?)').exec(src); if (v) PO = +v[1]; } }
    if (missing.length) throw new Error('Game vừa cập nhật nên tool chưa nhận ra: ' + missing.join(', ') + '. Hãy chụp màn hình này gửi Claude để sửa tool.');
    // Đường dẫn tương đối → tuyệt đối (vì bản sao chạy từ blob:)
    src = src.replace(/from"\.\//g, 'from"' + base).replace(/import\("\.\//g, 'import("' + base);
    // Không cho bản sao khởi động lại giao diện game
    let ok1 = false, ok2 = false;
    src = src.replace(/((?:[\w$]+\(\);)*)const ([\w$]+)=[\w$]+\.createRoot\(document\.getElementById\("hud"\)\)/, (_, __, v) => { ok1 = true; return `const ${v}={render(){}}`; });
    src = src.replace(/(__tuTienReady:!0\}\)\})([\w$]+)\(\)\.catch\(/, (_, a) => { ok2 = true; return a + 'Promise.resolve().catch('; });
    if (!ok1 || !ok2) throw new Error('Game vừa đổi cách khởi động nên tool chưa chạy được. Hãy chụp màn hình này gửi Claude để sửa tool.');
    src = src.replace(/window\.addEventListener\("contextmenu",/, 'void("contextmenu",');
    src += `\n;export const __VKT={${Object.entries(names).map(([k, v]) => k + ':' + v).join(',')}};`;
    progress('Đang dựng bộ tính toán…');
    const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const mod = await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
    const K = mod.__VKT;
    K.bundle = url.split('/').pop();
    K.optMissing = optMissing; K.PO = PO;
    return K;
  }

  // ───────────────────────── 2. Tiện ích ─────────────────────────
  const G = () => window.game;
  const C = () => G().env.content;
  const clone = (x) => structuredClone(x);
  const sleep0 = () => new Promise((r) => setTimeout(r, 0));
  const pct = (x, d = 0) => (x * 100).toFixed(d).replace('.', ',') + '%';
  const num = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace('.', ',');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const HE = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ', bang: 'Băng', loi: 'Lôi', phong: 'Phong', vo_sac: 'Vô sắc' };
  const heTen = (h) => HE[h] ?? h;
  const STAGE = ['Sơ', 'Trung', 'Hậu', 'ĐVM'];

  function ctx() {
    const K = S.core, st = G().state;
    const run = clone(st.run), meta = clone(st.meta), F = K.fn, o = new Map();
    run.rngKeys ??= {};
    return {
      ...G().env, run, meta, rng: new F(run.rng), enc: run.active, noticeLines: [],
      rngFor(r) {
        let u = o.get(r);
        if (!u) { const l = Object.hasOwn(run.rngKeys, r) ? run.rngKeys[r] : undefined; u = l === undefined ? F.fromSeed(`${run.seed}|rng|${r}`) : new F(l); o.set(r, u); }
        return u;
      },
    };
  }
  const nvNow = () => clone(G().state.run.nhanVat);
  const realmName = (i) => { try { return S.core.rn(i).ten; } catch { return 'Cảnh giới ' + i; } };
  const realmLabel = (cg, tc) => { try { return S.core.Qn(cg, tc); } catch { return realmName(cg); } };

  // ───────────────────────── 3. Mô phỏng trận ─────────────────────────
  const BENCH_IDS = ['enemy.de_tu_truc_co', 'enemy.doc_hanh_kiem_khach', 'enemy.ma_tu_hut_mau', 'enemy.cuong_thi', 'enemy.am_tuong', 'enemy.lao_hoe_tinh', 'enemy.hoa_tinh', 'enemy.thuy_linh', 'enemy.mao_cuong'];
  function benchEnemies(cg, tcP = 0) {
    const K = S.core, c = C();
    const tcs = [Math.max(0, tcP - 1), tcP, Math.min(3, tcP + 1)];
    let ids = BENCH_IDS.filter((id) => c.enemies.has(id));
    if (ids.length < 6) { const all = [...c.enemies.keys()].sort(); const step = Math.max(1, Math.floor(all.length / 9)); ids = all.filter((_, i) => i % step === 0).slice(0, 9); }
    return ids.map((id, i) => ({ id, E: K.Ga({ ...c.enemies.get(id), canh_gioi: cg, tieu_canh_gioi: tcs[i % 3] }, c, { muc: 'thuong' }) }));
  }
  function fight(P, E) {
    try { return S.core.eJ(clone(P), clone(E), {}); } catch { return { thang: false, nHiep: 30, khiHuyetThapNhat: 0, stTa: 0 }; }
  }
  function enemyAt(def, cg, tc, muc) {
    return S.core.Ga({ ...def, canh_gioi: cg, tieu_canh_gioi: tc }, C(), muc ? { muc } : {});
  }

  // ───────────────────────── 4. Tối ưu kinh mạch ─────────────────────────
  function makeEval(nv0, enemies, mode) {
    const K = S.core, c = C(), cache = new Map();
    return (manh) => {
      const key = manh.map((p) => p.key).sort().join('|');
      if (cache.has(key)) return cache.get(key);
      const nv = clone(nv0); nv.kinhMach.manh = manh.map((p) => ({ ...p.m }));
      const R = K.Rt(nv, c), P = K.Vr(nv, c);
      let fightScore = 0, wins = 0;
      for (const { E } of enemies) {
        const r = fight(P, E);
        const hpLeft = r.khiHuyetThapNhat / P.khiHuyetToiDa;
        const dealt = Math.min(1, (r.stTa || 0) * Math.max(1, r.nHiep) / E.khiHuyetToiDa);
        if (r.thang) { wins++; fightScore += mode === 'danh' ? 100 + 15 * hpLeft + 60 / Math.max(1, r.nHiep) : 100 + 50 * hpLeft + 25 / Math.max(1, r.nHiep); }
        else fightScore += 50 * dealt;
      }
      const thong = R.manh.filter((m) => m && m.thong).length;
      const toc = R.biDong.toc_do || 0, dp = R.biDong.dot_pha || 0;
      let s;
      if (mode === 'tu') s = 0.3 * fightScore + 400 * toc + 300 * dp + 0.5 * R.linhLuc + thong;
      else if (mode === 'danh') s = fightScore + 0.5 * R.linhLuc + 0.2 * thong;
      else s = fightScore + 30 * toc + 20 * dp + 0.2 * thong + 0.5 * R.linhLuc;
      const out = { s, wins, P, R };
      cache.set(key, out);
      return out;
    };
  }

  function buildCandidates(nv0) {
    const K = S.core, c = C();
    const pool = Object.keys(nv0.tuiDo).filter((id) => { const it = c.items.get(id); return it && (it.loai === 'cong_phap' || it.loai === 'phap_khi') && it.hinh && (it.canh_gioi ?? 0) <= nv0.canhGioi; });
    const g = K.xo(c, nv0), cand = {};
    for (const id of pool) {
      const it = c.items.get(id), seen = new Set(); cand[id] = [];
      for (let xoay = 0; xoay < 4; xoay++) for (let y = 0; y < g.cao; y++) for (let x = 0; x < g.rong; x++) {
        const m = { item: id, x, y, xoay };
        let err; try { err = K.Jh(nv0, c, m); } catch (e) { err = 'x'; }
        if (err) continue;
        const cells = K.al(g, m, it); if (!cells) continue;
        const key = id + ':' + [...cells].sort((a, b) => a - b).join(',');
        if (seen.has(key)) continue; seen.add(key);
        cand[id].push({ m, cells, key });
      }
    }
    return { cand, g };
  }

  async function anneal({ nv0, mode, iters, init, onProg, label }) {
    const enemies = benchEnemies(nv0.canhGioi, nv0.tieuCanhGioi || 0);
    const ev = makeEval(nv0, enemies, mode);
    const { cand } = buildCandidates(nv0);
    const ids = Object.keys(cand).filter((k) => cand[k].length);
    let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const overlaps = (manh, c, skip = -1) => { const used = new Set(); manh.forEach((p, i) => { if (i !== skip) p.cells.forEach((x) => used.add(x)); }); return c.cells.some((x) => used.has(x)); };
    let cur = [];
    if (init) for (const m of init) { const c = (cand[m.item] || []).find((c) => c.m.x === m.x && c.m.y === m.y && c.m.xoay === m.xoay); if (c && !overlaps(cur, c)) cur.push(c); }
    let curS = ev(cur).s, best = cur, bestS = curS;
    const T0 = init && init.length ? 10 : 40;
    for (let it = 0; it < iters; it++) {
      if (S.abort) break;
      if (it % 20 === 0) { onProg && onProg(it / iters, label); await sleep0(); }
      const T = Math.max(0.4, T0 * (1 - it / iters));
      const next = cur.slice(); const r = rnd();
      const free = () => ids.filter((id) => !next.some((p) => p.m.item === id));
      if (r < 0.4 || next.length === 0) { const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c)) continue; next.push(c); }
      else if (r < 0.6) next.splice(Math.floor(rnd() * next.length), 1);
      else if (r < 0.9) { const i = Math.floor(rnd() * next.length); const id = next[i].m.item; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      else { const i = Math.floor(rnd() * next.length); const f = free(); if (!f.length) continue; const id = f[Math.floor(rnd() * f.length)]; const c = cand[id][Math.floor(rnd() * cand[id].length)]; if (overlaps(next, c, i)) continue; next[i] = c; }
      const e = ev(next);
      if (e.s >= curS || rnd() < Math.exp((e.s - curS) / T)) { cur = next; curS = e.s; if (e.s > bestS) { best = next; bestS = e.s; } }
    }
    const e = ev(best);
    return { manh: best.map((p) => ({ ...p.m })), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R };
  }

  function evalCurrent(nv, mode) {
    const enemies = benchEnemies(nv.canhGioi, nv.tieuCanhGioi || 0);
    const ev = makeEval({ ...clone(nv), kinhMach: { ...clone(nv.kinhMach), manh: [] } }, enemies, mode);
    const manh = nv.kinhMach.manh.map((m) => ({ m, key: m.item + ':' + m.x + ',' + m.y + ',' + m.xoay }));
    const e = ev(manh);
    return { manh: clone(nv.kinhMach.manh), score: e.s, wins: e.wins, n: enemies.length, P: e.P, R: e.R };
  }

  // ───────────────────────── 5. Vẽ kinh mạch ─────────────────────────
  const BASE = { thuy: ['#3f6fb5', '#5a8fd6', '#2c5592', '#6f9fd0'], bang: ['#5fb8c9', '#86cfdc', '#3e9db0'], vo_sac: ['#7d7a76', '#9a958e', '#5f5c58'], hoa: ['#c0392b', '#d9622b', '#a8321f'], tho: ['#8a6a2e', '#a07a3a', '#6e5524'], kim: ['#c9a227', '#8f7a2a', '#e0b84a', '#a8892c', '#d4a017'], moc: ['#3f8f4a', '#5aa865', '#2f6f38'], loi: ['#7a4fb5', '#9a6fd0'], phong: ['#3fa08f', '#5cbfae'] };
  const TINT = { thuy: '#cfdcef', bang: '#d3ecf0', vo_sac: '#dcd6cc', hoa: '#efc2b4', kim: '#f1e3b0', tho: '#e3d2b0', moc: '#cfe6c8', loi: '#ddd0ef', phong: '#cdebe5' };

  function drawGrid(nv, manh, mark) {
    const K = S.core, c = C();
    const nv2 = clone(nv); nv2.kinhMach.manh = manh;
    const g = K.xo(c, nv2), km = nv2.kinhMach;
    const hy = new Set(km.huyetThem || []); g.huyet.forEach((v, i) => v && hy.add(i));
    const own = {}, cols = [], used = {}, pieces = [];
    const R = K.Rt(nv2, c);
    manh.forEach((m, n) => {
      const it = c.items.get(m.item); const he = (it.he || ['vo_sac'])[0];
      const pal = BASE[he] || ['#888']; cols.push(pal[(used[he] = (used[he] || 0) + 1) % pal.length]);
      const cells = K.al(g, m, it) || []; cells.forEach((x) => (own[x] = n));
      const rm = R.manh[n];
      pieces.push({ it, cells, thong: rm ? rm.thong : false, heSo: rm ? rm.heSo : 0, onHuyet: cells.some((x) => hy.has(x)) });
    });
    // chỉ vẽ vùng có ô mở
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    for (let i = 0; i < g.rong * g.cao; i++) if (km.trangThai[i] !== 'an' || own[i] !== undefined) { const x = i % g.rong, y = Math.floor(i / g.rong); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(g.rong - 1, x1 + 1); y1 = Math.min(g.cao - 1, y1 + 1);
    const Sz = 84, M = 10, W = (x1 - x0 + 1) * Sz + 2 * M, H = (y1 - y0 + 1) * Sz + 2 * M;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const d = cv.getContext('2d');
    d.fillStyle = '#f3ece0'; d.fillRect(0, 0, W, H);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * g.rong + x, px = M + (x - x0) * Sz, py = M + (y - y0) * Sz, st = km.trangThai[i];
      let fill = st === 'an' ? '#f3ece0' : (TINT[km.mau[i]] || '#ddd');
      if (own[i] !== undefined) fill = cols[own[i]];
      d.fillStyle = fill; d.fillRect(px + 2, py + 2, Sz - 4, Sz - 4);
      d.strokeStyle = '#bdb2a3'; d.lineWidth = 2; d.strokeRect(px + 2, py + 2, Sz - 4, Sz - 4);
      if (st === 'tac') { d.fillStyle = '#7a1f1a'; d.font = 'bold 38px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('×', px + Sz / 2, py + Sz / 2); }
      if (i === g.danDien && own[i] === undefined) { d.fillStyle = '#fbf7ef'; d.fillRect(px + 5, py + 5, Sz - 10, Sz - 10); d.strokeStyle = '#7a1f1a'; d.lineWidth = 4; d.strokeRect(px + 5, py + 5, Sz - 10, Sz - 10); d.fillStyle = '#7a1f1a'; d.font = 'bold 40px serif'; d.textAlign = 'center'; d.textBaseline = 'middle'; d.fillText('丹', px + Sz / 2, py + Sz / 2 + 2); }
      if (hy.has(i)) { d.beginPath(); d.arc(px + Sz - 16, py + 16, 9, 0, 7); d.fillStyle = '#d9b228'; d.fill(); d.strokeStyle = '#7a5c00'; d.lineWidth = 1.5; d.stroke(); }
      if (mark && mark.has(i)) { d.strokeStyle = '#1a7f37'; d.lineWidth = 7; d.strokeRect(px + 8, py + 8, Sz - 16, Sz - 16); d.fillStyle = '#1a7f37'; d.font = 'bold 18px sans-serif'; d.textAlign = 'left'; d.textBaseline = 'alphabetic'; d.fillText('MỞ', px + 12, py + Sz - 12); }
    }
    pieces.forEach((p, n) => {
      const cs = new Set(p.cells); d.strokeStyle = '#1e1512'; d.lineWidth = 7;
      for (const cI of cs) {
        const x = cI % g.rong, y = Math.floor(cI / g.rong), px = M + (x - x0) * Sz, py = M + (y - y0) * Sz;
        const L = (a, b, e, f) => { d.beginPath(); d.moveTo(a, b); d.lineTo(e, f); d.stroke(); };
        if (!cs.has(cI - g.rong)) L(px, py, px + Sz, py);
        if (!cs.has(cI + g.rong)) L(px, py + Sz, px + Sz, py + Sz);
        if (!cs.has(cI - 1) || x === 0) L(px, py, px, py + Sz);
        if (!cs.has(cI + 1) || x === g.rong - 1) L(px + Sz, py, px + Sz, py + Sz);
      }
      const c0 = Math.min(...p.cells); const x = c0 % g.rong, y = Math.floor(c0 / g.rong);
      const px = M + (x - x0) * Sz + Sz / 2, py = M + (y - y0) * Sz + Sz / 2;
      d.font = 'bold 36px sans-serif'; d.textAlign = 'center'; d.textBaseline = 'middle';
      d.lineWidth = 6; d.strokeStyle = '#1e1512'; d.strokeText(String(n + 1), px, py); d.fillStyle = '#fff'; d.fillText(String(n + 1), px, py);
    });
    const legend = pieces.map((p, n) => `<div class="vk-lg"><span class="vk-sw" style="background:${cols[n]}">${n + 1}</span><b>${esc(p.it.ten)}</b> <span class="vk-mu">· ${esc((p.it.he || ['vo_sac']).map(heTen).join('/'))}${p.onHuyet ? ' · trên huyệt' : ''}${p.thong ? '' : ' · <span class="vk-bad">không thông</span>'}</span></div>`).join('');
    return `<img class="vk-img" src="${cv.toDataURL('image/png')}" alt="kinh mạch"><div class="vk-note">Chấm vàng = huyệt · 丹 = đan điền · × = ô tắc. Giữ tay lên ảnh để lưu.</div>${legend}`;
  }

  // ───────────────────────── 6. Giao diện ─────────────────────────
  const css = `
  #vk-root{position:fixed;inset:0;z-index:2147483000;background:#f3ece0;color:#1e1512;font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column}
  #vk-root *{box-sizing:border-box}
  #vk-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#7a1f1a;color:#fff}
  #vk-hd b{font-size:17px;flex:1}
  #vk-hd button{background:#fff2;border:1px solid #fff6;color:#fff;border-radius:8px;padding:6px 10px;font-size:14px}
  #vk-tabs{display:flex;overflow-x:auto;background:#eadfc6;border-bottom:1px solid #cdbf9f}
  #vk-tabs button{flex:0 0 auto;border:0;background:none;padding:10px 12px;font-size:14px;color:#5a4a3a;border-bottom:3px solid transparent}
  #vk-tabs button.on{color:#7a1f1a;border-bottom-color:#7a1f1a;font-weight:700}
  #vk-body{flex:1;overflow-y:auto;padding:12px 14px 40px}
  .vk-card{background:#fbf7ef;border:1px solid #ddd0b4;border-radius:10px;padding:10px 12px;margin:0 0 12px}
  .vk-card h3{margin:0 0 6px;font-size:16px;color:#7a1f1a}
  .vk-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dashed #e4d8bd}
  .vk-row:last-child{border-bottom:0}
  .vk-mu{color:#6b5a4a}
  .vk-ok{color:#1a7f37;font-weight:600}.vk-bad{color:#b3261e;font-weight:600}
  .vk-btn{display:inline-block;background:#7a1f1a;color:#fff;border:0;border-radius:8px;padding:9px 14px;font-size:15px;margin:4px 6px 4px 0}
  .vk-btn.sec{background:#fff;color:#7a1f1a;border:1px solid #7a1f1a}
  .vk-btn:disabled{opacity:.5}
  .vk-img{width:100%;max-width:480px;display:block;margin:6px auto;border-radius:6px}
  .vk-note{font-size:12px;color:#6b5a4a;text-align:center;margin-bottom:6px}
  .vk-lg{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:14px}
  .vk-sw{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;color:#fff;font-weight:700;font-size:13px;flex:0 0 26px}
  table.vk-t{width:100%;border-collapse:collapse;font-size:13.5px}
  table.vk-t th,table.vk-t td{padding:5px 4px;border-bottom:1px solid #e4d8bd;text-align:left;vertical-align:top}
  table.vk-t th{color:#7a1f1a;font-weight:600}
  .vk-bar{height:8px;background:#e4d8bd;border-radius:4px;overflow:hidden;margin:8px 0}
  .vk-bar i{display:block;height:100%;background:#7a1f1a;width:0}
  .vk-sel{font-size:15px;padding:6px;border-radius:6px;border:1px solid #cdbf9f;background:#fff;max-width:100%}
  .vk-err{background:#fde8e6;border:1px solid #e8b3ad;color:#7a1f1a;border-radius:10px;padding:10px 12px}
  #vk-fab{position:fixed;right:12px;bottom:190px;z-index:2147483001;width:52px;height:52px;border-radius:50%;background:#7a1f1a;color:#fff;font:700 22px serif;border:2px solid #f3ece0;box-shadow:0 2px 8px #0005;display:none}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  const root = document.createElement('div'); root.id = 'vk-root';
  root.innerHTML = `<div id="vk-hd"><b>Trợ lý Vạn Kiếp</b><button id="vk-rf">Làm mới</button><button id="vk-x">Đóng</button></div>
  <div id="vk-tabs"></div><div id="vk-body"></div>`;
  document.body.appendChild(root);
  const fab = document.createElement('button'); fab.id = 'vk-fab'; fab.textContent = '助'; document.body.appendChild(fab);
  const body = root.querySelector('#vk-body'), tabsEl = root.querySelector('#vk-tabs');
  S.show = () => { root.style.display = 'flex'; fab.style.display = 'none'; render(); };
  S.hide = () => { S.abort = true; root.style.display = 'none'; fab.style.display = 'block'; };
  root.querySelector('#vk-x').onclick = S.hide; fab.onclick = S.show;
  root.querySelector('#vk-rf').onclick = () => { S.best = null; S.cho = null; render(); };

  const TABS = [['tq', 'Tổng quan'], ['km', 'Kinh mạch'], ['dp', 'Đột phá & thọ'], ['tr', 'Trận'], ['tien', 'Kiếm linh thạch'], ['cho', 'Chợ quanh đây'], ['tkc', 'Tàng Kinh Các'], ['ld', 'Luyện đan'], ['bd', 'Bản đồ']];
  S.tab = 'tq';
  tabsEl.innerHTML = TABS.map(([k, t]) => `<button data-k="${k}">${t}</button>`).join('');
  tabsEl.onclick = (e) => { const k = e.target.dataset && e.target.dataset.k; if (k) { S.abort = true; S.tab = k; render(); } };

  const errBox = (e) => `<div class="vk-err"><b>Có lỗi:</b> ${esc(e && e.message || e)}<br><span class="vk-mu" style="font-size:12px">Tool ${TOOL_VER}${S.core ? ' · game ' + esc(S.core.bundle) : ''}. Nếu lỗi lặp lại, chụp màn hình gửi Claude.</span></div>`;

  async function render() {
    tabsEl.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === S.tab));
    try {
      if (!S.core) { body.innerHTML = `<div class="vk-card">⏳ <span id="vk-pg">Đang chuẩn bị…</span></div>`; S.core = await loadCore((m) => { const el = body.querySelector('#vk-pg'); if (el) el.textContent = m; }); }
      if (!G().state.run) { body.innerHTML = `<div class="vk-card">Chưa có kiếp nào đang chơi. Vào game (tạo hoặc nạp kiếp) rồi bấm <b>Làm mới</b>.</div>`; return; }
      S.abort = false;
      ({ tq: () => { tabTongQuan(); tongQuanExtra(); }, km: tabKinhMach, dp: tabDotPha2, tr: tabTran, tkc: tabTKC, cho: tabCho, ld: tabLuyenDan, tien: tabTien, bd: tabBanDo })[S.tab]();
    } catch (e) { console.error(e); body.innerHTML = errBox(e); }
  }

  const progressHtml = (id) => `<div id="${id}" style="display:none"><div class="vk-bar"><i></i></div><div class="vk-mu" style="font-size:13px"></div><button class="vk-btn sec vk-stop">Dừng</button></div>`;
  function bindProgress(box) {
    box.style.display = 'block';
    box.querySelector('.vk-stop').onclick = () => { S.abort = true; };
    return (f, label) => { box.querySelector('i').style.width = Math.round(f * 100) + '%'; box.querySelector('.vk-mu').textContent = (label || '') + ' ' + Math.round(f * 100) + '%'; };
  }

  // ── Tab Tổng quan
  function tabTongQuan() {
    const K = S.core, c = ctx(), run = c.run, nv = run.nhanVat;
    const tho = K.ke(nv);
    const lc = nv.linhCan ? `${({ thien: 'Thiên', bien_di: 'Biến dị', song: 'Song', tap: 'Tạp', vo: 'Vô' })[nv.linhCan.pham] || nv.linhCan.pham} linh căn (${(nv.linhCan.he || []).map(heTen).join(', ')})` : '—';
    let sect = '<div class="vk-mu">Chưa vào tông môn.</div>';
    const tm = K.Kn(c);
    if (tm) {
      let ten = tm.slot; try { ten = c.world.info(tm.slot).diaDanh.ten; } catch {}
      const reasons = K.wr(c);
      const next = K.No[tm.capBac + 1];
      sect = `<div class="vk-row"><span>Tông môn</span><b>${esc(ten)}</b></div>
      <div class="vk-row"><span>Cấp bậc</span><b>${esc(K.No[tm.capBac])}</b></div>
      <div class="vk-row"><span>Công tích</span><b>${Math.floor(tm.congTich)}</b></div>
      ${next ? `<div class="vk-row"><span>Lên ${esc(next)}</span>${reasons.length ? `<span class="vk-bad">${esc(reasons.join('; '))}</span>` : '<span class="vk-ok">Đủ điều kiện xin khảo hạch — xem tab Trận</span>'}</div>` : ''}`;
    }
    const nghe = Object.entries(nv.nghe || {}).map(([k, v]) => `${({ luyen_dan: 'Luyện đan', che_phu: 'Chế phù', luyen_bao: 'Luyện bảo', tran_phap: 'Trận pháp' })[k] || k}: bậc ${v.bac}, ${Math.floor(v.kinhNghiem)} kinh nghiệm`).join('<br>') || '—';
    // cơ duyên sắp hết hạn
    const seen = new Map();
    for (const l of run.log || []) if (l.expiresAt && l.key) seen.set(l.key, l);
    const dip = [...seen.values()].filter((l) => l.expiresAt - run.nam >= 0.05).sort((a, b) => a.expiresAt - b.expiresAt)
      .map((l) => `<div class="vk-row"><span>${esc(String(l.text).replace(/còn [\d.,]+ năm\.?/, '').replace(/[-]/g, ''))}</span><b>${num(l.expiresAt - run.nam)} năm</b></div>`).join('') || '<div class="vk-mu">Không có.</div>';
    body.innerHTML = `
    <div class="vk-card"><h3>${esc(nv.ten)}</h3>
      <div class="vk-row"><span>Cảnh giới</span><b>${esc(realmLabel(nv.canhGioi, nv.tieuCanhGioi))}</b></div>
      <div class="vk-row"><span>Tuổi / thọ</span><b>${Math.floor(nv.tuoi)} / ${tho} <span class="vk-mu">(còn ${Math.floor(tho - nv.tuoi)} năm)</span></b></div>
      <div class="vk-row"><span>Linh căn</span><b>${esc(lc)}</b></div>
      <div class="vk-row"><span>Thương thế</span><b>${nv.thuongThe ? `<span class="vk-bad">${nv.thuongThe} bậc</span>` : 'Lành lặn'}</b></div>
      <div class="vk-row"><span>Lịch luyện</span><b>${num(nv.lichLuyen || 0)}${(nv.lichLuyen || 0) < 2 ? ' <span class="vk-bad">sắp cạn — đi đánh/đi xa để hồi</span>' : ''}</b></div>
      <div class="vk-row"><span>Linh thạch · Cống hiến</span><b>${Math.floor(nv.linhThach || 0)} · ${Math.floor(nv.congHien || 0)}</b></div>
      <div class="vk-row"><span>Nghề</span><b style="text-align:right">${nghe}</b></div>
      <div class="vk-row"><span>Lượt khai thông kinh mạch</span><b>${(nv.kinhMach.cho && nv.kinhMach.cho.mo) || 0}</b></div>
    </div>
    <div class="vk-card"><h3>Sư môn</h3>${sect}</div>
    <div class="vk-card"><h3>Cơ duyên sắp hết hạn</h3>${dip}</div>
    <div class="vk-card"><h3>Độ mạnh chung</h3><div id="vk-dm" class="vk-mu">Bấm để đánh thử với mọi loại quái cùng cảnh giới.</div><button class="vk-btn" id="vk-dmb">Đánh thử</button></div>
    <div class="vk-mu" style="font-size:12px;text-align:center">Tool ${TOOL_VER} · game ${esc(K.bundle)}</div>`;
    body.querySelector('#vk-dmb').onclick = async (ev) => {
      ev.target.disabled = true; const out = body.querySelector('#vk-dm'); out.textContent = 'Đang đánh thử…'; await sleep0();
      const P = K.Vr(nvNow(), C()); const res = [];
      for (const tc of [0, 1, 2, 3]) {
        let w = 0, n = 0;
        for (const def of C().enemies.values()) { let E; try { E = enemyAt(def, nv.canhGioi, tc); } catch { continue; } n++; if (fight(P, E).thang) w++; }
        res.push(`<div class="vk-row"><span>Quái ${esc(realmName(nv.canhGioi))} ${STAGE[tc]}</span><b>thắng ${w}/${n} (${pct(w / Math.max(1, n))})</b></div>`); out.innerHTML = res.join(''); await sleep0();
      }
      let w = 0, n = 0;
      for (const def of C().enemies.values()) { let E; try { E = enemyAt(def, nv.canhGioi + 1, 0); } catch { continue; } n++; if (fight(P, E).thang) w++; }
      res.push(`<div class="vk-row"><span>Quái ${esc(realmName(nv.canhGioi + 1))} Sơ</span><b>thắng ${w}/${n} (${pct(w / Math.max(1, n))})</b></div>`);
      out.innerHTML = res.join('') + '<div class="vk-mu" style="font-size:12px">Tính với kinh mạch đang xếp trong game.</div>';
    };
  }

  // ── Tab Kinh mạch
  function statRows(a, b) {
    const ch = (r) => r.P.chieu.filter((x) => x.dang !== undefined).map((x) => `${esc(x.ten)} (${Math.round(x.uy)})`).join(', ');
    const rows = [
      ['Thắng trận mẫu', `${a.wins}/${a.n}`, `${b.wins}/${b.n}`],
      ['Khí huyết', Math.round(a.P.khiHuyetToiDa), Math.round(b.P.khiHuyetToiDa)],
      ['Linh lực / lượt', num(a.P.linhLucMoiLuot), num(b.P.linhLucMoiLuot)],
      ['Tu luyện', '+' + pct(a.R.biDong.toc_do || 0), '+' + pct(b.R.biDong.toc_do || 0)],
      ['Đột phá', '+' + pct(a.R.biDong.dot_pha || 0, 1), '+' + pct(b.R.biDong.dot_pha || 0, 1)],
    ];
    return `<table class="vk-t"><tr><th></th><th>Đang xếp</th><th>Bản mới</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td></tr>`).join('')}
    <tr><td>Chiêu</td><td>${ch(a)}</td><td>${ch(b)}</td></tr></table>`;
  }

  function tabKinhMach() {
    const nv = nvNow();
    const tac = nv.kinhMach.trangThai.map((s, i) => (s === 'tac' ? i : -1)).filter((i) => i >= 0);
    const mo = (nv.kinhMach.cho && nv.kinhMach.cho.mo) || 0;
    body.innerHTML = `
    <div class="vk-card"><h3>Xếp kinh mạch tối ưu</h3>
      <div class="vk-mu" style="font-size:13px">Tool thử hàng nghìn cách xếp các món trong túi, đánh thử ${'9'} trận mẫu cùng cảnh giới cho mỗi cách và giữ cách tốt nhất.</div>
      <div style="margin:8px 0"><select class="vk-sel" id="vk-mode"><option value="bal">Cân bằng (đánh + tu luyện)</option><option value="danh">Ưu tiên đánh nhau</option><option value="tu">Ưu tiên tu luyện / đột phá</option></select>
      <select class="vk-sel" id="vk-it"><option value="1500">Nhanh</option><option value="3000" selected>Vừa</option><option value="6000">Kỹ (lâu)</option></select></div>
      <button class="vk-btn" id="vk-go">Bắt đầu xếp</button>
      ${progressHtml('vk-pr')}<div id="vk-out"></div></div>
    <div class="vk-card"><h3>Ô kinh mạch nên mở</h3>
      <div class="vk-mu" style="font-size:13px">Có ${tac.length} ô tắc · còn ${mo} lượt khai thông. Tool thử mở từng ô rồi xếp lại để xem ô nào lợi nhất.</div>
      <button class="vk-btn" id="vk-op" ${tac.length ? '' : 'disabled'}>Tìm ô nên mở</button>
      ${progressHtml('vk-pr2')}<div id="vk-out2"></div></div>
    <div class="vk-card"><h3>Đang xếp trong game</h3><div id="vk-cur"></div></div>`;
    try { body.querySelector('#vk-cur').innerHTML = drawGrid(nv, nv.kinhMach.manh); } catch (e) { body.querySelector('#vk-cur').innerHTML = errBox(e); }
    if (S.best && S.best.nvKey === JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi])) showBest(nv);
    body.querySelector('#vk-go').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const mode = body.querySelector('#vk-mode').value, iters = +body.querySelector('#vk-it').value;
      const prog = bindProgress(body.querySelector('#vk-pr'));
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const cur = evalCurrent(nv, mode);
        const a = await anneal({ nv0, mode, iters, init: null, onProg: (f) => prog(f * 0.6, 'Đang tìm…') });
        const b = await anneal({ nv0, mode, iters: Math.round(iters / 2), init: (a.score >= cur.score ? a : cur).manh, onProg: (f) => prog(0.6 + f * 0.4, 'Đang tinh chỉnh…') });
        let best = [a, b].sort((x, y) => y.score - x.score)[0];
        if (cur.score >= best.score) best = { ...cur, same: true };
        S.best = { nvKey: JSON.stringify([nv.tuiDo, nv.kinhMach.trangThai, nv.canhGioi, nv.tieuCanhGioi]), cur, best, mode };
        body.querySelector('#vk-pr').style.display = 'none';
        showBest(nv);
      } catch (e) { console.error(e); body.querySelector('#vk-out').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
    body.querySelector('#vk-op').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr2'));
      const mode = body.querySelector('#vk-mode').value;
      try {
        const nv0 = clone(nv); nv0.kinhMach.manh = [];
        const base = await anneal({ nv0, mode, iters: 800, init: nv.kinhMach.manh, onProg: (f) => prog(f / (tac.length + 1), 'Mốc hiện tại…') });
        const res = [];
        for (let k = 0; k < tac.length && !S.abort; k++) {
          const i = tac[k]; const nvO = clone(nv0); nvO.kinhMach.trangThai[i] = 'thong';
          const r = await anneal({ nv0: nvO, mode, iters: 600, init: base.manh, onProg: (f) => prog((k + 1 + f) / (tac.length + 1), `Thử ô ${k + 1}/${tac.length}…`) });
          res.push({ i, r, gain: r.score - base.score });
        }
        res.sort((x, y) => y.gain - x.gain);
        body.querySelector('#vk-pr2').style.display = 'none';
        const top = res[0];
        const g = S.core.xo(C(), nv);
        const pos = (i) => `cột ${i % g.rong + 1}, hàng ${Math.floor(i / g.rong) + 1}`;
        let html = `<table class="vk-t"><tr><th>Ô (tính từ góc trên trái)</th><th>Hệ</th><th>Thắng</th><th>Lợi</th></tr>` +
          res.map((x) => `<tr><td>${pos(x.i)}</td><td>${heTen(nv.kinhMach.mau[x.i])}</td><td>${x.r.wins}/${x.r.n}</td><td>${x.gain > 1 ? '<span class="vk-ok">+' + Math.round(x.gain) + '</span>' : '<span class="vk-mu">≈0</span>'}</td></tr>`).join('') + '</table>';
        if (top && top.gain > 1) {
          const nvO = clone(nv); nvO.kinhMach.trangThai[top.i] = 'thong';
          html = `<div class="vk-ok" style="margin:6px 0">Nên mở ô có khung xanh "MỞ" (${pos(top.i)}). Xếp như ảnh sau khi mở:</div>` + drawGrid(nvO, top.r.manh, new Set([top.i])) + html;
        } else html = `<div class="vk-mu" style="margin:6px 0">Với đồ hiện có, mở ô nào cũng chưa lợi thêm. Giữ lượt khai thông lại.</div>` + html;
        body.querySelector('#vk-out2').innerHTML = html;
      } catch (e) { console.error(e); body.querySelector('#vk-out2').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }
  function showBest(nv) {
    const { cur, best } = S.best; const out = body.querySelector('#vk-out');
    if (!out) return;
    out.innerHTML = (best.same ? '<div class="vk-ok" style="margin:6px 0">Cách đang xếp đã tốt nhất tool tìm được.</div>' : '<div class="vk-ok" style="margin:6px 0">Xếp lại trong game theo ảnh dưới:</div>' + drawGrid(nv, best.manh)) + statRows(cur, best) +
      '<div class="vk-mu" style="font-size:12px;margin-top:6px">Trận mẫu: 9 loại quái cùng cảnh giới với bạn, ở tiểu cảnh giới quanh mức của bạn (thấp hơn 1, bằng, cao hơn 1).</div>';
  }

  // ── Tab Đột phá
  function tabDotPha() {
    const K = S.core, c = ctx(), nv = c.run.nhanVat;
    const h0 = K.kR(c, { dan: [], thieuDot: 0 });
    const pills = [...new Set(h0.danDung || [])];
    const tdOpts = [0, ...(h0.thieuDot || []).map((x, i) => (x.duoc ? i + 1 : null)).filter(Boolean)];
    const combos = [];
    const sets = [[]]; pills.forEach((p) => sets.push([p])); for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) sets.push([pills[i], pills[j]]);
    for (const dan of sets) for (const td of tdOpts) { try { const h = K.kR(ctx(), { dan, thieuDot: td }); combos.push({ dan, td, tiLe: h.tiLe, h }); } catch {} }
    combos.sort((a, b) => b.tiLe - a.tiLe || a.dan.length - b.dan.length || a.td - b.td);
    const itemTen = (id) => (C().items.get(id) || {}).ten || id;
    const rows = combos.slice(0, 10).map((x) => `<tr><td>${x.dan.length ? x.dan.map(itemTen).map(esc).join(' + ') : '—'}</td><td>${x.td ? x.td + ' nấc (−' + h0.thieuDot[x.td - 1].nam + ' năm)' : '—'}</td><td><b>${pct(x.tiLe, 1)}</b></td></tr>`).join('');
    const best = combos[0] || { h: h0, tiLe: h0.tiLe };
    const nguon = (best.h.nguon || []).map((n) => `<div class="vk-row"><span>${esc(n.ten)}</span><b class="${n.gt < 0 ? 'vk-bad' : ''}">${n.gt >= 0 ? '+' : ''}${pct(n.gt, 1)}</b></div>`).join('');
    const cho = h0.cho ? `${esc(h0.cho.ten)} · linh khí ${esc(h0.cho.linhKhi && h0.cho.linhKhi.ten)}` : '—';
    const chan = h0.chan ? `<div class="vk-err" style="margin-bottom:8px">Chưa đột phá được: ${esc(typeof h0.chan === 'string' ? h0.chan : Array.isArray(h0.chan) ? h0.chan.join('; ') : (h0.chan.ten || h0.chan.lyDo || JSON.stringify(h0.chan)))}</div>` : '';
    body.innerHTML = `${chan}
    <div class="vk-card"><h3>Lên ${esc(realmName(h0.len))}</h3>
      <div class="vk-row"><span>Đang ở</span><b>${esc(realmLabel(nv.canhGioi, nv.tieuCanhGioi))}</b></div>
      <div class="vk-row"><span>Nơi đang đứng</span><b>${cho}</b></div>
      <div class="vk-row"><span>Tỉ lệ nếu không dùng gì</span><b>${pct(h0.tiLe, 1)}</b></div>
      ${h0.som ? '<div class="vk-bad" style="font-size:13px">Chưa Đại viên mãn: đột phá sớm bị trừ tỉ lệ.</div>' : ''}
    </div>
    <div class="vk-card"><h3>Các phương án (đan trong túi + đốt thọ)</h3>
      ${pills.length ? '' : '<div class="vk-mu" style="font-size:13px">Trong túi chưa có đan đột phá dùng được.</div>'}
      <table class="vk-t"><tr><th>Đan</th><th>Đốt thọ</th><th>Tỉ lệ</th></tr>${rows}</table>
      <div class="vk-mu" style="font-size:12px;margin-top:6px">Chưa tính hộ pháp (+5% nếu có). Đột phá ở động phủ hoặc sư môn của mình sẽ cao hơn ở thành thị.</div></div>
    <div class="vk-card"><h3>Chi tiết phương án tốt nhất</h3>${nguon}</div>`;
  }

  // ── Tab Trận
  function tabTran() {
    const K = S.core, c = ctx(), run = c.run, nv = run.nhanVat, Cc = C();
    const P = K.Vr(nv, Cc);
    const res4 = (def, cg, muc) => [0, 1, 2, 3].map((tc) => { let E; try { E = enemyAt(def, cg, tc, muc); } catch { return '<td>—</td>'; } const r = fight(P, E); return `<td>${r.thang ? `<span class="vk-ok">Thắng</span><br><span class="vk-mu">còn ${Math.round(r.khiHuyetThapNhat / P.khiHuyetToiDa * 100)}%</span>` : '<span class="vk-bad">Thua</span>'}</td>`; }).join('');
    const head = `<tr><th>Đối thủ</th>${STAGE.map((s) => `<th>${s}</th>`).join('')}</tr>`;
    // Khảo hạch
    let kh = '<div class="vk-mu">Chưa vào tông môn.</div>';
    const tm = K.Kn(c);
    if (tm) {
      const next = tm.capBac + 1, reasons = K.wr(c);
      if (!K.No[next]) kh = '<div class="vk-mu">Đã ở bậc cao nhất.</div>';
      else {
        kh = `<div class="vk-row"><span>Lên ${esc(K.No[next])}</span>${reasons.length ? `<span class="vk-bad">${esc(reasons.join('; '))}</span>` : '<span class="vk-ok">Đủ điều kiện xin khảo hạch</span>'}</div>`;
        if (next === 2 || next === 3) {
          let id; try { id = K.Rsn(c, tm.slot, next); } catch {}
          const npc = id && c.run.npc[id];
          if (!npc) kh += '<div class="vk-mu">Không có đối thủ — khảo hạch qua luôn.</div>';
          else if (nv.canhGioi > npc.canhGioi) kh += `<div class="vk-ok">Đối thủ ${esc(npc.ten)} (${esc(realmLabel(npc.canhGioi, npc.tieuCanhGioi))}) yếu hơn bạn một cảnh giới: sẽ nhận thua, không phải đánh.</div>`;
          else {
            let line = '';
            try { const def = K.ko(c, id); const E = K.Ga(def, Cc, next === 3 ? { muc: 'tinh_anh' } : {}); const r = fight(P, E); line = r.thang ? `<span class="vk-ok">Mô phỏng: THẮNG, còn ${Math.round(r.khiHuyetThapNhat / P.khiHuyetToiDa * 100)}% máu</span>` : `<span class="vk-bad">Mô phỏng: THUA</span> <span class="vk-mu">(đối thủ ${Math.round(E.khiHuyetToiDa)} máu, bạn ${Math.round(P.khiHuyetToiDa)})</span>`; } catch (e) { line = '<span class="vk-mu">Không mô phỏng được.</span>'; }
            kh += `<div class="vk-row"><span>Đối thủ: <b>${esc(npc.ten)}</b> · ${esc(realmLabel(npc.canhGioi, npc.tieuCanhGioi))}</span></div><div>${line}</div><div class="vk-mu" style="font-size:12px">Thua phải chờ 2 năm mới thi lại.</div>`;
          }
        }
      }
    }
    // Nhiệm vụ đang treo
    const names = []; for (let i = 0; i < 8; i++) { const n = realmName(i); if (names.includes(n)) break; names.push(n); }
    const boards = [];
    for (const [slot, v] of Object.entries(run.noiChon || {})) if (v && v.treoThuong && v.treoThuong.viec && v.treoThuong.viec.length) boards.push([slot, v.treoThuong]);
    const nhan = (run.viecNhan || []).map((v) => [null, v]);
    const viecRows = [];
    const clean = (x) => String(x ?? '').replace(/[\ue000-\uf8ff]/g, '');
    const addViec = (v, tag) => {
      const lvl = names.findIndex((n) => clean(v.ten).endsWith('· ' + n));
      const cg = lvl >= 0 ? lvl : nv.canhGioi;
      const foes = Object.values(v.vars || {}).filter((x) => typeof x === 'string' && Cc.enemies.has(x));
      if (!foes.length) return;
      for (const id of foes) viecRows.push(`<tr><td><b>${esc(Cc.enemies.get(id).ten)}</b><br><span class="vk-mu" style="font-size:12px">${tag}${esc(clean(v.ten))}${v.congHien ? ' · ' + v.congHien + ' cống hiến' : ''}</span></td>${res4(Cc.enemies.get(id), cg)}</tr>`);
    };
    for (const [, v] of nhan) addViec(v, 'Đã nhận: ');
    for (const [slot, tt] of boards) for (const v of tt.viec) addViec(v, '');
    const enemyOpts = [...Cc.enemies.values()].sort((a, b) => String(a.ten).localeCompare(String(b.ten), 'vi')).map((e) => `<option value="${esc(e.id)}">${esc(e.ten)}</option>`).join('');
    body.innerHTML = `
    <div class="vk-card"><h3>Khảo hạch thăng cấp tông môn</h3>${kh}</div>
    <div class="vk-card"><h3>Nhiệm vụ trên bảng</h3>
      ${viecRows.length ? `<table class="vk-t">${head}${viecRows.join('')}</table><div class="vk-mu" style="font-size:12px">Cột Sơ…ĐVM = quái ở tiểu cảnh giới đó. Chỉ nhận việc thắng chắc ở cả cột Hậu.</div>` : '<div class="vk-mu">Chưa có bảng nhiệm vụ nào đã mở. Vào Điện nhiệm vụ / Bảng treo thưởng xem một lần rồi bấm Làm mới.</div>'}</div>
    <div class="vk-card"><h3>Thử đánh quái bất kỳ</h3>
      <select class="vk-sel" id="vk-en" style="width:100%">${enemyOpts}</select>
      <div style="margin-top:6px"><select class="vk-sel" id="vk-cg">${names.map((n, i) => `<option value="${i}" ${i === nv.canhGioi ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <select class="vk-sel" id="vk-muc"><option value="thuong">Thường</option><option value="tinh_anh">Tinh anh</option></select>
      <button class="vk-btn" id="vk-fg">Đánh thử</button></div><div id="vk-fo"></div></div>`;
    body.querySelector('#vk-fg').onclick = () => {
      const id = body.querySelector('#vk-en').value, cg = +body.querySelector('#vk-cg').value, muc = body.querySelector('#vk-muc').value;
      body.querySelector('#vk-fo').innerHTML = `<table class="vk-t">${head}<tr><td>${esc(Cc.enemies.get(id).ten)}</td>${res4(Cc.enemies.get(id), cg, muc)}</tr></table>`;
    };
  }

  // ── Tab Tàng Kinh Các
  function itemDesc(it) {
    const b = it.bi_dong || {}, out = [];
    if (it.linh_luc) out.push(`linh lực ${num(it.linh_luc, 2)}`);
    const sg = (v, d = 0) => (v >= 0 ? '+' : '') + pct(v, d);
    if (b.toc_do) out.push(`tu luyện ${sg(b.toc_do)}`);
    if (b.dot_pha) out.push(`đột phá ${sg(b.dot_pha)}`);
    if (b.khi_huyet) out.push(`khí huyết ${sg(b.khi_huyet)}`);
    if (b.ho_the) out.push(`hộ thể ${sg(b.ho_the, 1)}`);
    if (b.khang_tam_ma) out.push(`kháng tâm ma ${b.khang_tam_ma > 0 ? '+' : ''}${pct(b.khang_tam_ma)}`);
    for (const [k, v] of Object.entries(b.chi_so || {})) out.push(`${({ than_thuc: 'thần thức', ngo_tinh: 'ngộ tính', than_phap: 'thân pháp', can_cot: 'căn cốt', dao_tam: 'đạo tâm', khi_van: 'khí vận' })[k] || k} +${v}`);
    if (it.chieu) out.push(`chiêu <b>${esc(it.chieu.ten)}</b> (${({ cong: 'đánh', thu: 'thủ', hoi_phuc: 'hồi máu', khong_che: 'khống chế' })[it.chieu.dang] || it.chieu.dang}, uy ${num(it.chieu.uy, 2)}${it.chieu.scope ? ', đánh lan' : ''})`);
    return out.join(' · ');
  }
  function tabTKC() {
    const K = S.core, c = ctx(), nv = c.run.nhanVat, Cc = C();
    let list = [];
    try { list = [...K.Hon(c, 'cong_phap'), ...K.Hon(c, 'phap_khi')]; } catch (e) { body.innerHTML = errBox(e); return; }
    if (!list.length) { body.innerHTML = '<div class="vk-card">Chưa vào tông môn hoặc Tàng Kinh Các chưa có gì.</div>'; return; }
    const tm = K.Kn(c), cap = tm ? tm.capBac : 0, ch = nv.congHien || 0;
    list.forEach((e) => { e.it = Cc.items.get(e.id); e.own = (nv.tuiDo[e.id] || 0) > 0; e.can = e.capBac <= cap && e.gia <= ch; });
    list.sort((a, b) => (b.can - a.can) || a.gia - b.gia);
    const row = (e) => `<tr><td><b>${esc(e.it.ten)}</b>${e.own ? ' <span class="vk-mu">(đã có)</span>' : ''}<br><span class="vk-mu" style="font-size:12px">${esc((e.it.he || []).map(heTen).join('/'))} · phẩm ${e.it.pham_cap} · ${itemDesc(e.it)}</span></td><td>${e.gia}${e.capBac > cap ? `<br><span class="vk-bad" style="font-size:12px">cần ${esc(K.No[e.capBac])}</span>` : e.gia > ch ? '<br><span class="vk-mu" style="font-size:12px">thiếu</span>' : '<br><span class="vk-ok" style="font-size:12px">mua được</span>'}</td><td class="vk-gain" data-id="${esc(e.id)}"></td></tr>`;
    body.innerHTML = `
    <div class="vk-card"><h3>Nên mua gì?</h3>
      <div class="vk-mu" style="font-size:13px">Bạn có <b>${Math.floor(ch)}</b> cống hiến, cấp <b>${esc(K.No[cap])}</b>. Tool thử thêm từng món vào túi, xếp lại kinh mạch và đánh trận mẫu để đo món nào lợi nhất.</div>
      <label style="display:block;margin:6px 0;font-size:14px"><input type="checkbox" id="vk-all"> Đo cả món chưa đủ cống hiến (cùng cấp bậc)</label>
      <button class="vk-btn" id="vk-ms">Đo giá trị</button>${progressHtml('vk-pr3')}<div id="vk-rank"></div></div>
    <div class="vk-card"><h3>Tàng Kinh Các</h3><table class="vk-t"><tr><th>Món</th><th>Giá</th><th>Lợi</th></tr>${list.map(row).join('')}</table></div>`;
    body.querySelector('#vk-ms').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const all = body.querySelector('#vk-all').checked;
      const targets = list.filter((e) => !e.own && e.capBac <= cap && (all || e.gia <= ch) && e.it.hinh && (e.it.canh_gioi ?? 0) <= nv.canhGioi).slice(0, 25);
      const prog = bindProgress(body.querySelector('#vk-pr3'));
      try {
        const nv0 = clone(nvNow()); nv0.kinhMach.manh = [];
        const mode = 'bal';
        const base = await anneal({ nv0, mode, iters: 1200, init: nvNow().kinhMach.manh, onProg: (f) => prog(f / (targets.length + 1), 'Mốc hiện tại…') });
        const res = [];
        for (let k = 0; k < targets.length && !S.abort; k++) {
          const e = targets[k]; const nvX = clone(nv0); nvX.tuiDo[e.id] = 1;
          const r = await anneal({ nv0: nvX, mode, iters: 800, init: base.manh, onProg: (f) => prog((k + 1 + f) / (targets.length + 1), `Đo ${e.it.ten}…`) });
          const gain = r.score - base.score; res.push({ e, gain, r });
          const td = body.querySelector(`.vk-gain[data-id="${CSS.escape(e.id)}"]`); if (td) td.innerHTML = gain > 1 ? `<span class="vk-ok">+${Math.round(gain)}</span><br><span class="vk-mu" style="font-size:12px">${r.wins}/${r.n} thắng</span>` : '<span class="vk-mu">≈0</span>';
        }
        res.sort((a, b) => b.gain / Math.max(10, b.e.gia) - a.gain / Math.max(10, a.e.gia));
        body.querySelector('#vk-pr3').style.display = 'none';
        body.querySelector('#vk-rank').innerHTML = `<div class="vk-mu" style="font-size:13px;margin:6px 0">Mốc hiện tại: thắng ${base.wins}/${base.n}. Xếp theo <b>lợi trên mỗi cống hiến</b>:</div><table class="vk-t"><tr><th>Món</th><th>Giá</th><th>Lợi</th><th>Thắng</th></tr>` +
          res.filter((x) => x.gain > 1).map((x) => `<tr><td>${esc(x.e.it.ten)}</td><td>${x.e.gia}</td><td class="vk-ok">+${Math.round(x.gain)}</td><td>${x.r.wins}/${x.r.n}</td></tr>`).join('') + '</table>' +
          (res.some((x) => x.gain > 1) ? '' : '<div class="vk-mu">Không món nào giúp rõ rệt so với đồ đang có.</div>') +
          '<div class="vk-mu" style="font-size:12px">"Lợi" = điểm tổng hợp (đánh trận mẫu + tu luyện). Mua xong vào tab Kinh mạch để xếp lại.</div>';
      } catch (e) { console.error(e); body.querySelector('#vk-rank').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }


  // ── Tab Chợ quanh đây: quét hàng các tiệm ở những nơi đi tới được, đo món nào lợi nhất với linh thạch hiện có
  const LOAI_TEN = { cong_phap: 'Công pháp', phap_khi: 'Pháp khí', dan_duoc: 'Đan dược', dung_cu: 'Dụng cụ', linh_duoc: 'Linh dược', yeu_tai: 'Yêu tài', nguyen_lieu: 'Nguyên liệu', phu_luc: 'Phù', phuong_tien: 'Đi lại' };
  async function scanShops(maxY, prog) {
    const K = S.core, c = ctx(), run = c.run, W = c.world, Cc = C(), cur = run.viTri;
    const land = W.tho(cur), out = [];
    const slots = W.slots.filter((s) => { try { return W.tho(s.id) === land; } catch { return false; } });
    const near = [];
    for (const s of slots) { let y; try { y = K.mf(c, s.id); } catch { continue; } if (!(y <= maxY)) continue; try { if (!K.gP(c, s.id)) continue; } catch {} near.push([s.id, y]); }
    near.sort((a, b) => a[1] - b[1]);
    for (let k = 0; k < near.length; k++) {
      if (S.abort) break;
      const [slot, y] = near[k];
      if (k % 4 === 0) { prog(k / near.length, 'Đang xem các tiệm…'); await sleep0(); }
      let encs = []; try { encs = K.Nin(c, slot); } catch { continue; }
      for (const id of encs) {
        const def = Cc.encounters.get(id);
        if (!def || def.kind !== 'cua_hang' || !def.ke_hang || !def.ke_hang.length || def.giao_dien === 'dau_gia') continue;
        const saved = run.active; run.active = { id, slot };
        const cc = { ...c, noi: slot, enc: run.active };
        try {
          for (const e of K.H1(cc, id, slot) || []) {
            const it = Cc.items.get(e.itemId); if (!it) continue;
            const pf = e.priceFactor ?? 1;
            const gia = pf === 1 ? undefined : Math.max(1, Math.round((it.gia || 0) * pf));
            let price; try { price = K.E1(cc, e.itemId, gia, 0); } catch { price = gia ?? it.gia; }
            let noi = slot; try { noi = W.info(slot).ten || slot; } catch {}
            out.push({ slot, noi, years: y, shop: String(def.ten || 'Tiệm').replace(/\{[^}]*\}/g, '').trim() || 'Tiệm', it, price });
          }
        } catch (err) { console.warn('shop', id, slot, err); }
        finally { run.active = saved; }
      }
    }
    return { rows: out, nPlaces: near.length };
  }
  function tabCho() {
    const nv = nvNow();
    body.innerHTML = `
    <div class="vk-card"><h3>Đồ đáng mua bằng linh thạch</h3>
      <div class="vk-mu" style="font-size:13px">Bạn có <b>${Math.floor(nv.linhThach || 0)}</b> linh thạch. Tool xem hàng đang bày ở các tiệm trong bán kính đi đường bạn chọn (cùng đại lục, vùng đã khám phá), rồi thử từng món mua nổi vào kinh mạch để đo món nào lợi nhất.</div>
      <div style="margin:8px 0"><select class="vk-sel" id="vk-ry"><option value="0.5">Trong 6 tháng đường</option><option value="1" selected>Trong 1 năm đường</option><option value="2">Trong 2 năm đường</option><option value="4">Trong 4 năm đường</option></select></div>
      <label style="display:block;margin:4px 0 8px;font-size:14px"><input type="checkbox" id="vk-do" checked> Đo giá trị đồ đánh/tu luyện (lâu hơn)</label>
      <button class="vk-btn" id="vk-sc">Quét chợ</button>${progressHtml('vk-pr4')}</div>
    <div id="vk-cho"></div>`;
    if (S.cho) renderCho();
    body.querySelector('#vk-sc').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr4'));
      try {
        const maxY = +body.querySelector('#vk-ry').value, doMeasure = body.querySelector('#vk-do').checked;
        const { rows, nPlaces } = await scanShops(maxY, (f, l) => prog(f * (doMeasure ? 0.25 : 1), l));
        const money = nv.linhThach || 0;
        // món rẻ nhất của mỗi loại
        const cheapest = new Map();
        for (const r of rows) { const o = cheapest.get(r.it.id); if (!o || r.price < o.price || (r.price === o.price && r.years < o.years)) cheapest.set(r.it.id, r); }
        const usable = [...cheapest.values()].filter((r) => (r.it.loai === 'cong_phap' || r.it.loai === 'phap_khi') && r.it.hinh && (r.it.canh_gioi ?? 0) <= nv.canhGioi && !(nv.tuiDo[r.it.id] > 0) && r.price <= money)
          .sort((a, b) => (b.it.pham_cap || 0) - (a.it.pham_cap || 0) || a.price - b.price).slice(0, 12);
        const measured = [];
        let base = null;
        if (doMeasure && usable.length) {
          const nv0 = clone(nv); nv0.kinhMach.manh = [];
          base = await anneal({ nv0, mode: 'bal', iters: 1000, init: nv.kinhMach.manh, onProg: (f) => prog(0.25 + 0.75 * f / (usable.length + 1), 'Mốc hiện tại…') });
          for (let k = 0; k < usable.length && !S.abort; k++) {
            const r = usable[k]; const nvX = clone(nv0); nvX.tuiDo[r.it.id] = 1;
            const res = await anneal({ nv0: nvX, mode: 'bal', iters: 600, init: base.manh, onProg: (f) => prog(0.25 + 0.75 * (k + 1 + f) / (usable.length + 1), `Đo ${r.it.ten}…`) });
            measured.push({ r, gain: res.score - base.score, wins: res.wins, n: res.n });
          }
          measured.sort((a, b) => b.gain - a.gain);
        }
        S.cho = { rows, nPlaces, cheapest, usable, measured, base, money, maxY, canhGioi: nv.canhGioi };
        body.querySelector('#vk-pr4').style.display = 'none';
        renderCho();
      } catch (e) { console.error(e); body.querySelector('#vk-cho').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }
  function renderCho() {
    const { rows, nPlaces, cheapest, usable, measured, base, money, canhGioi } = S.cho;
    const where = (r) => `${esc(r.noi)} <span class="vk-mu">· ${r.years < 0.05 ? 'ngay đây' : num(r.years) + ' năm'}</span>`;
    const all = [...cheapest.values()];
    // Đan đột phá cho cửa kế tiếp
    const pills = all.filter((r) => r.it.dot_pha && (r.it.dot_pha.canh_gioi === undefined || r.it.dot_pha.canh_gioi === canhGioi + 1)).sort((a, b) => a.price - b.price);
    const lo = all.filter((r) => r.it.loai === 'dung_cu').sort((a, b) => (b.it.pham_cap || 0) - (a.it.pham_cap || 0));
    let html = `<div class="vk-card"><h3>Kết quả</h3><div class="vk-mu" style="font-size:13px">Đã xem ${nPlaces} nơi, ${rows.length} món đang bày. Giá đã tính theo từng nơi. Hàng có thể đổi khi sang chu kỳ mới hoặc bị người khác mua.</div></div>`;
    if (measured.length) {
      const good = measured.filter((m) => m.gain > 1);
      if (good.length >= 2) html += `<div class="vk-card"><h3>Bộ mua tốt nhất với ${Math.floor(money)} linh thạch</h3><div class="vk-mu" style="font-size:13px">Thử kết hợp 2–3 món trong số đáng mua nhất, xem bộ nào mạnh nhất mà vẫn đủ tiền.</div><button class="vk-btn" id="vk-cb">Tìm bộ</button>${progressHtml('vk-pr7')}<div id="vk-cbo">${S.cho.combo || ''}</div></div>`;
      html += `<div class="vk-card"><h3>Đồ đánh / tu luyện đáng mua</h3>${good.length ? `<table class="vk-t"><tr><th>Món</th><th>Ở đâu</th><th>Giá</th><th>Lợi</th></tr>` +
        good.map((m) => `<tr><td><b>${esc(m.r.it.ten)}</b><br><span class="vk-mu" style="font-size:12px">${esc((m.r.it.he || []).map(heTen).join('/'))} · phẩm ${m.r.it.pham_cap} · ${itemDesc(m.r.it)}</span></td><td>${where(m.r)}</td><td>${Math.round(m.r.price)}</td><td class="vk-ok">+${Math.round(m.gain)}<br><span class="vk-mu" style="font-size:12px">${m.wins}/${m.n} thắng</span></td></tr>`).join('') + '</table>' : '<div class="vk-mu">Không món nào mua nổi giúp rõ rệt so với đồ đang có.</div>'}
        <div class="vk-mu" style="font-size:12px;margin-top:6px">Mốc hiện tại: thắng ${base.wins}/${base.n} trận mẫu. "Lợi" cùng thang điểm với tab Tàng Kinh Các.</div></div>`;
    } else if (usable.length) {
      html += `<div class="vk-card"><h3>Đồ đánh / tu luyện mua nổi</h3><table class="vk-t"><tr><th>Món</th><th>Ở đâu</th><th>Giá</th></tr>${usable.map((r) => `<tr><td><b>${esc(r.it.ten)}</b><br><span class="vk-mu" style="font-size:12px">phẩm ${r.it.pham_cap} · ${itemDesc(r.it)}</span></td><td>${where(r)}</td><td>${Math.round(r.price)}</td></tr>`).join('')}</table></div>`;
    } else html += `<div class="vk-card"><h3>Đồ đánh / tu luyện</h3><div class="vk-mu">Không có món mới nào mua nổi với ${Math.floor(money)} linh thạch.</div></div>`;
    html += `<div class="vk-card"><h3>Đan cho lần đột phá tới</h3>${pills.length ? `<table class="vk-t"><tr><th>Đan</th><th>Ở đâu</th><th>Giá</th></tr>${pills.map((r) => `<tr><td><b>${esc(r.it.ten)}</b><br><span class="vk-mu" style="font-size:12px">+${pct(r.it.dot_pha.ti_le || 0)} tỉ lệ</span></td><td>${where(r)}</td><td class="${r.price <= money ? 'vk-ok' : 'vk-bad'}">${Math.round(r.price)}</td></tr>`).join('')}</table>` : '<div class="vk-mu">Các tiệm quanh đây không bày đan đột phá cho cửa kế tiếp. Thử bán kính xa hơn hoặc đợi đấu giá.</div>'}</div>`;
    if (lo.length) html += `<div class="vk-card"><h3>Dụng cụ nghề</h3><table class="vk-t"><tr><th>Món</th><th>Ở đâu</th><th>Giá</th></tr>${lo.map((r) => `<tr><td><b>${esc(r.it.ten)}</b><br><span class="vk-mu" style="font-size:12px">phẩm ${r.it.pham_cap}</span></td><td>${where(r)}</td><td class="${r.price <= money ? 'vk-ok' : 'vk-bad'}">${Math.round(r.price)}</td></tr>`).join('')}</table></div>`;
    const byPlace = new Map(); for (const r of rows) { if (!byPlace.has(r.noi)) byPlace.set(r.noi, []); byPlace.get(r.noi).push(r); }
    html += `<div class="vk-card"><h3>Toàn bộ hàng theo nơi</h3>` + [...byPlace.entries()].map(([noi, rs]) => `<details><summary><b>${esc(noi)}</b> <span class="vk-mu">· ${rs[0].years < 0.05 ? 'ngay đây' : num(rs[0].years) + ' năm'} · ${rs.length} món</span></summary><table class="vk-t">${rs.sort((a, b) => a.price - b.price).map((r) => `<tr><td>${esc(r.it.ten)} <span class="vk-mu" style="font-size:12px">· ${LOAI_TEN[r.it.loai] || r.it.loai} · phẩm ${r.it.pham_cap ?? '?'}</span></td><td class="${r.price <= money ? '' : 'vk-mu'}">${Math.round(r.price)}</td></tr>`).join('')}</table></details>`).join('') + '</div>';
    body.querySelector('#vk-cho').innerHTML = html;
    const cb = body.querySelector('#vk-cb');
    if (cb) cb.onclick = async () => {
      cb.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr7'));
      try {
        const r = await comboSearch(prog);
        body.querySelector('#vk-pr7').style.display = 'none';
        let h = '';
        if (!r || !r.res.length) h = '<div class="vk-mu">Không có bộ 2–3 món nào vừa tiền. Mua món lẻ tốt nhất ở bảng dưới.</div>';
        else {
          const bestSingle = r.singles.filter((m) => m.r.price <= money).sort((a, b) => b.gain - a.gain)[0];
          const top = r.res.slice(0, 5);
          h = '<table class="vk-t"><tr><th>Bộ</th><th>Tổng giá</th><th>Lợi</th></tr>' + top.map((x) => `<tr><td>${x.s.map((m) => `<b>${esc(m.r.it.ten)}</b> <span class="vk-mu" style="font-size:12px">(${esc(m.r.noi)})</span>`).join('<br>')}</td><td>${Math.round(x.cost)}</td><td class="vk-ok">+${Math.round(x.gain)}<br><span class="vk-mu" style="font-size:12px">${x.wins}/${x.n} thắng</span></td></tr>`).join('') + '</table>';
          if (bestSingle && bestSingle.gain >= top[0].gain) h += `<div class="vk-mu" style="font-size:13px">Mua lẻ ${esc(bestSingle.r.it.ten)} đã gần bằng bộ tốt nhất — có thể giữ tiền lại.</div>`;
        }
        S.cho.combo = h; body.querySelector('#vk-cbo').innerHTML = h;
      } catch (e) { body.querySelector('#vk-cbo').innerHTML = errBox(e); }
      cb.disabled = false;
    };
  }

  // ═════════════════════════ BẢN 2.0: các tính năng mới ═════════════════════════
  const has = (...ks) => ks.every((k) => typeof S.core[k] === 'function');
  const needMsg = (what) => `<div class="vk-mu">Phần "${what}" chưa dùng được với bản game này. Bấm "Tự kiểm tra" ở tab Tổng quan rồi chụp màn hình gửi Claude.</div>`;
  const placeName = (c, slot) => { try { return c.world.info(slot).ten || slot; } catch { return slot; } };
  const danger = (c, slot) => { try { return S.core.is(S.core.ua(c, c.run, slot)); } catch { return null; } };
  const dangerTag = (d) => !d ? '' : `<span class="${d.id === 'hiem' || d.id === 'tu_dia' ? 'vk-bad' : d.id === 'ngang_suc' ? '' : 'vk-ok'}">${esc(d.ten)}</span>`;
  const yrs = (y) => (y < 0.05 ? 'ngay đây' : num(y) + ' năm');
  const cleanTxt = (x) => String(x ?? '').replace(/[-]/g, '').replace(/\{[^}]*\}/g, '…').replace(/\s+/g, ' ').trim();
  const HOA = { on: 'Lửa nhỏ', thuong: 'Lửa vừa', lieu: 'Lửa lớn' };
  const NGHE = { luyen_dan: 'Luyện đan', che_phu: 'Chế phù', luyen_bao: 'Luyện bảo' };
  const GRADE = [['hong_nang', 'Nổ lò'], ['hong', 'Hỏng'], ['ha', 'Hạ'], ['trung', 'Trung'], ['thuong', 'Thượng'], ['cuc', 'Cực']];
  function withPlace(c, slot) { const c2 = { ...c, run: { ...c.run, viTri: slot, active: undefined }, enc: undefined }; return c2; }
  function nearSlots(c, maxY) {
    const W = c.world, cur = c.run.viTri; let land; try { land = W.tho(cur); } catch {}
    const out = [];
    for (const s of W.slots) {
      if (s.an) continue;
      try { if (land !== undefined && W.tho(s.id) !== land) continue; } catch { continue; }
      let y; try { y = S.core.mf(c, s.id); } catch { continue; }
      if (!(y <= maxY)) continue;
      try { if (S.core.gP && !S.core.gP(c, s.id)) continue; } catch {}
      out.push({ slot: s.id, y });
    }
    return out.sort((a, b) => a.y - b.y);
  }
  // Mô phỏng nhanh 1 quái ở cảnh giới của nó, trả về chuỗi kết quả
  function simFoe(P, def, tcs) {
    tcs = tcs || (String(def.id || '').startsWith('npc.') && def.tieu_canh_gioi !== undefined ? [def.tieu_canh_gioi] : [0, 2]);
    const res = tcs.map((tc) => { try { const E = S.core.Ga({ ...def, tieu_canh_gioi: tc }, C(), def.muc ? { muc: def.muc } : {}); return fight(P, E).thang; } catch { return null; } });
    if (res.every((r) => r === true)) return { ok: 2, txt: '<span class="vk-ok">Thắng chắc</span>' };
    if (res.some((r) => r === true)) return { ok: 1, txt: '<span>Có thể thắng</span>' };
    if (res.every((r) => r === null)) return { ok: -1, txt: '<span class="vk-mu">?</span>' };
    return { ok: 0, txt: '<span class="vk-bad">Thua</span>' };
  }
  function foesOf(c, vars) {
    const out = [];
    for (const v of Object.values(vars || {})) {
      if (typeof v !== 'string') continue;
      let def; try { def = S.core.ko(c, v); } catch {}
      if (!def && C().enemies.has(v)) def = C().enemies.get(v);
      if (def && def.ten) out.push(def);
    }
    return out;
  }
  function rewardHint(def) {
    const s = JSON.stringify(def.choices || def.scenes || {}), out = [];
    const lt = [...s.matchAll(/"linh_thach":\s*(\d+)/g)].map((m) => +m[1]);
    if (lt.length) out.push(`linh thạch tới ${Math.max(...lt)}`);
    const ids = [...new Set([...s.matchAll(/"(?:add_item|roi_quy)":\s*(?:\{"id":\s*)?"(item\.[a-z0-9_]+)"/g)].map((m) => m[1]))];
    const names = ids.map((id) => C().items.get(id)).filter(Boolean).sort((a, b) => (b.pham_cap || 0) - (a.pham_cap || 0)).slice(0, 3).map((it) => it.ten);
    if (names.length) out.push(names.join(', '));
    if (/"tu_vi"/.test(s)) out.push('tu vi');
    if (/"cong_hien"/.test(s)) out.push('cống hiến');
    return out.join(' · ') || '—';
  }

  // ── Đột phá & thọ nguyên: kế hoạch
  function planData() {
    const K = S.core, c = ctx(), nv = c.run.nhanVat, Cc = C();
    const tho = K.ke(nv), left = tho - nv.tuoi;
    const p = { tho, left, need: 0, nextNeed: 0, here: null, hereYears: Infinity, places: [], stagn: false };
    try { p.need = K.qw(c, { untilExhausted: true }); p.nextNeed = K.qw(c, { nextMinorRealm: true }); } catch {}
    try { p.here = K.to(c); } catch {}
    if (p.here && !p.here.chan && p.here.tuViNam > 0) {
      p.hereYears = p.need / p.here.tuViNam;
      try { const got = K.Nb(c, p.here, { dan: [], danSo: {} }, p.hereYears); p.stagn = got < p.need * 0.97; } catch {}
    }
    try { const d = K.Di(nv, Cc); p.speed = d; p.capped = d / (1 + (nv.tucTue || 0)) > 1.45; } catch {}
    return { c, nv, p };
  }
  async function scanRetreat(c, maxY, prog) {
    const K = S.core, out = [];
    const list = nearSlots(c, maxY);
    for (let i = 0; i < list.length; i++) {
      if (S.abort) break;
      if (i % 15 === 0) { prog && prog(i / list.length, 'Đang so chỗ bế quan…'); await sleep0(); }
      const { slot, y } = list[i];
      let info; try { info = K.to(withPlace(c, slot)); } catch { continue; }
      if (!info || info.chan || !(info.tuViNam > 0)) continue;
      out.push({ slot, y, info, d: danger(c, slot) });
    }
    const dr = (d) => ({ an_toan: 0, ngang_suc: 1, hiem: 2, tu_dia: 3 })[d && d.id] ?? 1;
    return out.sort((a, b) => b.info.tuViNam - a.info.tuViNam || dr(a.d) - dr(b.d) || a.y - b.y);
  }
  function pillCandidates(nextRealm) {
    return [...C().items.values()].filter((it) => it.dot_pha && (it.dot_pha.canh_gioi === undefined || it.dot_pha.canh_gioi === nextRealm));
  }
  function bestRateWith(nv, extraPills, td, asDvm) {
    const c = ctx();
    if (asDvm && c.run.nhanVat.tieuCanhGioi < 3) { c.run.nhanVat.tieuCanhGioi = 3; c.run.nhanVat.peakStage = 3; }
    for (const id of extraPills) c.run.nhanVat.tuiDo[id] = Math.max(1, c.run.nhanVat.tuiDo[id] || 0);
    try { return S.core.kR(c, { dan: extraPills, thieuDot: td }).tiLe; } catch { return null; }
  }
  function whereToGet(id) {
    const out = [];
    const nv = nvNow();
    if ((nv.tuiDo[id] || 0) > 0) out.push('<span class="vk-ok">trong túi</span>');
    try { const c = ctx(); const e = [...S.core.Hon(c, 'cong_phap'), ...S.core.Hon(c, 'phap_khi')].find((x) => x.id === id); if (e) out.push(`Tàng Kinh Các (${e.gia} cống hiến)`); } catch {}
    if (S.cho) { const r = S.cho.cheapest.get(id); if (r) out.push(`${esc(r.noi)} · ${yrs(r.years)} · ${Math.round(r.price)} lt`); }
    return out.join('; ');
  }

  function tabDotPha2() {
    if (!has('to', 'qw', 'Nb')) { tabDotPha(); body.insertAdjacentHTML('afterbegin', `<div class="vk-card"><h3>Kế hoạch thọ nguyên</h3>${needMsg('kế hoạch thọ nguyên')}</div>`); return; }
    const { c, nv, p } = planData();
    const nextRealm = nv.canhGioi + 1;
    const atTop = p.need <= 0;
    let verdict = '';
    if (atTop) verdict = '<div class="vk-ok">Đã đủ tu vi Đại viên mãn — có thể chuẩn bị đột phá.</div>';
    else if (!p.here || p.here.chan) verdict = `<div class="vk-mu">Chỗ đang đứng không bế quan được${p.here && p.here.chan ? ': ' + esc(p.here.chan) : ''}. Xem danh sách chỗ bế quan bên dưới.</div>`;
    else {
      const ok = p.hereYears < p.left - 5;
      verdict = `<div class="${ok ? 'vk-ok' : 'vk-bad'}" style="font-size:16px">${ok ? 'Kịp' : 'KHÔNG KỊP'}: cần khoảng <b>${Math.ceil(p.hereYears)} năm</b> bế quan ở đây, còn <b>${Math.floor(p.left)} năm</b> thọ.</div>`;
    }
    body.innerHTML = `
    <div class="vk-card"><h3>Kế hoạch tới Đại viên mãn</h3>
      <div class="vk-row"><span>Cảnh giới</span><b>${esc(realmLabel(nv.canhGioi, nv.tieuCanhGioi))}</b></div>
      <div class="vk-row"><span>Thọ còn</span><b>${Math.floor(p.left)} năm <span class="vk-mu">(${Math.floor(nv.tuoi)}/${p.tho})</span></b></div>
      <div class="vk-row"><span>Tu vi còn thiếu tới Đại viên mãn</span><b>${Math.ceil(p.need)}</b></div>
      ${p.nextNeed > 0 && p.nextNeed < p.need ? `<div class="vk-row"><span>…tới tiểu cảnh giới kế</span><b>${Math.ceil(p.nextNeed)}</b></div>` : ''}
      <div class="vk-row"><span>Bế quan ở chỗ này</span><b>${p.here && !p.here.chan ? `${num(p.here.tuViNam, 2)} tu vi/năm · ${esc(p.here.ten)} · linh khí ${esc(p.here.linhKhi && p.here.linhKhi.ten)}` : '—'}</b></div>
      ${verdict}
      ${p.stagn ? '<div class="vk-bad" style="font-size:13px">Lịch luyện không đủ cho cả quãng bế quan: giữa chừng sẽ ngưng trệ. Xen kẽ đi đánh, đi xa để hồi.</div>' : ''}
      ${p.capped ? '<div class="vk-mu" style="font-size:13px">Tốc độ tu luyện từ linh căn + công pháp đã vượt trần 1,5: thêm công pháp tăng tốc giờ chỉ còn 25% tác dụng. Đòn bẩy lớn hơn là chỗ bế quan, đan tu luyện, đạo lữ.</div>' : ''}
    </div>
    <div class="vk-card"><h3>Chỗ bế quan tốt nhất gần đây</h3>
      <select class="vk-sel" id="vk-bqy"><option value="1">Trong 1 năm đường</option><option value="3" selected>Trong 3 năm đường</option><option value="8">Trong 8 năm đường</option></select>
      <button class="vk-btn" id="vk-bq">So sánh</button>${progressHtml('vk-pr5')}<div id="vk-bqo"></div></div>
    <div class="vk-card"><h3>Đan giúp tu vi và thọ</h3><div id="vk-pill"></div></div>
    <div class="vk-card"><h3>Muốn đạt tỉ lệ đột phá cao nhất</h3><div id="vk-tgt"></div></div>
    <div id="vk-dpold"></div>`;
    // Đan tu luyện / thọ / phá bình cảnh
    const Cc = C();
    const tuPills = [...Cc.items.values()].filter((it) => it.tu_luyen && (it.tu_luyen.canh_gioi === undefined || it.tu_luyen.canh_gioi === nv.canhGioi));
    const thoPills = [...Cc.items.values()].filter((it) => JSON.stringify(it.dung || '').includes('"tho_nguyen"') && (it.canh_gioi ?? 0) <= nv.canhGioi);
    const bcPills = [...Cc.items.values()].filter((it) => JSON.stringify(it.dung || '').includes('pha_binh_canh') && it.canh_gioi === nv.canhGioi);
    const tuv = p.here && p.here.tuViNam || 0;
    const rowP = (it, eff) => `<tr><td><b>${esc(it.ten)}</b><br><span class="vk-mu" style="font-size:12px">${eff}</span></td><td style="font-size:13px">${whereToGet(it.id) || '<span class="vk-mu">chưa thấy — quét tab Chợ</span>'}</td></tr>`;
    let ph = '<table class="vk-t"><tr><th>Đan</th><th>Có ở đâu</th></tr>';
    for (const it of tuPills) ph += rowP(it, `+${pct(it.tu_luyen.toc_do)} tu luyện trong ${it.tu_luyen.nam} năm${tuv ? ` ≈ +${Math.round(it.tu_luyen.toc_do * tuv * it.tu_luyen.nam)} tu vi` : ''}`);
    for (const it of thoPills) { const m = /"tho_nguyen":\s*(\d+)/.exec(JSON.stringify(it.dung)); ph += rowP(it, `+${m ? m[1] : '?'} năm thọ`); }
    for (const it of bcPills) ph += rowP(it, 'phá bình cảnh của tầng hiện tại (đỡ phần tu vi tích thêm)');
    ph += '</table><div class="vk-mu" style="font-size:12px">Dùng nhiều lần cùng một loại đan sẽ bị dược kháng, hiệu quả giảm dần.</div>';
    body.querySelector('#vk-pill').innerHTML = (tuPills.length + thoPills.length + bcPills.length) ? ph : '<div class="vk-mu">Không có đan phù hợp cảnh giới này.</div>';
    // Mục tiêu tỉ lệ
    try {
      const dvm = nv.tieuCanhGioi < 3;
      const base0 = bestRateWith(nv, [], 0, dvm);
      const h0 = { ...S.core.kR(c, { dan: [], thieuDot: 0 }), tiLe: base0 ?? 0 };
      const cands = pillCandidates(nextRealm).map((it) => ({ it, gain: (bestRateWith(nv, [it.id], 0, dvm) ?? h0.tiLe) - h0.tiLe })).filter((x) => x.gain > 0.0001).sort((a, b) => b.gain - a.gain);
      const top2 = cands.slice(0, 2).map((x) => x.it.id);
      const tdMax = (h0.thieuDot || []).reduce((m, x, i) => (x.duoc ? i + 1 : m), 0);
      const best = bestRateWith(nv, top2, tdMax, dvm);
      let html = (dvm ? '<div class="vk-mu" style="font-size:13px;margin-bottom:4px">Tính như khi bạn đã tới Đại viên mãn (đột phá sớm bị trừ rất nặng).</div>' : '') + `<div class="vk-row"><span>Không dùng gì</span><b>${pct(h0.tiLe, 1)}</b></div>`;
      cands.slice(0, 4).forEach((x) => { html += `<div class="vk-row"><span>+ ${esc(x.it.ten)} <span class="vk-mu" style="font-size:12px">${whereToGet(x.it.id) || 'chưa thấy chỗ bán'}</span></span><b>+${pct(x.gain, 1)}</b></div>`; });
      if (tdMax) html += `<div class="vk-row"><span>+ đốt ${tdMax} nấc thọ (−${h0.thieuDot[tdMax - 1].nam} năm)</span><b>+${pct((bestRateWith(nv, [], tdMax, dvm) ?? h0.tiLe) - h0.tiLe, 1)}</b></div>`;
      html += `<div class="vk-row"><span><b>Gom đủ 2 đan tốt nhất + đốt thọ</b></span><b class="vk-ok">${best !== null ? pct(best, 1) : '?'}</b></div>`;
      html += '<div class="vk-mu" style="font-size:12px">Cộng thêm: hộ pháp +5%; đột phá ở động phủ của mình hoặc sư môn cao hơn ở thành thị; linh khí dồi dào +5%. Từ Kết Đan, mọi khoản cộng bị giảm vì bình cảnh.</div>';
      body.querySelector('#vk-tgt').innerHTML = html;
    } catch (e) { body.querySelector('#vk-tgt').innerHTML = errBox(e); }
    // bảng phương án cũ
    const keep = body.innerHTML;
    tabDotPha(); const old = body.innerHTML; body.innerHTML = keep; body.querySelector('#vk-dpold').innerHTML = old;
    body.querySelector('#vk-bq').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr5'));
      try {
        const list = await scanRetreat(c, +body.querySelector('#vk-bqy').value, prog);
        body.querySelector('#vk-pr5').style.display = 'none';
        const top = list.slice(0, 8);
        body.querySelector('#vk-bqo').innerHTML = top.length ? `<table class="vk-t"><tr><th>Nơi</th><th>Tu vi/năm</th><th>Tới ĐVM</th></tr>` + top.map((r) => {
          const yy = p.need > 0 ? p.need / r.info.tuViNam : 0;
          const ok = r.y + yy < p.left - 5;
          return `<tr><td><b>${esc(placeName(c, r.slot))}</b><br><span class="vk-mu" style="font-size:12px">${esc(r.info.ten)} · linh khí ${esc(r.info.linhKhi && r.info.linhKhi.ten)}${r.info.doYen ? ' · ' + esc(r.info.doYen) : ''} · ${yrs(r.y)} · ${dangerTag(r.d)}${r.info.rentPerYear ? ` · ${Math.round(r.info.rentPerYear)} lt/năm` : ''}${r.info.meritPerYear ? ` · ${Math.round(r.info.meritPerYear)} cống hiến/năm` : ''}</span></td><td>${num(r.info.tuViNam, 2)}</td><td class="${ok ? 'vk-ok' : 'vk-bad'}">${p.need > 0 ? Math.ceil(yy) + ' năm' : '—'}</td></tr>`;
        }).join('') + '</table><div class="vk-mu" style="font-size:12px">Mỗi lần ngồi bị giới hạn số năm theo loại chỗ; ngồi xong cứ ngồi tiếp. Động phủ của mình không giới hạn.</div>' : '<div class="vk-mu">Không tìm thấy chỗ bế quan nào trong bán kính này.</div>';
      } catch (e) { body.querySelector('#vk-bqo').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }

  // ── Luyện đan & thi nghề
  function gradeBar(pb) {
    return GRADE.filter(([k]) => pb[k] > 0.004).map(([k, t]) => `<span class="${k === 'thuong' || k === 'cuc' ? 'vk-ok' : k.startsWith('hong') ? 'vk-bad' : 'vk-mu'}">${t} ${pct(pb[k])}</span>`).join(' · ');
  }
  function recipeRows(c, nv) {
    const K = S.core, Cc = C(), out = [];
    for (const dpId of nv.donPhuong || []) {
      const dp = Cc.donPhuong.get(dpId); if (!dp) continue;
      let best = null;
      for (const hoa of ['on', 'thuong', 'lieu']) {
        let L; try { L = K.Lu(c, { dp: dpId, hoa, phu: [], soMe: 1 }, { ten: '', diem: 0 }); } catch { continue; }
        if (!L) continue;
        if (L.phuDung && L.phuDung.some((x) => x.length)) { try { const L2 = K.Lu(c, { dp: dpId, hoa, phu: L.phuDung.map((x) => x[0] || ''), soMe: 1 }, { ten: '', diem: 0 }); if (L2) L = L2; } catch {} }
        const good = (L.phanBo.thuong || 0) + (L.phanBo.cuc || 0);
        const so = dp.so || [1, 2, 3, 4];
        const qty = (L.phanBo.ha || 0) * so[0] + (L.phanBo.trung || 0) * (so[1] ?? so[0]) + (L.phanBo.thuong || 0) * (so[2] ?? so[1]) + (L.phanBo.cuc || 0) * (so[3] ?? so[2]);
        const r = { dpId, dp, hoa, L, good, qty };
        if (!best || (r.qty > best.qty + 1e-9) || (Math.abs(r.qty - best.qty) < 1e-9 && good > best.good)) best = r;
      }
      if (!best) continue;
      const ra = best.L.ra;
      let sell = 0; try { sell = K.IP ? K.IP(c, ra.id, undefined, 0) : Math.round((ra.gia || 0) * 0.6); } catch { sell = Math.round((ra.gia || 0) * 0.6); }
      const cost = (dp.chu || []).reduce((s, x) => s + (Cc.items.get(x.id)?.gia || 0) * x.so, 0) + (dp.linh_thach || 0);
      const nam = best.L.nam || 0.05;
      out.push({ ...best, ra, sell, cost, nam, profit: best.qty * sell - cost, perYear: (best.qty * sell - cost) / nam });
    }
    return out;
  }
  function tabLuyenDan() {
    const K = S.core, c = ctx(), nv = c.run.nhanVat, Cc = C();
    let html = '';
    // Thi nghề
    if (!has('jan', 'bb')) html += `<div class="vk-card"><h3>Thi nghề</h3>${needMsg('thi nghề')}</div>`;
    else {
      const ngheList = Object.keys(nv.nghe || {}).length ? Object.keys(nv.nghe) : ['luyen_dan'];
      for (const ng of ngheList) {
        const bac = (nv.nghe && nv.nghe[ng] && nv.nghe[ng].bac) || 0;
        let rows = '', best = null;
        for (const hoa of ['on', 'thuong', 'lieu']) {
          let j; try { j = K.jan(c, ng, hoa); } catch { continue; }
          if (!best || j.qua > best.j.qua) best = { hoa, j };
          rows += `<tr><td>${HOA[hoa]}</td><td><b>${pct(j.qua)}</b></td><td style="font-size:12px">${gradeBar(j.phanBo)}</td></tr>`;
        }
        let reasons = []; try { reasons = K.bb(c, ng); } catch {}
        let parts = '';
        if (has('Pw') && best) { try { parts = K.Pw(c, ng, best.j.pham, best.hoa, { ten: 'Trường thi', diem: 0 }, best.j.pham).filter((x) => x.ten !== 'Luyện vượt bậc' && x.gt).map((x) => `<div class="vk-row"><span>${esc(x.ten)}</span><b class="${x.gt < 0 ? 'vk-bad' : ''}">${x.gt > 0 ? '+' : ''}${Math.round(x.gt)}</b></div>`).join(''); } catch {} }
        html += `<div class="vk-card"><h3>Thi ${esc(NGHE[ng] || ng)} lên bậc ${bac + 1}</h3>
          ${reasons.length ? `<div class="vk-bad" style="margin-bottom:6px">Chưa thi được: ${esc(reasons.join('; '))}</div>` : '<div class="vk-ok" style="margin-bottom:6px">Đủ điều kiện dự thi.</div>'}
          <table class="vk-t"><tr><th>Cách lửa</th><th>Đỗ</th><th>Phân bố</th></tr>${rows}</table>
          ${best ? `<div style="margin-top:6px">Nên chọn <b>${HOA[best.hoa]}</b>: đỗ ${pct(best.j.qua)}. Cần ra hạng Thượng trở lên mới đỗ. Rớt thì chỉ bị khóa 3 năm <b>ở nơi vừa thi</b> — sang nơi khác có trường thi là thi lại được ngay.</div>` : ''}
          ${parts ? `<details style="margin-top:6px"><summary>Điểm của bạn (cao hơn thì đỗ dễ hơn)</summary>${parts}<div class="vk-mu" style="font-size:12px">Tăng điểm: chỉ số chính của nghề (công pháp, đồ cộng thần thức/ngộ tính), lên cảnh giới.</div></details>` : ''}</div>`;
      }
    }
    // Tự luyện
    if (!has('Lu')) html += `<div class="vk-card"><h3>Đan phương đã thuộc</h3>${needMsg('luyện chế')}</div>`;
    else {
      const rr = recipeRows(c, nv).sort((a, b) => (a.L.chan ? 1 : 0) - (b.L.chan ? 1 : 0) || b.perYear - a.perYear);
      html += `<div class="vk-card"><h3>Đan phương đã thuộc</h3>${rr.length ? '<table class="vk-t"><tr><th>Đan</th><th>Lửa nên dùng</th><th>Lãi ước tính</th></tr>' + rr.map((r) => {
        const miss = (r.dp.chu || []).filter((x) => (nv.tuiDo[x.id] || 0) < x.so).map((x) => `${Cc.items.get(x.id)?.ten || x.id} ×${x.so}`);
        return `<tr><td><b>${esc(r.ra.ten)}</b> <span class="vk-mu" style="font-size:12px">phẩm ${r.L.pham}</span><br><span style="font-size:12px">${gradeBar(r.L.phanBo)}</span>${r.L.chan ? `<br><span class="vk-bad" style="font-size:12px">${esc(r.L.chan)}</span>` : ''}${miss.length ? `<br><span class="vk-mu" style="font-size:12px">thiếu: ${esc(miss.join(', '))}</span>` : ''}</td><td>${HOA[r.hoa]}<br><span class="vk-mu" style="font-size:12px">~${num(r.qty, 1)} viên/mẻ · ${num(r.nam, 2)} năm/mẻ</span></td><td class="${r.profit > 0 ? 'vk-ok' : 'vk-bad'}">${Math.round(r.profit)} lt/mẻ<br><span class="vk-mu" style="font-size:12px">bán ~${r.sell}/viên</span></td></tr>`;
      }).join('') + '</table><div class="vk-mu" style="font-size:12px">Lãi = số viên trung bình × giá bán ở đây − giá gốc nguyên liệu − linh thạch mỗi mẻ. Giá thật ở tiệm có thể chênh.</div>' : '<div class="vk-mu">Chưa thuộc đan phương nào.</div>'}</div>`;
    }
    body.innerHTML = html;
  }

  // ── Kiếm linh thạch
  async function scanBounties(c, maxY, prog) {
    const K = S.core, out = [], P = K.Vr(c.run.nhanVat, C());
    const list = nearSlots(c, maxY);
    for (let i = 0; i < list.length; i++) {
      if (S.abort) break;
      if (i % 10 === 0) { prog && prog(i / list.length, 'Đang xem bảng treo thưởng…'); await sleep0(); }
      const { slot, y } = list[i];
      let viec; try { viec = K.Rrn(c, slot, 'thanh_tran'); } catch { continue; }
      for (const v of viec || []) {
        if (!v.thuong) continue;
        const foes = foesOf(c, v.vars);
        let worst = { ok: 2, txt: '<span class="vk-mu">không rõ</span>' };
        for (const f of foes) { const r = simFoe(P, f); if (r.ok < worst.ok || worst.txt.includes('không rõ')) worst = r; }
        let y2 = 0; try { y2 = K.mf(withPlace(c, slot), v.slot); } catch {}
        out.push({ board: slot, y, v, foes, res: worst, y2, d: danger(c, v.slot) });
      }
    }
    return out;
  }
  function junkItems(c, nv) {
    const K = S.core, Cc = C(), out = [];
    const onGrid = new Set(nv.kinhMach.manh.map((m) => m.item));
    const equip = new Set(Object.values(nv.trangBi || {}));
    const recipeMats = new Set(); for (const dpId of nv.donPhuong || []) { const dp = Cc.donPhuong.get(dpId); (dp?.chu || []).forEach((x) => recipeMats.add(x.id)); (dp?.phu || []).forEach(() => {}); }
    for (const [id, n] of Object.entries(nv.tuiDo)) {
      if (!(n > 0) || onGrid.has(id) || equip.has(id)) continue;
      const it = Cc.items.get(id); if (!it || !it.gia) continue;
      if (['don_phuong', 'lenh_bai', 'phuong_tien', 'tru_vat'].includes(it.loai)) continue;
      const keepPill = it.dot_pha || it.tu_luyen || JSON.stringify(it.dung || '').includes('tho_nguyen');
      let price; try { price = K.IP ? K.IP(c, id, undefined, 0) : Math.round(it.gia * 0.6); } catch { price = Math.round(it.gia * 0.6); }
      out.push({ it, n, price, total: price * n, keep: keepPill ? 'đan quý — cân nhắc giữ' : recipeMats.has(id) ? 'nguyên liệu đan phương của bạn' : (it.loai === 'cong_phap' || it.loai === 'phap_khi') ? 'đồ không dùng trên kinh mạch' : '' });
    }
    return out.sort((a, b) => b.total - a.total);
  }
  function tabTien() {
    const K = S.core, c = ctx(), nv = c.run.nhanVat;
    const junk = junkItems(c, nv);
    const sum = junk.filter((x) => !x.keep.startsWith('đan quý') && !x.keep.startsWith('nguyên liệu')).reduce((s, x) => s + x.total, 0);
    let bong = '';
    if (has('KI')) { try { const k = K.KI(c); if (k.linhThach || k.congHien) bong = `<div class="vk-ok">Bổng lộc đang chờ ở sư môn: ${k.linhThach} linh thạch, ${Math.round(k.congHien)} cống hiến (${k.nam} năm).</div>`; } catch {} }
    body.innerHTML = `
    <div class="vk-card"><h3>Cách kiếm linh thạch</h3>
      <div class="vk-mu" style="font-size:13px">Bạn có <b>${Math.floor(nv.linhThach || 0)}</b> linh thạch. Theo thứ tự nên làm:</div>
      <ol style="margin:6px 0 0;padding-left:20px;font-size:14px">
        <li><b>Bán đồ thừa</b> trong túi (bảng dưới) — có tiền ngay. Bán ở nơi xa vùng sản sinh ra món đó thì được giá cao hơn.</li>
        <li><b>Nhận treo thưởng</b> ở các thành trấn quanh đây — chỉ nhận việc tool báo <span class="vk-ok">Thắng chắc</span>. Đây thường là nguồn lớn nhất.</li>
        <li><b>Luyện đan để bán</b> khi đã có lò và đan phương có lãi (tab Luyện đan).</li>
        <li><b>Lĩnh bổng lộc</b> đều đặn nếu ở tông môn; cấp càng cao càng nhiều.</li>
        <li>Đánh yêu thú lấy yêu tài, trồng linh dược ở linh điền động phủ rồi đem bán.</li>
      </ol>${bong}</div>
    <div class="vk-card"><h3>Treo thưởng quanh đây</h3>
      <select class="vk-sel" id="vk-tty"><option value="1">Trong 1 năm đường</option><option value="2" selected>Trong 2 năm đường</option><option value="4">Trong 4 năm đường</option></select>
      <button class="vk-btn" id="vk-tt" ${has('Rrn') ? '' : 'disabled'}>Tìm việc</button>${progressHtml('vk-pr6')}<div id="vk-tto">${has('Rrn') ? '' : needMsg('bảng treo thưởng')}</div></div>
    <div class="vk-card"><h3>Đồ trong túi bán được</h3>
      ${junk.length ? `<div class="vk-mu" style="font-size:13px">Bán hết phần không cần giữ được khoảng <b>${Math.round(sum)}</b> linh thạch (giá ở chỗ đang đứng).</div><table class="vk-t"><tr><th>Món</th><th>SL</th><th>Tổng</th></tr>${junk.slice(0, 40).map((x) => `<tr><td>${esc(x.it.ten)}${x.keep ? `<br><span class="vk-mu" style="font-size:12px">${x.keep}</span>` : ''}</td><td>${x.n}</td><td>${Math.round(x.total)}</td></tr>`).join('')}</table>` : '<div class="vk-mu">Túi không có gì đáng bán.</div>'}</div>`;
    body.querySelector('#vk-tt').onclick = async (ev) => {
      ev.target.disabled = true; S.abort = false;
      const prog = bindProgress(body.querySelector('#vk-pr6'));
      try {
        const list = await scanBounties(c, +body.querySelector('#vk-tty').value, prog);
        body.querySelector('#vk-pr6').style.display = 'none';
        list.sort((a, b) => (b.res.ok >= 1) - (a.res.ok >= 1) || b.v.thuong / (1 + b.y + b.y2) - a.v.thuong / (1 + a.y + a.y2));
        body.querySelector('#vk-tto').innerHTML = list.length ? `<table class="vk-t"><tr><th>Việc</th><th>Thưởng</th><th>Sức</th></tr>` + list.slice(0, 25).map((r) => `<tr><td><b>${esc(cleanTxt(r.v.ten))}</b><br><span class="vk-mu" style="font-size:12px">Nhận ở ${esc(placeName(c, r.board))} (${yrs(r.y)}) → làm ở ${esc(placeName(c, r.v.slot))} (${yrs(r.y2)}, ${dangerTag(r.d)}) · hạn ${r.v.han} năm${r.foes.length ? ' · gặp ' + esc(r.foes.map((f) => f.ten).join(', ')) : ''}</span></td><td><b>${r.v.thuong}</b>${r.v.congHien ? `<br><span class="vk-mu" style="font-size:12px">+${r.v.congHien} cống hiến</span>` : ''}</td><td>${r.res.txt}</td></tr>`).join('') + '</table><div class="vk-mu" style="font-size:12px">Bảng treo thưởng đổi mỗi năm. "Thắng chắc" = thắng quái cả ở Sơ và Hậu kỳ cảnh giới của nó.</div>' : '<div class="vk-mu">Không thấy việc có thưởng linh thạch trong bán kính này.</div>';
      } catch (e) { body.querySelector('#vk-tto').innerHTML = errBox(e); }
      ev.target.disabled = false;
    };
  }

  // ── Bản đồ: cơ duyên + đường đi an toàn
  function routeSafe(c, target) {
    const W = c.world, start = c.run.viTri, PO = S.core.PO || 30;
    let land; try { land = W.tho(start); } catch {}
    const nodes = W.slots.filter((s) => !s.an && (() => { try { return W.tho(s.id) === land; } catch { return false; } })());
    const idx = new Map(nodes.map((s, i) => [s.id, i]));
    if (!idx.has(target) || !idx.has(start)) return null;
    const pen = nodes.map((s) => { const d = danger(c, s.id); return d && d.id === 'tu_dia' ? 40 : d && d.id === 'hiem' ? 12 : 0; });
    const N = nodes.length, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const si = idx.get(start), ti = idx.get(target); dist[si] = 0;
    const lim = PO * 0.97;
    for (;;) {
      let u = -1, b = Infinity; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < b) { b = dist[i]; u = i; }
      if (u < 0 || u === ti) break; done[u] = 1;
      const a = nodes[u];
      for (let v = 0; v < N; v++) {
        if (done[v]) continue;
        const d = Math.hypot(a.x - nodes[v].x, a.y - nodes[v].y); if (d > lim) continue;
        const w = d + 2 + (v === ti ? 0 : pen[v]);
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
      }
    }
    if (!isFinite(dist[ti])) return null;
    const path = []; for (let v = ti; v >= 0; v = prev[v]) path.push(nodes[v]); path.reverse();
    let len = 0; for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    return { path, len };
  }
  function tabBanDo() {
    const K = S.core, c = ctx(), run = c.run, Cc = C(), P = K.Vr(run.nhanVat, Cc);
    const items = [];
    for (const [slot, n] of Object.entries(run.nodes || {})) {
      if (!n || !n.encounter) continue;
      if (n.hetHanNam !== undefined && n.hetHanNam <= run.nam) continue;
      const def = Cc.encounters.get(n.encounter); if (!def) continue;
      let y = Infinity; try { y = K.mf(c, slot); } catch {}
      const foes = foesOf(c, n.vars); let worst = null;
      for (const f of foes) { const r = simFoe(P, f); if (!worst || r.ok < worst.ok) worst = r; }
      items.push({ slot, def, n, y, foes, res: worst, d: danger(c, slot), left: n.hetHanNam !== undefined ? n.hetHanNam - run.nam : undefined });
    }
    items.sort((a, b) => a.y - b.y);
    const opts = items.map((x, i) => `<option value="${esc(x.slot)}">${esc(cleanTxt(x.def.ten || x.n.encounter))} · ${esc(placeName(c, x.slot))}</option>`).join('');
    const tm = K.Kn(c);
    const extra = tm ? `<option value="${esc(tm.slot)}">Sư môn · ${esc(placeName(c, tm.slot))}</option>` : '';
    const choTowns = S.cho ? [...new Set(S.cho.rows.map((r) => r.slot))].slice(0, 30).map((sl) => `<option value="${esc(sl)}">Chợ · ${esc(placeName(c, sl))}</option>`).join('') : '';
    body.innerHTML = `
    <div class="vk-card"><h3>Cơ duyên và sự kiện trên bản đồ</h3>${items.length ? `<table class="vk-t"><tr><th>Sự kiện</th><th>Đi</th><th>Sức</th></tr>${items.map((x) => `<tr><td><b>${esc(cleanTxt(x.def.ten || x.n.encounter))}</b><br><span class="vk-mu" style="font-size:12px">${esc(placeName(c, x.slot))} · ${dangerTag(x.d)}${x.left !== undefined ? ` · còn ${num(x.left)} năm` : ''}${x.foes.length ? ' · gặp ' + esc(x.foes.map((f) => f.ten).join(', ')) : ''}<br>Có thể được: ${esc(rewardHint(x.def))}</span></td><td>${yrs(x.y)}</td><td>${x.res ? x.res.txt : '<span class="vk-mu">không rõ</span>'}</td></tr>`).join('')}</table>` : '<div class="vk-mu">Chưa có sự kiện nào hiện trên bản đồ.</div>'}</div>
    <div class="vk-card"><h3>Đường đi an toàn</h3>
      <div class="vk-mu" style="font-size:13px">Đi một chặng dài dễ gặp biến cố giữa đường. Chặng ngắn hơn ${K.PO || 30} đơn vị bản đồ thì không bị chặn giữa đường. Tool tìm chuỗi chặng ngắn, né nơi nguy hiểm.</div>
      <select class="vk-sel" id="vk-dst" style="width:100%;margin:6px 0">${opts}${extra}${choTowns}</select>
      <button class="vk-btn" id="vk-rt" ${items.length || tm || choTowns ? '' : 'disabled'}>Tìm đường</button><div id="vk-rto"></div></div>`;
    body.querySelector('#vk-rt').onclick = () => {
      const dst = body.querySelector('#vk-dst').value; const out = body.querySelector('#vk-rto');
      let direct = 0; try { direct = K.mf(c, dst); } catch {}
      const r = routeSafe(c, dst);
      if (!r) { out.innerHTML = '<div class="vk-mu">Không tìm được đường bộ (có thể khác đại lục, cần đi thuyền).</div>'; return; }
      const dTot = Math.hypot(c.world.slot(run.viTri).x - c.world.slot(dst).x, c.world.slot(run.viTri).y - c.world.slot(dst).y) || 1;
      const yPer = direct / dTot;
      out.innerHTML = `<div style="margin:6px 0">Đi thẳng: ${yrs(direct)}${dTot >= (K.PO || 30) ? ' · <span class="vk-bad">có thể bị chặn giữa đường</span>' : ''}. Đi theo chặng: ${r.path.length - 1} chặng, khoảng ${yrs(r.len * yPer)}.</div><ol style="margin:0;padding-left:20px;font-size:14px">${r.path.slice(1).map((s) => `<li>${esc(placeName(c, s.id))} ${dangerTag(danger(c, s.id))}</li>`).join('')}</ol>`;
    };
  }

  // ── Cảnh báo (Tổng quan) + thăng cấp xa hơn + tự kiểm tra
  function warnings() {
    const K = S.core, c = ctx(), run = c.run, nv = run.nhanVat, w = [];
    try { const left = K.ke(nv) - nv.tuoi; if (left < 30) w.push(['bad', `Thọ chỉ còn ${Math.floor(left)} năm.`]); } catch {}
    if (has('to', 'qw')) { try { const { p } = planData(); if (p.need > 0 && p.hereYears !== Infinity && p.hereYears > p.left - 5) w.push(['bad', `Bế quan ở chỗ này cần ~${Math.ceil(p.hereYears)} năm mới tới Đại viên mãn, nhưng thọ chỉ còn ${Math.floor(p.left)} năm. Xem tab Đột phá.`]); } catch {} }
    if ((nv.lichLuyen || 0) < 2) w.push(['bad', 'Lịch luyện sắp cạn: bế quan sẽ ngưng trệ. Đi đánh, đi xa để hồi.']);
    if (nv.thuongThe) w.push(['bad', `Đang bị thương ${nv.thuongThe} bậc: tu luyện và đột phá đều giảm.`]);
    const tm = run.tongMon; if (tm && tm.promotionRetryYear && tm.promotionRetryYear > run.nam) w.push(['', `Khảo hạch tông môn bị khóa thêm ${num(tm.promotionRetryYear - run.nam)} năm.`]);
    if (has('bb')) for (const ng of Object.keys(nv.nghe || {})) { try { const r = K.bb(c, ng).find((x) => x.includes('rớt')); if (r) w.push(['', `${NGHE[ng] || ng}: ${r}.`]); } catch {} }
    const seen = new Map(); for (const l of run.log || []) if (l.expiresAt && l.key) seen.set(l.key, l);
    for (const l of seen.values()) { const d = l.expiresAt - run.nam; if (d > 0.05 && d < 0.6) w.push(['', `Sắp hết hạn (${num(d)} năm): ${cleanTxt(String(l.text).replace(/còn [\d.,]+ năm\.?/, ''))}`]); }
    return w;
  }
  function masterInfo(c) {
    const ms = Object.values(c.run.npc || {}).filter((n) => n.song && n.danhPhan === 'su_phu');
    return ms.map((m) => `${esc(m.ten)} (thiện cảm ${Math.round(m.haoCam ?? 0)})`).join(', ');
  }
  async function selfTest(out) {
    const K = S.core, rows = [];
    const t = async (name, fnc) => { try { const r = await fnc(); rows.push([name, true, r || '']); } catch (e) { rows.push([name, false, e && e.message || String(e)]); } out.innerHTML = rows.map(([n, ok, m]) => `<div class="vk-row"><span>${esc(n)}</span><b class="${ok ? 'vk-ok' : 'vk-bad'}">${ok ? 'OK' : 'LỖI'}</b></div>${ok ? '' : `<div class="vk-mu" style="font-size:12px">${esc(m)}</div>`}`).join(''); await sleep0(); };
    await t('Đọc nhân vật', () => { const nv = nvNow(); if (!nv.kinhMach) throw new Error('thiếu kinh mạch'); });
    await t('Kinh mạch + đánh thử', () => { const r = evalCurrent(nvNow(), 'bal'); if (!r.P) throw new Error('không dựng được nhân vật'); });
    await t('Đột phá', () => { K.kR(ctx(), { dan: [], thieuDot: 0 }); });
    await t('Kế hoạch thọ', () => { if (!has('to', 'qw', 'Nb')) throw new Error('thiếu hàm'); planData(); });
    await t('Thi nghề', () => { if (!has('jan')) throw new Error('thiếu hàm'); K.jan(ctx(), 'luyen_dan', 'thuong'); });
    await t('Luyện đan', () => { if (!has('Lu')) throw new Error('thiếu hàm'); recipeRows(ctx(), nvNow()); });
    await t('Tàng Kinh Các', () => { K.Hon(ctx(), 'cong_phap'); });
    await t('Chợ (1 nơi)', async () => { const c = ctx(); const near = nearSlots(c, 3); for (const { slot } of near) { const encs = K.Nin(c, slot); for (const id of encs) { const d = C().encounters.get(id); if (d && d.kind === 'cua_hang' && d.ke_hang && d.ke_hang.length) { K.H1({ ...c, noi: slot }, id, slot); return 'ok'; } } } return 'không có tiệm gần'; });
    await t('Treo thưởng', () => { if (!has('Rrn')) throw new Error('thiếu hàm'); const c = ctx(); K.Rrn(c, c.run.viTri, 'thanh_tran'); });
    await t('Giá bán', () => { if (!has('IP')) throw new Error('thiếu hàm'); });
    await t('Độ nguy hiểm', () => { if (!has('ua', 'is')) throw new Error('thiếu hàm'); const c = ctx(); K.is(K.ua(c, c.run, c.run.viTri)); });
    if ((K.optMissing || []).length) rows.push(['Hàm chưa nhận ra', false, K.optMissing.join(', ')]);
    out.innerHTML += `<div class="vk-mu" style="font-size:12px;margin-top:6px">Tool ${TOOL_VER} · game ${esc(K.bundle)}</div>`;
  }
  function tongQuanExtra() {
    const c = ctx();
    const w = warnings();
    const warnHtml = w.length ? w.map(([k, t]) => `<div class="${k === 'bad' ? 'vk-bad' : ''}" style="padding:3px 0">• ${esc(t)}</div>`).join('') : '<div class="vk-ok">Không có gì đáng lo.</div>';
    body.insertAdjacentHTML('afterbegin', `<div class="vk-card"><h3>Cảnh báo</h3>${warnHtml}</div>`);
    const tm = S.core.Kn(c);
    if (tm) {
      const sect = [...body.querySelectorAll('.vk-card')].find((el) => el.querySelector('h3') && el.querySelector('h3').textContent === 'Sư môn');
      if (sect) {
        let extra = '';
        const mi = masterInfo(c); extra += `<div class="vk-row"><span>Sư phụ</span><b>${mi || 'chưa có'}</b></div>`;
        if (has('KS') && tm.capBac === 2) { try { const r = S.core.KS(c); extra += `<div class="vk-row"><span>Xin tiến cử lên Chân truyền</span>${r ? `<span class="vk-bad">${esc(r)}</span>` : '<span class="vk-ok">Được — gặp sư phụ xin tiến cử</span>'}</div>`; } catch {} }
        sect.insertAdjacentHTML('beforeend', extra);
      }
    }
    body.insertAdjacentHTML('beforeend', `<div class="vk-card"><h3>Tự kiểm tra</h3><div class="vk-mu" style="font-size:13px">Chạy thử mọi chức năng với bản game hiện tại. Nếu có dòng LỖI, chụp màn hình gửi Claude.</div><button class="vk-btn" id="vk-st">Tự kiểm tra</button><div id="vk-sto"></div></div>`);
    body.querySelector('#vk-st').onclick = async (ev) => { ev.target.disabled = true; await selfTest(body.querySelector('#vk-sto')); ev.target.disabled = false; };
  }

  // ── Chợ: tìm bộ mua tốt nhất theo ngân sách
  async function comboSearch(prog) {
    const { measured, money } = S.cho;
    const cand = measured.filter((m) => m.gain > 1).slice(0, 5);
    if (cand.length < 2) return null;
    const nv = nvNow(); const nv0 = clone(nv); nv0.kinhMach.manh = [];
    const base = S.cho.base;
    const sets = [];
    for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) { sets.push([cand[i], cand[j]]); for (let k = j + 1; k < cand.length; k++) sets.push([cand[i], cand[j], cand[k]]); }
    const ok = sets.filter((s) => s.reduce((a, m) => a + m.r.price, 0) <= money);
    const res = [];
    for (let i = 0; i < ok.length && !S.abort; i++) {
      const s = ok[i]; const nvX = clone(nv0); s.forEach((m) => { nvX.tuiDo[m.r.it.id] = 1; });
      const r = await anneal({ nv0: nvX, mode: 'bal', iters: 450, init: base.manh, onProg: (f) => prog((i + f) / ok.length, `Thử bộ ${i + 1}/${ok.length}…`) });
      res.push({ s, gain: r.score - base.score, wins: r.wins, n: r.n, cost: s.reduce((a, m) => a + m.r.price, 0) });
    }
    res.sort((a, b) => b.gain - a.gain);
    return { res, singles: cand };
  }

  render();
})();
