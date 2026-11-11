(function () {
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

  function billingPeriod() {
    var root = document.querySelector("[data-billing-root]");
    return (root && root.getAttribute("data-billing")) || "yearly";
  }

  function hasAnyCheckout(c) {
    return filled(c.checkout.monthly) || filled(c.checkout.yearly) || filled(c.checkout.lifetime);
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

    if (filled(c.email)) {
      document.querySelectorAll("[data-contact]").forEach(function (el) {
        el.href = "mailto:" + c.email.trim();
      });
    }
  }

  function showThanks(form) {
    var fields = form.querySelector(".waitlist-fields");
    var thanks = form.parentElement
      ? form.parentElement.querySelector(".waitlist-thanks, .frost-thanks") || form.querySelector(".waitlist-thanks, .frost-thanks")
      : form.querySelector(".waitlist-thanks, .frost-thanks");
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
    var err = form.parentElement ? form.parentElement.querySelector(".waitlist-error") : null;
    if (err) err.hidden = true;
    if (thanks) {
      thanks.hidden = false;
      thanks.setAttribute("tabindex", "-1");
      thanks.focus();
    }
  }

  function showError(form, message) {
    var host = form.parentElement || form;
    var err = host.querySelector(".waitlist-error");
    if (!err) {
      err = document.createElement("p");
      err.className = "waitlist-error";
      form.insertAdjacentElement("afterend", err);
    }
    err.textContent = message;
    err.hidden = false;
  }

  document.querySelectorAll("form.waitlist").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = form.querySelector("input[type='email']");
      if (!email.checkValidity()) {
        email.reportValidity();
        return;
      }
      var endpoint = cfg().waitlist;
      var submit = form.querySelector("button[type='submit']");
      if (filled(endpoint)) {
        if (submit) submit.disabled = true;
        fetch(endpoint.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: email.value.trim() })
        }).then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          showThanks(form);
        }).catch(function () {
          showError(form, "Something went wrong. Please try again.");
        }).finally(function () {
          if (submit) submit.disabled = false;
        });
        return;
      }
      showThanks(form);
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

  var billingRoot = document.querySelector("[data-billing-root]");
  if (billingRoot) {
    billingRoot.querySelectorAll(".billing-toggle [data-billing]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var period = btn.getAttribute("data-billing");
        billingRoot.setAttribute("data-billing", period);
        billingRoot.querySelectorAll(".billing-toggle [data-billing]").forEach(function (other) {
          var on = other.getAttribute("data-billing") === period;
          other.setAttribute("aria-pressed", on ? "true" : "false");
          other.classList.toggle("is-on", on);
        });
        applyConfig();
      });
    });
  }

  applyConfig();

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
