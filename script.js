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

  /* ================= 예스24 모바일 링크 전환 ================= */
  function initVendorLinks() {
    var link = document.querySelector("[data-yes24-link]");
    if (!link) return;
    if (window.matchMedia("(max-width: 760px)").matches) {
      link.href = "https://m.ticket.yes24.com/perf/detail/perfinfo.aspx?idperf=59036";
    }
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

  /* ================= 문의(전화상담 요청) ================= */
  /* 구글폼 연동 — 폼 응답이 연결된 구글시트에 그대로 쌓임(OAuth 승인 불필요) */
  var INQUIRY_FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeEDa6ecrtdW8dOrnqYmlr_w8ejoHvbdc8Aq7HKGEVTNC39uQ/formResponse";
  var INQUIRY_FORM_PHONE_ENTRY = "entry.1934712052";
  function initInquiry() {
    var modal = document.getElementById("inquiryModal");
    if (!modal) return;
    var form = document.getElementById("inquiryForm");
    var phoneInput = document.getElementById("inquiryPhone");
    var status = document.getElementById("inquiryStatus");
    var lastFocus = null;
    function open() {
      lastFocus = document.activeElement;
      if (status) { status.textContent = ""; status.className = "inquiry__status"; }
      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add("is-open"); });
      document.body.style.overflow = "hidden";
      if (phoneInput) phoneInput.focus();
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
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-inquiry-open]")) { e.preventDefault(); open(); }
      else if (e.target.closest("[data-inquiry-close]")) { e.preventDefault(); close(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var phone = (phoneInput.value || "").trim();
        if (!phone) return;
        if (!INQUIRY_FORM_ACTION_URL || INQUIRY_FORM_ACTION_URL.charAt(0) === "[") {
          status.textContent = "연동 준비 중입니다. 관리자에게 문의해 주세요.";
          status.className = "inquiry__status is-error";
          return;
        }
        var submitBtn = form.querySelector(".inquiry__submit");
        if (submitBtn) submitBtn.disabled = true;
        status.textContent = "전송 중...";
        status.className = "inquiry__status";
        var body = new URLSearchParams();
        body.append(INQUIRY_FORM_PHONE_ENTRY, phone);
        fetch(INQUIRY_FORM_ACTION_URL, { method: "POST", mode: "no-cors", body: body })
          .then(function () {
            status.textContent = "접수되었습니다. 순차적으로 연락드리겠습니다.";
            status.className = "inquiry__status is-ok";
            form.reset();
            aceHit("#/conv/inquiry");
            karrotHit("Lead");
          })
          .catch(function () {
            status.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
            status.className = "inquiry__status is-error";
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }
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

  /* ================= 공유하기 / 카카오맵 ================= */
  /* developers.kakao.com JavaScript 키 — 카카오톡 공유용 */
  var KAKAO_JS_KEY = "2f35fbd996a378c15abcbe552844f156";
  /* 카카오맵 전용 지도 키(+ 플랫폼 도메인 등록 필요) */
  var KAKAO_MAP_JS_KEY = "9e653069a946c28fe6369fb6a44cfe8a";
  var VENUE_LAT = 35.8280220; // 영남대학교 근사 좌표 — 지도 확인 후 천마아트센터 위치로 미세조정 필요
  var VENUE_LNG = 128.7572223;
  function initKakaoMap() {
    var el = document.getElementById("kakaoMap");
    if (!el || !KAKAO_MAP_JS_KEY || KAKAO_MAP_JS_KEY.charAt(0) === "[") return;
    var script = document.createElement("script");
    script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + KAKAO_MAP_JS_KEY + "&autoload=false";
    script.onload = function () {
      try {
        window.kakao.maps.load(function () {
          var center = new kakao.maps.LatLng(VENUE_LAT, VENUE_LNG);
          el.innerHTML = "";
          var map = new kakao.maps.Map(el, { center: center, level: 4 });
          new kakao.maps.Marker({ position: center, map: map });
        });
      } catch (e) {}
    };
    document.head.appendChild(script);
  }
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

  /* ================= AceCounter 전환추적 =================
     공통스크립트(ac.js)는 페이지 진입 시 1회만 수집한다. 페이지 이동이 없는
     액션(전화연결/공유/예매링크)을 전환으로 잡기 위해, 클릭 시 location.hash를
     구분되는 가상 경로로 바꾸고 수집스크립트를 다시 삽입해 가상 페이지뷰를 만든다.
     이후 에이스카운터 관리자 페이지 [설정 > 페이지 > 전환페이지]에서 아래 경로를
     전환페이지로 등록하면 전환 리포트에 집계된다.
       #/conv/tel        전화연결
       #/conv/share/*    공유 (채널별: kakao/band/facebook/x/line/copy)
       #/conv/book/*     예매링크 (nol/yes24)
       #/conv/inquiry    문의(전화번호 남기기) 접수완료 */
  function aceHit(vpath) {
    try {
      if (location.hash !== vpath) history.replaceState(null, "", vpath);
      var G = window._AceGID;
      if (!G || !G.val || G.o === 0) return;
      var A = G.val[G.o - 1];
      var U = (A[4]).replace(/,/g, "_");
      var s = document.createElement("script");
      s.src = "https://cr.acecounter.com/ac.js?gc=" + A[2] + "&py=" + A[1] + "&up=" + U + "&rd=" + new Date().getTime();
      var ref = document.getElementsByTagName("script")[0];
      ref.parentNode.insertBefore(s, ref);
    } catch (e) {}
  }

  /* 당근마켓 광고(카롯 픽셀) 전환추적 — 전화연결/공유/예매링크/문의 4종 */
  function karrotHit(eventName) {
    try {
      if (window.karrotPixel) window.karrotPixel.track(eventName);
    } catch (e) {}
  }

  /* 카카오 픽셀 구매 전환 — 예매링크 클릭 시 */
  var KAKAO_PIXEL_ID = "1384481355008199841";
  function kakaoPixelPurchase() {
    try {
      if (window.kakaoPixel) window.kakaoPixel(KAKAO_PIXEL_ID).purchase();
    } catch (e) {}
  }

  function initAceConversions() {
    document.addEventListener("click", function (e) {
      var tel = e.target.closest('a[href^="tel:"]');
      if (tel) { aceHit("#/conv/tel"); karrotHit("Contact"); return; }
      var ch = e.target.closest("[data-share-channel]");
      if (ch) { aceHit("#/conv/share/" + ch.getAttribute("data-share-channel")); karrotHit("Share"); return; }
      var vendor = e.target.closest(".vendor--lg");
      if (vendor) {
        var name = /nol\.yanolja/.test(vendor.href) ? "nol" : /yes24/.test(vendor.href) ? "yes24" : "etc";
        aceHit("#/conv/book/" + name);
        karrotHit("Purchase");
        kakaoPixelPurchase();
      }
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
    initVendorLinks();
    initInquiry();
    initKakaoMap();
    initKakao();
    initShare();
    initAceConversions();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
