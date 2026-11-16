#!/usr/bin/env python3
"""Generate templates.html and templates/<slug>.html from templates.json."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "https://wearefaces.github.io/promptly-site"
CSS_V = "20261117-signup-v8"
VAR_RE = re.compile(r"\[[A-Z][A-Z0-9_ ]*\]")

LOGO = """        <svg class="logo" viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill="#000"/>
        <g fill="#fff">
          <circle cx="10" cy="10" r="2.05"/>
          <circle cx="16" cy="10" r="2.05"/>
          <circle cx="22" cy="16" r="2.05"/>
          <circle cx="10" cy="22" r="2.05"/>
          <circle cx="16" cy="22" r="2.05"/>
          <circle cx="10" cy="28" r="2.05"/>
          <circle cx="16" cy="28" r="2.05"/>
          <circle cx="22" cy="28" r="2.05"/>
        </g>
      </svg>"""

FOOTER_LOGO = """        <svg class="footer-logo" viewBox="0 0 40 40" aria-hidden="true">
          <defs>
            <mask id="promptly-holes">
              <rect width="40" height="40" rx="10" fill="#fff"/>
              <g fill="#000">
                <circle cx="10" cy="10" r="2.05"/>
                <circle cx="16" cy="10" r="2.05"/>
                <circle cx="22" cy="16" r="2.05"/>
                <circle cx="10" cy="22" r="2.05"/>
                <circle cx="16" cy="22" r="2.05"/>
                <circle cx="10" cy="28" r="2.05"/>
                <circle cx="16" cy="28" r="2.05"/>
                <circle cx="22" cy="28" r="2.05"/>
              </g>
            </mask>
          </defs>
          <rect width="40" height="40" rx="10" fill="#fff" mask="url(#promptly-holes)"/>
        </svg>"""


def highlight(prompt: str) -> str:
    parts = []
    last = 0
    for m in VAR_RE.finditer(prompt):
        parts.append(html.escape(prompt[last:m.start()]))
        parts.append(f'<span class="tpl-var">{html.escape(m.group(0))}</span>')
        last = m.end()
    parts.append(html.escape(prompt[last:]))
    return "".join(parts)


def nav_links(prefix: str, current: str) -> str:
    items = [
        ("features.html", "Features"),
        ("templates.html", "Templates"),
        ("pricing.html", "Pricing"),
        ("enterprise.html", "Enterprise"),
        ("blog.html", "Blog"),
        ("download.html", "Get Promptly"),
    ]
    lines = []
    for href, label in items:
        cur = ' aria-current="page"' if href == current else ""
        lines.append(f'          <a href="{prefix}{href}"{cur}>{label}</a>')
    return "\n".join(lines)


def header(prefix: str, current: str) -> str:
    links = nav_links(prefix, current)
    waitlist = f"{prefix}index.html#waitlist"
    return f"""  <header class="site-header header-page">
    <div class="wrap-wide header-inner">
      <a class="brand" href="{prefix}index.html">
{LOGO}
        <span>Promptly</span>
      </a>
      <nav class="nav" aria-label="Primary">
{links}
      </nav>
      <div class="header-actions">
        <button type="button" class="btn btn-sm btn-ghost header-signin" data-auth-open>Sign in</button>
        <span class="header-account" data-auth-signed-in hidden>
          <span class="header-avatar" data-auth-avatar aria-hidden="true"></span>
          <span class="header-email" data-auth-email></span>
          <button type="button" class="btn btn-sm btn-ghost" data-auth-signout>Sign out</button>
        </span>
        <a class="btn btn-sm" href="{waitlist}" data-cta="primary">Join waitlist</a>
        <details class="nav-toggle">
          <summary aria-label="Open menu">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>
            </svg>
          </summary>
          <nav class="nav-panel" aria-label="Primary">
{links}
          </nav>
        </details>
      </div>
    </div>
  </header>"""


def footer(prefix: str, form_id: str, extra_js: str = "") -> str:
    return f"""  <footer class="site-footer">
    <div class="footer-bg" aria-hidden="true"></div>
    <div class="wrap-wide footer-cta">
      <div class="footer-mark">
{FOOTER_LOGO}
      </div>
      <div>
        <h2 class="display">Join the Promptly waitlist.</h2>
        <p class="lede">Mac and Windows. We'll email you when it's ready.</p>
          <form class="waitlist" action="#" method="post">
          <div class="waitlist-platforms" role="group" aria-label="Platform">
            <button type="button" data-platform="mac" aria-pressed="false">Mac</button>
            <button type="button" data-platform="windows" aria-pressed="false">Windows</button>
            <button type="button" data-platform="both" aria-pressed="true">Both</button>
          </div>
            <div class="waitlist-fields">
              <label for="{form_id}" class="visually-hidden">Email</label>
              <input id="{form_id}" type="email" name="email" required autocomplete="email" placeholder="you@company.com" spellcheck="false" maxlength="199">
              <button class="btn btn-light" type="submit">Join the waitlist</button>
            </div>
            <p class="waitlist-thanks" hidden>You're on the waitlist. We'll write when it's ready.</p>
          </form>
      </div>
    </div>
    <div class="footer-bar">
      <div class="wrap-wide footer-bar-inner">
        <p>© Promptly</p>
        <nav class="footer-nav" aria-label="Footer">
          <a href="{prefix}privacy.html">Privacy</a>
          <a href="{prefix}terms.html">Terms</a>
          <a href="{prefix}blog.html">Blog</a>
          <a href="{prefix}pricing.html">Pricing</a>
          <a href="{prefix}enterprise.html">Enterprise</a>
          <!-- Contact: set CONTACT_EMAIL in config.js to turn this into a mailto link. -->
          <a href="{prefix}terms.html#contact" data-contact>Contact</a>
        </nav>
      </div>
    </div>
  </footer>
  <script src="{prefix}config.js"></script>
  <script src="https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js" defer></script>
  <script src="https://www.gstatic.com/firebasejs/11.4.0/firebase-auth-compat.js" defer></script>
  <script src="https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore-compat.js" defer></script>
  <script src="{prefix}firebase-config.js" defer></script>
  <script src="{prefix}auth.js?v={CSS_V}" defer></script>
  <script src="{prefix}waitlist.js?v={CSS_V}" defer></script>
  <script src="{prefix}consent.js?v=20261113-uses5" defer></script>
  <script src="{prefix}templates.js?v={CSS_V}" defer></script>
{extra_js}"""


def firebase_scripts(prefix: str) -> str:
    return f'  <script src="{prefix}members.js?v={CSS_V}" defer></script>'


def head(title: str, description: str, canonical: str, extra_css: str = "") -> str:
    if "/templates/" in canonical and not canonical.endswith("/templates.html"):
        prefix = "../"
    else:
        prefix = ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(description)}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#F4F5F0" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Promptly">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(description)}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{BASE}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Promptly for Mac — Select text. Ask any AI.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(title)}">
  <meta name="twitter:description" content="{html.escape(description)}">
  <meta name="twitter:image" content="{BASE}/og.png">
  <link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
  <link rel="icon" href="{prefix}favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="{prefix}apple-touch-icon.png" sizes="180x180">
  <link rel="stylesheet" href="{prefix}styles.css?v={CSS_V}">
  <link rel="stylesheet" href="{prefix}templates.css?v={CSS_V}">
{extra_css}
  <script>document.documentElement.classList.add("js");</script>
</head>"""


