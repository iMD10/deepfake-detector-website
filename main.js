/* Deepfake detector landing page — vanilla JS, no build step.
   Three jobs: count up the real stats, run the mobile menu, run an analysis. */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Point this at your backend. Leave empty to run the page in demo mode,
     which replays the verbatim 2026-08-17 run instead of calling a GPU. */
  var API = "";

  /* The paper has no public URL yet. While this is empty, the Paper links open
     the document panel at the attribution note. Set it and they become
     ordinary external links, no other change required. */
  var PAPER_URL = "";

  /* ------------------------------------------------------- hero video

     The current file is 13.21 MB against a 1.5 MB budget, so it is opt-in
     rather than opt-out. Three refusals, each for its own reason:

       reduced motion  the DoD says fall back to the poster, and an autoplay
                       attribute cannot be cancelled from CSS
       narrow viewport phone data, and the video is cropped to a sliver there
       Save-Data       the visitor has asked, in a header, not to be sent this

     In every refused case the poster carries the page on its own. */
  (function heroVideo() {
    var video = document.getElementById("bg-video");
    if (!video) return;

    var narrow = window.matchMedia("(max-width: 720px)").matches;
    var conn = navigator.connection || {};
    var metered = conn.saveData === true;

    if (REDUCED || narrow || metered) {
      video.remove();
      document.getElementById("bg").classList.add("bg-still");
      return;
    }

    var source = document.createElement("source");
    source.type = "video/mp4";
    source.src = video.dataset.src;
    video.appendChild(source);
    video.load();
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused; poster stays */ });
  })();

  /* ---------------------------------------------------------------- stats */

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function countUp(el, i) {
    var target = parseFloat(el.dataset.target);
    var suffix = el.dataset.suffix || "";
    var dec = parseInt(el.dataset.dec, 10) || 0;

    if (REDUCED) { el.textContent = target.toFixed(dec) + suffix; return; }

    var duration = 1500 + i * 80;
    var delay = 480 + i * 90;
    var start = null;

    setTimeout(function () {
      requestAnimationFrame(function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        el.textContent = (target * easeOutCubic(p)).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      });
    }, delay);
  }

  var vals = Array.prototype.slice.call(document.querySelectorAll(".stat .val"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || e.target.dataset.ran) return;
        e.target.dataset.ran = "1";
        countUp(e.target, vals.indexOf(e.target));
        io.unobserve(e.target);
      });
    }, { threshold: 0.25 });
    vals.forEach(function (v) { io.observe(v); });
  } else {
    vals.forEach(countUp);
  }

  /* ----------------------------------------------------------- mobile nav */

  var burger = document.getElementById("burger");
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("mobile-menu");

  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    overlay.hidden = !open;
    sheet.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (open) sheet.querySelector("a").focus();
  }

  burger.addEventListener("click", function () {
    setMenu(burger.getAttribute("aria-expanded") !== "true");
  });
  overlay.addEventListener("click", function () { setMenu(false); });
  sheet.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setMenu(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { setMenu(false); closeDoc(); }
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 720) setMenu(false);
  });

  /* --------------------------------------------------------- the analysis */

  var fileInput = document.getElementById("file");
  var stages = document.getElementById("stages");
  var bar = document.getElementById("bar");
  var err = document.getElementById("err");
  var ctaWrap = document.querySelector(".cta-wrap");
  var doc = document.getElementById("doc");

  var MAX_BYTES = 12 * 1024 * 1024;
  var ORDER = ["boot", "load", "read", "write"];
  var timers = [];

  function stageEl(name) { return stages.querySelector('[data-s="' + name + '"]'); }

  function showError(msg) {
    err.textContent = msg;
    err.hidden = false;
  }

  function clearError() { err.hidden = true; err.textContent = ""; }

  /* Stages are advertised, not faked: each one names real work the backend is
     doing, and the elapsed clock is real. Cold timings come from the live run
     (container 1.2s, weights 42.6s, inference 15.6s). */
  function runStages() {
    var t0 = Date.now();
    var marks = { boot: 1500, load: 44000, read: 55000, write: 75000 };
    var idx = 0;

    stages.hidden = false;
    ctaWrap.hidden = true;
    stageEl("boot").classList.add("now");

    var tick = setInterval(function () {
      var ms = Date.now() - t0;
      var current = ORDER[idx];
      var el = stageEl(current);
      if (el) el.querySelector("b").textContent = ((ms / 1000) | 0) + "s";
      bar.style.width = Math.min((ms / marks.write) * 100, 96) + "%";

      if (current && ms > marks[current] && idx < ORDER.length - 1) {
        el.classList.remove("now");
        el.classList.add("done");
        idx++;
        stageEl(ORDER[idx]).classList.add("now");
      }
    }, 250);

    timers.push(tick);
    return function stop() {
      clearInterval(tick);
      bar.style.width = "100%";
      ORDER.forEach(function (n) {
        var el = stageEl(n);
        el.classList.remove("now");
        el.classList.add("done");
      });
    };
  }

  function resetStages() {
    timers.forEach(clearInterval);
    timers = [];
    stages.hidden = true;
    ctaWrap.hidden = false;
    bar.style.width = "0";
    ORDER.forEach(function (n) {
      stageEl(n).classList.remove("now", "done");
      stageEl(n).querySelector("b").textContent = "";
    });
  }

  /* The model ends its reasoning with "Therefore, this image is fake." and also
     returns prediction separately. Show it once: strip the closing sentence and
     let the verdict element carry it. Same move as strip_verdict_leak() in
     training. Also repairs the missing space after a period. */
  function cleanReasoning(text) {
    return String(text || "")
      .replace(/\s*Therefore,?\s*th(is|e)\s+image\s+is\s+(real|fake)\s*\.?\s*$/i, "")
      .replace(/([.!?])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Official emits "From low-level perspective: ... From high-level perspective: ..."
     The fine-tune does not. Style the halves when present, fall back to one
     paragraph when absent, so one template serves both. */
  function renderProse(container, text) {
    container.textContent = "";
    var re = /From\s+(low|high)-level\s+perspective\s*:\s*/gi;
    var parts = [], m, last = 0, labels = [];

    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      labels.push(m[1].toLowerCase() + "-level");
      last = m.index + m[0].length;
      parts.push(null);
    }
    parts.push(text.slice(last));

    if (!labels.length) {
      var p = document.createElement("p");
      p.textContent = text;
      container.appendChild(p);
      return;
    }

    var li = 0;
    parts.forEach(function (chunk) {
      if (chunk === null || !String(chunk).trim()) return;
      var para = document.createElement("p");
      if (li < labels.length) {
        var em = document.createElement("em");
        em.className = "half";
        em.textContent = labels[li++];
        para.appendChild(em);
      }
      para.appendChild(document.createTextNode(String(chunk).trim()));
      container.appendChild(para);
    });
  }

  function paintModel(which, data) {
    var say = document.getElementById(which === "official" ? "say-of" : "say-ft");
    var verdict = document.getElementById(which === "official" ? "v-of" : "v-ft");
    var ms = document.querySelector('.model[data-model="' + which + '"] .ms');

    renderProse(say, cleanReasoning(data.reasoning));

    var word = data.prediction === "real" ? "Real" : "Fake";
    verdict.textContent = word;
    verdict.classList.toggle("real", data.prediction === "real");

    if (typeof data.inference_ms === "number") {
      ms.textContent = (data.inference_ms / 1000).toFixed(1) + "s";
    }

    if (data.truncated) document.getElementById("flag").hidden = false;
  }

  function openDoc(file) {
    if (file) {
      var img = document.getElementById("doc-img");
      var ph = document.getElementById("doc-ph");
      img.src = URL.createObjectURL(file);
      img.hidden = false;
      ph.hidden = true;
      var meta = document.getElementById("doc-meta");
      meta.children[1].textContent = "file";
      meta.children[1].nextElementSibling.textContent = file.name;
    }
    doc.hidden = false;
    document.body.classList.add("doc-open");
    document.getElementById("doc-close").focus();
  }

  function closeDoc() {
    if (doc.hidden) return;
    doc.hidden = true;
    document.body.classList.remove("doc-open");
    resetStages();
  }

  document.getElementById("doc-close").addEventListener("click", closeDoc);

  /* The document panel is the only other surface this site has, so the nav
     points into it rather than at sections that do not exist. Open it, then
     bring the requested part into view. */
  function openDocAt(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    openDoc(null);
    target.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" });
  }

  if (PAPER_URL) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-paper]"), function (a) {
      a.href = PAPER_URL;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#doc-"]');
    if (!a) return;
    e.preventDefault();
    setMenu(false);
    openDocAt(a.getAttribute("href"));
  });

  /* 404.html links across as /#doc-method, so honour the hash on arrival. */
  if (/^#doc-/.test(window.location.hash)) openDocAt(window.location.hash);

  document.getElementById("analyse").addEventListener("click", function () {
    clearError();
    fileInput.click();
  });

  document.getElementById("example").addEventListener("click", function () {
    openDoc(null);
  });

  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;

    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showError("That file is not a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("That image is over 12 MB. Try a smaller one.");
      return;
    }

    clearError();
    var stop = runStages();

    if (!API) {
      /* Demo mode: hold the wait so the state can be reviewed, then show the
         verbatim run. Replace API above to call the real backend. */
      setTimeout(function () { stop(); openDoc(file); }, REDUCED ? 400 : 6000);
      return;
    }

    var body = new FormData();
    body.append("image", file);
    body.append("models", "both");

    fetch(API, { method: "POST", body: body })
      .then(function (r) {
        if (!r.ok) throw new Error("The backend returned " + r.status + ".");
        return r.json();
      })
      .then(function (json) {
        stop();
        if (json.finetune) paintModel("finetune", json.finetune);
        if (json.official) paintModel("official", json.official);
        openDoc(file);
      })
      .catch(function (e) {
        resetStages();
        showError(e.message + " The models scale to zero after five idle minutes, so a cold start can take up to two minutes. Try once more.");
      });
  });

})();
