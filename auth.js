/* Firebase Auth for templates: Google + email/password (matches the Promptly app, minus Sign in with Apple). */
(function (root) {
  "use strict";

  var listeners = [];
  var user = null;
  var ready = false;
  var initError = null;

  function $(id) { return document.getElementById(id); }

  function ensureModal() {
    if ($("auth-modal")) return;
    var wrap = document.createElement("div");
    wrap.id = "auth-modal";
    wrap.className = "auth-modal";
    wrap.hidden = true;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "auth-title");
    wrap.innerHTML =
      '<div class="auth-modal-backdrop" data-auth-close="true"></div>' +
      '<div class="auth-dialog">' +
        '<button type="button" class="auth-close" data-auth-close="true" aria-label="Close">×</button>' +
        '<h2 id="auth-title">Sign in to unlock</h2>' +
        '<p class="lede">Use the same Google or email sign-in as Promptly. Members templates stay in your account.</p>' +
        '<p class="auth-error" id="auth-error" hidden></p>' +
        '<button type="button" class="btn" id="auth-google">Continue with Google</button>' +
        '<form id="auth-form" class="auth-actions" style="margin-top:16px">' +
          '<label for="auth-email">Email</label>' +
          '<input id="auth-email" type="email" name="email" autocomplete="email" required>' +
          '<label for="auth-password">Password</label>' +
          '<input id="auth-password" type="password" name="password" autocomplete="current-password" required minlength="6">' +
          '<button type="submit" class="btn" id="auth-signin">Sign in</button>' +
          '<button type="button" class="btn btn-ghost" id="auth-signup">Create account</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute("data-auth-close")) closeModal();
    });
    $("auth-google").addEventListener("click", signInGoogle);
    $("auth-form").addEventListener("submit", function (e) {
      e.preventDefault();
      signInEmail(false);
    });
    $("auth-signup").addEventListener("click", function () { signInEmail(true); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("auth-modal").hidden) closeModal();
    });
  }

  function showError(msg) {
    var el = $("auth-error");
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = msg;
  }

  function friendlyError(err) {
    var code = (err && err.code) || "";
    if (code === "auth/unauthorized-domain") {
      return "This domain is not yet authorised in Firebase Auth. Add wearefaces.github.io (and localhost for previews) in the promptly-bfad6 console.";
    }
    if (code === "auth/operation-not-allowed") {
      return "This sign-in method is not enabled yet in the promptly-bfad6 Auth console.";
    }
    if (code === "auth/popup-blocked") return "The sign-in popup was blocked. Allow popups, or try again.";
    if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found") {
      return "That email or password did not match.";
    }
    if (code === "auth/email-already-in-use") return "An account with this email already exists. Try signing in.";
    if (code === "auth/weak-password") return "Use a password of at least 6 characters.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    return (err && err.message) || "Sign-in failed.";
  }

  function openModal() {
    ensureModal();
    showError(initError);
    $("auth-modal").hidden = false;
    var email = $("auth-email");
    if (email) email.focus();
  }

  function closeModal() {
    var modal = $("auth-modal");
    if (modal) modal.hidden = true;
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(user); } catch (e) {}
    });
    root.dispatchEvent(new CustomEvent("promptly-auth", { detail: { user: user } }));
    document.querySelectorAll("[data-auth-open]").forEach(function (btn) {
      btn.hidden = !!user;
    });
    document.querySelectorAll("[data-auth-signed-in]").forEach(function (el) {
      el.hidden = !user;
    });
    document.querySelectorAll("[data-auth-email]").forEach(function (el) {
      el.textContent = user && (user.email || user.displayName || "Signed in");
    });
  }

  function app() {
    if (!root.firebase || !root.PROMPTLY_FIREBASE) return null;
    if (firebase.apps && firebase.apps.length) return firebase.app();
    return firebase.initializeApp(root.PROMPTLY_FIREBASE);
  }

  function signInGoogle() {
    showError("");
    try {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider).then(function () {
        closeModal();
      }).catch(function (err) {
        if (err && err.code === "auth/popup-blocked") {
          return firebase.auth().signInWithRedirect(provider);
        }
        showError(friendlyError(err));
      });
    } catch (err) {
      showError(friendlyError(err));
    }
  }

  function signInEmail(isSignUp) {
    showError("");
    var email = $("auth-email") && $("auth-email").value;
    var password = $("auth-password") && $("auth-password").value;
    var p = isSignUp
      ? firebase.auth().createUserWithEmailAndPassword(email, password)
      : firebase.auth().signInWithEmailAndPassword(email, password);
    p.then(function () { closeModal(); }).catch(function (err) {
      showError(friendlyError(err));
    });
  }

  function signOut() {
    if (!root.firebase) return;
    firebase.auth().signOut();
  }

  function init() {
    ensureModal();
    document.addEventListener("click", function (e) {
      var open = e.target.closest && e.target.closest("[data-auth-open]");
      if (open) { e.preventDefault(); openModal(); }
      var out = e.target.closest && e.target.closest("[data-auth-signout]");
      if (out) { e.preventDefault(); signOut(); }
    });
    if (!root.firebase || !root.PROMPTLY_FIREBASE) {
      initError = "Sign-in is not configured in this build.";
      ready = true;
      emit();
      return;
    }
    try {
      app();
      firebase.auth().onAuthStateChanged(function (u) {
        user = u || null;
        ready = true;
        emit();
      });
    } catch (err) {
      initError = friendlyError(err);
      ready = true;
      emit();
    }
  }

  root.PromptlyAuth = {
    init: init,
    open: openModal,
    close: closeModal,
    signOut: signOut,
    onChange: function (fn) { listeners.push(fn); if (ready) fn(user); },
    currentUser: function () { return user; },
    isReady: function () { return ready; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
