/* Deepfake detector landing page — vanilla JS, no build step.
   Three jobs: count up the real stats, run the mobile menu, run an analysis. */

(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------- the backend

     The live deployment of the fakereasoning-api Modal app. Its contract was
     read from the deployment's own /openapi.json, not assumed:

       POST /api/v1/analyze   multipart: file=<image>, model=kaust|official
                              200 -> one flat AnalysisResponse
                              413 415 422 429 502 504 -> ErrorResponse
       POST /api/v1/warmup    multipart: model=<id>, 202 and returns at once
       GET  /health           liveness

     One call answers for one checkpoint, so the panel makes one call per
     column it shows. Model ids come from the backend's model_catalog.py.

     Set API to "" to go back to demo mode, which replays the verbatim
     2026-08-17 run instead of spending GPU time. Keep that path working. */
  var API = "https://hanooodaey--fakereasoning-api-fastapi-app.modal.run";
  var ANALYZE = "/api/v1/analyze";
  var WARMUP = "/api/v1/warmup";
  var MODEL_IDS = { finetune: "kaust", official: "official" };
  var API_TIMEOUT_MS = 300000;

  var RETRY_HINT = " The models scale to zero after five idle minutes, so a cold " +
    "start can take up to two minutes. Try once more.";

  /* The report, served from this origin. Links marked data-paper point here;
     the nav item still scrolls to the Paper section. */
  var PAPER_URL = "assets/kasp_project_report.pdf";

  /* ------------------------------------------------------- hero video

     The current file is 13.21 MB against a 1.5 MB budget, so it is opt-in
     rather than opt-out. Two refusals, each an explicit signal from the
     visitor rather than a guess made on their behalf:

       reduced motion  the DoD says fall back to the poster, and an autoplay
                       attribute cannot be cancelled from CSS
       Save-Data       the visitor has asked, in a header, not to be sent this

     A third refusal on max-width 720px used to sit here. It was removed: the
     landing read as a flat black rectangle on every phone, which is most of
     the demo-day traffic. The 13.21 MB still lands on phone data, and that
     number is the thing to fix, not the playback.

     In every refused case the poster carries the page on its own. */
  (function heroVideo() {
    var video = document.getElementById("bg-video");
    if (!video) return;

    var bg = document.getElementById("bg");
    var conn = navigator.connection || {};
    var metered = conn.saveData === true;

    function fallBackToPoster() {
      if (!video.parentNode) return;
      video.remove();
      bg.classList.add("bg-still");
    }

    if (REDUCED || metered) {
      fallBackToPoster();
      return;
    }

    /* A network or decode failure leaves an empty element behind, and the
       poster attribute stops applying once the media errors. Hand the frame
       back to the CSS still so the landing is never a black rectangle. */
    video.addEventListener("error", fallBackToPoster);

    var source = document.createElement("source");
    source.type = "video/mp4";
    source.src = video.dataset.src;
    source.addEventListener("error", fallBackToPoster);
    video.appendChild(source);
    video.load();

    /* iOS plays a muted playsinline video without a gesture, but refuses in
       Low Power Mode. Retry once on the first touch, then stop asking. */
    function attempt() {
      var p = video.play();
      if (p && p.catch) p.catch(waitForGesture);
    }
    function waitForGesture() {
      document.addEventListener("touchstart", once, { once: true, passive: true });
      document.addEventListener("click", once, { once: true });
    }
    function once() {
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* refused twice; poster stays */ });
    }
    attempt();
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
  /* An MPO holds the primary image plus one or two more frames, so the file on
     disk is larger than the image that ends up being sent. Read up to twice
     the cap and apply the cap to what prepare() returns. */
  var READ_MAX = 2 * MAX_BYTES;
  var ORDER = ["boot", "load", "read", "write"];
  var timers = [];

  /* Which readings the panel shows. Read from the markup rather than fixed
     here, so hiding an <article class="model"> in index.html is the single
     switch: no request is made for it, no warmup is spent on it, and nothing
     is written into it. Remove the hidden attribute and it comes back. */
  var COLUMNS = Array.prototype.slice
    .call(document.querySelectorAll(".doc-compare .model[data-model]"))
    .filter(function (el) { return !el.hidden; })
    .map(function (el) { return el.dataset.model; });

  function sayId(col) { return col === "official" ? "say-of" : "say-ft"; }
  function verdictId(col) { return col === "official" ? "v-of" : "v-ft"; }

  /* ------------------------------------------------- what actually gets sent

     The file's declared type cannot be trusted. A camera or a phone in depth
     mode writes .mpo, and the browser reports it as "image/mpo" on one
     platform and "" on the next, so a MIME test rejected the photograph
     before it ever reached the backend. Read the magic number instead. */
  function sniff(b) {
    if (b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
    if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
        b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return "image/png";
    if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
    return null;
  }

  /* An MPO is two or more complete JPEG images written end to end: the
     full-size primary first, then the parallax or preview frames recorded
     alongside it. Every byte of the first image is already a valid JPEG, so
     the whole repair is to send that and drop the rest — nothing is decoded
     and nothing is re-encoded, so the photograph the model reads is the
     photograph the camera wrote.

     Returns the length of the primary image, or 0 if these bytes are not a
     JPEG. This walks the marker structure rather than searching for the FFD9
     end marker, because FFD9 also ends the EXIF thumbnail inside APP1 and a
     search would cut the photograph off there. */
  function primaryJpegLength(b) {
    if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) return 0;
    var i = 2;
    while (i + 1 < b.length) {
      if (b[i] !== 0xFF) return 0;                     /* lost the structure */
      var m = b[i + 1];
      if (m === 0xFF) { i++; continue; }               /* fill byte */
      if (m === 0xD9) return i + 2;                    /* EOI: primary ends */
      if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      if (i + 3 >= b.length) return 0;
      var len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2) return 0;
      i += 2 + len;
      if (m === 0xDA) {
        /* Entropy-coded scan data. An FF inside it is stuffed as FF 00, and
           restart markers are legal; anything else is the next real marker. */
        while (i + 1 < b.length &&
               !(b[i] === 0xFF && b[i + 1] !== 0x00 &&
                 !(b[i + 1] >= 0xD0 && b[i + 1] <= 0xD7))) i++;
      }
    }
    return 0;
  }

  /* APP2 "MPF\0" is the multi-picture index: the table of contents naming
     where each frame starts. With the other frames dropped its offsets point
     at nothing, and a reader that trusts it still calls the result an MPO, so
     it goes too. Returns its byte range, or null. Only the header is walked —
     APP2 always precedes the first scan. EXIF in APP1 is left alone, so
     orientation and capture data survive the cut. */
  function mpfSegment(b) {
    var i = 2;
    while (i + 7 < b.length && b[i] === 0xFF) {
      var m = b[i + 1];
      if (m === 0xDA || m === 0xD9) return null;
      if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      var len = (b[i + 2] << 8) | b[i + 3];
      if (len < 2) return null;
      if (m === 0xE2 && b[i + 4] === 0x4D && b[i + 5] === 0x50 &&
          b[i + 6] === 0x46 && b[i + 7] === 0x00) return [i, i + 2 + len];
      i += 2 + len;
    }
    return null;
  }

  /* Resolves to {file, note}: the bytes to upload, and a line for the exhibit
     when they are not the bytes that were picked. */
  function prepare(file) {
    return file.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      var type = sniff(b);

      if (!type) {
        throw new Error("That file is not a PNG, JPEG or WebP image. " +
          "It does not begin like one, whatever its name says.");
      }
      if (type !== "image/jpeg") return { file: file, note: null };

      var end = primaryJpegLength(b);
      if (!end || end >= file.size) return { file: file, note: null };

      /* More frames follow the first: an MPO, or a JPEG with data appended. */
      var mpf = mpfSegment(b);
      var parts = mpf ? [file.slice(0, mpf[0]), file.slice(mpf[1], end)]
                      : [file.slice(0, end)];
      return {
        file: new File(parts, file.name.replace(/\.[^.]*$/, "") + ".jpg",
                       { type: "image/jpeg" }),
        note: "That was a multi-picture file. Its primary image was lifted out and " +
              "sent on its own — no pixel was decoded or re-encoded on the way."
      };
    });
  }

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
    document.body.classList.add("working");
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
    document.body.classList.remove("working");
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
    var say = document.getElementById(sayId(which));
    var verdict = document.getElementById(verdictId(which));
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
  function paintMissing(which, reason) {
    var say = document.getElementById(sayId(which));
    var verdict = document.getElementById(verdictId(which));
    var ms = document.querySelector('.model[data-model="' + which + '"] .ms');
    var p = document.createElement("p");
    p.textContent = reason || "No answer came back from this model.";
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
    /* The worked example ships with its ground truth stated. For a visitor's
       own photograph there is no ground truth to state, so it goes. */
    var truth = document.getElementById("exhibit-truth");
    if (truth) truth.hidden = true;
    COLUMNS.forEach(function (col) {
      var v = document.getElementById(verdictId(col));
      v.textContent = "";
      v.classList.remove("real");
      document.getElementById(sayId(col)).textContent = "";
    });
  }

  /* The exhibit caption. This used to write the filename into the <dt> that
     labels the size row, and replace the filename <dd> with the literal
     string "file". Address the <dd> elements directly. Anything not known —
     demo mode has no response — is left as the markup had it. */
  function setMeta(name, image) {
    var dds = document.getElementById("doc-meta").getElementsByTagName("dd");
    if (name && dds[0]) dds[0].textContent = name;
    if (image && image.width && dds[1]) {
      dds[1].textContent = image.width + " × " + image.height +
        (image.format ? " · " + image.format : "");
    }
    if (image && dds[2]) {
      dds[2].textContent = new Date().toLocaleDateString("en-GB",
        { day: "numeric", month: "short", year: "numeric" });
    }
  }

  function setNote(text) {
    var el = document.getElementById("exhibit-note");
    if (!el) return;
    el.textContent = text || "";
    el.hidden = !text;
  }

  var exhibitUrl = null;

  /* `file` is previewed, `name` is captioned. They come apart for a
     multi-picture file: the preview is the primary image cut out of it, which
     every browser can decode, while the caption stays the name that was
     picked. */
  function openDoc(file, image, note, name) {
    if (file) {
      setNote(note);
      var img = document.getElementById("doc-img");
      if (exhibitUrl) URL.revokeObjectURL(exhibitUrl);
      exhibitUrl = URL.createObjectURL(file);
      img.src = exhibitUrl;
      img.hidden = false;
      document.getElementById("doc-ph").hidden = true;
      setMeta(name || file.name, image);
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

  /* Route a result to its column. The deployed build returns model_id; older
     builds do not, so fall back to model_revision, and finally to whichever
     model we asked for. */
  function columnFor(result, requested) {
    var id = String(result.model_id || "");
    if (id === "kaust") return "finetune";
    if (id === "official") return "official";
    var rev = String(result.model_revision || "");
    if (/^finetun/i.test(rev)) return "finetune";
    if (/^official/i.test(rev)) return "official";
    return requested;
  }

  /* Say what actually went wrong. "Failed to fetch" sends someone looking at
     the model when the real problem is CORS or a stopped app. `config` marks
     the failures that retrying cannot fix. */
  function failureFor(status) {
    if (status === 404) return { msg: "No endpoint at that address (404). Check API in main.js.", config: true };
    if (status === 401 || status === 403) return { msg: "The backend refused the request (" + status + ").", config: true };
    if (status === 405) return { msg: "The endpoint rejected a POST (405). Check API in main.js.", config: true };
    if (status === 413) return { msg: "That image is larger than the backend accepts (413).", config: true };
    if (status === 415) return { msg: "The backend does not accept that image type (415).", config: true };
    if (status === 422) return { msg: "The backend could not read that image (422).", config: true };
    if (status === 429) return { msg: "Too many analyses from this address (429).", config: false };
    if (status === 502) return { msg: "The API could not reach the GPU tier (502).", config: false };
    if (status === 504) return { msg: "The GPU tier did not answer in time (504).", config: false };
    if (status >= 500) return { msg: "The backend errored (" + status + ").", config: false };
    return { msg: "The backend returned " + status + ".", config: false };
  }

  /* The API returns its own error envelope: {code, message, request_id,
     retryable}. Its message is written for a reader, so prefer it. */
  function readError(response) {
    var fallback = failureFor(response.status);
    return response.json().then(function (b) {
      var err = new Error((b && b.message) || fallback.msg);
      err.config = fallback.config;
      err.retryable = b && typeof b.retryable === "boolean" ? b.retryable : !fallback.config;
      err.requestId = b && b.request_id;
      return err;
    }, function () {
      var err = new Error(fallback.msg);
      err.config = fallback.config;
      err.retryable = !fallback.config;
      return err;
    });
  }

  /* Fire and forget. /warmup returns 202 without doing work; its only job is
     to start the right GPU container booting while the visitor is still in
     the file picker, which is the bulk of the cold path. */
  function warmup() {
    if (!API) return;
    COLUMNS.forEach(function (col) {
      var body = new FormData();
      body.append("model", MODEL_IDS[col]);
      fetch(API + WARMUP, { method: "POST", body: body }).catch(function () {});
    });
  }

  function analyseOne(file, modelId, signal) {
    var body = new FormData();
    body.append("file", file);
    body.append("model", modelId);
    var opts = { method: "POST", body: body };
    if (signal) opts.signal = signal;

    return fetch(API + ANALYZE, opts).then(function (r) {
      if (r.ok) {
        return r.json().then(null, function () {
          var e = new Error("The backend replied with something that is not JSON.");
          e.config = true;
          throw e;
        });
      }
      return readError(r).then(function (e) { throw e; });
    }, function (e) {
      if (e.name === "AbortError") throw e;
      var err = new Error("The request never reached the backend. It may be stopped, " +
        "or refusing this origin with CORS.");
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

  document.getElementById("analyse").addEventListener("click", function () {
    clearError();
    /* Warm the GPU class now, not on file select. Choosing a file takes a
       visitor several seconds and the containers need about a minute, so this
       is the only moment where the head start is worth anything. It costs a
       boot if they cancel the picker, which is what /warmup is for. */
    warmup();
    fileInput.click();
  });

  document.getElementById("example").addEventListener("click", function () {
    openDoc(null);
  });

  fileInput.addEventListener("change", function () {
    var picked = fileInput.files && fileInput.files[0];
    /* Clear it immediately, or picking the same file twice fires no change
       event and the second attempt looks like a dead button. */
    fileInput.value = "";
    if (!picked) return;

    if (picked.size > READ_MAX) {
      showError("That file is over " + (READ_MAX / 1048576) + " MB. Try a smaller one.");
      return;
    }

    clearError();
    /* Read and check the bytes before showing the working state: a file that
       is never going to be sent should not put a stage clock on screen. */
    prepare(picked).then(function (ready) {
      if (ready.file.size > MAX_BYTES) {
        throw new Error("That image is over 12 MB. Try a smaller one.");
      }
      analyse(ready.file, picked, ready.note);
    }, function (e) {
      showError(e.message);
    });
  });

  /* `sending` is what goes to the backend, `picked` is what the visitor chose.
     They differ only for a multi-picture file, where the caption keeps the
     name that was picked. */
  function analyse(sending, picked, note) {
    var stop = runStages();

    if (!API) {
      /* Demo mode: hold the wait so the state can be reviewed, then show the
         verbatim run. Set API above to call the real backend. */
      setTimeout(function () { stop(); openDoc(sending, null, note, picked.name); }, REDUCED ? 400 : 6000);
      return;
    }

    /* One call per visible checkpoint, in parallel. None is allowed to sink
       another: each settles into {ok, value|error} so one model failing
       still shows the one that answered. */
    var controller = window.AbortController ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, API_TIMEOUT_MS);
    var signal = controller ? controller.signal : null;

    function settle(p) {
      return p.then(function (v) { return { ok: true, value: v }; },
                    function (e) { return { ok: false, error: e }; });
    }

    var columns = COLUMNS;

    Promise.all(columns.map(function (col) {
      return settle(analyseOne(sending, MODEL_IDS[col], signal));
    })).then(function (settled) {
      clearTimeout(timer);

      if (timedOut) {
        throw new Error("No answer in five minutes, so the request was given up on.");
      }

      var painted = {};
      var duplicate = false;
      var firstError = null;

      settled.forEach(function (s, i) {
        if (!s.ok) { firstError = firstError || s.error; return; }
        var col = columnFor(s.value, columns[i]);
        /* A backend without the model selector answers with its default both
           times. Show it once rather than twice under two different headings. */
        if (painted[col]) { duplicate = true; return; }
        painted[col] = s.value;
      });

      var answered = columns.filter(function (c) { return painted[c]; });

      if (!answered.length) {
        throw firstError || new Error("The backend replied, but with no result this page could read.");
      }

      stop();
      resetPanel();

      columns.forEach(function (col) {
        if (painted[col]) paintModel(col, painted[col]);
        else if (duplicate) paintMissing(col, "This deployment has no model selector, so both requests returned the same checkpoint.");
        else paintMissing(col, firstError ? firstError.message : null);
      });

      openDoc(sending, painted[answered[0]].image, note, picked.name);
    }).catch(function (e) {
      clearTimeout(timer);
      resetStages();
      if (e.requestId) console.error("Backend request id:", e.requestId);
      showError(e.message + (e.config ? "" : RETRY_HINT));
    });
  }

})();
