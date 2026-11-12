/* Promptly marketing site — demo time-saved model.
   Figures are an illustrative forecast, not measured customer results.
   Model: 40s manual path vs 5s with Promptly, 230 workdays/year. */
(function () {
  "use strict";

  var MANUAL_SEC = 40;
  var PROMPTLY_SEC = 5;
  var SAVED_SEC = MANUAL_SEC - PROMPTLY_SEC;
  var WORKDAYS = 230;
  var WEEK_DAYS = 5;

  function hoursYear(asks) {
    return (asks * SAVED_SEC * WORKDAYS) / 3600;
  }

  function fmtHours(h) {
    if (h >= 100) return String(Math.round(h));
    var r = Math.round(h * 10) / 10;
    return (Math.abs(r - Math.round(r)) < 0.05) ? String(Math.round(r)) : String(r);
  }

  function fmtMinutes(seconds) {
    var m = seconds / 60;
    if (m < 10) return String(Math.round(m * 10) / 10);
    return String(Math.round(m));
  }

  function niceMax(value) {
    if (value <= 0) return 10;
    var raw = value * 1.15;
    var pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var n = raw / pow;
    var nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
    return nice * pow;
  }

  function setText(root, sel, text) {
    var els = root.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) els[i].textContent = text;
  }

  function renderChart(svg, yearHours) {
    if (!svg) return;
    var w = 640;
    var h = 268;
    var pl = 48;
    var pr = 36;
    var pt = 22;
    var pb = 40;
    var iw = w - pl - pr;
    var ih = h - pt - pb;
    var maxH = niceMax(yearHours);
    var months = 12;
    var pts = [];
    var i;
    for (i = 0; i < months; i++) {
      var hours = yearHours * (i + 1) / months;
      var x = pl + (iw * i) / (months - 1);
      var y = pt + ih - (hours / maxH) * ih;
      pts.push({ x: x, y: y, hours: hours });
    }
    var line = "";
    for (i = 0; i < pts.length; i++) {
      line += (i === 0 ? "M" : "L") + pts[i].x.toFixed(1) + " " + pts[i].y.toFixed(1);
    }
    var area =
      "M" + pts[0].x.toFixed(1) + " " + (pt + ih).toFixed(1) +
      " L" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
    for (i = 1; i < pts.length; i++) {
      area += " L" + pts[i].x.toFixed(1) + " " + pts[i].y.toFixed(1);
    }
    area +=
      " L" + pts[pts.length - 1].x.toFixed(1) + " " + (pt + ih).toFixed(1) + " Z";

    var lineEl = svg.querySelector("[data-impact-line]");
    var areaEl = svg.querySelector("[data-impact-area]");
    if (lineEl) lineEl.setAttribute("d", line);
    if (areaEl) areaEl.setAttribute("d", area);

    var last = pts[pts.length - 1];
    var dot = svg.querySelector("[data-impact-dot]");
    if (dot) {
      dot.setAttribute("cx", last.x.toFixed(1));
      dot.setAttribute("cy", last.y.toFixed(1));
    }
    var endLabel = svg.querySelector("[data-impact-end]");
    if (endLabel) {
      endLabel.setAttribute("x", last.x.toFixed(1));
      endLabel.setAttribute("y", (last.y - 12).toFixed(1));
      endLabel.textContent = fmtHours(yearHours) + " h";
    }

    var ticks = svg.querySelector("[data-impact-yticks]");
    if (ticks) {
      var html = "";
      var steps = 4;
      for (i = 0; i <= steps; i++) {
        var v = (maxH * i) / steps;
        var y = pt + ih - (v / maxH) * ih;
        html +=
          '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y.toFixed(1) +
          '" y2="' + y.toFixed(1) + '" />' +
          '<text x="' + (pl - 8) + '" y="' + (y + 4).toFixed(1) +
          '" text-anchor="end">' + fmtHours(v) + "</text>";
      }
      ticks.innerHTML = html;
    }
  }

  function update(root) {
    var slider = root.querySelector("[data-impact-asks]");
    var asks = slider ? parseInt(slider.value, 10) : 15;
    if (!asks || asks < 1) asks = 15;
    var daySec = asks * SAVED_SEC;
    var weekSec = daySec * WEEK_DAYS;
    var yearH = hoursYear(asks);
    var teamH = yearH * 5;

    setText(root, "[data-impact-asks-out]", String(asks));
    setText(root, "[data-val-ask]", String(SAVED_SEC));
    setText(root, "[data-val-day]", fmtMinutes(daySec));
    setText(root, "[data-val-week]", fmtMinutes(weekSec));
    setText(root, "[data-val-year]", fmtHours(yearH));
    setText(root, "[data-val-team]", fmtHours(teamH));
    setText(root, "[data-asks-word]", String(asks));

    var yearUnit = root.querySelectorAll("[data-unit-year]");
    var yLabel = (Math.round(yearH * 10) / 10) === 1 ? "hour" : "hours";
    for (var i = 0; i < yearUnit.length; i++) yearUnit[i].textContent = yLabel;

    renderChart(root.querySelector("[data-impact-chart]"), yearH);

    var live = root.querySelector("[data-impact-live]");
    if (live) {
      live.textContent =
        "Demo forecast at " + asks + " asks a workday: " +
        SAVED_SEC + " seconds saved per ask, " +
        fmtMinutes(daySec) + " minutes a day, " +
        fmtHours(yearH) + " " + yLabel + " a year.";
    }
  }

  function init(root) {
    var slider = root.querySelector("[data-impact-asks]");
    update(root);
    if (slider) {
      slider.addEventListener("input", function () { update(root); });
      slider.addEventListener("change", function () { update(root); });
    }
  }

  function boot() {
    var roots = document.querySelectorAll("[data-impact]");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
