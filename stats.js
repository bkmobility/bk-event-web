/* 통계 계산 (앱/웹 공용) */
(function () {
  var exact = null, pre = null, cache = {};
  function build() {
    exact = {}; pre = [];
    var B = window.BK_BJD || { A: [], G: [] };
    B.G.forEach(function (g) {
      var sido = B.A[g[0]], sg = g[1];
      [sg].concat(sg.split(' ')).forEach(function (n) {
        if (!exact[n]) exact[n] = sido;
        if (n.length > 2 && /[시군구]$/.test(n)) { var s = n.slice(0, -1); if (!exact[s]) exact[s] = sido; }
      });
      (g[2] || []).forEach(function (d) {
        d.split(' ').forEach(function (p) { if (!exact[p]) exact[p] = sido; pre.push([p, sido]); });
      });
    });
    B.A.forEach(function (a) { exact[a] = a; });
  }
  /* 거주지 문자열 -> 시·도 이름 | '기타' | '' (미입력) */
  function regionOf(res) {
    res = String(res || '').trim();
    if (!res) return '';
    if (cache[res] !== undefined) return cache[res];
    if (!exact) build();
    var t = res.split(/[\s,\/]+/)[0], out = '';
    if (exact[t]) out = exact[t];
    else if (t.length >= 2) {
      var c = {};
      pre.forEach(function (x) { if (x[0].indexOf(t) === 0) c[x[1]] = (c[x[1]] || 0) + 1; });
      var best = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
      out = best || '기타';
    } else out = '기타';
    cache[res] = out;
    return out;
  }
  function ageBucket(b) {
    if (!/^\d{6}$/.test(b || '')) return '';
    var yy = +b.slice(0, 2), now = new Date(), cy = now.getFullYear() % 100;
    var year = yy <= cy - 16 ? 2000 + yy : 1900 + yy, age = now.getFullYear() - year;
    if (age < 20) return '10대 이하';
    if (age >= 70) return '70대+';
    return Math.floor(age / 10) * 10 + '대';
  }
  var AGE_ORDER = ['10대 이하', '20대', '30대', '40대', '50대', '60대', '70대+'];
  function tally(people, fn) {
    var m = {};
    people.forEach(function (p) { var k = fn(p); if (k) m[k] = (m[k] || 0) + 1; });
    return m;
  }
  function sorted(m, order) {
    var arr = Object.keys(m).map(function (k) { return { k: k, n: m[k] }; });
    if (order) arr.sort(function (a, b) { return order.indexOf(a.k) - order.indexOf(b.k); });
    else arr.sort(function (a, b) { return b.n - a.n || a.k.localeCompare(b.k, 'ko'); });
    return arr;
  }
  function ages(people) { return sorted(tally(people, function (p) { return ageBucket(p.birth); }), AGE_ORDER); }
  function memos(people) { return sorted(tally(people, function (p) { return String(p.memo || '').trim() || '없음'; })); }
  function regions(people) {
    var arr = sorted(tally(people, function (p) { return regionOf(p.res); }));
    var etc = arr.filter(function (x) { return x.k === '기타'; }), rest = arr.filter(function (x) { return x.k !== '기타'; });
    return rest.concat(etc);
  }
  function missing(people) {
    var o = { res: 0, intro: 0, memo: 0, birth: 0 };
    people.forEach(function (p) {
      if (!String(p.res || '').trim()) o.res++;
      if (!String(p.intro || '').trim()) o.intro++;
      if (!String(p.memo || '').trim()) o.memo++;
      if (!/^\d{6}$/.test(p.birth || '')) o.birth++;
    });
    return o;
  }
  /* 필터 {k,v} 에 맞는지 */
  function match(p, fx) {
    if (!fx) return true;
    if (fx.k === 'age') return ageBucket(p.birth) === fx.v;
    if (fx.k === 'memo') return (String(p.memo || '').trim() || '없음') === fx.v;
    if (fx.k === 'region') return regionOf(p.res) === fx.v;
    if (fx.k === 'miss') { if (fx.v === 'birth') return !/^\d{6}$/.test(p.birth || ''); return !String(p[fx.v] || '').trim(); }
    return true;
  }
  var LABEL = { age: '연령대', memo: '비고', region: '권역', miss: '입력 현황' };
  var MISS = { res: '거주지 없음', intro: '소개자 없음', memo: '비고 없음', birth: '생년월일 없음' };
  function label(fx) { return fx.k === 'miss' ? MISS[fx.v] : fx.k === 'dup' ? '중복 항목' : LABEL[fx.k] + ' ' + fx.v; }
  window.BKStats = { regionOf: regionOf, ageBucket: ageBucket, ages: ages, memos: memos, regions: regions, missing: missing, match: match, label: label, MISS: MISS };
})();
