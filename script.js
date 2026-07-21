/* =============================================================
   적우 「황금빛 밤」 — interactions
   - Golden rain canvas (적우=붉은 비 모티프, 황금빛으로)
   - D-day countdown
   - Nav scroll state + reveal on scroll
   All motion respects prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Concert datetime (EDIT HERE) ----------
     실제 공연 일시로 교체하세요. (연, 월(0=1월), 일, 시, 분) */
  var SHOW_DATE = new Date(2026, 7, 22, 16, 0, 0); // 2026-08-22 16:00 (오후 4시)

  /* ================= Golden rain canvas ================= */
  function initRain() {
    var canvas = document.querySelector(".hero__canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, drops = [];

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with area, capped for perf.
      var count = Math.min(120, Math.round((w * h) / 12000));
      drops = [];
      for (var i = 0; i < count; i++) drops.push(makeDrop(true));
    }

    function makeDrop(seed) {
      return {
        x: Math.random() * w,
        y: seed ? Math.random() * h : -20,
        len: 8 + Math.random() * 22,
        vy: 60 + Math.random() * 140,     // px per second
        drift: -8 + Math.random() * 16,
        a: 0.12 + Math.random() * 0.5,
        wide: Math.random() < 0.18        // occasional brighter streak
      };
    }

    var last = performance.now();
    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.y += d.vy * dt;
        d.x += d.drift * dt;
        if (d.y - d.len > h) { drops[i] = makeDrop(false); continue; }
        var grad = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
        grad.addColorStop(0, "oklch(0.62 0.19 26 / 0)");
        grad.addColorStop(1, "oklch(0.62 0.19 26 / " + d.a.toFixed(2) + ")");
        ctx.strokeStyle = grad;
        ctx.lineWidth = d.wide ? 1.6 : 0.8;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - d.len);
        ctx.lineTo(d.x + d.drift * 0.06, d.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    }

    var raf;
    resize();
    if (reduceMotion) {
      // Static single frame: a few faint streaks, no animation loop.
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        ctx.strokeStyle = "oklch(0.62 0.19 26 / " + (d.a * 0.6).toFixed(2) + ")";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - d.len);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }
    } else {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 200);
    });

    // Pause when hero is off-screen to save cycles.
    if (!reduceMotion && "IntersectionObserver" in window) {
      var hero = document.querySelector(".hero");
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
          else if (raf) { cancelAnimationFrame(raf); raf = null; }
        });
      }, { threshold: 0.01 }).observe(hero);
    }
  }

  /* ================= Countdown ================= */
  function initCountdown() {
    var root = document.getElementById("countdown");
    if (!root) return;
    var els = {
      days: root.querySelector('[data-cd="days"]'),
      hours: root.querySelector('[data-cd="hours"]'),
      mins: root.querySelector('[data-cd="mins"]'),
      secs: root.querySelector('[data-cd="secs"]')
    };
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var diff = SHOW_DATE.getTime() - Date.now();
      if (diff <= 0) {
        els.days.textContent = "00"; els.hours.textContent = "00";
        els.mins.textContent = "00"; els.secs.textContent = "00";
        var label = document.querySelector(".countdown__label");
        if (label) label.textContent = "오늘, 그 밤";
        return false;
      }
      var s = Math.floor(diff / 1000);
      els.days.textContent = Math.floor(s / 86400);
      els.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      els.mins.textContent = pad(Math.floor((s % 3600) / 60));
      els.secs.textContent = pad(s % 60);
      return true;
    }
    if (tick()) setInterval(tick, 1000);
  }

  /* ================= Nav scroll state ================= */
  function initNav() {
    var nav = document.getElementById("nav");
    if (!nav) return;
    function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 40); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ================= Reveal on scroll ================= */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
    if (!items.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });

    function reveal(el) {
      if (el.hasAttribute("data-reveal-stagger")) {
        Array.prototype.forEach.call(el.children, function (child, i) {
          child.style.transitionDelay = (i * 90) + "ms";
        });
      }
      el.classList.add("is-in");
    }

    // Failsafe: nothing stays hidden if the observer never fires for an item
    // (e.g. prerender snapshots, unusual scroll containers).
    setTimeout(function () {
      items.forEach(function (el) {
        if (!el.classList.contains("is-in")) { reveal(el); io.unobserve(el); }
      });
    }, 2600);
  }

  /* ================= Hero entrance ================= */
  function initHero() {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { hero.classList.add("hero-ready"); });
    });
  }

  /* ================= 예매 모달 ================= */
  function initBooking() {
    var modal = document.getElementById("bookModal");
    if (!modal) return;
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      // next frame so the transition runs
      requestAnimationFrame(function () { modal.classList.add("is-open"); });
      document.body.style.overflow = "hidden";
      var first = modal.querySelector(".modal__vendors a, .modal__close");
      if (first) first.focus();
    }
    function close() {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      var done = function () {
        modal.hidden = true;
        modal.removeEventListener("transitionend", done);
      };
      modal.addEventListener("transitionend", done);
      // fallback if no transition fires
      setTimeout(function () { if (!modal.classList.contains("is-open")) modal.hidden = true; }, 400);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-book-open]")) { e.preventDefault(); open(); }
      else if (e.target.closest("[data-book-close]")) { e.preventDefault(); close(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ================= Toast ================= */
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-on"); });
    setTimeout(function () {
      t.classList.remove("is-on");
      setTimeout(function () { t.remove(); }, 320);
    }, 2000);
  }

  /* ================= 공유하기 ================= */
  /* 카카오톡 공유 — developers.kakao.com JavaScript 키로 교체(+ 도메인 등록) */
  var KAKAO_JS_KEY = "[KAKAO_JAVASCRIPT_APP_KEY]";
  function initKakao() {
    try {
      if (window.Kakao && KAKAO_JS_KEY && KAKAO_JS_KEY.charAt(0) !== "[" && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
      }
    } catch (e) {}
  }
  function kakaoShare(url) {
    try {
      if (window.Kakao && window.Kakao.isInitialized() && window.Kakao.Share) {
        window.Kakao.Share.sendDefault({
          objectType: "text",
          text: "슈퍼디바 적우 콘서트 - 대구\n2026.08.22 (토) 오후 4시 · 영남대 천마아트센터 그랜드홀",
          link: { mobileWebUrl: url, webUrl: url }
        });
        return true;
      }
    } catch (e) {}
    return false;
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  function copyLink(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () { toast("링크가 복사되었습니다"); },
        function () { if (!legacyCopy(url)) window.prompt("아래 링크를 복사하세요", url); else toast("링크가 복사되었습니다"); }
      );
      return;
    }
    if (legacyCopy(url)) { toast("링크가 복사되었습니다"); return; }
    window.prompt("아래 링크를 복사하세요", url);
  }

  function initShare() {
    var modal = document.getElementById("shareModal");
    if (!modal) return;
    var shareText = "슈퍼디바 적우 콘서트 - 대구 · 2026.08.22 (토) 오후 4시 · 영남대 천마아트센터";
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add("is-open"); });
      document.body.style.overflow = "hidden";
      var first = modal.querySelector(".share__item, .modal__close");
      if (first) first.focus();
    }
    function close() {
      modal.classList.remove("is-open");
      document.body.style.overflow = "";
      var done = function () {
        modal.hidden = true;
        modal.removeEventListener("transitionend", done);
      };
      modal.addEventListener("transitionend", done);
      setTimeout(function () { if (!modal.classList.contains("is-open")) modal.hidden = true; }, 400);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function shareTo(channel, url) {
      switch (channel) {
        case "kakao":
          if (!kakaoShare(url)) toast("카카오톡 공유 준비 중입니다");
          break;
        case "band":
          window.open("https://band.us/plugin/share?body=" + encodeURIComponent(shareText) + "&route=" + encodeURIComponent(url), "_blank", "noopener,noreferrer");
          break;
        case "facebook":
          window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank", "noopener,noreferrer");
          break;
        case "x":
          window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(shareText) + "&url=" + encodeURIComponent(url), "_blank", "noopener,noreferrer");
          break;
        case "line":
          window.open("https://social-plugins.line.me/lineit/share?url=" + encodeURIComponent(url), "_blank", "noopener,noreferrer");
          break;
        case "copy":
          copyLink(url);
          break;
      }
    }

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-share]")) { e.preventDefault(); open(); return; }
      if (e.target.closest("[data-share-close]")) { e.preventDefault(); close(); return; }
      var chBtn = e.target.closest("[data-share-channel]");
      if (chBtn) {
        e.preventDefault();
        shareTo(chBtn.getAttribute("data-share-channel"), location.href);
        close();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ================= Boot ================= */
  function boot() {
    initHero();
    initNav();
    initReveal();
    initCountdown();
    initRain();
    initBooking();
    initKakao();
    initShare();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
