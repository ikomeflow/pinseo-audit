# PINSEO Audit

## Affected items and phone layout

Main heading now includes an expandable outline with each heading's source order, level, text and optional ID. Image alt findings list the affected image positions, IDs and declared addresses. The app never fetches these images. Empty alt attributes are treated separately because decorative images can intentionally have empty descriptions. Lists retain actual totals while displaying at most 100 headings and 30 affected images. Source HTML can include hidden/theme headings and does not include changes made by page scripts.

Affected items are searchable and included in JSON, CSV and the complete print/PDF report. Repeat comparisons and personal review labels detect changed items even when the counts stay the same. The existing design and Futura Group credit are retained. Chrome responsive emulation was checked at actual 390- and 320-pixel document widths: a real Futura Group audit, expanded heading list, filtering and note entry fit without horizontal page overflow. This is browser emulation, not a physical-phone test. Fifty automated tests pass.

## Audit progress and usable reports

The form validates malformed or unsupported addresses before starting a request and explicitly describes the single-page scope. Audits stream real stages: reading the page, checking page details, robots.txt and the sitemap. Initial page findings can be read while resource checks continue. They are marked incomplete and cannot be exported until the final report arrives. Cancel stops the client request and propagates cancellation through server fetching and body reading; a previous successful report is retained. A partial or interrupted stream never becomes a successful report or a comparison baseline.

Flagged findings include practical checking steps and an optional WordPress guide. Instructions distinguish intentional indexing directives, decorative image descriptions and multiple headings from automatic errors. The existing evidence, priorities, notes and original blue-and-white layout are preserved.

PDF report opens a complete local print view with all findings and notes, independently of screen filters. Choose Print / Save PDF in that view, then Save as PDF in the browser. This uses browser printing and Unicode text without adding a PDF library or uploading report data. More report formats provides CSV and full JSON. CSV cells are escaped and protected against spreadsheet formula injection; print-view evidence and notes are HTML-escaped. Exports contain the public page report and personal checklist, not Google tokens or Search Console data. Reports and notes remain in tab memory unless the visitor exports them.

The HTML build uses React's renderToString for hydrateRoot compatibility. The Node preview forwards streaming response bodies rather than buffering a whole audit. Forty-four automated checks cover the existing audit and Google boundaries plus progress ordering, cancellation, interrupted streams, client validation and export safety.

## Finding search and repeat checks

Findings now include optional To do / Working on it / Reviewed progress and personal notes inside their existing details. A collapsed action checklist summarises flagged and personally annotated findings. State is isolated by exact final URL and retained only in tab memory; Save includes the current page's checklist in JSON. A changed evidence string is explicitly flagged and is not counted as a current reviewed item until reconfirmed. Manual progress never alters automated finding status.

The optional Google panel adds search and sort controls for returned terms and pages. An optional review-opportunity filter uses at least 100 impressions and under 3% CTR as an explicit starting threshold, not an SEO benchmark or promise. Missing metrics are not converted to zeros. Filters operate only on the bounded rows Google returned; they make no additional Google requests and do not imply exhaustive keyword coverage. Test fixtures for UI verification are local-only and excluded from publication.

The original blue-and-white layout is retained. The address field explains that a domain is accepted and adds HTTPS before submission; the server still validates public hosts, redirects, response sizes and timeouts. Search findings by words in their title, group, evidence or suggested action, alongside the existing status filters and a compact priority filter. Priorities are manual review guidance, never a ranking score or an instruction to change intentional directives.

Repeated successful checks of the same final URL (including its query) and the same source method can be compared in the current tab. The comparison shows previous/current evidence, newly flagged items, items no longer flagged and items now unavailable. Unavailable or omitted checks are never counted as fixed. A failed request keeps the previous successful report visible with an explicit message. No reports, history or Google tokens are persisted by these features.

Free, public, no-login website checks by Futura Group. Blue and white branding and the PA monogram follow the visual conventions inspected in ikomeflow/flowtrack. No analytics, audit database, paid data provider, or API key is required for public page checks. Optional Google Search Console authorization is separate and needs an owner-configured OAuth client.

## Run and verify

Use Node.js 22 or newer. Run npm ci, npm test, npm run build, then npm start. Open http://127.0.0.1:4173. The small React interface is rendered to HTML at build time, then hydrated in the browser. The build creates one self-contained Cloudflare Worker at dist/server/index.js. Runtime packages are bundled.

## What it checks

One public HTTPS page: title, description, H1s, canonical declarations, robots and googlebot meta directives, X-Robots-Tag, viewport, lang, image alt attributes, Open Graph metadata, and JSON-LD JSON syntax. It also requests robots.txt and one same-origin sitemap candidate. Findings are Observed, Review, or Not checked. Counts are counts, never an overall SEO grade. Lengths are context rather than fixed ranking rules.

It does not execute page JavaScript, crawl a whole site, verify Google indexing, measure keyword positions or backlinks, test every link, validate schema eligibility, or guarantee rankings. A noindex directive is surfaced; absence never proves indexability. A sitemap-shaped response is not proof of valid XML, valid listed URLs, or Search Console submission.

