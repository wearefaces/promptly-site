/* Client-rendered members template page: /template.html?id=<slug> */
(function (root) {
  "use strict";

  function qs(id) { return document.getElementById(id); }
  function param(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }
  function escapeHtml(s) {
    if (root.PromptlyQuality) return PromptlyQuality.escapeHtml(s);
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function highlight(prompt) {
    return escapeHtml(prompt).replace(/\[[A-Z][A-Z0-9_ ]*\]/g, function (m) {
      return '<span class="tpl-var">' + m + "</span>";
    });
  }

  function showGate() {
    qs("tpl-gate").hidden = false;
    qs("tpl-member-head").hidden = true;
    qs("tpl-member-body").hidden = true;
  }

  function render(t) {
    document.title = t.seoTitle || (t.title + " — Members template — Promptly");
    var desc = document.querySelector('meta[name="description"]');
    if (desc && t.seoDescription) desc.setAttribute("content", t.seoDescription);
    document.body.setAttribute("data-template-slug", t.slug);
    document.body.setAttribute("data-template-title", t.title);
    document.body.setAttribute("data-template-category", t.category || "");
    document.body.setAttribute("data-template-persona", t.persona || "");
    document.body.setAttribute("data-template-level", t.level || "");
    document.body.setAttribute("data-template-format", t.format || "");

    qs("tpl-gate").hidden = true;
    if (qs("tpl-gate-crumb")) qs("tpl-gate-crumb").hidden = true;
    qs("tpl-member-head").hidden = false;
    qs("tpl-member-body").hidden = false;
    qs("tpl-member-crumb").innerHTML = '<a href="templates.html">Templates</a> / ' + escapeHtml(t.category || "Members");
    qs("tpl-member-title").textContent = t.title;
    qs("tpl-member-desc").textContent = t.description || "";
    qs("tpl-member-meta").innerHTML =
      (t.category ? '<span class="tpl-tag tpl-tag-cat">' + escapeHtml(t.category) + "</span>" : "") +
      (t.persona ? '<span class="tpl-tag">' + escapeHtml(t.persona) + "</span>" : "") +
      (t.level ? '<span class="tpl-tag">' + escapeHtml(t.level) + "</span>" : "");
    var persona = qs("tpl-panel-persona");
    var level = qs("tpl-panel-level");
    var format = qs("tpl-panel-format");
    if (persona) persona.textContent = t.persona || "";
    if (level) level.textContent = t.level || "";
    if (format) format.textContent = t.format || "";
    var editor = qs("tpl-prompt-editor");
    var original = qs("tpl-prompt-original");
    if (editor) editor.value = t.prompt || "";
    if (original) original.value = t.prompt || "";

    if (root.PromptlyTemplates && PromptlyTemplates.bindAnalyzePanel) {
      PromptlyTemplates.bindAnalyzePanel();
    } else if (root.PromptlyTemplates && PromptlyTemplates.bindCopy) {
      PromptlyTemplates.bindCopy();
    }
    var open = qs("tpl-open-promptly");
    if (open && !open.getAttribute("data-bound")) {
      open.setAttribute("data-bound", "1");
      // click handled by templates.js bindOpen if it ran after the button existed.
      // Re-bind if templates.js ran first on an empty body slug.
    }
    if (root.PromptlyTemplates && open) {
      // templates.js bindOpen already attached if the button existed at load (it does).
    }
  }

  function tryLoad(slug) {
    if (!slug) { showGate(); return; }
    // Public templates have a static page.
    fetch("templates.json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : { templates: [] }; })
      .then(function (data) {
        var pub = (data.templates || []).some(function (t) { return t.slug === slug; });
        if (pub) {
          location.replace("templates/" + encodeURIComponent(slug) + ".html");
          return;
        }
        loadMember(slug);
      })
      .catch(function () { loadMember(slug); });
  }

  function loadMember(slug) {
    var preview = new URLSearchParams(location.search).get("previewAuth") === "1";
    function go() {
      if (!root.PromptlyMembers) { showGate(); return; }
      PromptlyMembers.fetchTemplate(slug).then(function (t) {
        if (t) render(t);
        else showGate();
      });
    }
    if (root.PromptlyAuth && PromptlyAuth.currentUser()) { go(); return; }
    if (preview) { go(); return; }
    showGate();
    if (root.PromptlyAuth) {
      PromptlyAuth.onChange(function (u) { if (u || preview) go(); });
    }
  }

  var slug = param("id") || param("slug");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { tryLoad(slug); });
  } else {
    tryLoad(slug);
  }
})(window);
