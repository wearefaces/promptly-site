/* Compact consent banner. Opt-in: nothing analytics-like runs before Accept.
   No analytics or tracker is wired on this site yet, so Accept only stores the
   choice. A future hook can read window.promptlyConsent.get() === "accepted". */
(function () {
  var KEY = "promptly-consent";
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  window.promptlyConsent = { get: get };
  if (get() === "accepted" || get() === "declined") return;

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
      set(b.getAttribute("data-consent"));
      box.classList.add("is-leaving");
      setTimeout(function () { box.remove(); }, 220);
    });
    document.body.appendChild(box);
    requestAnimationFrame(function () { box.classList.add("is-in"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
