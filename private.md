What's likely costing the most

The scene loop runs every frame, forever. It sways every leaf through JavaScript and reads page layout each frame, and every scroll update rewrites CSS variables on the root element, which forces the browser to recalculate styles across the whole page.
Blur and glow filters are everywhere. The whole ambient layer gets a scroll-driven blur, each leaf has its own blur, and many raindrops carry a blur or glow. The hero and contact sections also blur as you scroll.
The foliage is huge on phones. Each leaf box is still 460–760px wide on a small screen, and each one is its own layer.
Full-screen blend modes. The scanline overlay and lightning use mix-blend-mode, and the nav has a backdrop-filter, which is barely visible anyway since its background is already 88% opaque.
Most of the page has almost no rain. In the middle sections, intensity sits at 16%, so rain and leaves are barely visible but cost full price.

Tier 1: no visible change

Make the scene loop lazy. Write CSS variables only when a value actually changes, move the leaf sway into CSS keyframes (which run off the main thread), and drop the per-frame layout reads. This is probably the biggest single win.
Remove the nav backdrop-blur and the scanline blend mode on phones. The look stays essentially the same.

Tier 2: small trades you're unlikely to notice
3. Rain as 3 tiled layers (back, mid, front, different speeds) instead of 45–90 separate drops. This keeps the depth feel, and it means 3 layers instead of dozens.
4. Scroll blur removal on phones. Keep the hero and contact fade, lift and scale, but drop the blur and the whole-layer ambient blur, and suggest depth with opacity instead.
5. Lighter foliage on phones. Fewer, smaller clusters, sized to the screen, with the per-leaf blur baked in (or merged into left and right layers).
6. Cheaper lightning. Replace the blend mode and bolt blur with a plain translucent wide stroke. The flash reads the same for its 150ms.
7. Diagram pulses. Swap the drop-shadow on moving dots for a second, larger translucent circle as a fake glow.
8. Calm mode. While intensity is at its 16% baseline, hide half the drops and pause the rest.

Tier 3: adaptive quality (best for keeping the charm)
9. A quality governor. It checks frame rate for the first two seconds, plus CPU cores and device memory, and sets a "lite" flag on weak devices. The lite flag applies the Tier 2 trims, so modern phones and desktops keep the full experience. It can also step down later if frames start dropping.

My recommendation: do Tier 1 for everyone, and apply Tier 2 only through the Tier 3 governor. That gives older phones a lean scene with the same rain, jungle, lightning and fireflies, and the layout, colors and content stay untouched.

Shall I go with that package, or would you rather pick specific numbers? If you tell me which phone is struggling, I can tune the "lite" thresholds for it.


Tier 2 targets a different kind of cost, so don't expect a second jump like that one. Tier 1 removed wasted JavaScript work. Tier 2 reduces what the phone's GPU and memory have to draw each frame: how many separate layers exist, how many blurs it computes, and how large the foliage is. I can't promise numbers without measuring on your phone. My guess is you'd notice it as:

Smoother scrolling on the weakest phones, especially through the hero and contact transitions.
No hitch when lightning fires, since the current flash blends and blurs the whole screen.
Less heat and battery drain, and less risk of the browser reloading the tab on 2GB phones.

If your phone already feels good, Tier 2 is polish. If it's still occasionally choppy, it's worth doing.

Nothing here can launch the page to the moon, because I'd apply it in two batches and only the second batch changes what you see:

Batch A, effectively invisible:
Remove the whole-layer ambient blur.
Remove the scroll-driven blur on the hero and contact sections, keeping the fade, lift and scale.
Make the lightning cheaper: same flash, no blend mode or bolt blur.
Swap the diagram pulse glow filters for a cheaper fake glow.
Batch B, the one to look at:
Rain as 3 tiled parallax layers instead of 45–90 separate drops. This is the biggest saving, but the rain texture will look a little different up close.
Smaller, fewer foliage clusters on phones.

Desktop stays as it is either way, and everything in Tier 2 is reversible. I'd suggest Batch A first, then you check it on your phone, then Batch B only if you still want more. Shall I start with Batch A?



Batch A of Tier 2 is done. Rain tiling and the smaller foliage (Batch B) are not touched yet, as agreed. I tested desktop and phone sizes in dark and light themes with no script errors, but not on a real phone.

What changed (phones and touch devices only, desktop looks exactly as before)

Ambient layer blur: I removed the depth blur on the whole ambient layer. It was at most half a pixel of softness.
Hero and contact blur: I removed the scroll-driven blur on the hero and contact content. The fade, lift and scale stay, and the blur only showed once the content was nearly transparent anyway.
Lightning: It is the same flash, but it no longer blends the whole screen against what's behind it, and the bolt's glow is now a translucent stroke instead of a blurred one. On phones the glow edge is slightly crisper than the soft blur it replaces.
Diagram pulses: The moving dots now have a soft translucent ring instead of a blur filter. In my screenshot the difference is subtle. Each pulse now names its glow color in one variable, so any pulse you add later only needs that.

