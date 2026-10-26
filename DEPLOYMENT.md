# PINSEO Audit deployment

Verified 26 October 2026.

## Live addresses

- App: https://audit.ikomeflow.com/
- WordPress landing: https://ikomeflow.com/pinseo-audit/ (page 382)
- Source: https://github.com/ikomeflow/pinseo-audit
- Hosting fallback: https://pinseo-audit.brightrice2.chatgpt.site/

Sites audience is public. Page audits require no account. The homepage Work section includes PINSEO Audit beside BizTrack and FlowTrack, with the matching PA logo and card styling. Homepage navigation is Ebook, Work, Shop, About, Login.

## Current release

Sites version 6 uses source commit 6fcd7a909e808b424d1eb76e206cfdec4fb81fed. Deployment appgdep_6adfb630ea8081919a241ae7ac39d6c9 succeeded with environment revision 1. A later source commit may update these operational notes without changing application code. GitHub history differs from hosting history because files were uploaded through the signed-in GitHub interface after the connector rejected writes to this repository.

The minimal interface has one URL field and Run audit action, Review findings first, a direct Test speed link in the results toolbar, and collapsed help and Google panels. The WordPress landing now matches FlowTrack and BizTrack: dark full-width layout, shared navigation and typography, PA logo and one launch button. The Google report now adds 7/28/90-day periods, independent previous-period totals, and on-demand Search terms, Top pages, Devices, Countries and Trends views. Charts and tables use returned Google rows only. The custom domain returns HTTP 200. The hosted Google client is configured; testing status is explicit. No client secret is used by PINSEO.

## Google Search Console

Google Cloud project PINSEO Audit (cryptic-album-512817-n3) belongs to the intended Ikomeflow account. Search Console API is enabled. Branding uses the app, privacy and terms URLs, with ikomeflow.com as authorized domain. The web client is restricted to https://audit.ikomeflow.com. Only webmasters.readonly is requested. The owner approved Google’s User Data Policy, the web client, the contact email, the test user and the read-only grant.

Live Chrome testing successfully completed consent, listed accessible properties, and displayed actual Google Search Analytics totals for Futura Group. The report used a final-data window of 26 September–23 October 2026 in Pacific Time. Private measurements and tokens are not stored in this repository. The account does not list ikomeflow.com; that site needs a verified property or an account with access.

Google publishing status remains Testing. The Google console shows a lifetime cap of 100 users before verification; only approved test users can connect while testing. Public Google release/verification is not complete. The general public can still use page audits without signing in. See SEARCH_CONSOLE_SETUP.md.

## Verification

Thirty automated tests pass, including public/private URL restrictions, redirect validation, bounded responses, HTML/entity extraction, accurate status handling, direct PageSpeed URL handling, API origin/rate checks, Google property boundaries, Pacific date windows, invalid/missing metrics, token endpoint restrictions, exact-page filtering, independent totals, partial failure and authorization expiration. Added tests cover selectable date windows, adjacent comparison periods, all detail dimensions, bounded row limits and missing trend dates. The current local build and production deployment pass. GitHub CI runs tests and build for the source backup. New authenticated detail views still require live verification; the existing consent, traffic and indexing checks below describe earlier completed verification.

Real Chrome page audits completed for ikomeflow.com and futuragroup.io, each returning 16 findings. The Futura Group page showed 1 Review, 14 Observed and 1 Not checked. Google property discovery and traffic totals were verified live. A subsequent Chrome session verified exact-page traffic, top-query rendering and URL Inspection; Google returned “Submitted and indexed” for the Futura Group homepage. Live disconnect/revocation was not fully verified. Chrome disconnected during the phone-preview attempt; a new phone-size browser check was not completed. Responsive CSS is present. Desktop screenshots were saved.

Test speed now links directly to Google PageSpeed Insights for the audited final URL. The previous in-app API calls, score cards and device controls have been removed. Chrome verification completed a real audit of ikomeflow.com, followed the Test speed link and confirmed that Google generated its own PageSpeed report for the same URL. Google owns and displays those results. The landing page was visually compared with BizTrack, and the published app home screen was checked in Chrome. A new phone-size check was not performed.

## DNS and HTTPS

Cloudflare is authoritative. These records were added with Auto TTL, leaving existing records unchanged:

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| CNAME | audit | custom-domains.chatgpt.site | DNS only |
| TXT | _openai-site-verification.audit | openai-site-verification=WcLJ3DXSXqA_UIHMu_k8MdrJYiwP2uHzfGtKlma4j60 | DNS only |
| TXT | _cf-custom-hostname.audit | a0cd4baa-4f55-4daf-8fec-03e2e0bfc736 | DNS only |

The host confirmed domain and SSL active. These public verification values are not login credentials. Do not change nameservers or use FlowTrack’s GitHub Pages target for this server-backed app.

## Updates and limits

Run npm ci, npm run check, npm test and npm run build. Build output is dist/server/index.js and dist/.openai/hosting.json. Use the Sites source workflow to push and package the matching source state before publishing. Deploy a saved version after environment changes. GitHub CI verifies source but does not deploy production.

No paid SEO provider, billing upgrade, paid hosting plan, analytics or audit database was enabled. Hosting and Google quotas may interrupt checks. The rate guard is best effort, per isolate, and not a global quota. Page audits are limited to 1 MB and four redirects. Google reads are user-triggered, with no background polling or refresh tokens. Reports and tokens stay in tab memory.

Sites account terms govern the current host. The separately documented Cloudflare Workers Free limits are not an asserted Sites entitlement. Keep private network/tunnel bindings disabled. See README.md and Google’s official quota documentation for details.
