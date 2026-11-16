(function () {
  var search = document.getElementById("tpl-search");
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-tpl-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-tpl-card]"));
  var empty = document.getElementById("tpl-empty");
  var count = document.getElementById("tpl-count");
  var category = "All";

  function norm(s) {
    return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function apply() {
    var q = search ? norm(search.value) : "";
    var visible = 0;
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var hay = card.getAttribute("data-search") || "";
      var catOk = category === "All" || cat === category;
      var qOk = !q || hay.indexOf(q) !== -1;
      var show = catOk && qOk;
      card.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
    if (count) {
      var label = visible === 1 ? "1 template" : visible + " templates";
      if (category !== "All") label += " in " + category;
      if (q) label += " matching “" + search.value.trim() + "”";
      count.textContent = label;
    }
  }

  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        category = chip.getAttribute("data-tpl-filter") || "All";
        chips.forEach(function (c) {
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        apply();
      });
    });
  }

  if (search) {
    search.addEventListener("input", apply);
  }

  if (cards.length) apply();

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(area);
  }

  document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-copy-target");
      var src = document.getElementById(id);
      if (!src) return;
      var text = src.textContent || "";
      var done = function () {
        var prev = btn.textContent;
        btn.textContent = "Copied";
        btn.setAttribute("aria-label", "Prompt copied");
        setTimeout(function () {
          btn.textContent = prev;
          btn.removeAttribute("aria-label");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  });
})();
