/* 붙여넣기 추가 파서 (앱/웹 공용) - 법정동으로 거주지, 이름 모양으로 소개자 판단 */
(function () {
  var SUR = '김이박최정강조윤장임한오서신권황안송류유홍전고문양손배백허남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부가피감계복상빈사승시야오옥';
  var strong = null, weak = null;
  function build() {
    strong = {}; weak = {};
    var B = window.BK_BJD || { S: [], A: [], G: [] };
    function add(o, s) { if (s) o[s] = 1; }
    B.S.forEach(function (s) { add(strong, s); });
    B.A.forEach(function (s) { add(strong, s); });
    B.G.forEach(function (g) {
      var sg = g[1];
      add(strong, sg);
      sg.split(' ').forEach(function (p) {
        add(strong, p);
        if (p.length > 2 && /[시군구]$/.test(p)) add(strong, p.slice(0, -1));
      });
      (g[2] || []).forEach(function (d) {
        add(strong, d);
        d.split(' ').forEach(function (p) {
          add(strong, p);
          if (p.length > 2 && /[동읍면리]$/.test(p)) add(weak, p.slice(0, -1));
        });
      });
    });
  }
  /* 'strong' | 'weak' | '' */
  function placeKind(seg) {
    if (!strong) build();
    seg = String(seg || '').trim();
    if (!seg) return '';
    var parts = seg.split(/\s+/), k = 'strong';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (strong[p]) continue;
      if (weak[p]) { k = 'weak'; continue; }
      return '';
    }
    return k;
  }
  function nameLike(s) { return /^[가-힣]{2,4}$/.test(s); }
  function surname(s) { return SUR.indexOf(s.charAt(0)) >= 0; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function fmtPhone(d) {
    if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
    if (d.length === 10) return d.slice(0, 2) === '02' ? '02-' + d.slice(2, 6) + '-' + d.slice(6) : d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    if (d.length === 9 && d.slice(0, 2) === '02') return '02-' + d.slice(2, 5) + '-' + d.slice(5);
    return d;
  }
  /* 토큰 하나 분류: {t:'res'|'intro'|'', why, sugg, sure} */
  function classify(tok) {
    var k = placeKind(tok);
    if (k === 'strong') return { t: 'res', why: '법정동 ✓', sure: true };
    if (k === 'weak') {
      if (nameLike(tok) && surname(tok)) return { t: 'res', why: '지명·이름 겸용', sure: false, both: true };
      return { t: 'res', why: '법정동 ✓', sure: true };
    }
    if (nameLike(tok)) return { t: 'intro', why: '이름 ✓', sure: true };
    return { t: '', why: '지명도 이름도 아니에요', sure: false };
  }
  function parseLine(raw, idx) {
    var line = String(raw || '').replace(/^[\s​﻿]*(?:[-•*·▶▷]|\d{1,3}[.)])\s+/, '').trim();
    var r = { idx: idx, raw: String(raw || '').trim(), name: '', phone: '', birth: '', res: '', intro: '', memo: '', err: '', pend: [], notes: {} };
    var m = line.match(/(0\d{1,2})[-.\s]?(\d{3,4})[-.\s]?(\d{4})(?!\d)/);
    if (!m) { r.err = '전화번호를 찾지 못했어요'; var nm0 = line.match(/[가-힣]{2,5}/); r.name = nm0 ? nm0[0] : ''; return r; }
    r.phone = fmtPhone(m[1] + m[2] + m[3]);
    var before = line.slice(0, m.index), after = line.slice(m.index + m[0].length);
    var rest = after;
    var bm = rest.match(/(?:^|[^\d])((?:19|20)\d{6}|\d{6})(?!\d)/);
    if (bm) {
      var b = bm[1]; if (b.length === 8) b = b.slice(2);
      r.birth = b; rest = rest.replace(bm[1], ' ');
    }
    var bsegs = before.split(/[·/|,;ㆍ\t]+/).map(function (x) { return x.trim(); }).filter(function (x) { return /[가-힣A-Za-z0-9]/.test(x); });
    var nameTxt = '', carry = [];
    var ni = -1;
    bsegs.forEach(function (x, i) { if (ni < 0 && nameLike(x) && !placeKind(x)) ni = i; });
    if (ni < 0) bsegs.forEach(function (x, i) { if (ni < 0 && /^[가-힣A-Za-z]{2,10}$/.test(x) && !placeKind(x)) ni = i; });
    if (ni >= 0) { nameTxt = bsegs[ni]; bsegs.forEach(function (x, i) { if (i !== ni) carry.push(x); }); rest = carry.join(' / ') + ' / ' + rest; }
    else {
      var seg0 = rest.replace(/^[\s·/|,;:\-ㆍ]+/, '');
      var mm = seg0.match(/^([가-힣]{2,5})(?=[\s·/|,;]|$)/);
      if (mm) { nameTxt = mm[1]; rest = bsegs.join(' / ') + ' / ' + seg0.slice(mm[1].length); }
    }
    r.name = nameTxt.replace(/\s+/g, ' ').trim();
    if (!r.name) { r.err = '이름을 찾지 못했어요'; return r; }
    var segs = rest.split(/[·/|,;ㆍ\t]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s && /[가-힣A-Za-z0-9]/.test(s); });
    var toks = [];
    segs.forEach(function (s) {
      if (placeKind(s)) toks.push(s);
      else if (/\s/.test(s) && s.split(/\s+/).every(function (p) { return nameLike(p) || placeKind(p); })) {
        var cur = '';
        s.split(/\s+/).forEach(function (p) {
          if (placeKind(p)) { cur = cur ? cur + ' ' + p : p; }
          else { if (cur) { toks.push(cur); cur = ''; } toks.push(p); }
        });
        if (cur) toks.push(cur);
      }
      else toks.push(s);
    });
    toks.forEach(function (tok) {
      var c = classify(tok);
      if (c.t && c.sure && !r[c.t]) { r[c.t] = tok; r.notes[c.t] = c.why; return; }
      var p = { text: tok, why: c.why, pick: '', sugg: c.t || '' };
      if (c.t && !r[c.t]) p.pick = c.t;
      else if (c.t) p.why = (c.t === 'res' ? '거주지가 이미 있어요' : '소개자가 이미 있어요');
      r.pend.push(p);
    });
    /* 둘 다 못 정한 2개 짜리: 순서대로 거주지, 소개자 추천 */
    var pu = r.pend.filter(function (p) { return !p.pick; });
    if (pu.length) {
      var order = ['res', 'intro'];
      pu.forEach(function (p, i) { if (!p.sugg && pu.length === 1 && !r.res && toks.length === 1) { /* 한 개뿐이고 판단 불가 → 선택 */ } });
    }
    return r;
  }
  function parse(text) {
    var out = [];
    String(text || '').split(/\r?\n/).forEach(function (l, i) { if (l.trim()) out.push(parseLine(l, i)); });
    return out;
  }
  /* 확인 필요 여부 / 최종 데이터 */
  function needsCheck(r) { return r.pend.length > 0; }
  function unresolved(r) { return r.pend.some(function (p) { return !p.pick; }); }
  function finalize(r, commonMemo) {
    var d = { name: r.name, phone: r.phone, birth: r.birth, res: r.res, intro: r.intro, memo: r.memo };
    var extra = [];
    r.pend.forEach(function (p) {
      if (p.pick === 'res') d.res = d.res ? d.res + ' ' + p.text : p.text;
      else if (p.pick === 'intro') d.intro = d.intro ? d.intro + ', ' + p.text : p.text;
      else if (p.pick === 'memo') extra.push(p.text);
    });
    var memo = [d.memo].concat(extra).concat([commonMemo || '']).map(function (s) { return String(s || '').trim(); }).filter(Boolean);
    d.memo = memo.join(', ');
    return d;
  }
  window.BKPaste = { parse: parse, finalize: finalize, needsCheck: needsCheck, unresolved: unresolved, placeKind: placeKind, classify: classify };
})();