## PageSpeed

After a successful audit, Test speed opens Google PageSpeed Insights directly in a new tab with the audited final URL prefilled. Google runs and displays the speed report. PINSEO does not call the PageSpeed API, show speed scores, or wait for an API quota. No API key is needed by PINSEO for this link. The link preserves page query parameters, removes fragments, and rejects non-HTTPS or credentialed URLs.

## Google Search Console (optional)

The compact Google panel supports read-only property discovery, exact-page or whole-property web-search totals (clicks, impressions, CTR, historical average position), previous-period totals, and recorded URL indexing. Select 7, 28 or 90 days; the Pacific-date window ends three days before today, using final data only. Detail tabs show up to 20 search terms, pages and countries, device performance, and a daily clicks chart with an exact-values table. Each extra tab loads on demand and is cached for the current report. Missing dates and metrics remain missing; breakdown rows are not summed into totals. Property boundaries are checked. Google can omit rows and queries for privacy. Index inspection is the Google-recorded version, not a live test.

Google Identity Services obtains a short-lived token only after a user action. The client requests webmasters.readonly only. Tokens and results remain in tab memory, never local storage, cookies, a PINSEO database or the audit server. Google API calls use fixed allowlisted read endpoints. Expiration and disconnect clear data and cancel pending requests; disconnect requests Google revocation. No offline access or refresh tokens are used.

A Google web client restricted to https://audit.ikomeflow.com is now configured in the PINSEO Audit Google project. The client uses only webmasters.readonly; Google lists it as a non-sensitive scope. Google publishing status is now In production and the hosted mode is live. Google lists the read-only scope as non-sensitive; no sensitive-scope review is required. The user approved the audit-homepage ownership verification, and Google confirmed Ownership verified on 28 October 2026 for ikome2flow@gmail.com. The persistent verification tag is in build.mjs. Google says to allow 24 hours afterward before retrying the brand check; branding is not yet verified. A new public-user consent test remains unverified. Live Chrome testing successfully completed the Google consent flow, listed accessible properties, and displayed actual Search Analytics totals for Futura Group. The account does not currently list ikomeflow.com; that property must be added/verified in Search Console or accessed through an account with permission. Live exact-page traffic, top-query rendering and URL Inspection were also verified: Google returned “Submitted and indexed” for the audited Futura Group homepage. See SEARCH_CONSOLE_SETUP.md for configuration and the remaining verification steps. Public page checks remain available to everyone without Google sign-in.

## Privacy and abuse protection

Reports are held in browser memory; JSON download and print are optional. Requests are not stored in a database. Hosting, Google, DNS, and target-site providers may retain normal request logs. Submitting a page sends its URL to the audit server and hostname to Cloudflare public DNS. Running PageSpeed separately sends the URL to Google. Do not submit sensitive URLs.

Only HTTPS domain names on the default port are accepted. IP literals, private host suffixes, credentials, nonpublic DNS results, and private redirect destinations are rejected. DNS is checked again per redirect. Fetches use no visitor cookies or authorization, manual redirects, byte limits, and deadlines. Target HTML is never executed or returned as markup. React escapes evidence text. Deployed Workers must have no private-network/tunnel bindings. DNS checks are defense in depth, not a substitute for platform egress isolation.

The in-memory five-audits/minute/IP guard is per Worker isolate, best effort, and resets on restarts. It is not a distributed abuse quota. Each fetched page is at most 1 MB; robots.txt 128 KB; sitemap 256 KB; at most four redirects. A provider challenge may be returned as a 200 page; findings describe only the fetched response, not a verified search-engine view.

## Hosting and free limits

See DEPLOYMENT.md for actual live status, custom-domain records, and WordPress integration. This application needs a server endpoint and cannot run fully on GitHub Pages alone. GitHub stores source; the included workflow checks tests and build, without automatic production deployment. No billing plan or paid service was enabled. Hosting availability depends on the account's plan and limits; free does not promise unlimited traffic.

A direct alternative is a Cloudflare Workers Free account using wrangler.jsonc after building. The currently documented Free plan allows 100,000 requests/day with 10 ms CPU per request and limited subrequests; every asset/API request counts and audits need multiple outbound requests. Large parsing jobs can exceed CPU limits. Do not enable a paid Workers plan without the owner's approval. Limits: https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/workers/platform/pricing/. Sites hosting is governed by its own account terms; the direct Cloudflare Free allowance is not an asserted Sites entitlement.

## Source layout

app/ — interface and CSS; lib/audit.mjs — extraction, fetching, checks; lib/handler.mjs — HTTP API and rate guard; lib/pagespeed.mjs — direct Google report URL; worker/index.mjs — deployed request handler; build.mjs — bundling; tests/ — safety and accuracy regression tests; wordpress/ — landing page and portfolio card.

The production Worker uses native HTMLRewriter. The Node preview uses a WHATWG HTML parser (parse5). Both inspect source HTML without script execution. The working application was simplified from the large starter after dependency installation exhausted available disk space.

MIT License.
