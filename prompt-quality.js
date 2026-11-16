/**
 * Promptly prompt-quality rubric.
 *
 * SITE + APPS SHOULD MIRROR THIS FILE.
 * Deterministic, local, no network. Tuned for English prompts.
 * Version 1 — 16 November 2026.
 *
 * Score is 0–100, sum of:
 *   role/persona          16  (e.g. "You are…", "Act as…", a named persona)
 *   clear task verb       16  (rewrite, review, draft, explain, …)
 *   audience              16  (who the output is for)
 *   output format         14  (email, bullets, table, JSON, step-by-step, …)
 *   context/constraints   14  (rules, do-not, sources, limits)
 *   sensible length       12  (enough to be specific, not a wall of text)
 *   examples              12  (an example, sample, or worked input)
 *
 * Bands: 0–39 Weak, 40–69 Fair, 70–84 Good, 85–100 Excellent.
 */
(function (root) {
  "use strict";

  var WEIGHTS = {
    role: 16,
    task: 16,
    audience: 16,
    format: 14,
    context: 14,
    length: 12,
    examples: 12
  };

  var TASK_VERBS = new RegExp(
    "\\b(" +
      "rewrite|rewriting|write|writing|draft|drafting|review|reviewing|" +
      "explain|explaining|summarize|summarise|summarizing|" +
      "generate|creating|create|analyze|analyse|analyzing|" +
      "plan|planning|translate|compare|extract|list|outline|" +
      "edit|editing|critique|critiquing|improve|revise|revising|" +
      "turn|convert|build|design|propose|evaluate|assess|" +
      "answer|describe|classify|rank|score|debug|refactor|" +
      "teach|tutor|coach|brainstorm|expand|condense|proofread" +
    ")\\b",
    "i"
  );

  var ROLE_RE = /(?:\byou are\b|\bact as\b|\brole\s*[:—-]|\bpersona\s*[:—-]|\bas a (?:senior|professional|friendly|critical|subject|collaborative|expert|editor|mentor|reviewer|writer|engineer|analyst|researcher|teacher|tutor|coach|partner)\b|subject expert|friendly mentor|professional writer|collaborative partner|critical reviewer)/i;

  var AUDIENCE_RE = /(?:\baudience\b|\breaders?\b|\bfor (?:a |an |the )?(?:beginner|beginners|student|students|customer|customers|stakeholder|stakeholders|manager|managers|team|executive|executives|developer|developers|engineer|engineers|client|clients|user|users|buyer|buyers|hiring|candidate|candidates|board)\b|\bwho (?:it is|this is|i am|i'm|we are) (?:for|writing to|speaking to|talking to)\b|\bwho i am writing to\b|\bintended for\b|\btarget (?:reader|audience|user|customer)\b)/i;

  var FORMAT_RE = /(?:\boutput format\b|\bformat\s*[:—-].{0,40}\b(?:plain text|bullet|table|email|json|markdown|code|step-by-step|steps)\b|\bas (?:a |an )?(?:bullet(?:\s+list)?|bullets|table|markdown|json|email|csv|checklist|numbered list|step-by-step|plain text)\b|\breturn (?:a |an |the )?(?:list|table|json|email|markdown|checklist|outline|report)\b|\bwrite (?:a |an )?(?:email|subject line|json|table|bullet)\b|\bheadings?\b.{0,30}\b(?:then|using|with)\b)/i;

  var CONTEXT_RE = /(?:\bconstraints?\b|\brules?\s*[:—-]|\bdo not\b|\bdon't\b|\bmust not\b|\bmust\b|\bonly (?:use|using|from|if)\b|\busing only\b|\bdo not invent\b|\bdon't invent\b|\bif (?:something|a fact|it) is missing\b|\blimits?\b|\bassumptions?\b|\bprovided (?:notes|sources|text|draft|code)\b|\bnotes\s*[:—-]|\bsources?\s*[:—-])/i;

  var EXAMPLE_RE = /(?:\bfor example\b|\be\.g\.|\bexample\s*[:—-]|\bsample\s*[:—-]|\bworked example\b|\bsuch as\b|\bgiven\s*[:—-]|\binput\s*[:—-][\s\S]{0,80}\boutput\s*[:—-]|```)/i;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function lengthPoints(text) {
    var n = text.trim().length;
    if (n < 40) return 0;
    if (n < 80) return 6;
    if (n <= 2000) return 12;
    if (n <= 4000) return 8;
    return 4;
  }

  function bandFor(score) {
    if (score >= 85) return { id: "excellent", label: "Excellent", color: "#2A8A3E" };
    if (score >= 70) return { id: "good", label: "Good", color: "#7BAE3F" };
    if (score >= 40) return { id: "fair", label: "Fair", color: "#ED990E" };
    return { id: "weak", label: "Weak", color: "#DC2D28" };
  }

  function has(re, text) {
    return re.test(text);
  }

  function scorePrompt(input) {
    var text = String(input || "").replace(/\s+/g, " ").trim();
    var empty = !text;

    var parts = {
      role: empty ? 0 : (has(ROLE_RE, text) ? WEIGHTS.role : 0),
      task: empty ? 0 : (has(TASK_VERBS, text) ? WEIGHTS.task : 0),
      audience: empty ? 0 : (has(AUDIENCE_RE, text) ? WEIGHTS.audience : 0),
      format: empty ? 0 : (has(FORMAT_RE, text) ? WEIGHTS.format : 0),
      context: empty ? 0 : (has(CONTEXT_RE, text) ? WEIGHTS.context : 0),
      length: empty ? 0 : lengthPoints(text),
      examples: empty ? 0 : (has(EXAMPLE_RE, text) ? WEIGHTS.examples : 0)
    };

    var score = 0;
    Object.keys(parts).forEach(function (k) { score += parts[k]; });
    score = clamp(Math.round(score), 0, 100);
    var band = bandFor(score);

    var suggestions = [];
    if (!parts.task) {
      suggestions.push({
        id: "task",
        priority: "Critical",
        title: "What should the model do?",
        why: "A clear task verb (rewrite, review, draft, explain) tells the model the job. Without it the prompt is easy to misread."
      });
    }
    if (!parts.audience) {
      suggestions.push({
        id: "audience",
        priority: "Critical",
        title: "Who is the target audience?",
        why: "Naming the reader or user changes tone, length, and what gets explained. This is usually the highest-leverage missing piece."
      });
    }
    if (!parts.role) {
      suggestions.push({
        id: "role",
        priority: "High",
        title: "What role or persona should the AI take?",
        why: "A role such as Subject Expert or Friendly Mentor sets tone and depth, and stops the model inventing a voice."
      });
    }
    if (parts.length < WEIGHTS.length) {
      suggestions.push({
        id: "length",
        priority: parts.length === 0 ? "High" : "Mid",
        title: text.trim().length > 4000 ? "Tighten the prompt" : "Add more context",
        why: text.trim().length > 4000
          ? "Very long prompts bury the task. Keep the job, audience, rules and one example, and cut the rest."
          : "Short prompts leave the model to guess. Add the situation, the goal, and any facts it must use."
      });
    }
    if (!parts.context) {
      suggestions.push({
        id: "context",
        priority: "High",
        title: "What specific problem should this solve?",
        why: "Constraints, sources, and what not to invent keep the answer usable. 'Do not invent facts' is often enough to start."
      });
    }
    if (!parts.format) {
      suggestions.push({
        id: "format",
        priority: "Mid",
        title: "What output format do you want?",
        why: "Asking for an email, a table, bullets, or JSON means less cleanup later and a more consistent result."
      });
    }
    if (!parts.examples) {
      suggestions.push({
        id: "examples",
        priority: "Mid",
        title: "Add an example of a good output",
        why: "One short example of the shape you want is often more effective than another paragraph of rules."
      });
    }

    var order = { Critical: 0, High: 1, Mid: 2 };
    suggestions.sort(function (a, b) { return order[a.priority] - order[b.priority]; });

    var present = [];
    if (parts.role) present.push("role");
    if (parts.format) present.push("format");
    if (parts.audience) present.push("audience");
    if (parts.task) present.push("a clear task");
    if (parts.context) present.push("constraints");
    if (parts.examples) present.push("examples");

    var summary;
    if (empty) {
      summary = "Paste a prompt to see a score and suggestions.";
    } else if (score >= 85) {
      summary = "Role, format and audience all set.";
    } else if (present.length >= 3) {
      var shown = present.slice(0, 3);
      if (shown.length === 1) summary = cap(shown[0]) + " is in place.";
      else if (shown.length === 2) summary = cap(shown[0]) + " and " + shown[1] + " are in place.";
      else summary = cap(shown[0]) + ", " + shown[1] + " and " + shown[2] + " are in place.";
    } else if (parts.task) {
      summary = "A clear task, but the prompt still needs more structure.";
    } else {
      summary = "Add a task, an audience, and how the answer should look.";
    }

    return {
      score: score,
      band: band.id,
      label: band.label,
      color: band.color,
      summary: summary,
      parts: parts,
      suggestions: suggestions,
      version: 1
    };
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function ringHTML(result, opts) {
    opts = opts || {};
    var size = opts.size || 72;
    var r = Math.round((size / 2) - 6);
    var c = 2 * Math.PI * r;
    var offset = c * (1 - result.score / 100);
    var title = result.score + " — " + result.label;
    return (
      '<div class="pq-badge" data-band="' + result.band + '">' +
        '<svg class="pq-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
          '<circle class="pq-ring-track" cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '"></circle>' +
          '<circle class="pq-ring-value" cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" ' +
            'stroke="' + result.color + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle>' +
        '</svg>' +
        '<div class="pq-badge-copy">' +
          '<p class="pq-score"><span class="pq-score-num">' + result.score + '</span><span class="pq-score-label">' + result.label + '</span></p>' +
          (opts.summary === false ? "" : '<p class="pq-summary">' + escapeHtml(result.summary) + "</p>") +
        "</div>" +
        '<span class="visually-hidden">' + escapeHtml(title + ". " + result.summary) + "</span>" +
      "</div>"
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function suggestionsHTML(result) {
    if (!result || !result.suggestions || !result.suggestions.length) return "";
    return result.suggestions.map(function (item) {
      return (
        '<li class="pq-suggestion" tabindex="0">' +
          '<span class="pq-tag pq-tag-' + item.priority.toLowerCase() + '">' + escapeHtml(item.priority) + "</span>" +
          "<span>" + escapeHtml(item.title) + "</span>" +
          '<span class="pq-tip">' + escapeHtml(item.why) + "</span>" +
        "</li>"
      );
    }).join("");
  }

  root.PromptlyQuality = {
    VERSION: 1,
    WEIGHTS: WEIGHTS,
    scorePrompt: scorePrompt,
    bandFor: bandFor,
    ringHTML: ringHTML,
    suggestionsHTML: suggestionsHTML,
    escapeHtml: escapeHtml
  };
})(typeof window !== "undefined" ? window : globalThis);