One change on every device
Lightning used to set its variables on the root of the page, which made the browser re-check styles for the entire page twice per flash. They are now set on the two lightning elements themselves, so flashes should cause fewer hitches on all devices.

HTML and the privacy page

No structural HTML changes. privacy.html uses the same styles.css and scripts.js and the same ambient layer markup, so it gets every improvement, including the Tier 1 ones, automatically.
Cache-busting versions bumped. I changed the ?v= numbers on both files in index.html and privacy.html to 20260924a. Without that, returning visitors' browsers could keep serving the old cached scripts and styles, as happened with the stale build earlier. Both HTML files changed only on those two lines each. When you deploy, upload all four files so the new versions get picked up.

Try it on your slow phone. If it's still choppy, Batch B (rain tiles, smaller foliage) is the next step. Since that one changes the look, I'd do it once you've seen how Batch A feels.




Lightning CSS it is! Thanks for the great suggestions!

And this is what page speed says
Failing Elements
{ "path": "1,HTML,1,BODY,6,MAIN,11,SECTION,0,DIV,5,DIV,0,A,0,SPAN", "boundingRect": { "height": 22, "bottom": 8928, "left": 144, "width": 124, "top": 8905, "right": 268 }, "snippet": "<span data-i18n=\"contact.cta.download\">", "type": "node", "lhId": "1-0-SPAN", "selector": "div.wrap > div.contact-cta > a.btn > span", "explanation": "Fix any of the following:\n Element has insufficient color contrast of 3.55 (foreground color: #d9e9ea, background color: #2a838b, font size: 10.2pt (13.6px), font weight: bold). Expected contrast ratio of 4.5:1", "nodeLabel": "Download resume" }




# me

