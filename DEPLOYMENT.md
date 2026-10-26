# PINSEO Audit deployment

Verified 26 October 2026.

## Public addresses

- Application: https://audit.ikomeflow.com/
- Landing page: https://ikomeflow.com/pinseo-audit/
- GitHub: https://github.com/ikomeflow/pinseo-audit
- Hosting fallback: https://pinseo-audit.brightrice2.chatgpt.site/

The Sites audience is public. No ChatGPT or application sign-in is required. WordPress page ID is 382. The landing page includes a direct launch link; its integration HTML is in wordpress/pinseo-audit-page.html. The homepage Work section now includes PINSEO Audit beside BizTrack and FlowTrack, using the PA logo and matching card styles. Its navigation is Ebook, Work, Shop, About, Login.

## DNS and HTTPS

Cloudflare is authoritative for ikomeflow.com. Three new records were added with Auto TTL, leaving existing records unchanged:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | audit | custom-domains.chatgpt.site | DNS only |
| TXT | _openai-site-verification.audit | openai-site-verification=WcLJ3DXSXqA_UIHMu_k8MdrJYiwP2uHzfGtKlma4j60 | DNS only |
| TXT | _cf-custom-hostname.audit | a0cd4baa-4f55-4daf-8fec-03e2e0bfc736 | DNS only |

The hosting service confirmed domain active and SSL active. These public DNS verification values are not login credentials. Do not change nameservers or reuse FlowTrack's GitHub Pages target for this server-backed app.

## Current release and verification

Sites saved version 2 uses source commit 6d160add1f80abb020843c9538c5cd07f8861f79. The production deployment succeeded. GitHub contains the corresponding application source; its commit history differs because files were uploaded through the signed-in GitHub interface after the connector rejected writes to this new repository.

Sixteen automated tests pass. They cover public URL restrictions, private and reserved DNS addresses, per-redirect validation, response byte limits, HTML parsing, entity decoding, missing canonical evidence, indexing directives, unavailable checks, PageSpeed missing/invalid scores, API origin checks, and the per-isolate rate guard. The local build completed. Browser checks at a 390 px viewport confirmed a real audit, private-address rejection, working finding filters, and no horizontal overflow. Phone screenshots could not be captured by the in-app browser; desktop screenshots were saved.

An unauthenticated request to the production custom-domain API audited https://ikomeflow.com/ successfully (HTTP 200, 16 findings). Its title was decoded to “Ikome Princewill | Business Ebook & Tracking Apps”, 49 characters, rather than counting the entity markup. The landing page returned HTTP 200, had one H1, and included the correct HTTPS launch link.

Google PageSpeed's live API returned HTTP 429 during browser verification. The app showed quota exhaustion and no numeric scores. The actual successful-score display path is covered with supplied-response tests; a successful live Lighthouse run was not obtained.

## Updates

Run npm ci, npm run check, npm test, and npm run build. The build produces dist/server/index.js and dist/.openai/hosting.json. Push source and publish a matching archive through the Sites workflow. The GitHub workflow checks builds and tests; it does not automatically deploy production.

For a separate deployment to a personal Cloudflare Workers account, build first, use wrangler.jsonc, and stay on Workers Free. Do not deploy the server app to GitHub Pages alone. The existing .openai/hosting.json binds the current Sites project; an independent new Site must use its own identity.

## Costs and limitations

No paid SEO service, paid hosting plan, billing upgrade, API key, analytics, or audit database was enabled. The UI and README explain size, redirect, rate, hosting, and Google quota limits. Free does not mean unlimited traffic or guaranteed uptime. Sites account terms govern the current host. The separately documented Cloudflare Workers Free limits are not a claim about the Sites account's plan. See README.md for the official provider links.

The in-memory rate limiter is best effort, per isolate, and not a global distributed quota. DNS validation relies on public resolution and the Worker platform's egress isolation; never attach private network or tunnel bindings.

## Minimal interface and Search Console update

The new interface puts one URL field and audit action first, focuses findings on Review by default, and collapses help and the optional Google panel. Twenty-five automated tests pass, including Google property matching, Pacific dates, unavailable/invalid metrics, token destination restrictions, page filters, separate totals, partial failure and expiration. The local Worker build passes.

Search Console code is implemented but activation and live end-to-end verification are pending. The correct Ikomeflow Google account now has the dedicated PINSEO Audit project cryptic-album-512817-n3, and the Search Console API enable action was submitted. The owner must finish the OAuth web client and Google consent/verification process, and configure the public client ID as described in SEARCH_CONSOLE_SETUP.md. The app reports setup pending until configured; it never substitutes example data.

Sites version 3 (source 774698f153e9594b28bb6526a24b0d02cc58d00a, deployment appgdep_6adf953f77b481918f68e53bfb2f168b) published successfully. The custom domain returned HTTP 200 and the minimal heading. The public Google client configuration is currently empty; this is intentionally shown as setup pending. A real Chrome audit of ikomeflow.com completed with 16 findings (1 Review, 14 Observed, 1 Not checked). No live authenticated Google report has been verified.
