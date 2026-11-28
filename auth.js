/* Firebase Auth for the site and templates: Google, Apple, and email/password
   (the same account as the Promptly app). The site never writes trialStartedAt. */
(function (root) {
  "use strict";

  var listeners = [];
  var user = null;
  var ready = false;
  var initError = null;
  var authMode = "signin";

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
        '<h2 id="auth-title">Sign in</h2>' +
        '<p class="lede" id="auth-lede">Use the same Google, Apple, or email sign-in as the Promptly app.</p>' +
        '<p class="auth-error" id="auth-error" hidden></p>' +
        '<div class="auth-providers">' +
        '<button type="button" class="btn" id="auth-google">Continue with Google</button>' +
        '<button type="button" class="btn btn-apple" id="auth-apple"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16.365 12.86c-.02-2.14 1.75-3.17 1.83-3.22-1-1.46-2.56-1.66-3.11-1.68-1.32-.13-2.58.78-3.25.78-.67 0-1.7-.76-2.8-.74-1.44.02-2.77.84-3.51 2.13-1.5 2.6-.38 6.45 1.08 8.56.71 1.03 1.56 2.19 2.67 2.15 1.07-.04 1.47-.69 2.76-.69 1.29 0 1.65.69 2.78.67 1.15-.02 1.88-1.05 2.58-2.09.81-1.18 1.15-2.33 1.17-2.39-.03-.01-2.24-.86-2.26-3.41zm-2.12-6.26c.59-.71.98-1.7.87-2.69-.84.03-1.86.56-2.46 1.27-.54.63-1.01 1.64-.88 2.61.93.07 1.89-.47 2.47-1.19z"/></svg>Continue with Apple</button>' +
        '</div>' +
        '<form id="auth-form" class="auth-actions" style="margin-top:16px">' +
          '<label for="auth-email">Email</label>' +
          '<input id="auth-email" type="email" name="email" autocomplete="email" required>' +
          '<label for="auth-password">Password</label>' +
          '<input id="auth-password" type="password" name="password" autocomplete="current-password" required minlength="6">' +
          '<button type="submit" class="btn" id="auth-submit">Sign in</button>' +
        '</form>' +
        '<p class="auth-forgot-wrap" id="auth-forgot-wrap"><button type="button" id="auth-forgot" class="auth-switch-btn">Forgot password?</button></p>' +
        '<p class="auth-switch" id="auth-switch-wrap">No account? <button type="button" id="auth-switch" class="auth-switch-btn">Create account</button></p>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) {
      if (e.target && e.target.getAttribute("data-auth-close")) closeModal();
    });
    $("auth-google").addEventListener("click", signInGoogle);
    $("auth-apple").addEventListener("click", signInApple);
    $("auth-form").addEventListener("submit", function (e) {
      e.preventDefault();
      signInEmail(authMode === "signup");
    });
    $("auth-switch").addEventListener("click", function () {
      setMode(authMode === "signup" ? "signin" : "signup");
    });
    $("auth-forgot").addEventListener("click", sendPasswordReset);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !$("auth-modal").hidden) closeModal();
    });
    setMode(authMode);
  }

  function setMode(mode) {
    authMode = mode === "signup" ? "signup" : "signin";
    var isSignup = authMode === "signup";
    var title = $("auth-title");
    var lede = $("auth-lede");
    var submit = $("auth-submit");
    var sw = $("auth-switch");
    var wrap = $("auth-switch-wrap");
    var password = $("auth-password");
    if (title) title.textContent = isSignup ? "Create account" : "Sign in";
    if (lede) {
      lede.textContent = isSignup
        ? "Use Google, Apple, or email. This is the same account you'll use in the Promptly app. The free trial starts when you first sign in to the app."
        : "Use the same Google, Apple, or email sign-in as the Promptly app.";
    }
    if (submit) submit.textContent = isSignup ? "Create account" : "Sign in";
    if (sw) sw.textContent = isSignup ? "Sign in" : "Create account";
    if (wrap) {
      wrap.firstChild.textContent = isSignup ? "Already have an account? " : "No account? ";
    }
    if (password) password.setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
    var forgotWrap = $("auth-forgot-wrap");
    if (forgotWrap) forgotWrap.hidden = isSignup;
    showError("");
  }

  function showError(msg, tone) {
    var el = $("auth-error");
    if (!el) return;
    el.classList.remove("auth-ok");
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    if (tone === "ok") el.classList.add("auth-ok");
    el.textContent = msg;
  }

  function friendlyError(err) {
    var code = (err && err.code) || "";
    if (code === "auth/unauthorized-domain") {
      return "This domain is not yet authorised in Firebase Auth. Add getpromptly.io (and localhost for previews) in the promptly-bfad6 console.";
    }
    if (code === "auth/operation-not-allowed") {
      return "This sign-in method is not enabled yet in the promptly-bfad6 Auth console.";
    }
    if (code === "auth/popup-blocked") return "The sign-in popup was blocked. Allow popups, or try again.";
    if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled.";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/user-not-found") {
      return "That email or password did not match. If you signed up with Google or Apple, use that button instead.";
    }
    if (code === "auth/email-already-in-use") return "An account with this email already exists. Try signing in.";
    if (code === "auth/weak-password") return "Use a password of at least 6 characters.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    return (err && err.message) || "Sign-in failed.";
  }

  function openModal(mode) {
    ensureModal();
    rememberProfileReturn();
    setMode(mode === "signup" ? "signup" : "signin");
    showError(initError);
    $("auth-modal").hidden = false;
    var email = $("auth-email");
    if (email) email.focus();
  }

  function closeModal() {
    var modal = $("auth-modal");
    if (modal) modal.hidden = true;
  }

  function firstLetter(u) {
    var s = ((u && (u.displayName || u.email)) || "?").trim();
    return (s.charAt(0) || "?").toUpperCase();
  }

  function profileHref() {
    return "/profile";
  }

  function isProfilePage() {
    var path = ((location.pathname || "").split("/").pop() || "");
    return path === "profile.html" || path === "profile";
  }

  function rememberProfileReturn() {
    if (!isProfilePage()) return;
    try { sessionStorage.setItem("promptly-auth-return", "/profile"); } catch (e) {}
  }

  function maybeRedirectToProfile() {
    if (!user) return;
    var ret = null;
    try { ret = sessionStorage.getItem("promptly-auth-return"); } catch (e) {}
    if (ret !== "/profile" && ret !== "profile.html") return;
    try { sessionStorage.removeItem("promptly-auth-return"); } catch (e) {}
    if (!isProfilePage()) location.assign(profileHref());
  }

  var profileSignInOpened = false;
  function maybePromptProfileSignIn() {
    if (user || !isProfilePage()) return;
    rememberProfileReturn();
    var modal = $("auth-modal");
    if (modal && !modal.hidden) return;
    if (profileSignInOpened) return;
    profileSignInOpened = true;
    openModal("signin");
  }

  // The header avatar opens the profile page (profile.html). Header markup stays a <span> in every page;
  // it is swapped for a link here so the static pages don't all need editing.
  function linkAvatars() {
    document.querySelectorAll("span[data-auth-avatar]").forEach(function (el) {
      var a = document.createElement("a");
      a.href = profileHref();
      a.className = el.className;
      a.setAttribute("data-auth-avatar", "");
      a.setAttribute("aria-label", "Your profile");
      a.title = "Your profile";
      el.replaceWith(a);
    });
  }

  // There is no account menu in the static header. Build a minimal one here (Profile + Sign out)
  // in the existing header style, so every page gets it without markup changes.
  function ensureAccountMenu() {
    var href = profileHref();
    document.querySelectorAll(".header-account[data-auth-signed-in]").forEach(function (account) {
      if (account.querySelector(".header-account-menu")) return;
      var signout = account.querySelector("[data-auth-signout]");
      if (!signout) return;
      var email = account.querySelector("[data-auth-email]");
      var menu = document.createElement("details");
      menu.className = "header-account-menu";
      var summary = document.createElement("summary");
      summary.setAttribute("aria-label", "Account menu");
      if (email) summary.appendChild(email);
      var chev = document.createElement("span");
      chev.className = "header-account-chevron";
      chev.setAttribute("aria-hidden", "true");
      chev.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8 9.5 4.5"/></svg>';
      summary.appendChild(chev);
      var panel = document.createElement("div");
      panel.className = "header-account-panel";
      panel.setAttribute("role", "menu");
      var profile = document.createElement("a");
      profile.href = href;
      profile.textContent = "Profile";
      profile.setAttribute("role", "menuitem");
      signout.setAttribute("role", "menuitem");
      panel.append(profile, signout);
      menu.append(summary, panel);
      account.appendChild(menu);
    });
  }

  function renderAvatars() {
    linkAvatars();
    document.querySelectorAll("[data-auth-avatar]").forEach(function (el) {
      el.replaceChildren();
      if (!user) return;
      if (user.photoURL) {
        var img = document.createElement("img");
        img.src = user.photoURL;
        img.alt = "";
        el.appendChild(img);
      } else {
        el.textContent = firstLetter(user);
      }
    });
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(user); } catch (e) {}
    });
    root.dispatchEvent(new CustomEvent("promptly-auth", { detail: { user: user } }));
    document.querySelectorAll("[data-auth-open]").forEach(function (btn) {
      if (btn.closest && btn.closest("[data-auth-signed-in]")) return;
      if (btn.classList.contains("header-signin") || btn.hasAttribute("data-auth-header")) {
        btn.hidden = !!user;
      }
    });
    document.querySelectorAll("[data-auth-signed-in]").forEach(function (el) {
      el.hidden = !user;
    });
    document.querySelectorAll("[data-auth-email]").forEach(function (el) {
      el.textContent = user && (user.email || user.displayName || "Signed in");
    });
    renderAvatars();
    ensureAccountMenu();
    maybeRedirectToProfile();
    maybePromptProfileSignIn();
  }

  function app() {
    if (!root.firebase || !root.PROMPTLY_FIREBASE) return null;
    if (firebase.apps && firebase.apps.length) return firebase.app();
    return firebase.initializeApp(root.PROMPTLY_FIREBASE);
  }

  function signInWithProvider(provider) {
    firebase.auth().signInWithPopup(provider).then(function () {
      closeModal();
    }).catch(function (err) {
      if (err && err.code === "auth/popup-blocked") {
        return firebase.auth().signInWithRedirect(provider);
      }
      showError(friendlyError(err));
    });
  }

  function signInGoogle() {
    showError("");
    try {
      signInWithProvider(new firebase.auth.GoogleAuthProvider());
    } catch (err) {
      showError(friendlyError(err));
    }
  }

  function signInApple() {
    showError("");
    try {
      var provider = new firebase.auth.OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      signInWithProvider(provider);
    } catch (err) {
      showError(friendlyError(err));
    }
  }

  function sendPasswordReset() {
    showError("");
    var email = $("auth-email") && $("auth-email").value && $("auth-email").value.trim();
    if (!email) {
      showError("Enter your email first, then click Forgot password.");
      var field = $("auth-email");
      if (field) field.focus();
      return;
    }
    if (!root.firebase) {
      showError("Sign-in is not configured in this build.");
      return;
    }
    firebase.auth().sendPasswordResetEmail(email).then(function () {
      showError("If an account with a password exists for that email, we sent a reset link.", "ok");
    }).catch(function (err) {
      showError(friendlyError(err));
    });
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
      if (open) {
        e.preventDefault();
        var mode = open.getAttribute("data-auth-open");
        openModal(mode === "signup" ? "signup" : "signin");
      }
      var out = e.target.closest && e.target.closest("[data-auth-signout]");
      if (out) { e.preventDefault(); signOut(); }
      document.querySelectorAll(".header-account-menu[open]").forEach(function (d) {
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });
    try {
      var q = new URLSearchParams(location.search).get("auth");
      var hash = (location.hash || "").replace("#", "");
      if (q === "signup" || hash === "signup") openModal("signup");
    } catch (e) {}
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