This is the repo for my [profile page](https://yogirajt.github.io)!

## How the site is built

All wording and facts live in **`content/*.json`**. Templates live in **`src/`**. On every push the
GitHub workflow runs `.github/scripts/build.mjs`, which generates

| Generated file | From |
| --- | --- |
| `index.html` | `src/index.njk` + `src/head.njk` + `src/partials/` + `src/diagrams/*.html` + `content/` |
| `privacy.html` | `src/privacy.njk` + `src/partials/` + `content/privacy.json` |
| `404.html` | `src/404.njk` + `content/notFound.json` |
| `i18n.js`, `privacy-i18n.js` (German tables) | `src/i18n.js`, `src/privacy-i18n.js` + `content/` |
| `sitemap.xml`, `robots.txt`, `assets/site.webmanifest`, JSON-LD | `content/site.json` (+ git history for `lastmod`) |

and then minifies and inlines CSS as before. Do not edit the generated files; they are not in the repo.

Both pages share the cookie banner, header and footer (`src/partials/`), so those are edited once
(markup in the partial, wording in `content/ui.json`).

## Where to change what

| I want to change... | Edit |
| --- | --- |
| Name, e-mail, city, years of experience, employer, social links, base URL, theme colours | `content/site.json` |
| Navbar name (stacked first / last name) | `content/site.json` -> `firstName`, `lastName` |
| Navbar monogram (the hexagon "Y") | the `<svg class="brand-mark">` in `src/partials/chrome.njk`, colours and animation under "Brand" in `styles.css` |
| Job title wording (`Senior` / `Full-Stack`) | `content/site.json` -> `level`, `discipline`, `role` |
| `<title>`, meta description, Open Graph / Twitter text | `content/seo.json` |
| Hero text, pitch, buttons, the 13 architecture diagrams' names + descriptions | `content/hero.json` |
| About paragraphs and quick facts | `content/about.json` |
| Jobs, bullets, tech tags, earlier experience | `content/experience.json` |
| Skill groups and tags | `content/skills.json` |
| Education, spoken languages | `content/education.json` |
| Contact section | `content/contact.json` |
| Privacy policy (hero, at-a-glance box, every section, contact block) | `content/privacy.json` |
| 404 page text | `content/notFound.json` (English only, no translation) |
| Nav, cookie banner, footer, aria-labels, toast / screen-reader messages | `content/ui.json` |

Every translatable string is `{ "en": "...", "de": "..." }`. **Both are required** (the build fails
otherwise). `**bold**` becomes `<strong>`. Text that is identical in both languages and needs no
translation is written `{ "text": "Hindi" }`.

### Tokens (change a fact once)

Inside any string you can write `{{ name }}`, `{{ firstName }}`, `{{ years }}`, `{{ city }}`,
`{{ country.en }}` / `{{ country.de }}` / `{{ country.code }}`, `{{ employer }}`, `{{ level }}`,
`{{ discipline }}` (and `{{ discipline | lower }}`), `{{ role.title }}`, `{{ role.seoTitle }}`.
They resolve per language. `role.title` is the visible job title ("Senior Full-Stack Engineer");
`role.seoTitle` is the search-engine variant that also lists "Backend" (title, description, Open
Graph, JSON-LD `jobTitle`). Edit the `Backend` part of `seoTitle` in `site.json` if you want to change that.

### Renaming the role

1. Change `discipline` (and `level`) in `content/site.json`.
2. Put the **old** wording in `guard.stale` (e.g. `"Full-Stack"`).
3. Run the build. Every place that still contains the old wording, in content, templates or
   scripts, is reported as a warning (`::warning::` annotation in GitHub Actions). Past job titles in
   `experience.jobs` / `experience.earlier` are exempt via `guard.allowIn`.
4. Read the sentences that use `{{ discipline }}` (hero pitch, About): the grammar around a new word
   may need adjusting. Add `--strict` to the build step to make warnings fail the build.

## Common edits

* **New job:** add an object at the *top* of `jobs` in `experience.json` (order = page order). Copy an
  existing one: unique `id`, `title`, `company`, `place` (a key of `places`), `dates`, `bullets`,
  `tags`; add `"current": true` for the highlighted card (and remove it from the old one).
* **New bullet / tag:** append `{ "en": "...", "de": "..." }` to `bullets`, or a string to `tags`.
* **New skill group:** append `{ "id": "g7", "title": { ... }, "tags": [ ... ] }` to `groups`.
  Tags need no translation.
* **New architecture diagram:** add the SVG as `src/diagrams/<id>.html` (copy an existing file and
  keep its opening `<svg ...>` tag) and an entry with the same `id` in `hero.architectures`.
  The dots, ordering and screen-reader labels follow automatically.

### Privacy policy sections

`content/privacy.json` -> `sections` is a list; each section has an `id` (also its anchor), a
`heading` and `blocks`. Section numbers (01, 02, ...) are generated from the order. Block types:

| `type` | Fields |
| --- | --- |
| `p` | `text` |
| `list` | `points` (list of translatable strings) |
| `table` | `caption`, `headers` (2 strings), `rows` (each `{ "a": ..., "b": ... }`) |
| `panel` | `role`, `emailLabel` (the controller box; name and e-mail come from `site.json`) |
| `button` | `text` (the "cookie settings" button; there should be only one) |

"Last updated" is a normal string in `hero.updated`; remember to change the date when you change
the policy.

### Hero title effect and icons

* The hero title ("Yogi", `site.json` -> `alternateName`) has an old-TV signal-interference effect:
  `.glitch` in `styles.css` draws it, `initHeroGlitch()` in `scripts.js` decides when (a burst after load,
  then every ~3-8 s while the title is on screen; tapping the title triggers one). It is switched off for
  visitors who prefer reduced motion. On phones the title is much larger (`.hero h1` in the
  `max-width: 900px` block).
* Favicon and app icons are generated from the navbar monogram: `assets/favicon.svg` (the source, used by
  modern browsers) plus the PNG/ICO sizes next to it. The `?v=` on the icon links is a hash of those files,
  so browsers fetch a changed icon instead of showing a cached one. The social preview image
  (`assets/og-image.png`) is a separate picture.

### Navigation on phones

Up to 860px wide the navigation bar is docked to the bottom of the screen and its menu opens upwards.
Everything else that lives at the bottom (cookie banner, "copied" toast, page end) makes room through the
`--dock` CSS variable (0 on desktop), so a new bottom-anchored element should add `var(--dock)` to its
`bottom` offset.

## Tests

`npm test` builds the site (in a temp copy) and compares it with the snapshots in
`tests/__snapshots__/`. **Wording is masked**, so editing `content/*.json` text never needs a snapshot
update. The tests cover:

* the structure of `index.html`, `privacy.html`, `404.html` (elements, classes, ids, links, ARIA wiring,
  `data-i18n` key *shapes*), the JSON-LD, sitemap, robots.txt, manifest, the shape of both German
  tables and the language-switch scripts (everything except the injected tables);
* in-page anchors and `aria-labelledby` references resolve; every `data-i18n` key exists in its table;
  no `{{ }}` or `undefined` leaks into a page; the build has no warnings;
* **rewording every string and changing the url, e-mail, links and colours changes nothing else**
  (this is what catches a value that is hard-coded in a template instead of read from `site.json`);
* **adding a job, bullet, tag, skill group, fact, degree, language, policy section/paragraph/point or
  diagram with an existing layout changes nothing**;
* the build refuses a missing translation and an unknown `{{ token }}`.

Identical neighbouring items are shown once in the snapshots, and SVG diagrams only by their opening
tag (the drawings are copied verbatim, not generated), so list lengths and artwork are not tested.
After an **intended** change to a template, `build.mjs` or the scripts, run `npm run test:update`,
read the `git diff` of `tests/__snapshots__/`, and commit it with the change. (`test:update` uses a
POSIX `UPDATE_SNAPSHOTS=1` prefix; on Windows set the variable first.) The workflow runs `npm test`
before generating, so an unintended structural change blocks the deploy.

## Local preview

```sh
npm install
npm run build          # writes a complete, unminified site to dist/
npx serve dist
```

`npm run build:strict` additionally fails on warnings. Commit `package-lock.json` after the first
`npm install`; the workflow uses it when present.