def card_html(t: dict, href: str) -> str:
    search = " ".join(
        [
            t["title"],
            t["description"],
            t["category"],
            t["persona"],
            t["level"],
            t["format"],
        ]
    ).lower()
    return f"""        <article class="tpl-card-wrap" data-tpl-card data-category="{html.escape(t['category'])}" data-search="{html.escape(search)}">
          <a class="tpl-card" href="{html.escape(href)}">
            <h2>{html.escape(t['title'])}</h2>
            <p>{html.escape(t['description'])}</p>
            <div class="tpl-meta">
              <span class="tpl-tag tpl-tag-cat">{html.escape(t['category'])}</span>
              <span class="tpl-tag">{html.escape(t['persona'])}</span>
              <span class="tpl-tag">{html.escape(t['level'])}</span>
            </div>
          </a>
        </article>"""


def write_index(data: dict) -> None:
    categories = data["categories"]
    templates = data["templates"]
    chips = ['          <button type="button" class="tpl-chip" data-tpl-filter="All" aria-pressed="true">All</button>']
    for c in categories:
        chips.append(
            f'          <button type="button" class="tpl-chip" data-tpl-filter="{html.escape(c)}" aria-pressed="false">{html.escape(c)}</button>'
        )
    cards = "\n".join(card_html(t, f"templates/{t['slug']}.html") for t in templates)
    n = len(templates)
    title = "Templates — Promptly for Mac"
    desc = "Original AI prompt templates for writing, marketing, coding, business, email, research, and learning. Copy a prompt and use it in Promptly or any AI you already use."
    canonical = f"{BASE}/templates.html"
    extra_css = (
        f'  <link rel="stylesheet" href="prompt-quality.css?v={CSS_V}">\n'
        f'  <link rel="stylesheet" href="members.css?v={CSS_V}">'
    )
    page = f"""{head(title, desc, canonical, extra_css)}
<body>
  <a class="skip-link" href="#main">Skip to content</a>
{header("", "templates.html")}
  <main id="main">
    <div class="page-hero">
      <div class="wrap">
        <h1>Templates</h1>
        <p class="lede">Ready-to-use prompts you can copy into Promptly, or into the AI you already use. Each one has a persona, a level, and an output format. Sign in to unlock the members library.</p>
        <div class="tpl-hero-actions">
          <a class="btn btn-ghost" href="analyze.html">Analyze a prompt</a>
        </div>
      </div>
    </div>
    <div class="page-section">
      <div class="wrap">
        <div class="tpl-toolbar">
          <div class="tpl-toolbar-row">
          <div class="tpl-search-wrap">
            <svg class="tpl-search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
              <circle cx="7" cy="7" r="4.25"/>
              <path d="M10.5 10.5 14 14"/>
            </svg>
            <label class="visually-hidden" for="tpl-search">Search templates</label>
            <input id="tpl-search" class="tpl-search" type="search" placeholder="Search templates" autocomplete="off" spellcheck="false">
          </div>
          <div class="auth-bar">
            <button type="button" class="btn btn-sm" data-auth-open>Sign in</button>
            <span data-auth-signed-in hidden>
              <span class="auth-user" data-auth-email></span>
              <button type="button" class="btn btn-sm btn-ghost" data-auth-signout>Sign out</button>
            </span>
          </div>
          </div>
          <div class="tpl-filters" role="group" aria-label="Filter by category">
{chr(10).join(chips)}
          </div>
        </div>
        <p class="tpl-count" id="tpl-count">{n} templates</p>
        <div class="tpl-grid" id="tpl-grid">
{cards}
        </div>
        <p class="tpl-empty" id="tpl-empty" hidden>No templates match that search.</p>
      </div>
    </div>
  </main>
{footer("", "email-templates-footer", firebase_scripts(""))}
</body>
</html>
"""
    (ROOT / "templates.html").write_text(page)
    print("wrote templates.html")


