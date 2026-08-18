/* Deepfake detector landing page — vanilla JS, no build step.
   Three jobs: count up the real stats, run the mobile menu, run an analysis. */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------- the backend

     Point API at the Modal web endpoint of fakereasoning-api. Modal serves
     these as https://<workspace>--<app>-<function>.modal.run, so it will
     look something like:

       var API = "https://kaust-academy--fakereasoning-api-analyse.modal.run";

     That is the only edit this file needs. Leave it empty and the page runs
     in demo mode, replaying the verbatim 2026-08-17 run instead of spending
     GPU time — keep that path working, it is how the site gets reviewed.

     The request is multipart: `image` is the file, `models` selects which
     checkpoints answer. The timeout matches FR_IDLE_TIMEOUT=300 on the
     backend, because a visitor arriving after a quiet five minutes pays for
     a container start and 26.8 GB of weights before any inference begins. */
  var API = "";
  var MODELS = "both";
  var API_TIMEOUT_MS = 300000;

  var RETRY_HINT = " The models scale to zero after five idle minutes, so a cold " +
    "start can take up to two minutes. Try once more.";

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

  /* Shown when the backend answered, but not for this model. Better than
     leaving the other column's prose from the previous run standing. */
  function paintMissing(which) {
    var say = document.getElementById(which === "official" ? "say-of" : "say-ft");
    var verdict = document.getElementById(which === "official" ? "v-of" : "v-ft");
    var ms = document.querySelector('.model[data-model="' + which + '"] .ms');
    var p = document.createElement("p");
    p.textContent = "No answer came back from this model.";
    say.textContent = "";
    say.appendChild(p);
    verdict.textContent = "—";
    verdict.classList.remove("real");
    /* Clear the timing too. A 9.9s next to "no answer" reads as a measurement
       of something that never happened. */
    if (ms) ms.textContent = "";
  }

  /* Every real run starts from a clean panel. A verdict or a truncation flag
     left over from the previous image is worse than no answer at all. Demo
     mode never calls this: its prose is the recorded run, written in markup. */
  function resetPanel() {
    document.getElementById("flag").hidden = true;
    ["ft", "of"].forEach(function (k) {
      var v = document.getElementById("v-" + k);
      v.textContent = "";
      v.classList.remove("real");
      document.getElementById("say-" + k).textContent = "";
    });
  }

  /* The exhibit caption. This used to write the filename into the <dt> that
     labels the size row, and replace the filename <dd> with the literal
     string "file". Address the <dd> elements directly. Anything not known —
     demo mode has no response — is left as the markup had it. */
  function setMeta(file, image) {
    var dds = document.getElementById("doc-meta").getElementsByTagName("dd");
    if (file && dds[0]) dds[0].textContent = file.name;
    if (image && image.width && dds[1]) {
      dds[1].textContent = image.width + " × " + image.height +
        (image.format ? " · " + image.format : "");
    }
    if (image && dds[2]) {
      dds[2].textContent = new Date().toLocaleDateString("en-GB",
        { day: "numeric", month: "short", year: "numeric" });
    }
  }

  var exhibitUrl = null;

  function openDoc(file, image) {
    if (file) {
      var img = document.getElementById("doc-img");
      if (exhibitUrl) URL.revokeObjectURL(exhibitUrl);
      exhibitUrl = URL.createObjectURL(file);
      img.src = exhibitUrl;
      img.hidden = false;
      document.getElementById("doc-ph").hidden = true;
      setMeta(file, image);
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

  /* Two response shapes are in play. main.js was written against an envelope
     keyed by model; docs/model-contract.md documents a single flat result.
     Rather than guess, accept both — and a list, which is the third obvious
     way to return two answers. A flat result is routed by model_revision,
     the only field that says which checkpoint replied. */
  function normalise(json) {
    var out = { finetune: null, official: null };

    function place(result) {
      if (!result || typeof result !== "object") return;
      var rev = String(result.model_revision || "");
      if (/^finetun/i.test(rev)) out.finetune = result;
      else if (/^official/i.test(rev)) out.official = result;
    }

    if (json && (json.finetune || json.official)) {
      out.finetune = json.finetune || null;
      out.official = json.official || null;
      return out;
    }
    if (Array.isArray(json)) { json.forEach(place); return out; }
    if (json && Array.isArray(json.results)) { json.results.forEach(place); return out; }
    place(json);
    return out;
  }

  /* Say what actually went wrong. "Failed to fetch" sends someone looking at
     the model when the endpoint is misspelt. */
  function failureFor(status) {
    if (status === 404) return { msg: "No endpoint at that address (404). Check API in main.js.", config: true };
    if (status === 401 || status === 403) return { msg: "The backend refused the request (" + status + ").", config: true };
    if (status === 405) return { msg: "The endpoint rejected a POST (405). Check API in main.js.", config: true };
    if (status === 413) return { msg: "The backend rejected the image as too large (413).", config: true };
    if (status === 422) return { msg: "The backend could not read that image (422).", config: true };
    if (status === 429) return { msg: "The backend is rate limiting (429).", config: false };
    if (status >= 500) return { msg: "The backend errored (" + status + ").", config: false };
    return { msg: "The backend returned " + status + ".", config: false };
  }

  function callBackend(file) {
    var body = new FormData();
    body.append("image", file);
    body.append("models", MODELS);

    var controller = window.AbortController ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, API_TIMEOUT_MS);

    var opts = { method: "POST", body: body };
    if (controller) opts.signal = controller.signal;

    function done(v) { clearTimeout(timer); return v; }

    return fetch(API, opts).then(function (r) {
      if (!r.ok) {
        var f = failureFor(r.status);
        return r.text().catch(function () { return ""; }).then(function (body) {
          done();
          var err = new Error(f.msg);
          err.config = f.config;
          err.detail = String(body).slice(0, 300);
          throw err;
        });
      }
      return r.json().then(done, function () {
        done();
        var err = new Error("The backend replied with something that is not JSON.");
        err.config = true;
        throw err;
      });
    }, function (e) {
      done();
      if (timedOut || e.name === "AbortError") {
        throw new Error("No answer in five minutes, so the request was given up on.");
      }
      var err = new Error("The request never reached the backend. It may be offline, " +
        "or blocking this origin with CORS.");
      err.config = true;
      throw err;
    });
  }

  document.getElementById("doc-close").addEventListener("click", closeDoc);

  if (PAPER_URL) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-paper]"), function (a) {
      a.href = PAPER_URL;
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  /* ------------------------------------------------------ section nav

     The header scrolls away with the landing, so a compact nav takes over
     once the document starts, and marks which section is being read. */
  (function subnav() {
    var bar = document.getElementById("subnav");
    var top = document.getElementById("top");
    var ids = ["method", "results", "team", "paper"];
    if (!bar || !top || !("IntersectionObserver" in window)) return;

    new IntersectionObserver(function (entries) {
      bar.classList.toggle("on", !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(top);

    var links = Array.prototype.slice.call(bar.querySelectorAll("a[href^='#']"));
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle("here", l.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    ids.forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  })();

  document.getElementById("analyse").addEventListener("click", function () {
    clearError();
    fileInput.click();
  });

  document.getElementById("example").addEventListener("click", function () {
    openDoc(null);
  });

  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    /* Clear it immediately, or picking the same file twice fires no change
       event and the second attempt looks like a dead button. */
    fileInput.value = "";
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
         verbatim run. Set API above to call the real backend. */
      setTimeout(function () { stop(); openDoc(file, null); }, REDUCED ? 400 : 6000);
      return;
    }

    callBackend(file)
      .then(function (json) {
        var models = normalise(json);
        if (!models.finetune && !models.official) {
          var err = new Error("The backend replied, but with no result this page could read.");
          err.config = true;
          throw err;
        }

        stop();
        resetPanel();

        if (models.finetune) paintModel("finetune", models.finetune);
        else paintMissing("finetune");
        if (models.official) paintModel("official", models.official);
        else paintMissing("official");

        openDoc(file, (models.official || models.finetune).image);
      })
      .catch(function (e) {
        resetStages();
        if (e.detail) console.error("Backend said:", e.detail);
        showError(e.message + (e.config ? "" : RETRY_HINT));
      });
  });

})();
