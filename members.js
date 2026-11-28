/* Load members-only templates. Public index has title + category only.
   Full documents come from Firestore (signed-in) or a localhost preview file. */
(function (root) {
  "use strict";

  var index = { categories: [], templates: [] };
  var fullBySlug = {};
  var signedIn = false;
  var prefix = document.documentElement.getAttribute("data-asset-prefix") || "";

  function isLocalHost() {
    var h = location.hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "::1";
  }

  function lockIcon() {
    return '<span class="tpl-lock-flag"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="7.5" width="9" height="6.5" rx="1.2"/><path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2"/></svg> Members</span>';
  }

  function lockedCard(item) {
    var search = (item.title + " " + item.category + " members").toLowerCase();
    var el = document.createElement("article");
    el.className = "tpl-card-wrap tpl-card-locked";
    el.setAttribute("data-tpl-card", "");
    el.setAttribute("data-category", item.category);
    el.setAttribute("data-search", search);
    el.setAttribute("data-member", "true");
    el.setAttribute("data-slug", item.slug);
    el.innerHTML =
      '<div class="tpl-card">' +
        "<h2>" + escapeHtml(item.title) + "</h2>" +
        '<p class="tpl-blur" aria-hidden="true">Sign in to read this template and copy the full prompt for your library.</p>' +
        '<div class="tpl-lock-row">' +
          '<div class="tpl-meta">' +
            '<span class="tpl-tag tpl-tag-cat">' + escapeHtml(item.category) + "</span>" +
            lockIcon() +
          "</div>" +
          '<button type="button" class="btn btn-sm" data-auth-open>Sign in to unlock</button>' +
        "</div>" +
      "</div>";
    return el;
  }

  function fullCard(item) {
    var search = [
      item.title, item.description || "", item.category,
      item.persona || "", item.level || "", item.format || ""
    ].join(" ").toLowerCase();
    var href = "/template?id=" + encodeURIComponent(item.slug);
    var el = document.createElement("article");
    el.className = "tpl-card-wrap";
    el.setAttribute("data-tpl-card", "");
    el.setAttribute("data-category", item.category);
    el.setAttribute("data-search", search);
    el.setAttribute("data-member", "true");
    el.setAttribute("data-slug", item.slug);
    el.innerHTML =
      '<a class="tpl-card" href="' + href + '">' +
        "<h2>" + escapeHtml(item.title) + "</h2>" +
        "<p>" + escapeHtml(item.description || "") + "</p>" +
        '<div class="tpl-lock-row">' +
          '<div class="tpl-meta">' +
            '<span class="tpl-tag tpl-tag-cat">' + escapeHtml(item.category) + "</span>" +
            (item.persona ? '<span class="tpl-tag">' + escapeHtml(item.persona) + "</span>" : "") +
            (item.level ? '<span class="tpl-tag">' + escapeHtml(item.level) + "</span>" : "") +
          "</div>" +
          lockIcon() +
        "</div>" +
      "</a>";
    return el;
  }

  function escapeHtml(s) {
    if (root.PromptlyQuality && PromptlyQuality.escapeHtml) return PromptlyQuality.escapeHtml(s);
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function addCategoryChips(categories) {
    var group = document.querySelector(".tpl-filters");
    if (!group) return;
    var existing = {};
    group.querySelectorAll("[data-tpl-filter]").forEach(function (btn) {
      existing[btn.getAttribute("data-tpl-filter")] = true;
    });
    categories.forEach(function (cat) {
      if (existing[cat]) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tpl-chip";
      btn.setAttribute("data-tpl-filter", cat);
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = cat;
      group.appendChild(btn);
      existing[cat] = true;
    });
    if (root.PromptlyTemplates && PromptlyTemplates.bindFilters) {
      PromptlyTemplates.bindFilters();
    }
  }

  function renderList() {
    var grid = document.getElementById("tpl-grid");
    if (!grid) return;
    grid.querySelectorAll('[data-member="true"]').forEach(function (el) { el.remove(); });
    var heading = document.getElementById("tpl-members-kicker");
    if (!heading) {
      heading = document.createElement("h2");
      heading.id = "tpl-members-kicker";
      heading.className = "tpl-members-kicker";
      heading.textContent = "Members library";
      grid.parentNode.insertBefore(heading, grid.nextSibling);
    }
    var mount = document.getElementById("tpl-members-grid");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "tpl-members-grid";
      mount.className = "tpl-grid";
      heading.after(mount);
    }
    mount.innerHTML = "";
    index.templates.forEach(function (item) {
      var full = fullBySlug[item.slug];
      mount.appendChild(signedIn && full ? fullCard(full) : lockedCard(item));
    });
    if (root.PromptlyTemplates && PromptlyTemplates.apply) PromptlyTemplates.apply();
  }

  function loadIndex() {
    return fetch(prefix + "members-index.json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : { categories: [], templates: [] }; })
      .then(function (data) {
        index = data || { categories: [], templates: [] };
        addCategoryChips(index.categories || []);
        renderList();
      })
      .catch(function () { renderList(); });
  }

  function ingestFull(list) {
    fullBySlug = {};
    (list || []).forEach(function (t) { if (t && t.slug) fullBySlug[t.slug] = t; });
  }

  function loadPreviewFull() {
    if (!isLocalHost()) return Promise.resolve(false);
    if (new URLSearchParams(location.search).get("previewAuth") !== "1") {
      return Promise.resolve(false);
    }
    return fetch("/preview/member-templates.json", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return false;
        ingestFull(data.templates || data);
        signedIn = true;
        if (root.PromptlyAuth && typeof PromptlyAuth.currentUser === "function" && !PromptlyAuth.currentUser()) {
          // Preview flag only; do not pretend Firebase has a user.
        }
        return true;
      })
      .catch(function () { return false; });
  }

  function loadFirestoreFull() {
    if (!root.firebase || !firebase.apps || !firebase.apps.length) {
      return Promise.resolve(false);
    }
    return firebase.firestore().collection("memberTemplates").get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          d.slug = d.slug || doc.id;
          list.push(d);
        });
        ingestFull(list);
        return true;
      })
      .catch(function (err) {
        console.warn("memberTemplates:", err && err.message);
        return false;
      });
  }

  function onAuth(u) {
    signedIn = !!u;
    var chain = u ? loadFirestoreFull() : Promise.resolve(false);
    chain.then(function (ok) {
      if (!ok && isLocalHost()) return loadPreviewFull();
    }).then(function () { renderList(); });
  }

  function getTemplate(slug) {
    return fullBySlug[slug] || null;
  }

  function fetchTemplate(slug) {
    if (fullBySlug[slug]) return Promise.resolve(fullBySlug[slug]);
    if (root.firebase && firebase.apps && firebase.apps.length && root.PromptlyAuth && PromptlyAuth.currentUser()) {
      return firebase.firestore().collection("memberTemplates").doc(slug).get()
        .then(function (doc) {
          if (!doc.exists) return null;
          var d = doc.data() || {};
          d.slug = d.slug || doc.id;
          fullBySlug[slug] = d;
          return d;
        });
    }
    return loadPreviewFull().then(function () { return fullBySlug[slug] || null; });
  }

  root.PromptlyMembers = {
    loadIndex: loadIndex,
    fetchTemplate: fetchTemplate,
    getTemplate: getTemplate,
    index: function () { return index; }
  };

  function start() {
    loadIndex().then(function () {
      if (isLocalHost() && new URLSearchParams(location.search).get("previewAuth") === "1") {
        loadPreviewFull().then(function (ok) {
          if (ok) renderList();
        });
      }
    });
    if (root.PromptlyAuth) PromptlyAuth.onChange(onAuth);
    else root.addEventListener("promptly-auth", function (e) { onAuth(e.detail && e.detail.user); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(window);
