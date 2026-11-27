(function () {
  var BILLING_COPY = {
    monthly: {
      name: "Pro Monthly",
      price: "$7",
      period: "/ month",
      note: "Cancel any time"
    },
    yearly: {
      name: "Pro Yearly",
      price: "$59",
      period: "/ year",
      note: "$4.92/mo · Save $25"
    }
  };

  function cfg() {
    var c = window.PROMPTLY || {};
    return {
      checkout: Object.assign({ monthly: "", yearly: "", lifetime: "" }, c.CHECKOUT || window.CHECKOUT || {}),
      download: c.DOWNLOAD_URL || window.DOWNLOAD_URL || "",
      email: c.CONTACT_EMAIL || window.CONTACT_EMAIL || "",
      waitlist: c.WAITLIST_ENDPOINT || window.WAITLIST_ENDPOINT || ""
    };
  }

  function filled(value) {
    return !!(value && String(value).trim());
  }

  function waitlistHref() {
    if (document.getElementById("waitlist")) return "#waitlist";
    return "index.html#waitlist";
  }

  function contactHref() {
    if (document.getElementById("contact")) return "#contact";
    return "terms.html#contact";
  }

  function billingPeriod() {
    var root = document.querySelector("[data-billing-root]");
    return (root && root.getAttribute("data-billing")) === "monthly" ? "monthly" : "yearly";
  }

  function hasAnyCheckout(c) {
    return filled(c.checkout.monthly) || filled(c.checkout.yearly) || filled(c.checkout.lifetime);
  }

  function initialBilling() {
    var hash = (location.hash || "").replace("#", "").toLowerCase();
    if (hash === "monthly" || hash === "yearly") return hash;
    try {
      var q = new URLSearchParams(location.search).get("billing");
      if (q === "monthly" || q === "yearly") return q;
    } catch (e) {}
    return "yearly";
  }

  function syncBillingUrl(period) {
    var hash = (location.hash || "").replace("#", "");
    if (!hash || hash === "monthly" || hash === "yearly") {
      if (hash !== period) {
        try { history.replaceState(null, "", "#" + period); } catch (e) {}
      }
      return;
    }
    try {
      var url = new URL(location.href);
      url.searchParams.set("billing", period);
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  }

  function applyBillingCopy(root, period) {
    var copy = BILLING_COPY[period];
    if (!copy) return;
    root.querySelectorAll("[data-billing-field]").forEach(function (el) {
      var key = el.getAttribute("data-billing-field");
      if (Object.prototype.hasOwnProperty.call(copy, key)) {
        el.textContent = copy[key];
      }
    });
    root.querySelectorAll("[data-billing-show]").forEach(function (el) {
      el.hidden = el.getAttribute("data-billing-show") !== period;
    });
    root.querySelectorAll("[data-billing-cta]").forEach(function (el) {
      el.setAttribute("data-plan", period);
    });
  }

  function setBilling(period, options) {
    period = period === "monthly" ? "monthly" : "yearly";
    document.querySelectorAll("[data-billing-root]").forEach(function (root) {
      root.setAttribute("data-billing", period);
      root.querySelectorAll(".billing-toggle [data-billing]").forEach(function (btn) {
        var on = btn.getAttribute("data-billing") === period;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.classList.toggle("is-on", on);
        btn.setAttribute("tabindex", on ? "0" : "-1");
      });
      applyBillingCopy(root, period);
    });
    applyConfig();
    if (!options || !options.skipUrl) syncBillingUrl(period);
  }

  function applyConfig() {
    var c = cfg();
    var checkoutLive = hasAnyCheckout(c);
    var billing = billingPeriod();

    document.querySelectorAll("[data-when]").forEach(function (el) {
      var when = el.getAttribute("data-when");
      var show =
        (when === "checkout" && checkoutLive) ||
        (when === "waitlist" && !checkoutLive) ||
        (when === "download" && filled(c.download)) ||
        (when === "no-download" && !filled(c.download));
      el.hidden = !show;
    });

    document.querySelectorAll("[data-cta]").forEach(function (el) {
      var kind = el.getAttribute("data-cta");
      var plan = el.getAttribute("data-plan");
      if (kind === "buy") {
        var buyUrl = c.checkout[plan] || "";
        if (filled(buyUrl)) {
          el.href = buyUrl.trim();
          el.textContent = "Buy";
        } else {
          el.href = waitlistHref();
          el.textContent = "Join waitlist";
        }
      } else if (kind === "trial") {
        var trialPlan = plan || billing;
        var trialUrl = c.checkout[trialPlan] || c.checkout.yearly || c.checkout.monthly || "";
        if (filled(trialUrl)) {
          el.href = trialUrl.trim();
          el.textContent = "Start free trial";
        } else {
          el.href = waitlistHref();
          el.textContent = "Join waitlist";
        }
      } else if (kind === "download") {
        if (filled(c.download)) {
          el.href = c.download.trim();
          el.textContent = el.getAttribute("data-label") || "Download for Mac";
        } else {
          el.href = waitlistHref();
          el.textContent = "Join waitlist";
        }
      } else if (kind === "primary") {
        if (filled(c.download)) {
          el.href = c.download.trim();
          el.textContent = "Download for Mac";
        } else if (checkoutLive) {
          var primaryUrl = c.checkout[billing] || c.checkout.yearly || c.checkout.monthly || c.checkout.lifetime;
          el.href = filled(primaryUrl) ? primaryUrl.trim() : "pricing.html";
          el.textContent = "Start free trial";
        } else {
          el.href = waitlistHref();
          el.textContent = "Join waitlist";
        }
      }
    });

    document.querySelectorAll("[data-contact]").forEach(function (el) {
      if (filled(c.email)) {
        el.href = "mailto:" + c.email.trim();
        if (el.getAttribute("data-contact-label") === "address") {
          el.textContent = c.email.trim();
        }
      } else if (!el.getAttribute("href") || el.getAttribute("href").indexOf("mailto:") === 0) {
        el.href = contactHref();
      }
    });
  }

  function thanksEl(form) {
    return form.parentElement
      ? form.parentElement.querySelector(".waitlist-thanks, .frost-thanks") || form.querySelector(".waitlist-thanks, .frost-thanks")
      : form.querySelector(".waitlist-thanks, .frost-thanks");
  }

  function showThanks(form) {
    var fields = form.querySelector(".waitlist-fields");
    var thanks = thanksEl(form);
    if (!thanks) {
      thanks = form.nextElementSibling && form.nextElementSibling.classList.contains("waitlist-thanks")
        ? form.nextElementSibling
        : null;
    }
    if (fields) {
      if (fields.style.display === "contents") {
        fields.querySelectorAll("input, button, label").forEach(function (el) { el.hidden = true; });
        form.hidden = true;
      } else {
        fields.hidden = true;
      }
    }
    form.querySelectorAll(".waitlist-platforms, .frost").forEach(function (el) {
      el.hidden = true;
    });
    var err = form.parentElement ? form.parentElement.querySelector(".waitlist-error") : null;
    if (err) err.hidden = true;
    if (thanks) {
      thanks.hidden = false;
      thanks.setAttribute("tabindex", "-1");
      thanks.focus();
    }
  }

  function showNote(form, message, options) {
    var host = form.parentElement || form;
    var err = host.querySelector(".waitlist-error");
    if (!err) {
      err = document.createElement("p");
      err.className = "waitlist-error";
      err.setAttribute("role", "status");
      form.insertAdjacentElement("afterend", err);
    }
    err.textContent = message;
    err.classList.toggle("is-error", !!(options && options.isError));
    err.hidden = false;
  }

  var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  var ATTR_KEY = "promptly-waitlist-attr";

  function clip(value, max) {
    return String(value || "").trim().slice(0, max);
  }

  function firstTouchAttr() {
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem(ATTR_KEY) || "null"); } catch (e) {}
    if (stored && typeof stored === "object" && stored.landingPath) return stored;
    var params = {};
    try { params = Object.fromEntries(new URLSearchParams(location.search)); } catch (e) {}
    var landingPath = (location.pathname || "/") + (location.search || "") + (location.hash || "");
    var attr = {
      utm_source: clip(params.utm_source, 199),
      utm_medium: clip(params.utm_medium, 199),
      utm_campaign: clip(params.utm_campaign, 199),
      referrer: clip(document.referrer, 999),
      landingPath: clip(landingPath, 499) || "/"
    };
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(attr)); } catch (e) {}
    return attr;
  }

  firstTouchAttr();

  function sourcePage() {
    var path = (location.pathname || "").split("/").pop() || "index.html";
    return path || "index.html";
  }

  function platformsOf(form) {
    var btn = form.querySelector(".waitlist-platforms button[aria-pressed='true']");
    var key = (btn && btn.getAttribute("data-platform")) || "both";
    if (key === "mac") return ["mac"];
    if (key === "windows") return ["windows"];
    return ["mac", "windows"];
  }

  function setPlatform(form, key) {
    key = key === "mac" || key === "windows" ? key : "both";
    form.querySelectorAll(".waitlist-platforms button").forEach(function (b) {
      var on = b.getAttribute("data-platform") === key;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("is-on", on);
    });
  }

  function prefillWaitlistEmail(user) {
    var email = user && user.email;
    document.querySelectorAll("form.waitlist input[type='email']").forEach(function (input) {
      if (email && (!input.value || input.getAttribute("data-prefilled") === "1")) {
        input.value = email;
        input.setAttribute("data-prefilled", "1");
      } else if (!email && input.getAttribute("data-prefilled") === "1") {
        input.value = "";
        input.removeAttribute("data-prefilled");
      }
    });
  }

  function writeWaitlist(form) {
    var emailInput = form.querySelector("input[type='email']");
    var email = emailInput && emailInput.value.trim().toLowerCase();
    if (!email || email.length >= 200 || !EMAIL_RE.test(email)) {
      if (emailInput && emailInput.reportValidity) emailInput.reportValidity();
      else showNote(form, "Enter a valid email address.", { isError: true });
      return;
    }
    if (!window.firebase || !firebase.firestore) {
      showNote(form, "The waitlist isn't available in this browser right now. Please try again.", { isError: true });
      return;
    }
    var submit = form.querySelector("button[type='submit']");
    var user = window.PromptlyAuth && PromptlyAuth.currentUser && PromptlyAuth.currentUser();
    var data = {
      email: email,
      platforms: platformsOf(form),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      source: sourcePage()
    };
    if (user && user.uid) data.uid = user.uid;
    var attr = firstTouchAttr();
    ["utm_source", "utm_medium", "utm_campaign", "referrer", "landingPath"].forEach(function (key) {
      if (attr[key]) data[key] = attr[key];
    });
    if (submit) submit.disabled = true;
    firebase.firestore().collection("waitlist").doc(email).set(data).then(function () {
      showThanks(form);
      if (typeof window.promptlyTrack === "function") {
        window.promptlyTrack("waitlist_signup", {
          source: data.source,
          utm_source: data.utm_source || "(direct)"
        });
      }
    }).catch(function (err) {
      var code = (err && err.code) || "";
      if (code === "already-exists" || /already exists|already-exists/i.test((err && err.message) || "")) {
        showThanks(form);
        showNote(form, "You're already on the waitlist.");
      } else if (code === "permission-denied") {
        // Create-only rules refuse both duplicates and writes made before the
        // waitlist rules are deployed, so don't claim success here.
        showNote(form, "You're already on the waitlist, or sign-up isn't open yet.", { isError: true });
      } else {
        showNote(form, "Something went wrong. Please try again.", { isError: true });
      }
    }).finally(function () {
      if (submit) submit.disabled = false;
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".waitlist-platforms [data-platform]");
    if (!btn) return;
    var form = btn.closest("form.waitlist");
    if (form) setPlatform(form, btn.getAttribute("data-platform"));
  });

  if (window.PromptlyAuth && PromptlyAuth.onChange) {
    PromptlyAuth.onChange(prefillWaitlistEmail);
  } else {
    window.addEventListener("promptly-auth", function (e) {
      prefillWaitlistEmail(e.detail && e.detail.user);
    });
  }

  document.querySelectorAll("form.waitlist").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = form.querySelector("input[type='email']");
      if (email && !email.checkValidity()) {
        email.reportValidity();
        return;
      }
      writeWaitlist(form);
    });
  });

  var header = document.querySelector(".site-header");
  if (header && header.classList.contains("home-header")) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  document.querySelectorAll("[data-billing-root]").forEach(function (root) {
    var toggle = root.querySelector(".billing-toggle");
    root.querySelectorAll(".billing-toggle [data-billing]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setBilling(btn.getAttribute("data-billing"));
      });
    });
    if (toggle) {
      toggle.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        var next = (event.key === "ArrowLeft" || event.key === "Home") ? "monthly" : "yearly";
        setBilling(next);
        var focusBtn = root.querySelector('.billing-toggle [data-billing="' + next + '"]');
        if (focusBtn) focusBtn.focus();
      });
    }
  });

  if (document.querySelector("[data-billing-root]")) {
    setBilling(initialBilling(), { skipUrl: true });
    window.addEventListener("hashchange", function () {
      var hash = (location.hash || "").replace("#", "").toLowerCase();
      if (hash === "monthly" || hash === "yearly") setBilling(hash, { skipUrl: true });
    });
  } else {
    applyConfig();
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll("[data-reveal]");
  if (!items.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  items.forEach(function (el) { io.observe(el); });
})();
