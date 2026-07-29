/* =========================================================
   L'atelier Cuisine Française — sample site
   parade.kyoto 系のモーション（文字分割 blur リビール / 画像 scale1.2→1 /
   カスタムカーソル / ローディング）を依存ライブラリなしで再現。
   ========================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  html.classList.remove('no-js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------
     1. 文字分割（parade.kyoto の setupTextSplit と同仕様）
        opacity 0→1 / translateY→0 / blur(9px)→0
        2.1s cubic-bezier(0.19,1,0.22,1)
     ---------------------------------------------------- */
  function splitText(el, fromY, duration) {
    fromY = fromY || '50px';
    duration = duration || '2.1s';
    var text = el.textContent.trim();
    if (!text) return [];
    el.textContent = '';
    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.textContent = text[i];
      if (text[i] === ' ') {
        s.style.display = 'inline';
        s.innerHTML = '&nbsp;';
      } else {
        s.style.display = 'inline-block';
      }
      s.style.opacity = '0';
      s.style.transform = 'translateY(' + fromY + ')';
      s.style.filter = 'blur(9px)';
      s.style.transition =
        'opacity ' + duration + ' cubic-bezier(0.19, 1, 0.22, 1),' +
        'transform ' + duration + ' cubic-bezier(0.19, 1, 0.22, 1),' +
        'filter ' + duration + ' cubic-bezier(0.19, 1, 0.22, 1)';
      el.appendChild(s);
      chars.push(s);
    }
    return chars;
  }

  function showChars(chars, stagger) {
    var d = 0;
    chars.forEach(function (c) {
      setTimeout(function () {
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
        c.style.filter = 'blur(0px)';
      }, d);
      d += stagger;
    });
  }

  function hideChars(chars, stagger, fromY) {
    var d = 0;
    chars.slice().reverse().forEach(function (c) {
      setTimeout(function () {
        c.style.opacity = '0';
        c.style.transform = 'translateY(' + fromY + ')';
        c.style.filter = 'blur(9px)';
      }, d);
      d += stagger;
    });
  }

  /* ----------------------------------------------------
     2. スクロール演出エンジン
        リビール／画像ズーム／見出しの文字分割をまとめて制御。
        IntersectionObserver はタブ非表示時に発火しないことがあり、
        その場合コンテンツが不可視のまま残るため rAF + rect 判定で実装する。
     ---------------------------------------------------- */
  function initScrollFx() {
    var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal], [data-zoom]'));
    var splits = Array.prototype.slice.call(document.querySelectorAll('[data-split]'));

    if (reduced) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    splits = splits.filter(function (el) { return !el.hasAttribute('data-split-hero'); });
    splits.forEach(function (el) {
      el.__chars = splitText(el, '100%');
      el.__shown = false;
    });

    var ticking = false;

    function check() {
      ticking = false;
      var vh = window.innerHeight;

      for (var i = reveals.length - 1; i >= 0; i--) {
        if (reveals[i].getBoundingClientRect().top < vh * 0.88) {
          reveals[i].classList.add('is-in');
          reveals.splice(i, 1);
        }
      }
      splits.forEach(function (el) {
        var top = el.getBoundingClientRect().top;
        if (!el.__shown && top < vh * 0.82) {
          el.__shown = true;
          showChars(el.__chars, 30);
        } else if (el.__shown && top > vh) {
          el.__shown = false;
          hideChars(el.__chars, 30, '100%');
        }
      });
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll);
    // 非表示タブでは rAF が止まるため、可視化された瞬間は同期で判定し直す
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) check();
    });
    check();
  }

  /* ----------------------------------------------------
     3. ローディング → KV 起動
     ---------------------------------------------------- */
  function initLoading() {
    var loading = document.querySelector('.loading');
    document.body.classList.add('is-loading');

    requestAnimationFrame(function () { html.classList.add('is-booting'); });

    function done() {
      html.classList.add('is-loaded');
      document.body.classList.remove('is-loading');
      startKV();
    }

    if (!loading || reduced) {
      setTimeout(done, reduced ? 0 : 400);
      return;
    }
    var fired = false;
    function go() { if (!fired) { fired = true; setTimeout(done, 900); } }
    window.addEventListener('load', go);
    setTimeout(go, 2600); // 保険
  }

  /* ----------------------------------------------------
     4. KV：背景クロスフェード + タイトル文字リビール
     ---------------------------------------------------- */
  var kvStarted = false;
  function startKV() {
    if (kvStarted) return;
    kvStarted = true;

    var items = document.querySelectorAll('.kv__bg__item');
    if (items.length) {
      items[0].classList.add('is-active');
      if (items.length > 1 && !reduced) {
        var i = 0;
        setInterval(function () {
          var next = (i + 1) % items.length;
          items[next].classList.add('is-active');
          setTimeout(function () {
            items[i].classList.remove('is-active');
            i = next;
          }, 60);
        }, 5200);
      }
    }

    var heroLines = document.querySelectorAll('[data-split-hero]');
    if (!heroLines.length) return;

    if (reduced) {
      Array.prototype.forEach.call(heroLines, function (l) { l.style.opacity = 1; });
      return;
    }

    var all = [];
    Array.prototype.forEach.call(heroLines, function (line) {
      all = all.concat(splitText(line, '100%'));
    });
    setTimeout(function () { showChars(all, 25); }, 260);

    // KV 内のサブテキストを本文リビール後に持ち上げる
    var after = document.querySelectorAll('[data-kv-after]');
    var delay = 260 + all.length * 25 + 500;
    Array.prototype.forEach.call(after, function (el, n) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = 'opacity .9s var(--ease-soft), transform .9s var(--ease-soft)';
      setTimeout(function () {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, delay + n * 140);
    });
  }

  /* ----------------------------------------------------
     5. ヘッダー（スクロールで隠す / KV 上は白文字）
     ---------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('.header');
    var cta = document.querySelector('.cta-fixed');
    if (!header) return;
    var kv = document.querySelector('.kv, .phero');
    var last = window.pageYOffset;

    function update() {
      var y = window.pageYOffset;
      var threshold = kv ? kv.offsetHeight - 90 : 60;

      header.classList.toggle('is-over', y < threshold && !document.body.classList.contains('is-nav-open'));
      header.classList.toggle('is-solid', y >= threshold);

      if (!document.body.classList.contains('is-nav-open')) {
        header.classList.toggle('is-hidden', y > last && y > threshold + 120);
      }
      if (cta) cta.classList.toggle('is-on', y > threshold);
      last = y;
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ----------------------------------------------------
     6. ドロワーメニュー
     ---------------------------------------------------- */
  function initDrawer() {
    var burger = document.querySelector('.burger');
    var drawer = document.querySelector('.drawer');
    if (!burger || !drawer) return;

    function close() {
      document.body.classList.remove('is-nav-open');
      burger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
    }
    burger.addEventListener('click', function () {
      var open = document.body.classList.toggle('is-nav-open');
      burger.setAttribute('aria-expanded', String(open));
      drawer.setAttribute('aria-hidden', String(!open));
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ----------------------------------------------------
     7. カスタムカーソル（PC のみ / lerp 0.3）
     ---------------------------------------------------- */
  function initCursor() {
    if (!window.matchMedia('(min-width: 1025px) and (hover: hover)').matches) return;
    var cur = document.getElementById('cursor');
    var txt = document.getElementById('cursorText');
    if (!cur) return;

    document.body.classList.add('has-cursor');

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2;
    var cx = tx, cy = ty;

    // マウスが動くまでは表示しない（画面中央に点が残るのを防ぐ）
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (cur.style.opacity !== '1') {
        cx = tx; cy = ty;
        cur.style.opacity = '1';
      }
    }, true);

    (function loop() {
      cx += (tx - cx) * 0.3;
      cy += (ty - cy) * 0.3;
      cur.style.left = cx + 'px';
      cur.style.top = cy + 'px';
      requestAnimationFrame(loop);
    })();

    var SEL = 'a, button, [role="button"], summary, [data-cursor-text]';
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest(SEL);
      var inv = e.target.closest('.cursor-invert');
      cur.classList.toggle('--invert', !!inv);
      if (!t) { cur.classList.remove('--hover', '--text'); if (txt) txt.textContent = ''; return; }
      var label = t.getAttribute('data-cursor-text');
      if (label) {
        if (txt) txt.innerHTML = label.replace(/\|/g, '<br>');
        cur.classList.add('--text');
        cur.classList.remove('--hover');
      } else {
        cur.classList.add('--hover');
        cur.classList.remove('--text');
        if (txt) txt.textContent = '';
      }
    });
    document.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(SEL)) {
        cur.classList.remove('--hover', '--text');
        if (txt) txt.textContent = '';
      }
    });
  }

  /* ----------------------------------------------------
     8. メニューページのカテゴリー絞り込み
     ---------------------------------------------------- */
  function initFilter() {
    var btns = document.querySelectorAll('[data-filter]');
    if (!btns.length) return;
    var cats = document.querySelectorAll('[data-cat]');

    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-filter');
        Array.prototype.forEach.call(btns, function (o) {
          o.classList.toggle('is-on', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
        Array.prototype.forEach.call(cats, function (c) {
          c.hidden = !(key === 'all' || c.getAttribute('data-cat') === key);
        });
      });
    });
  }

  /* ---------------------------------------------------- */
  function boot() {
    initHeader();
    initDrawer();
    initCursor();
    initScrollFx();
    initFilter();
    initLoading();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
