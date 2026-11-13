/* Compact consent banner. Opt-in: nothing analytics-like runs before Accept.
   On Accept — now, or a stored previous accept — load Google Analytics 4
   (gtag.js, G-Q87BLQVFK6, Promptly Firebase project promptly-bfad6).
   IP anonymization is on; ads and Google signals stay off; a page_view is sent.
   Decline, or no choice yet, never loads the script. */
(function () {
  var KEY = "promptly-consent";
  var GA_ID = "G-Q87BLQVFK6";
  var loaded = false;

  function get() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function set(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  window.promptlyConsent = { get: get };

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function loadAnalytics() {
    if (loaded || get() !== "accepted") return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    gtag("config", GA_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    bindCtas();
  }

  function eventName(el) {
    var cta = el.getAttribute("data-cta") || "";
    if (cta === "download") return "download_click";
    if (cta === "trial") return "start_trial_click";
    if (cta === "buy") return "begin_checkout_click";
    return null;
  }

  function bindCtas() {
    if (bindCtas.done) return;
    bindCtas.done = true;
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-cta]");
      if (!el || typeof window.gtag !== "function") return;
      var name = eventName(el);
      if (!name) return;
      var params = {
        link_text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)
      };
      var href = el.getAttribute("href");
      var plan = el.getAttribute("data-plan");
      if (href) params.link_url = href;
      if (plan) params.plan = plan;
      window.gtag("event", name, params);
    }, true);
  }

  if (get() === "accepted") {
    loadAnalytics();
    return;
  }
  if (get() === "declined") return;

  function build() {
    var privacy = "privacy.html";
    var box = document.createElement("section");
    box.className = "consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Privacy choices");
    box.innerHTML =
      '<p class="consent-text">We use privacy-friendly analytics to see which pages help. It stays off until you accept. If you decline, we only use what the site needs to work. <a href="' + privacy + '">Privacy</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn" data-consent="declined">Decline</button>' +
      '<button type="button" class="consent-btn" data-consent="accepted">Accept</button>' +
      '</div>';
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent]");
      if (!b) return;
      var choice = b.getAttribute("data-consent");
      set(choice);
      if (choice === "accepted") loadAnalytics();
      box.classList.add("is-leaving");
      setTimeout(function () { box.remove(); }, 220);
    });
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add("is-in"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
