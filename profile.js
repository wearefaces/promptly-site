/* Profile page: account details and "My prompts" from Firestore users/{uid}/prompts.
   Same sync protocol as the apps (see PLAN.md in the sync plan): client updatedAt (ms) for
   last-write-wins, serverUpdatedAt = server time, soft deletes (deleted: true, empty title/text). */
(function (root) {
  "use strict";

  var DEVICE_ID = "web";
  var TRIAL_DAYS = 14; // LicensePolicy.trialDays in the apps
  var DEFAULT_CATEGORIES = ["General", "💼 Work", "👤 Personal", "💻 Code", "✍️ Writing", "🔍 Research",
    "🎨 Creative", "📊 Analysis", "🎓 Education", "🏥 Health", "💰 Finance", "🎯 Marketing"];
  var PROVIDERS = { "google.com": "Google", "apple.com": "Apple", "password": "Email and password" };

  var ICONS = {
    prompts: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.2 3.5h9.6A1.3 1.3 0 0 1 14.1 4.8v5.2a1.3 1.3 0 0 1-1.3 1.3H7.2L3.2 13.8V4.8A1.3 1.3 0 0 1 4.5 3.5z"/></svg>',
    all: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 5.5h11v6.2a1.3 1.3 0 0 1-1.3 1.3h-8.4a1.3 1.3 0 0 1-1.3-1.3V5.5z"/><path d="M2.5 5.5 5 3h6l2.5 2.5"/></svg>',
    writing: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.2"/><path d="M6.2 9.7 9.8 6.1l1 1-3.6 3.6H6.2z"/></svg>',
    code: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 5-2.5 3L5 11M11 5l2.5 3L11 11"/></svg>',
    work: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.4" y="5.8" width="11.2" height="6.8" rx="1"/><path d="M6 5.8V4.6A1 1 0 0 1 7 3.6h2A1 1 0 0 1 10 4.6v1.2M2.4 8.6h11.2"/></svg>',
    general: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.8 7.2 8 3.4l5.2 3.8V13a.8.8 0 0 1-.8.8H3.6a.8.8 0 0 1-.8-.8z"/></svg>',
    personal: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="6" r="2.2"/><path d="M3.8 13c.6-2.2 2.1-3.3 4.2-3.3s3.6 1.1 4.2 3.3"/></svg>',
    research: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.2"/><path d="m10.4 10.4 3 3"/></svg>',
    star: '<svg class="profile-star" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 2.15 9.62 5.5l3.68.54-2.66 2.6.63 3.66L8 10.57 4.73 12.3l.63-3.66-2.66-2.6 3.68-.54L8 2.15z"/></svg>'
  };

  var state = {
    user: null, items: {}, categories: DEFAULT_CATEGORIES.slice(), editing: null, unsub: null,
    view: "prompts", category: "", sort: "recent", query: ""
  };

  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function show(sel, on) { var el = $(sel); if (el) el.hidden = !on; }
  function text(sel, value) { var el = $(sel); if (el) el.textContent = value; }
  function icon(name) {
    var t = document.createElement("template");
    t.innerHTML = (ICONS[name] || ICONS.general).trim();
    return t.content.firstChild;
  }

  function fmtDate(d) {
    if (!d || isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function isoNow() { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function newId() {
    if (root.crypto && crypto.randomUUID) return crypto.randomUUID().toLowerCase();
    return "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function categoryLabel(raw) {
    return String(raw || "General").replace(/^[^\w#&]+/u, "").trim() || "General";
  }
  function categoryKey(raw) { return categoryLabel(raw).toLowerCase(); }
  function categoryIcon(raw) {
    var key = categoryKey(raw);
    return icon(ICONS[key] ? key : "general");
  }

  /* ---------- data source: Firestore, or a mock injected only by the preview screenshot script ---------- */

  function source() {
    var mock = root.PROMPTLY_PROFILE_MOCK;
    if (mock) return mockSource(mock);
    var db = firebase.firestore();
    return {
      trial: function (uid) {
        return db.doc("users/" + uid).get().then(function (snap) {
          var t = snap.exists && snap.get("trialStartedAt");
          return t && t.toDate ? t.toDate() : null;
        });
      },
      categories: function (uid) {
        return db.doc("users/" + uid + "/settings/library").get().then(function (snap) {
          var c = snap.exists && snap.get("categories");
          return Array.isArray(c) && c.length ? c : null;
        }).catch(function () { return null; });
      },
      watch: function (uid, onItems, onError) {
        return db.collection("users/" + uid + "/prompts").onSnapshot(function (qs) {
          var items = {};
          qs.forEach(function (d) { items[d.id] = d.data(); });
          onItems(items);
        }, onError);
      },
      write: function (uid, id, data) {
        var payload = Object.assign({}, data, { serverUpdatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        return db.doc("users/" + uid + "/prompts/" + id).set(payload);
      }
    };
  }

  function mockSource(mock) {
    var items = JSON.parse(JSON.stringify(mock.prompts || {}));
    var cb = null;
    return {
      trial: function () { return Promise.resolve(mock.trialStartedAt ? new Date(mock.trialStartedAt) : null); },
      categories: function () { return Promise.resolve(mock.categories || null); },
      watch: function (uid, onItems) { cb = onItems; onItems(items); return function () {}; },
      write: function (uid, id, data) { items[id] = data; if (cb) cb(items); return Promise.resolve(); }
    };
  }

  /* ---------- account ---------- */

  function renderAccount(user) {
    var name = user.displayName || (user.email || "").split("@")[0] || "Your account";
    text("[data-profile-name]", name);
    text("[data-profile-email]", user.email || "");
    var pid = (user.providerData && user.providerData[0] && user.providerData[0].providerId) || "password";
    text("[data-profile-provider]", PROVIDERS[pid] || pid);
    var created = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
    text("[data-profile-created]", fmtDate(created));
    var av = $("[data-profile-avatar]");
    av.replaceChildren();
    if (user.photoURL) {
      var img = document.createElement("img");
      img.src = user.photoURL; img.alt = "";
      av.appendChild(img);
    } else {
      av.textContent = (name.trim().charAt(0) || "?").toUpperCase();
    }
    text("[data-profile-trial]", "…");
    var badge = $("[data-profile-trial-badge]");
    if (badge) { badge.hidden = true; badge.textContent = ""; }
  }

  function renderTrial(start) {
    var badge = $("[data-profile-trial-badge]");
    if (!start) {
      text("[data-profile-trial]", "Starts when you first sign in to the Promptly app");
      if (badge) badge.hidden = true;
      return;
    }
    var end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
    var remaining = Math.ceil((end.getTime() - Date.now()) / 86400000);
    var verb = remaining > 0 ? "ends " : "ended ";
    text("[data-profile-trial]", "Started " + fmtDate(start) + ", " + verb + fmtDate(end));
    if (badge) {
      badge.hidden = false;
      badge.textContent = remaining > 0 ? ("Trial · " + remaining + "d") : "Trial ended";
    }
  }

  /* ---------- prompts ---------- */

  function allLive() {
    return Object.keys(state.items).map(function (id) { return Object.assign({ id: id }, state.items[id]); })
      .filter(function (p) { return !p.deleted; });
  }

  function recency(p) {
    var used = p.lastUsed && String(p.lastUsed) !== "0001-01-01T00:00:00" ? Date.parse(p.lastUsed) : 0;
    var created = p.createdDate ? Date.parse(p.createdDate) : 0;
    return Math.max(p.updatedAt || 0, used || 0, created || 0);
  }

  function visibleItems() {
    var q = (state.query || "").trim().toLowerCase();
    var items = allLive().filter(function (p) {
      if (state.view === "favorites" && !p.isFavorite) return false;
      if (state.category && categoryKey(p.category) !== categoryKey(state.category)) return false;
      if (q) {
        var hay = ((p.title || "") + " " + (p.text || "") + " " + categoryLabel(p.category)).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    items.sort(function (a, b) {
      if (state.sort === "az") return String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" });
      if (state.sort === "used") return (b.useCount || 0) - (a.useCount || 0) || String(a.title || "").localeCompare(String(b.title || ""));
      return recency(b) - recency(a) || (a.position || 0) - (b.position || 0);
    });
    return items;
  }

  function itemWord(n) { return n + (n === 1 ? " item" : " items"); }

  function renderSidebarCounts() {
    var live = allLive();
    text("[data-count-prompts]", String(live.length));
    text("[data-count-favorites]", String(live.filter(function (p) { return p.isFavorite; }).length));
    var title = state.view === "favorites" ? "Favorites" : "Prompts";
    text("[data-view-title]", title);
    var heading = $("#profile-prompts-title");
    if (heading) heading.textContent = title;

    var counts = {};
    live.forEach(function (p) {
      var label = categoryLabel(p.category);
      counts[label] = (counts[label] || 0) + 1;
    });
    var list = $("[data-profile-categories]");
    if (!list) return;
    var labels = Object.keys(counts).sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base" }); });
    list.replaceChildren();
    function addCat(value, label, count, iconName) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "profile-cat" + (state.category === value ? " is-active" : "");
      b.appendChild(icon(iconName));
      var name = document.createElement("span");
      name.className = "profile-cat-name";
      name.textContent = label;
      var n = document.createElement("span");
      n.className = "profile-cat-count";
      n.textContent = String(count);
      b.append(name, n);
      b.addEventListener("click", function () {
        state.category = value;
        renderList();
      });
      li.appendChild(b);
      list.appendChild(li);
    }
    addCat("", "All", live.length, "all");
    labels.forEach(function (label) {
      addCat(label, label, counts[label], ICONS[label.toLowerCase()] ? label.toLowerCase() : "general");
    });
  }

  function renderList() {
    renderSidebarCounts();
    var list = $("[data-prompts-list]");
    var items = visibleItems();
    list.replaceChildren();
    items.forEach(function (p) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "profile-item";
      btn.setAttribute("aria-label", "Edit " + (p.title || "prompt"));
      var body = document.createElement("div");
      body.className = "profile-item-body";
      var h = document.createElement("h3");
      h.className = "profile-item-title";
      var title = document.createElement("span");
      title.textContent = p.title || "Untitled";
      var meta = document.createElement("span");
      meta.className = "profile-item-meta";
      meta.appendChild(categoryIcon(p.category));
      var cat = document.createElement("span");
      cat.textContent = categoryLabel(p.category);
      meta.appendChild(cat);
      if (typeof p.useCount === "number" && p.useCount > 0) {
        var used = document.createElement("span");
        used.textContent = "· " + p.useCount + "x used";
        meta.appendChild(used);
      }
      h.append(title, meta);
      var t = document.createElement("p");
      t.textContent = p.text || "";
      body.append(h, t);
      btn.appendChild(body);
      if (p.isFavorite) btn.appendChild(icon("star"));
      btn.addEventListener("click", function () { openEditor(p.id); });
      li.appendChild(btn);
      list.appendChild(li);
    });
    text("[data-count-items]", itemWord(items.length));
    show("[data-prompts-empty]", items.length === 0);
    list.hidden = items.length === 0;
  }

  function fillCategories(selected) {
    var sel = $("#prompt-category");
    var cats = state.categories.slice();
    if (selected && cats.indexOf(selected) < 0) cats.push(selected);
    sel.replaceChildren();
    cats.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = categoryLabel(c);
      if (c === (selected || "General")) o.selected = true;
      sel.appendChild(o);
    });
  }

  function openEditor(id) {
    var form = $("[data-prompt-editor]");
    var p = id ? state.items[id] : null;
    state.editing = id || null;
    text("[data-editor-title]", id ? "Edit" : "New");
    var save = $("[data-editor-save]");
    if (save) save.textContent = id ? "Save" : "Add prompt";
    var del = $("[data-editor-delete]");
    if (del) del.hidden = !id;
    form.elements.title.value = p ? p.title : "";
    form.elements.text.value = p ? p.text : "";
    form.elements.isFavorite.checked = p ? !!p.isFavorite : false;
    fillCategories(p ? p.category : "General");
    form.hidden = false;
    form.elements.title.focus();
  }

  function closeEditor() {
    state.editing = null;
    var form = $("[data-prompt-editor]");
    if (form) form.hidden = true;
  }

  // updatedAt never goes backwards for a document (rules enforce it), even with a skewed clock.
  function nextUpdatedAt(existing) {
    return Math.max(Date.now(), existing && existing.updatedAt ? existing.updatedAt + 1 : 0);
  }

  function nextPosition() {
    var max = -1;
    Object.keys(state.items).forEach(function (k) {
      var p = state.items[k].position;
      if (typeof p === "number" && p > max) max = p;
    });
    return max + 1;
  }

  function savePrompt(e) {
    e.preventDefault();
    var form = e.target;
    var id = state.editing || newId();
    var existing = state.editing ? state.items[id] : null;
    var data = Object.assign({
      tags: [], createdDate: isoNow(), lastUsed: "0001-01-01T00:00:00", useCount: 0, position: nextPosition()
    }, existing || {}, {
      title: form.elements.title.value.trim(),
      text: form.elements.text.value,
      category: form.elements.category.value || "General",
      isFavorite: form.elements.isFavorite.checked,
      deleted: false,
      updatedAt: nextUpdatedAt(existing),
      deviceId: DEVICE_ID,
      schema: 1
    });
    delete data.id;
    delete data.serverUpdatedAt;
    showError("");
    state.src.write(state.user.uid, id, data).then(closeEditor).catch(function () {
      showError("That prompt couldn’t be saved. Try again.");
    });
  }

  function removePrompt(id) {
    var p = state.items[id];
    if (!p || !root.confirm("Delete “" + (p.title || "this prompt") + "”? It’s removed from the Promptly app too when sync is on.")) return;
    var tomb = Object.assign({}, p, {
      title: "", text: "", tags: [], deleted: true, updatedAt: nextUpdatedAt(p), deviceId: DEVICE_ID, schema: 1
    });
    delete tomb.serverUpdatedAt;
    showError("");
    state.src.write(state.user.uid, id, tomb).then(closeEditor).catch(function () {
      showError("That prompt couldn’t be deleted. Try again.");
    });
  }

  function showError(msg) {
    var el = $("[data-prompts-error]");
    el.textContent = msg;
    el.hidden = !msg;
  }

  /* ---------- wiring ---------- */

  function onUser(user) {
    if (state.unsub) { state.unsub(); state.unsub = null; }
    state.user = user;
    state.items = {};
    state.view = "prompts";
    state.category = "";
    state.sort = "recent";
    state.query = "";
    closeEditor();
    show("[data-profile-loading]", false);
    show("[data-profile-signed-out]", !user);
    show("[data-profile-signed-in]", !!user);
    if (!user) return;
    var search = $("[data-profile-search]");
    if (search) search.value = "";
    syncChrome();
    renderAccount(user);
    state.src = source();
    state.src.trial(user.uid).then(renderTrial).catch(function () { text("[data-profile-trial]", "—"); });
    state.src.categories(user.uid).then(function (c) { if (c) state.categories = c; });
    renderList();
    state.unsub = state.src.watch(user.uid, function (items) {
      state.items = items;
      showError("");
      renderList();
    }, function () {
      showError("Your prompts couldn’t be loaded right now. Try again later.");
    });
  }

  function syncChrome() {
    $all("[data-view]").forEach(function (el) {
      var on = el.getAttribute("data-view") === state.view;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    $all("[data-sort]").forEach(function (el) {
      var on = el.getAttribute("data-sort") === state.sort;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function init() {
    $("[data-prompt-new]").addEventListener("click", function () { openEditor(null); });
    $all("[data-editor-cancel]").forEach(function (el) {
      el.addEventListener("click", closeEditor);
    });
    var del = $("[data-editor-delete]");
    if (del) del.addEventListener("click", function () { if (state.editing) removePrompt(state.editing); });
    $("[data-prompt-editor]").addEventListener("submit", savePrompt);
    $all("[data-view]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.view = el.getAttribute("data-view");
        syncChrome();
        renderList();
      });
    });
    $all("[data-sort]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.sort = el.getAttribute("data-sort");
        syncChrome();
        renderList();
      });
    });
    var search = $("[data-profile-search]");
    if (search) {
      search.addEventListener("input", function () {
        state.query = search.value;
        renderList();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeEditor();
    });
    if (root.PROMPTLY_PROFILE_MOCK) return onUser(root.PROMPTLY_PROFILE_MOCK.user);
    if (!root.PromptlyAuth) {
      show("[data-profile-loading]", false);
      show("[data-profile-signed-out]", true);
      return;
    }
    root.PromptlyAuth.onChange(onUser);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
