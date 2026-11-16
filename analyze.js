(function () {
  "use strict";

  var input = document.getElementById("az-input");
  var badge = document.getElementById("az-badge");
  var list = document.getElementById("az-suggestions");
  var empty = document.getElementById("az-empty");
  var timer = null;

  function render() {
    if (!window.PromptlyQuality || !input) return;
    var result = PromptlyQuality.scorePrompt(input.value);
    badge.innerHTML = PromptlyQuality.ringHTML(result, { size: 72 });
    list.innerHTML = "";
    if (!result.suggestions.length) {
      empty.hidden = false;
      empty.textContent = result.score >= 85
        ? "No urgent gaps. You can still tighten wording in Promptly."
        : "Paste a prompt to see suggestions.";
      return;
    }
    empty.hidden = true;
    result.suggestions.forEach(function (s) {
      var li = document.createElement("li");
      li.className = "pq-suggestion";
      li.tabIndex = 0;
      li.innerHTML =
        '<span class="pq-tag pq-tag-' + s.priority.toLowerCase() + '">' + s.priority + "</span>" +
        "<span>" + PromptlyQuality.escapeHtml(s.title) + "</span>" +
        '<span class="pq-tip">' + PromptlyQuality.escapeHtml(s.why) + "</span>";
      list.appendChild(li);
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 300);
  }

  if (input) {
    input.addEventListener("input", schedule);
    render();
  }
})();
