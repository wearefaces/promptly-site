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

  var state = { user: null, items: {}, categories: DEFAULT_CATEGORIES.slice(), editing: null, unsub: null };

  function $(sel) { return document.querySelector(sel); }
  function show(sel, on) { var el = $(sel); if (el) el.hidden = !on; }
  function text(sel, value) { var el = $(sel); if (el) el.textContent = value; }

  function fmtDate(d) {
    if (!d || isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function isoNow() { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function newId() {
    if (root.crypto && crypto.randomUUID) return crypto.randomUUID().toLowerCase();
    return "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
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
  }

  function renderTrial(start) {
    if (!start) {
      text("[data-profile-trial]", "Starts when you first sign in to the Promptly app");
      return;
    }
    var end = new Date(start.getTime() + TRIAL_DAYS * 86400000);
    var verb = end.getTime() > Date.now() ? "ends " : "ended ";
    text("[data-profile-trial]", "Started " + fmtDate(start) + ", " + verb + fmtDate(end));
  }

  /* ---------- prompts ---------- */

  function liveItems() {
    return Object.keys(state.items).map(function (id) { return Object.assign({ id: id }, state.items[id]); })
      .filter(function (p) { return !p.deleted; })
      .sort(function (a, b) {
        return (a.position || 0) - (b.position || 0) || String(a.createdDate).localeCompare(String(b.createdDate));
      });
  }

  function renderList() {
    var list = $("[data-prompts-list]");
    var items = liveItems();
    list.replaceChildren();
    items.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "profile-item";
      var body = document.createElement("div");
      body.className = "profile-item-body";
      var h = document.createElement("h3");
      h.textContent = p.title || "Untitled";
      var t = document.createElement("p");
      t.textContent = p.text || "";
      var meta = document.createElement("div");
      meta.className = "profile-meta";
      [p.isFavorite ? "★ Favorite" : null, p.category || "General"].concat(p.tags || []).forEach(function (label) {
        if (!label) return;
        var s = document.createElement("span");
        s.className = "profile-tag";
        s.textContent = label;
        meta.appendChild(s);
      });
      body.append(h, t, meta);
      var actions = document.createElement("div");
      actions.className = "profile-item-actions";
      var edit = button("Edit", function () { openEditor(p.id); });
      var del = button("Delete", function () { removePrompt(p.id); });
      edit.setAttribute("aria-label", "Edit " + (p.title || "prompt"));
      del.setAttribute("aria-label", "Delete " + (p.title || "prompt"));
      actions.append(edit, del);
      li.append(body, actions);
      list.appendChild(li);
    });
    show("[data-prompts-empty]", items.length === 0);
  }

  function button(label, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-sm btn-ghost";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  function fillCategories(selected) {
    var sel = $("#prompt-category");
    var cats = state.categories.slice();
    if (selected && cats.indexOf(selected) < 0) cats.push(selected);
    sel.replaceChildren();
    cats.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c; o.textContent = c;
      if (c === (selected || "General")) o.selected = true;
      sel.appendChild(o);
    });
  }

  function openEditor(id) {
    var form = $("[data-prompt-editor]");
    var p = id ? state.items[id] : null;
    state.editing = id || null;
    text("[data-editor-title]", id ? "Edit prompt" : "New prompt");
    form.elements.title.value = p ? p.title : "";
    form.elements.text.value = p ? p.text : "";
    form.elements.isFavorite.checked = p ? !!p.isFavorite : false;
    fillCategories(p ? p.category : "General");
    form.hidden = false;
    form.elements.title.focus();
  }

  function closeEditor() {
    state.editing = null;
    $("[data-prompt-editor]").hidden = true;
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
    state.src.write(state.user.uid, id, tomb).catch(function () {
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
    closeEditor();
    show("[data-profile-loading]", false);
    show("[data-profile-signed-out]", !user);
    show("[data-profile-signed-in]", !!user);
    if (!user) return;
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

  function init() {
    $("[data-prompt-new]").addEventListener("click", function () { openEditor(null); });
    $("[data-editor-cancel]").addEventListener("click", closeEditor);
    $("[data-prompt-editor]").addEventListener("submit", savePrompt);
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
