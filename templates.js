(function (root) {
  "use strict";

  var search = document.getElementById("tpl-search");
  var empty = document.getElementById("tpl-empty");
  var count = document.getElementById("tpl-count");
  var category = "All";
  var filtersBound = false;

  function norm(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function chips() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-tpl-filter]"));
  }

  function cards() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-tpl-card]"));
  }

  function apply() {
    var q = search ? norm(search.value) : "";
    var visible = 0;
    cards().forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var hay = card.getAttribute("data-search") || "";
      var catOk = category === "All" || cat === category;
      var qOk = !q || hay.indexOf(q) !== -1;
      var show = catOk && qOk;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
    if (count) {
      var label = visible === 1 ? "1 template" : visible + " templates";
      if (category !== "All") label += " in " + category;
      if (q && search) label += " matching “" + search.value.trim() + "”";
      count.textContent = label;
    }
  }

  function bindFilters() {
    chips().forEach(function (chip) {
      if (chip.getAttribute("data-bound") === "1") return;
      chip.setAttribute("data-bound", "1");
      chip.addEventListener("click", function () {
        category = chip.getAttribute("data-tpl-filter") || "All";
        chips().forEach(function (c) {
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        apply();
      });
    });
    filtersBound = true;
  }

  if (search) search.addEventListener("input", apply);
  bindFilters();
  if (cards().length) apply();

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(area);
  }


  function getPromptText() {
    var editor = document.getElementById("tpl-prompt-editor");
    if (editor) return editor.value;
    var raw = document.getElementById("tpl-prompt-raw");
    return raw ? (raw.value || raw.textContent || "") : "";
  }

  function getOriginalText() {
    var orig = document.getElementById("tpl-prompt-original");
    return orig ? (orig.value || orig.textContent || "") : "";
  }

  function bindCopy() {
    document.querySelectorAll("[data-copy-target], [data-copy-prompt]").forEach(function (btn) {
      if (btn.getAttribute("data-bound") === "1") return;
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        var text = "";
        if (btn.hasAttribute("data-copy-prompt")) {
          text = getPromptText();
        } else {
          var id = btn.getAttribute("data-copy-target");
          var src = document.getElementById(id);
          if (!src) return;
          text = src.value || src.textContent || "";
        }
        var done = function () {
          var prev = btn.textContent;
          btn.textContent = "Copied";
          btn.setAttribute("aria-label", "Prompt copied");
          setTimeout(function () {
            btn.textContent = prev;
            btn.removeAttribute("aria-label");
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            fallbackCopy(text);
            done();
          });
        } else {
          fallbackCopy(text);
          done();
        }
      });
    });
  }
  bindCopy();

  function toBase64Url(obj) {
    var json = JSON.stringify(obj);
    var b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function importURL(opts) {
    opts = opts || {};
    var slug = opts.slug || document.body.getAttribute("data-template-slug") || "";
    var url = "promptly://import?template=" + encodeURIComponent(slug);
    if (opts.payload) {
      url += "&v=1&data=" + toBase64Url(opts.payload);
    }
    return url;
  }

  function openInPromptly(opts) {
    var note = document.getElementById("tpl-open-note");
    var url = importURL(opts);
    var opened = false;
    function mark() { opened = true; }
    document.addEventListener("visibilitychange", mark);
    window.addEventListener("blur", mark);
    var hidden = document.getElementById("tpl-open-frame");
    if (!hidden) {
      hidden = document.createElement("iframe");
      hidden.id = "tpl-open-frame";
      hidden.setAttribute("aria-hidden", "true");
      hidden.style.display = "none";
      document.body.appendChild(hidden);
    }
    try { hidden.src = url; } catch (e) {}
    try { window.location.href = url; } catch (e2) {}
    setTimeout(function () {
      document.removeEventListener("visibilitychange", mark);
      window.removeEventListener("blur", mark);
      var hiddenStill = document.visibilityState !== "hidden" && !opened;
      if (hiddenStill && note) note.hidden = false;
    }, 1500);
  }

  function bindOpen() {
    var btn = document.getElementById("tpl-open-promptly");
    if (!btn || btn.getAttribute("data-bound") === "1") return;
    btn.setAttribute("data-bound", "1");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var slug = document.body.getAttribute("data-template-slug");
      var payload = null;
      if (slug) {
        payload = {
          title: document.body.getAttribute("data-template-title") || document.title,
          prompt: getPromptText(),
          category: document.body.getAttribute("data-template-category") || "",
          persona: document.body.getAttribute("data-template-persona") || "",
          level: document.body.getAttribute("data-template-level") || "",
          format: document.body.getAttribute("data-template-format") || "",
          source: "promptly-site",
          templateId: slug
        };
      }
      openInPromptly({ slug: slug, payload: payload });
    });
  }
  bindOpen();

  function mountBadge(target, text, compact) {
    if (!root.PromptlyQuality || !target) return null;
    var result = PromptlyQuality.scorePrompt(text || "");
    target.innerHTML = PromptlyQuality.ringHTML(result, {
      size: compact ? 56 : 72,
      summary: !compact
    });
    if (compact) {
      var badge = target.querySelector(".pq-badge");
      if (badge) badge.classList.add("pq-badge-compact");
    }
    return result;
  }

  function updateReset() {
    var reset = document.getElementById("tpl-prompt-reset");
    if (!reset) return;
    reset.hidden = getPromptText() === getOriginalText();
  }

  function renderPanel() {
    var host = document.getElementById("tpl-quality");
    var list = document.getElementById("tpl-suggestions");
    var empty = document.getElementById("tpl-suggestions-empty");
    if (!root.PromptlyQuality || !host) return null;
    var result = PromptlyQuality.scorePrompt(getPromptText());
    host.innerHTML = PromptlyQuality.ringHTML(result, { size: 72, summary: true });
    if (list) {
      list.innerHTML = PromptlyQuality.suggestionsHTML(result);
      if (empty) {
        if (result.suggestions.length) {
          empty.hidden = true;
        } else {
          empty.hidden = false;
          empty.textContent = result.score >= 85
            ? "No urgent gaps. You can still tighten wording in Promptly."
            : "Edit the prompt to see suggestions.";
        }
      }
    }
    updateReset();
    return result;
  }


  var hist = [];
  var histIdx = -1;
  var histTimer = null;
  var applyingHist = false;

  function countLabel(text) {
    var trimmed = (text || "").trim();
    var words = trimmed ? trimmed.split(/\s+/).length : 0;
    var chars = (text || "").length;
    return (words === 1 ? "1 word" : words + " words") +
      " · " + (chars === 1 ? "1 character" : chars + " characters");
  }

  function updateCount() {
    var el = document.getElementById("tpl-ed-count");
    if (el) el.textContent = countLabel(getPromptText());
  }

  function editorEl() {
    return document.getElementById("tpl-prompt-editor");
  }

  function snapOf(editor) {
    return { v: editor.value, s: editor.selectionStart, e: editor.selectionEnd };
  }

  function pushSnap(editor) {
    if (!editor) return;
    var snap = snapOf(editor);
    if (histIdx >= 0 && hist[histIdx].v === snap.v) {
      hist[histIdx] = snap;
      return;
    }
    hist = hist.slice(0, histIdx + 1);
    hist.push(snap);
    if (hist.length > 80) hist.shift();
    histIdx = hist.length - 1;
    updateUndoState();
  }

  function commitPending(editor) {
    clearTimeout(histTimer);
    pushSnap(editor);
  }

  function applySnap(editor, snap) {
    applyingHist = true;
    editor.value = snap.v;
    editor.setSelectionRange(snap.s, snap.e);
    applyingHist = false;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    updateCount();
    updateUndoState();
  }

  function updateUndoState() {
    var undo = document.querySelector('[data-ed="undo"]');
    var redo = document.querySelector('[data-ed="redo"]');
    if (undo) undo.disabled = histIdx <= 0;
    if (redo) redo.disabled = histIdx >= hist.length - 1;
  }

  function undoEdit() {
    var editor = editorEl();
    if (!editor) return;
    commitPending(editor);
    if (histIdx <= 0) return;
    histIdx -= 1;
    applySnap(editor, hist[histIdx]);
  }

  function redoEdit() {
    var editor = editorEl();
    if (!editor || histIdx >= hist.length - 1) return;
    clearTimeout(histTimer);
    histIdx += 1;
    applySnap(editor, hist[histIdx]);
  }

  function setEditorValue(editor, value, selStart, selEnd) {
    commitPending(editor);
    editor.value = value;
    editor.focus();
    editor.setSelectionRange(selStart, selEnd);
    pushSnap(editor);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    updateCount();
  }

  function insertVariable() {
    var editor = editorEl();
    if (!editor) return;
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var token = "{{variable}}";
    var next = editor.value.slice(0, start) + token + editor.value.slice(end);
    setEditorValue(editor, next, start + 2, start + 10);
  }

  function prefixLines(prefix) {
    var editor = editorEl();
    if (!editor) return;
    var v = editor.value;
    var selStart = editor.selectionStart;
    var selEnd = editor.selectionEnd;
    var a = v.lastIndexOf("\n", selStart - 1) + 1;
    var b = v.indexOf("\n", selEnd);
    if (b === -1) b = v.length;
    var block = v.slice(a, b);
    var lines = block.split("\n");
    var nextBlock = lines.map(function (line) {
      return line.indexOf(prefix) === 0 ? line : prefix + line;
    }).join("\n");
    var next = v.slice(0, a) + nextBlock + v.slice(b);
    var shift = prefix.length;
    if (selStart === selEnd) {
      var already = lines[0].indexOf(prefix) === 0;
      var pos = selStart + (already ? 0 : shift);
      setEditorValue(editor, next, pos, pos);
    } else {
      setEditorValue(editor, next, a, a + nextBlock.length);
    }
  }

  function bindEditor() {
    var editor = editorEl();
    var bar = document.querySelector(".tpl-editor-toolbar");
    if (!editor || !bar || bar.getAttribute("data-bound") === "1") return;
    bar.setAttribute("data-bound", "1");
    hist = [];
    histIdx = -1;
    pushSnap(editor);
    updateCount();
    bar.addEventListener("mousedown", function (e) {
      if (e.target.closest(".tpl-ed-btn")) e.preventDefault();
    });
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".tpl-ed-btn");
      if (!btn || btn.disabled) return;
      var act = btn.getAttribute("data-ed");
      if (act === "undo") undoEdit();
      else if (act === "redo") redoEdit();
      else if (act === "variable") insertVariable();
      else if (act === "heading") prefixLines("## ");
      else if (act === "bullet") prefixLines("- ");
    });
    editor.addEventListener("input", function () {
      updateCount();
      if (applyingHist) return;
      clearTimeout(histTimer);
      histTimer = setTimeout(function () { pushSnap(editor); }, 400);
    });
    editor.addEventListener("keydown", function (e) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key !== "z" && e.key !== "Z") return;
      e.preventDefault();
      if (e.shiftKey) redoEdit();
      else undoEdit();
    });
    var reset = document.getElementById("tpl-prompt-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        commitPending(editor);
      }, true);
      reset.addEventListener("click", function () {
        pushSnap(editor);
        updateCount();
      });
    }
  }

  var panelTimer = null;
  function bindAnalyzePanel() {
    var editor = document.getElementById("tpl-prompt-editor");
    var reset = document.getElementById("tpl-prompt-reset");
    if (editor && editor.getAttribute("data-bound") !== "1") {
      editor.setAttribute("data-bound", "1");
      editor.addEventListener("input", function () {
        clearTimeout(panelTimer);
        panelTimer = setTimeout(renderPanel, 300);
        updateReset();
      });
    }
    if (reset && reset.getAttribute("data-bound") !== "1") {
      reset.setAttribute("data-bound", "1");
      reset.addEventListener("click", function () {
        if (editor) editor.value = getOriginalText();
        renderPanel();
      });
    }
    bindCopy();
    bindOpen();
    bindEditor();
    renderPanel();
    updateCount();
  }
  bindAnalyzePanel();

  root.PromptlyTemplates = {
    apply: apply,
    bindFilters: bindFilters,
    bindCopy: bindCopy,
    openInPromptly: openInPromptly,
    importURL: importURL,
    mountBadge: mountBadge,
    bindAnalyzePanel: bindAnalyzePanel,
    renderPanel: renderPanel,
    getPromptText: getPromptText
  };
})(window);
