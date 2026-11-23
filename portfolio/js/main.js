(function () {
  "use strict";
  var D = window.DATA;
  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- sounds ---------- */
  var audioCtx = null;
  var soundOn = true;

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function playClick() {
    if (!soundOn) return;
    try {
      var ctx = getCtx(), now = ctx.currentTime;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) { console.error("click sound:", e); }
  }
  function playHover() {
    if (!soundOn) return;
    try {
      var ctx = getCtx(), now = ctx.currentTime;
      var osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) { console.error("hover sound:", e); }
  }

  function initSounds() {
    var sel = 'a, button, [role="button"], .stack, .sk, .pdot';
    var lastHover = null, hoverTimer = null;

    document.addEventListener("pointerdown", function (e) {
      var t = e.target.closest(sel);
      if (!t) return;
      if (t.disabled || t.getAttribute("aria-disabled") === "true") return;
      playClick();
    }, { passive: true });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var t = e.target.closest(sel);
      if (!t) return;
      if (t.disabled || t.getAttribute("aria-disabled") === "true") return;
      playClick();
    });

    var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) return;

    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest(sel);
      if (!t || t === lastHover) return;
      if (t.disabled || t.getAttribute("aria-disabled") === "true") return;
      lastHover = t;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(playHover, 40);
    }, { passive: true });

    document.addEventListener("pointerout", function (e) {
      var t = e.target.closest(sel);
      if (t && t === lastHover) lastHover = null;
    }, { passive: true });
  }

  function initSoundToggle() {
    var btn = $("sound");
    try {
      var saved = localStorage.getItem("sound");
      if (saved === "off") soundOn = false;
    } catch (e) {}

    function apply() {
      btn.setAttribute("aria-pressed", soundOn);
      btn.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    }
    apply();
    btn.onclick = function () {
      soundOn = !soundOn;
      apply();
      try { localStorage.setItem("sound", soundOn ? "on" : "off"); } catch (e) {}
      if (soundOn) playClick();
    };
  }

  /* ---------- sidebar / mobile drawer ---------- */
  function initSidebar() {
    var side = $("sidebar"), menu = $("menu");
    var backdrop = el("div", "backdrop");
    document.body.append(backdrop);

    function close() {
      side.classList.remove("open");
      backdrop.classList.remove("on");
      menu.setAttribute("aria-expanded", "false");
      menu.setAttribute("aria-label", "Open menu");
    }
    function open() {
      side.classList.add("open");
      backdrop.classList.add("on");
      menu.setAttribute("aria-expanded", "true");
      menu.setAttribute("aria-label", "Close menu");
    }
    menu.onclick = function () {
      if (side.classList.contains("open")) close(); else open();
    };
    backdrop.onclick = close;
    side.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    /* highlight active section link */
    var links = [].slice.call(side.querySelectorAll(".side-nav a"));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = "#" + en.target.id;
          links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach(function (t) { io.observe(t); });
    }
  }

  /* ---------- renderers ---------- */
  function renderProjects() {
    var total = D.projects.length;
    D.projects.forEach(function (p, i) {
      var stack = el("div", "stack" + (p.wide ? " wide" : ""));
      stack.style.setProperty("--ar", p.ratio);
      stack.tabIndex = 0;
      stack.setAttribute("role", "button");
      stack.setAttribute("aria-label", p.title + " screenshots. Activate to show the next image");
      p.images.forEach(function (im) {
        var card = el("div", "card"), img = document.createElement("img");
        img.src = im.src; img.alt = im.alt; img.dataset.cap = im.cap; img.loading = "lazy";
        card.append(img);
        stack.append(card);
      });

      var cap = el("div", "cap");
      cap.append(el("span", "dots"), el("span", "label"));
      var box = el("div", "stack-box");
      box.append(stack, cap, el("span", "hint", "Tap to swap"));

      var info = el("div");
      info.append(
        el("span", "kick", "Featured project " + pad(i + 1) + " / " + pad(total) + " · " + p.type),
        el("h3", "", p.title),
        el("p", "d", p.description)
      );
      if (p.note) info.append(el("p", "note", p.note));

      var slide = el("article", "slide");
      slide.append(box, info);
      $("track").append(slide);
      initStack(stack);
    });
  }

  function lum(hex) {
    var h = hex.replace("#", "");
    return (parseInt(h.substr(0, 2), 16) * 299 + parseInt(h.substr(2, 2), 16) * 587 + parseInt(h.substr(4, 2), 16) * 114) / 1000;
  }
  function chip(s) {
    var li = el("li", "sk"), i;
    if (s.k === "img") {
      i = document.createElement("img");
      i.className = "ico"; i.src = "assets/icons/" + s.f; i.alt = "";
    } else {
      var glyph = s.k === "glyph", mono = !glyph && lum(s.c) < 70;
      i = el("span", "ico");
      i.style.color = glyph ? "var(--ac)" : mono ? "var(--text)" : s.c;
      i.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" ' +
        (glyph ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + s.g
               : 'fill="currentColor"><path d="' + s.d + '"/>') + "</svg>";
    }
    i.setAttribute("aria-hidden", "true");
    li.append(i, document.createTextNode(s.n));
    return li;
  }
  function buildMarquee(mq, items) {
    var t = mq.firstChild;
    function build() {
      t.textContent = "";
      var probe = el("ul");
      items.forEach(function (s) { probe.append(chip(s)); });
      t.append(probe);
      var w = probe.getBoundingClientRect().width || 1;
      var reps = Math.max(1, Math.ceil(mq.clientWidth / w));
      var half = el("ul");
      for (var r = 0; r < reps; r++) items.forEach(function (s) { half.append(chip(s)); });
      var twin = half.cloneNode(true);
      twin.setAttribute("aria-hidden", "true");
      t.textContent = "";
      t.append(half, twin);
      t.style.setProperty("--dur", Math.max(12, (w * reps) / 40) + "s");
    }
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    var timer; window.addEventListener("resize", function () { clearTimeout(timer); timer = setTimeout(build, 200); });
  }
  function renderSkills() {
  D.skills.forEach(function (g) {
    var h = el("h3"), grp = el("div", "grp"), ul = el("ul", "stack-grid");
    h.append(document.createTextNode(g.title), el("small", "", g.items.length + " items"));
    g.items.forEach(function (s) { ul.append(chip(s)); });
    grp.append(h, ul);
    $("groups").append(grp);
  });
}

  /* ---------- behaviors ---------- */
  function initStack(stack) {
    var cards = [].slice.call(stack.children), n = cards.length, busy = false;
    var order = cards.map(function (_, i) { return i; });
    var box = stack.parentNode, dots = box.querySelector(".dots"), label = box.querySelector(".label");
    cards.forEach(function () { dots.append(document.createElement("b")); });

    function place(c, p) {
      c.style.zIndex = n - p;
      c.style.transform = "translate(" + p * 16 + "px," + p * 10 + "px) scale(" + (1 - p * 0.05) + ") rotate(" + p * 2.2 + "deg)";
      c.style.opacity = p > 2 ? 0 : 1;
      c.style.filter = p ? "brightness(" + (1 - p * 0.12) + ")" : "none";
    }
    function layout(skip) {
      order.forEach(function (ci, p) { if (ci !== skip) place(cards[ci], p); });
      var top = order[0];
      [].forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === top); });
      label.textContent = cards[top].querySelector("img").dataset.cap + " · " + (top + 1) + "/" + n;
    }
    function next() {
      if (busy || n < 2) return;
      busy = true;
      var first = order[0], c = cards[first];
      order.push(order.shift());
      c.style.transition = "transform .34s cubic-bezier(.4,0,.2,1)";
      c.style.transform = "translate(108%,-2%) rotate(9deg)";
      layout(first);
      setTimeout(function () { c.style.transition = ""; place(c, n - 1); }, 300);
      setTimeout(function () { busy = false; }, 420);
    }
    stack.addEventListener("click", next);
    stack.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
    });
    layout(-1);
  }

  function initCarousel() {
    var track = $("track"), count = $("count"), pager = $("pager");
    var prev = $("prev"), next = $("next");
    var slides = [].slice.call(track.children), total = slides.length;
    var dots = [], active = 0;

    slides.forEach(function (_, i) {
      var b = el("button", "pdot");
      b.type = "button";
      b.setAttribute("aria-label", "Show project " + (i + 1) + " of " + total);
      b.onclick = function () { goTo(i); };
      pager.append(b);
      dots.push(b);
    });
    if (total < 2) {
      pager.hidden = true;
      prev.disabled = next.disabled = true;
    }

    function nearest() {
      var x = track.scrollLeft, best = 0, dist = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - x);
        if (d < dist) { dist = d; best = i; }
      });
      return best;
    }
    function paint() {
      active = nearest();
      count.textContent = pad(active + 1) + " / " + pad(total);
      dots.forEach(function (d, i) {
        d.classList.toggle("on", i === active);
        if (i === active) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
      slides.forEach(function (s, i) { s.classList.toggle("on", i === active); });
    }
    function goTo(i) {
      var t = slides[(i + total) % total];
      if (!t) return;
      if (track.scrollTo) track.scrollTo({ left: t.offsetLeft, behavior: "smooth" });
      else track.scrollLeft = t.offsetLeft;
    }

    track.addEventListener("scroll", function () { window.requestAnimationFrame(paint); }, { passive: true });
    prev.onclick = function () { goTo(active - 1); };
    next.onclick = function () { goTo(active + 1); };

    $("projects").addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(active - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(active + 1); }
    });

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { track.scrollLeft = slides[active].offsetLeft; paint(); }, 150);
    });

    paint();
  }

  function initPause() {
    var groups = $("groups"), btn = $("pause");
    btn.onclick = function () {
      var paused = groups.classList.toggle("paused");
      btn.textContent = paused ? "Play motion" : "Pause motion";
    };
  }

  function initTheme() {
    var root = document.documentElement, btn = $("theme"), meta = document.querySelector('meta[name="theme-color"]');
    function apply(t) {
      var dark = t === "dark";
      root.dataset.theme = t;
      btn.setAttribute("aria-pressed", dark);
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      $("themeIcon").textContent = dark ? "☀" : "☾";
      if (meta) meta.setAttribute("content", dark ? "#0b0f0e" : "#ffffff");
    }
    apply(root.dataset.theme === "dark" ? "dark" : "light");
    btn.onclick = function () {
      var t = root.dataset.theme === "dark" ? "light" : "dark";
      apply(t);
      try { localStorage.setItem("theme", t); } catch (e) {}
    };
  }

  /* ---------- sidebar widgets & mini-game ---------- */
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) {}
    return null;
  }

  function initWidgets() {
    var root = document.documentElement;

    /* 1. Glow blob */
    var glowBtn = $("widget-glow"), isGlow = store("glow") === "on";
    function applyGlow() {
      glowBtn.setAttribute("aria-pressed", isGlow);
      root.classList.toggle("has-glow", isGlow);
      store("glow", isGlow ? "on" : "off");
    }
    applyGlow();
    glowBtn.onclick = function () { isGlow = !isGlow; applyGlow(); };

    /* 2. Snake: a full-screen board. The grid fills the whole screen, whatever its shape. */
    var modal = $("game-modal"), card = $("game-card"), canvas = $("snake-canvas"), ctx = canvas.getContext("2d");
    var openBtn = $("widget-snake"), closeBtn = $("game-close"), fsBtn = $("game-full");
    var overlay = $("game-overlay"), msg = $("game-msg"), sub = $("game-sub"), action = $("game-action");
    var scoreEl = $("game-score"), highEl = $("game-high");
    var DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    var KEYS = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
    var high = parseInt(store("snakeHigh"), 10) || 0;
    var state = "ready"; /* ready | running | paused | over */
    var snake, dir, queue, food, score = 0, step = 120, acc = 0, last = 0, raf = 0;
    var cols = 20, rows = 20, W = 320, H = 320, cell = 24, ox = 0, oy = 0, dpr = 1;
    var opener = null, t0 = performance.now();
    highEl.textContent = high;

    var isOpen = function () { return modal.classList.contains("on"); };
    var css = function (n, fb) { return getComputedStyle(root).getPropertyValue(n).trim() || fb; };

    /* measure the screen and fit as many square cells as possible */
    function measure() {
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      W = canvas.clientWidth || 320;
      H = canvas.clientHeight || 320;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.round(Math.max(18, Math.min(32, Math.min(W, H) / 20)));
      cols = Math.max(10, Math.floor(W / cell));
      rows = Math.max(10, Math.floor(H / cell));
      ox = (W - cols * cell) / 2;
      oy = (H - rows * cell) / 2;
    }
    function outside() {
      return snake.some(function (s) { return s.x >= cols || s.y >= rows; }) || food.x >= cols || food.y >= rows;
    }
    function dropFood() {
      do {
        food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
      } while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
    }
    function reset() {
      var hx = Math.floor(cols / 3), hy = Math.floor(rows / 2);
      snake = [{ x: hx, y: hy }, { x: hx - 1, y: hy }, { x: hx - 2, y: hy }];
      dir = DIRS.right; queue = []; score = 0; step = 120; acc = 0;
      scoreEl.textContent = 0;
      dropFood();
    }
    function onResize() {
      if (!isOpen() || !snake) return;
      measure();
      if (outside()) { reset(); setState("ready"); }
    }

    /* ----- drawing ----- */
    function rr(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function draw() {
      var ac = css("--ac", "#0f766e"), panel = css("--panel", "#f6f6f3"), line = css("--line", "#e4e4df"), bg2 = css("--bg2", "#fff");
      var x, y, i, s;
      ctx.fillStyle = bg2;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = panel;
      ctx.fillRect(0, 0, cols * cell, rows * cell);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = line;
      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) if ((x + y) % 2) ctx.fillRect(x * cell, y * cell, cell, cell);
      ctx.globalAlpha = 1;

      /* food, gently pulsing */
      var pulse = 0.34 + 0.04 * Math.sin((performance.now() - t0) / 160);
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * pulse, 0, Math.PI * 2);
      ctx.fill();

      /* body fades toward the tail */
      for (i = snake.length - 1; i >= 0; i--) {
        s = snake[i];
        ctx.globalAlpha = Math.max(0.45, 1 - (i / snake.length) * 0.55);
        ctx.fillStyle = ac;
        rr(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3, cell * 0.32);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* eyes on the head */
      var h = snake[0], cx = (h.x + 0.5) * cell, cy = (h.y + 0.5) * cell, px = -dir.y, py = dir.x;
      [-1, 1].forEach(function (k) {
        var ex = cx + dir.x * cell * 0.16 + px * k * cell * 0.2, ey = cy + dir.y * cell * 0.16 + py * k * cell * 0.2;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ex, ey, cell * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0b0f0e";
        ctx.beginPath(); ctx.arc(ex + dir.x * cell * 0.04, ey + dir.y * cell * 0.04, cell * 0.06, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();

      /* wall outline */
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = ac;
      ctx.lineWidth = 2;
      ctx.strokeRect(ox - 1, oy - 1, cols * cell + 2, rows * cell + 2);
      ctx.globalAlpha = 1;
    }

    /* ----- game logic ----- */
    function enqueue(d) {
      var ref = queue.length ? queue[queue.length - 1] : dir;
      if (d.x === ref.x && d.y === ref.y) return;
      if (d.x === -ref.x && d.y === -ref.y) return;
      if (queue.length < 2) queue.push(d);
    }
    function tick() {
      if (queue.length) dir = queue.shift();
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      var eat = head.x === food.x && head.y === food.y;
      var body = eat ? snake : snake.slice(0, -1);
      if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows ||
          body.some(function (s) { return s.x === head.x && s.y === head.y; })) {
        setState("over");
        return;
      }
      snake.unshift(head);
      if (eat) {
        score++;
        step = Math.max(55, 115 - score * 2);
        scoreEl.textContent = score;
        if (score > high) { high = score; highEl.textContent = high; store("snakeHigh", high); }
        playClick();
        dropFood();
      } else {
        snake.pop();
      }
    }
    function frame(ts) {
      if (!isOpen()) return;
      if (state === "running") {
        acc += Math.min(ts - last, 100);
        while (acc >= step && state === "running") { tick(); acc -= step; }
      }
      last = ts;
      draw();
      raf = requestAnimationFrame(frame);
    }

    /* ----- states ----- */
    function setState(s) {
      state = s;
      overlay.classList.toggle("on", s !== "running");
      if (s === "ready") {
        msg.textContent = "Ready?";
        sub.textContent = "Press an arrow key, WASD or Space to start";
        action.textContent = "Start";
      } else if (s === "paused") {
        msg.textContent = "Paused";
        sub.textContent = "Press Space to resume";
        action.textContent = "Resume";
      } else if (s === "over") {
        msg.textContent = "Game over";
        sub.textContent = "Score " + score + " · Best " + high + ". Press Space to try again";
        action.textContent = "Play again";
      }
    }
    function start() {
      if (state === "over") reset();
      last = performance.now(); acc = 0;
      setState("running");
    }
    function pause() { if (state === "running") setState("paused"); }
    function primary() { if (state !== "running") start(); }
    function toggle() { if (state === "running") pause(); else primary(); }
    function steer(name) {
      if (state === "over") return;
      if (state !== "running") start();
      enqueue(DIRS[name]);
    }

    /* ----- browser full screen (the board already fills the viewport; this also hides the browser bars) ----- */
    var canFs = !!(modal.requestFullscreen || modal.webkitRequestFullscreen);
    var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
    if (!canFs) fsBtn.style.display = "none";
    function toggleFs() {
      if (!canFs) return;
      if (fsEl()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var p = (modal.requestFullscreen || modal.webkitRequestFullscreen).call(modal);
        if (p && p.catch) p.catch(function () {});
      }
    }
    function onFsChange() {
      var on = !!fsEl();
      fsBtn.setAttribute("aria-pressed", on);
      fsBtn.setAttribute("aria-label", on ? "Exit full screen" : "Enter full screen");
      onResize();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);

    /* ----- open / close ----- */
    function light(k, on) {
      [].forEach.call(modal.querySelectorAll('kbd[data-k="' + k + '"]'), function (n) { n.classList.toggle("hit", on); });
    }
    function open() {
      var side = $("sidebar");
      if (side.classList.contains("open")) { var bd = document.querySelector(".backdrop"); if (bd) bd.click(); }
      opener = document.activeElement;
      modal.classList.add("on");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      measure(); reset(); setState("ready");
      card.focus({ preventScroll: true });
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function close() {
      if (!isOpen()) return;
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      modal.classList.remove("on");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
      state = "ready";
      [].forEach.call(modal.querySelectorAll("kbd.hit"), function (n) { n.classList.remove("hit"); });
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    function trapFocus(e) {
      var f = [].slice.call(card.querySelectorAll("button")).filter(function (b) { return b.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], end = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    }

    openBtn.onclick = open;
    closeBtn.onclick = close;
    fsBtn.onclick = toggleFs;
    action.onclick = primary;
    overlay.addEventListener("click", function (e) { if (e.target !== action) primary(); });
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", function () { if (isOpen()) pause(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden && isOpen()) pause(); });

    /* keyboard */
    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      var k = e.key === " " ? "space" : e.key.toLowerCase();
      if (k === "escape") { close(); return; }
      if (k === "tab") { trapFocus(e); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var onBtn = e.target.closest && e.target.closest("button");
      if (KEYS[k]) { e.preventDefault(); light(k, true); steer(KEYS[k]); }
      else if (k === "f") { e.preventDefault(); light(k, true); toggleFs(); }
      else if (k === "p" || (k === "space" && !onBtn) || (k === "enter" && !onBtn && state !== "running")) {
        e.preventDefault(); light(k, true); toggle();
      }
    });
    document.addEventListener("keyup", function (e) {
      light(e.key === " " ? "space" : e.key.toLowerCase(), false);
    });

    /* touch: swipe anywhere on the board, or use the on-screen pad */
    var sx = 0, sy = 0, tracking = false;
    canvas.addEventListener("pointerdown", function (e) { tracking = true; sx = e.clientX; sy = e.clientY; });
    canvas.addEventListener("pointermove", function (e) {
      if (!tracking) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      sx = e.clientX; sy = e.clientY;
    });
    canvas.addEventListener("pointerup", function () { tracking = false; });
    canvas.addEventListener("pointercancel", function () { tracking = false; });
    [].forEach.call(modal.querySelectorAll(".dpad button"), function (b) {
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); steer(b.dataset.dir); });
    });
  }

  /* 3. Konami Code Easter Egg */
  function initKonami() {
    var code = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    var pos = 0;
    document.addEventListener("keydown", function(e) {
      if (e.key === code[pos] || e.key.toLowerCase() === code[pos]) {
        pos++;
        if (pos === code.length) {
          triggerParty();
          pos = 0;
        }
      } else {
        pos = 0;
      }
    });

    function triggerParty() {
      var root = document.documentElement, isDark = root.dataset.theme === "dark";
      var timer = setInterval(function() {
        root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
        if (soundOn) playHover(); // Play a quick tick
      }, 80);
      setTimeout(function() {
        clearInterval(timer);
        root.dataset.theme = isDark ? "dark" : "light"; // Restore
        if (soundOn) playClick();
      }, 2000);
    }
  }

  /* ---------- boot ---------- */
  /* ---------- boot ---------- */
renderProjects();
renderSkills();
initCarousel();
initTheme();
initSoundToggle();
initSounds();
initSidebar();
initWidgets();
initKonami();
})();