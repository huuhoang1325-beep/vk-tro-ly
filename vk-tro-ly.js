// Trợ lý Vạn Kiếp Tu Tiên — mức 1 (chỉ tính toán, không tự bấm).
// Chạy bên trong trang game: tự tải code hiện tại của game và dùng lại các hàm tính toán của chính game.
const TOOL_VER = '1.0.0';

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
  };
  const REGEX_NAMES = {
    rn: [/function ([\w$]+)\(t\)\{return [\w$]+\[Math\.max\(0,Math\.min\([\w$]+,t\)\)\]\}/, 'bảng cảnh giới'],
    fn: [/class ([\w$]+)\{constructor\(n\)\{this\.state=n\}static fromSeed/, 'bộ số ngẫu nhiên'],
    No: [/const ([\w$]+)=\["Tạp dịch","Ngoại môn"/, 'tên cấp bậc tông môn'],
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
  root.querySelector('#vk-rf').onclick = () => { S.best = null; S.lastShop = null; S.lastOpen = null; render(); };

  const TABS = [['tq', 'Tổng quan'], ['km', 'Kinh mạch'], ['dp', 'Đột phá'], ['tr', 'Trận'], ['tkc', 'Tàng Kinh Các']];
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
      ({ tq: tabTongQuan, km: tabKinhMach, dp: tabDotPha, tr: tabTran, tkc: tabTKC })[S.tab]();
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
    if (b.toc_do) out.push(`tu luyện +${pct(b.toc_do)}`);
    if (b.dot_pha) out.push(`đột phá +${pct(b.dot_pha)}`);
    if (b.khi_huyet) out.push(`khí huyết +${pct(b.khi_huyet)}`);
    if (b.ho_the) out.push(`hộ thể +${pct(b.ho_the, 1)}`);
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

  render();
})();
