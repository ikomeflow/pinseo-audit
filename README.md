# PINSEO Audit

Free, public, no-login website checks by Futura Group. Blue and white branding and the PA monogram follow the visual conventions inspected in ikomeflow/flowtrack. No analytics, audit database, paid data provider, or API key is required for public page checks. Optional Google Search Console authorization is separate and needs an owner-configured OAuth client.

## Run and verify

Use Node.js 22 or newer. Run npm ci, npm test, npm run build, then npm start. Open http://127.0.0.1:4173. The small React interface is rendered to HTML at build time, then hydrated in the browser. The build creates one self-contained Cloudflare Worker at dist/server/index.js. Runtime packages are bundled.

## What it checks

One public HTTPS page: title, description, H1s, canonical declarations, robots and googlebot meta directives, X-Robots-Tag, viewport, lang, image alt attributes, Open Graph metadata, and JSON-LD JSON syntax. It also requests robots.txt and one same-origin sitemap candidate. Findings are Observed, Review, or Not checked. Counts are counts, never an overall SEO grade. Lengths are context rather than fixed ranking rules.

It does not execute page JavaScript, crawl a whole site, verify Google indexing, measure keyword positions or backlinks, test every link, validate schema eligibility, or guarantee rankings. A noindex directive is surfaced; absence never proves indexability. A sitemap-shaped response is not proof of valid XML, valid listed URLs, or Search Console submission.

## PageSpeed

An explicit Run PageSpeed button calls Google's PageSpeed Insights API directly from the visitor's browser, without a key. Only actual finite category scores from Google are displayed; missing scores remain unavailable. Runtime errors, timeout, and HTTP 429 never produce sample or estimated results. Tests are labeled mobile/desktop simulated Lighthouse lab data, with version, URL, and timestamp when supplied. This app does not claim real-user Core Web Vitals. Open in Google is available when the API is limited. See https://developers.google.com/speed/docs/insights/v5/get-started.

## Google Search Console (optional)

The compact Google panel supports read-only property discovery, exact-page or whole-property web-search totals (clicks, impressions, CTR, historical average position), top 5 queries, and recorded URL indexing. A 28-day Pacific-date window ends three days before today, using final data only. Missing rows stay unavailable; query rows are not summed into totals. Property boundaries are checked. Google can omit queries for privacy. Index inspection is the Google-recorded version, not a live test.

Google Identity Services obtains a short-lived token only after a user action. The client requests webmasters.readonly only. Tokens and results remain in tab memory, never local storage, cookies, a PINSEO database or the audit server. Google API calls use fixed allowlisted read endpoints. Expiration and disconnect clear data and cancel pending requests; disconnect requests Google revocation. No offline access or refresh tokens are used.

A Google web client restricted to https://audit.ikomeflow.com is now configured in the PINSEO Audit Google project. The client uses only webmasters.readonly; Google lists it as a non-sensitive scope. The connection starts in Testing and is labeled accordingly. Live Chrome testing successfully completed the Google consent flow, listed accessible properties, and displayed actual Search Analytics totals for Futura Group. The account does not currently list ikomeflow.com; that property must be added/verified in Search Console or accessed through an account with permission. Live exact-page traffic, top-query rendering and URL Inspection were also verified: Google returned “Submitted and indexed” for the audited Futura Group homepage. See SEARCH_CONSOLE_SETUP.md for configuration and the remaining verification steps. Public page checks remain available to everyone without Google sign-in.

## Privacy and abuse protection

Reports are held in browser memory; JSON download and print are optional. Requests are not stored in a database. Hosting, Google, DNS, and target-site providers may retain normal request logs. Submitting a page sends its URL to the audit server and hostname to Cloudflare public DNS. Running PageSpeed separately sends the URL to Google. Do not submit sensitive URLs.

Only HTTPS domain names on the default port are accepted. IP literals, private host suffixes, credentials, nonpublic DNS results, and private redirect destinations are rejected. DNS is checked again per redirect. Fetches use no visitor cookies or authorization, manual redirects, byte limits, and deadlines. Target HTML is never executed or returned as markup. React escapes evidence text. Deployed Workers must have no private-network/tunnel bindings. DNS checks are defense in depth, not a substitute for platform egress isolation.

The in-memory five-audits/minute/IP guard is per Worker isolate, best effort, and resets on restarts. It is not a distributed abuse quota. Each fetched page is at most 1 MB; robots.txt 128 KB; sitemap 256 KB; at most four redirects. A provider challenge may be returned as a 200 page; findings describe only the fetched response, not a verified search-engine view.

## Hosting and free limits

See DEPLOYMENT.md for actual live status, custom-domain records, and WordPress integration. This application needs a server endpoint and cannot run fully on GitHub Pages alone. GitHub stores source; the included workflow checks tests and build, without automatic production deployment. No billing plan or paid service was enabled. Hosting availability depends on the account's plan and limits; free does not promise unlimited traffic.

A direct alternative is a Cloudflare Workers Free account using wrangler.jsonc after building. The currently documented Free plan allows 100,000 requests/day with 10 ms CPU per request and limited subrequests; every asset/API request counts and audits need multiple outbound requests. Large parsing jobs can exceed CPU limits. Do not enable a paid Workers plan without the owner's approval. Limits: https://developers.cloudflare.com/workers/platform/limits/ and https://developers.cloudflare.com/workers/platform/pricing/. Sites hosting is governed by its own account terms; the direct Cloudflare Free allowance is not an asserted Sites entitlement.

## Source layout

app/ — interface and CSS; lib/audit.mjs — extraction, fetching, checks; lib/handler.mjs — HTTP API and rate guard; lib/pagespeed.mjs — score validation; worker/index.mjs — deployed request handler; build.mjs — bundling; tests/ — safety and accuracy regression tests; wordpress/ — landing page and portfolio card.

The production Worker uses native HTMLRewriter. The Node preview uses a WHATWG HTML parser (parse5). Both inspect source HTML without script execution. The working application was simplified from the large starter after dependency installation exhausted available disk space.

MIT License.
