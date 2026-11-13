/* Promptly marketing site — modeled weekly time saved by prompt-access tools.
   Midpoint and range come only from the published note:
   weekly hours = asks/day × 5 days × seconds-per-interaction / 3600.
   Midpoint: 45s direct + 15% × 75s avoided retry (15/day → 1.17 h/week).
   Range: 30s + 10% × 60s, versus 60s + 20% × 90s.
   Cumulative chart is modeled hours over 52 weeks, not a measured year.
   Not measured Promptly customer results. */
(function () {
  "use strict";

  var WEEK_DAYS = 5;
  var MID_SEC = 45 + 0.15 * 75; /* 56.25 */
  var LOW_SEC = 30 + 0.10 * 60; /* 36 */
  var HIGH_SEC = 60 + 0.20 * 90; /* 78 */
  var CHART_WEEKS = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52];
  var CHART_LABELS = [4, 12, 20, 28, 36, 44, 52];
  var SPAN_SHORT = 12;
  var SPAN_LONG = 52;

  function weekHours(asks, sec) {
    return (asks * WEEK_DAYS * sec) / 3600;
  }

  function fmtHours(h) {
    if (h >= 1000) return String(Math.round(h));
    var r2 = Math.round(h * 100) / 100;
    if (Math.abs(r2 - Math.round(r2)) < 0.005) return String(Math.round(r2));
    var r1 = Math.round(h * 10) / 10;
    if (Math.abs(r2 - r1) >= 0.005) return String(r2);
    return String(r1);
  }

  function hourWord(h) {
    return (Math.round(h * 100) / 100) === 1 ? "hour" : "hours";
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

  function renderChart(svg, weekH) {
    if (!svg) return;
    var w = 640;
    var h = 268;
    var pl = 48;
    var pr = 36;
    var pt = 22;
    var pb = 40;
    var iw = w - pl - pr;
    var ih = h - pt - pb;
    var endHours = weekH * SPAN_LONG;
    var maxH = niceMax(endHours);
    var pts = [];
    var i, wk, hours, x, y;
    for (i = 0; i < CHART_WEEKS.length; i++) {
      wk = CHART_WEEKS[i];
      hours = weekH * wk;
      x = pl + (iw * i) / (CHART_WEEKS.length - 1);
      y = pt + ih - (hours / maxH) * ih;
      pts.push({ x: x, y: y, hours: hours, week: wk });
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
      endLabel.textContent = fmtHours(endHours) + " h";
    }

    var ticks = svg.querySelector("[data-impact-yticks]");
    if (ticks) {
      var html = "";
      var steps = 4;
      for (i = 0; i <= steps; i++) {
        var v = (maxH * i) / steps;
        y = pt + ih - (v / maxH) * ih;
        html +=
          '<line x1="' + pl + '" x2="' + (w - pr) + '" y1="' + y.toFixed(1) +
          '" y2="' + y.toFixed(1) + '" />' +
          '<text x="' + (pl - 8) + '" y="' + (y + 4).toFixed(1) +
          '" text-anchor="end">' + fmtHours(v) + "</text>";
      }
      ticks.innerHTML = html;
    }

    var xlabels = svg.querySelector("[data-impact-xlabels]");
    if (xlabels) {
      var xhtml = "";
      for (i = 0; i < pts.length; i++) {
        if (CHART_LABELS.indexOf(pts[i].week) === -1) continue;
        xhtml +=
          '<text x="' + pts[i].x.toFixed(1) + '" y="256" text-anchor="middle">' +
          pts[i].week + "</text>";
      }
      xlabels.innerHTML = xhtml;
    }
  }

  function update(root) {
    var slider = root.querySelector("[data-impact-asks]");
    var asks = slider ? parseInt(slider.value, 10) : 15;
    if (!asks || asks < 1) asks = 15;

    var mid = weekHours(asks, MID_SEC);
    var lo = weekHours(asks, LOW_SEC);
    var hi = weekHours(asks, HIGH_SEC);
    var shortH = mid * SPAN_SHORT;
    var longH = mid * SPAN_LONG;

    setText(root, "[data-impact-asks-out]", String(asks));
    setText(root, "[data-val-week]", fmtHours(mid));
    setText(root, "[data-val-range]", fmtHours(lo) + "–" + fmtHours(hi));
    setText(root, "[data-val-12w]", fmtHours(shortH));
    setText(root, "[data-val-52w]", fmtHours(longH));
    setText(root, "[data-asks-word]", String(asks));

    var wLabel = hourWord(mid);
    var units = root.querySelectorAll("[data-unit-week]");
    for (var i = 0; i < units.length; i++) units[i].textContent = wLabel;
    units = root.querySelectorAll("[data-unit-12w]");
    var sLabel = hourWord(shortH);
    for (i = 0; i < units.length; i++) units[i].textContent = sLabel;
    units = root.querySelectorAll("[data-unit-52w]");
    var lLabel = hourWord(longH);
    for (i = 0; i < units.length; i++) units[i].textContent = lLabel;

    renderChart(root.querySelector("[data-impact-chart]"), mid);

    var live = root.querySelector("[data-impact-live]");
    if (live) {
      live.textContent =
        "Modeled estimate at " + asks + " asks a workday: " +
        fmtHours(mid) + " " + wLabel + " a week, range " +
        fmtHours(lo) + "–" + fmtHours(hi) + " " + hourWord(hi) +
        ", " + fmtHours(longH) + " " + lLabel + " over 52 weeks.";
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