def write_detail(t: dict, by_slug: dict) -> None:
    prefix = "../"
    title = t["seoTitle"]
    desc = t["seoDescription"]
    canonical = f"{BASE}/templates/{t['slug']}.html"
    related = [by_slug[s] for s in t.get("related", []) if s in by_slug]
    related_html = ""
    if related:
        cards = "\n".join(card_html(r, f"{r['slug']}.html") for r in related)
        related_html = f"""
        <section class="tpl-related" aria-labelledby="related-heading">
          <h2 id="related-heading">Related templates</h2>
          <div class="tpl-related-grid">
{cards}
          </div>
        </section>"""
    highlighted = highlight(t["prompt"])
    raw = html.escape(t["prompt"])
    form_id = "email-tpl-" + t["slug"] + "-footer"
    extra_css = (
        f'  <link rel="stylesheet" href="{prefix}prompt-quality.css?v={CSS_V}">\n'
        f'  <link rel="stylesheet" href="{prefix}members.css?v={CSS_V}">\n'
        f'  <script src="{prefix}prompt-quality.js?v={CSS_V}" defer></script>'
    )
    extra_js = ""
    page = f"""{head(title, desc, canonical, extra_css)}
<body data-template-slug="{html.escape(t['slug'])}" data-template-title="{html.escape(t['title'])}" data-template-category="{html.escape(t['category'])}" data-template-persona="{html.escape(t['persona'])}" data-template-level="{html.escape(t['level'])}" data-template-format="{html.escape(t['format'])}">
  <a class="skip-link" href="#main">Skip to content</a>
{header(prefix, "templates.html")}
  <main id="main">
    <div class="page-hero">
      <div class="wrap">
        <p class="tpl-crumb"><a href="../templates.html">Templates</a> / {html.escape(t['category'])}</p>
        <div class="tpl-detail-head">
          <div>
            <h1>{html.escape(t['title'])}</h1>
            <p class="lede tpl-detail-lede">{html.escape(t['description'])}</p>
            <div class="tpl-detail-meta">
              <span class="tpl-tag tpl-tag-cat">{html.escape(t['category'])}</span>
              <span class="tpl-tag">{html.escape(t['persona'])}</span>
              <span class="tpl-tag">{html.escape(t['level'])}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-section">
      <div class="wrap">
        <div class="tpl-workspace">
          <div class="tpl-workspace-main">
            <div class="tpl-prompt-head">
              <h2>Prompt</h2>
              <div class="tpl-prompt-tools">
                <button type="button" class="tpl-reset" id="tpl-prompt-reset" hidden>Reset</button>
                <button type="button" class="btn btn-sm btn-ghost" data-copy-prompt>Copy</button>
              </div>
            </div>
            <div class="tpl-prompt">
              <div class="tpl-editor-toolbar" role="toolbar" aria-label="Prompt editor">
                <div class="tpl-editor-tools">
                  <button type="button" class="tpl-ed-btn" data-ed="undo" title="Undo (Ctrl/⌘+Z)" aria-label="Undo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 6.5H11a3 3 0 1 1 0 6H9.5"/><path d="M6.5 4.5 4 6.5l2.5 2"/></svg></button>
                  <button type="button" class="tpl-ed-btn" data-ed="redo" title="Redo (Ctrl/⌘+Shift+Z)" aria-label="Redo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 6.5H5a3 3 0 1 0 0 6h1.5"/><path d="M9.5 4.5 12 6.5l-2.5 2"/></svg></button>
                  <span class="tpl-ed-sep" aria-hidden="true"></span>
                  <button type="button" class="tpl-ed-btn" data-ed="variable" title="Insert variable" aria-label="Insert variable"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5c-1.5 0-2 1.2-2 2.5 0 1-.6 1.5-1.5 1.5 1 0 1.5.5 1.5 1.5 0 1.3.5 2.5 2 2.5"/><path d="M10 3.5c1.5 0 2 1.2 2 2.5 0 1 .6 1.5 1.5 1.5-1 0-1.5.5-1.5 1.5 0 1.3-.5 2.5-2 2.5"/></svg></button>
                  <button type="button" class="tpl-ed-btn" data-ed="heading" title="Heading" aria-label="Heading"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 3.5v9M11 3.5v9M5 8h6"/></svg></button>
                  <button type="button" class="tpl-ed-btn" data-ed="bullet" title="Bullet list" aria-label="Bullet list"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="3.5" cy="4.5" r="0.8" fill="currentColor" stroke="none"/><circle cx="3.5" cy="8" r="0.8" fill="currentColor" stroke="none"/><circle cx="3.5" cy="11.5" r="0.8" fill="currentColor" stroke="none"/><path d="M6.5 4.5h6.5M6.5 8h6.5M6.5 11.5h6.5"/></svg></button>
                </div>
                <p class="tpl-ed-count" id="tpl-ed-count" aria-live="polite"></p>
              </div>
              <label class="visually-hidden" for="tpl-prompt-editor">Prompt text</label>
              <textarea class="tpl-prompt-body" id="tpl-prompt-editor" spellcheck="true">{raw}</textarea>
              <textarea id="tpl-prompt-original" hidden>{raw}</textarea>
            </div>
            <div class="tpl-actions">
              <button type="button" class="btn" id="tpl-open-promptly">Open in Promptly</button>
              <a class="btn btn-ghost" href="../download.html">Get Promptly</a>
              <a class="btn btn-ghost" href="../pricing.html">See pricing</a>
            </div>
            <p class="tpl-open-note" id="tpl-open-note" hidden>If Promptly did not open, <a href="../download.html">download the Mac app</a> and try again once it is installed.</p>
          </div>
          <aside class="tpl-analyze-panel" aria-label="Prompt quality">
            <h2>Quality</h2>
            <div id="tpl-quality"></div>
            <ul class="pq-suggestions" id="tpl-suggestions"></ul>
            <p class="pq-empty" id="tpl-suggestions-empty" hidden></p>
            <dl class="tpl-panel-meta">
              <div>
                <dt>Persona</dt>
                <dd>{html.escape(t['persona'])}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{html.escape(t['level'])}</dd>
              </div>
              <div>
                <dt>Output format</dt>
                <dd>{html.escape(t['format'])}</dd>
              </div>
            </dl>
          </aside>
        </div>
        {related_html}
      </div>
    </div>
  </main>
{footer(prefix, form_id, extra_js)}
</body>
</html>
"""
    out = ROOT / "templates" / f"{t['slug']}.html"
    out.write_text(page)
    print("wrote", out.relative_to(ROOT))


def main() -> None:
    data = json.loads((ROOT / "templates.json").read_text())
    by_slug = {t["slug"]: t for t in data["templates"]}
    dest = ROOT / "templates"
    dest.mkdir(exist_ok=True)
    for stale in dest.glob("*.html"):
        stale.unlink()
    write_index(data)
    for t in data["templates"]:
        write_detail(t, by_slug)


if __name__ == "__main__":
    main()
