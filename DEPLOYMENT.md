# PINSEO Audit deployment

Verified 28 October 2026.

## Approved homepage ownership verification — 28 October 2026

The user explicitly approved verifying https://audit.ikomeflow.com/ for ikome2flow@gmail.com. A persistent Google verification meta tag was added to the homepage head in build.mjs, with no visible design change. Sites version 13 (source a333e3ea00fcd36cab853113386968a12d03ae70) deployed successfully as appgdep_6ae1cda8ed1881919f95dde39c29850b with environment revision 2. The exact custom-domain homepage returned HTTP 200 with one matching verification tag. Google Search Console then confirmed Ownership verified using HTML tag. No other website or account was granted owner access. Keep the tag permanently. Google branding remains pending a recheck after its requested 24-hour propagation period. A fresh public-user consent flow has not been tested.

## Affected-item update — 27 October 2026

Heading findings list ordered H1–H6 text and IDs; missing-alt findings list exact source image positions, IDs and declared addresses without loading images. Lists are bounded to 100 headings and 30 affected images, with full totals shown. Search, same-page comparisons, personal review invalidation and all report exports include the affected items. Fifty automated tests pass and the Worker builds successfully.

Chrome DevTools responsive mode confirmed actual document widths of 390 and 320 pixels, with matching scroll widths and no horizontal overflow during a real completed Futura Group audit, expanded heading list, filtering and note entry. Progress selection also worked. This supersedes the earlier unverified viewport attempt below; no physical handset was used. Device mode was switched off afterward.

Google Audience now reports In production for the existing project, and the non-sensitive read-only scope needs no sensitive-scope verification. Hosted GOOGLE_SEARCH_CONSOLE_MODE was changed to live and deployment appgdep_6ae170c7b7848191a2df1757f7617071 succeeded with environment revision 2 and Sites version 11. The current production project can be retained; any future OAuth testing environment should use a separate project. No new OAuth credential or owner grant was created. Google brand verification was attempted and returned one issue: the app homepage is not registered to the owner account. Verify the audit homepage with specific owner approval, then allow the 24 hours Google requests before retrying branding. Public-user consent has not been newly tested. See SEARCH_CONSOLE_SETUP.md.

## Live addresses

- App: https://audit.ikomeflow.com/
- WordPress landing: https://ikomeflow.com/pinseo-audit/ (page 382)
- Source: https://github.com/ikomeflow/pinseo-audit
- Hosting fallback: https://pinseo-audit.brightrice2.chatgpt.site/

Sites audience is public. Page audits require no account. The homepage Work section includes PINSEO Audit beside BizTrack and FlowTrack, with the matching PA logo and card styling. Homepage navigation is Ebook, Work, Shop, About, Login.

## Usability update — 27 October 2026

The update preserves Site identity, public audience, custom domain, environment configuration, Google scopes and branding. It adds real streamed audit stages, cancellation, clearly labelled preliminary page findings, early address validation, practical finding guides and complete PDF/print, CSV and JSON reports. Browser printing creates PDFs locally; there is no report upload or new PDF dependency. Partial streams are not exportable and never replace the last completed report or its comparison baseline. The original layout and Produced by Futura Group credit are retained.

Automated verification: 44 tests passed and the self-contained Worker built successfully. Local browser checks confirmed completed real audits, cancellation retaining the last report, immediate invalid-address feedback, WordPress guidance, and a full 16-finding print view including a test note while the application view was filtered to one finding. A fresh preview has no React initialization errors after replacing non-hydratable static rendering with renderToString. Chrome's viewport override did not change the actual page width, so a real phone-width browser check remains unverified. Release version and deployment identity are recorded by native Sites history after publication.

## Deployment history (earlier release)

Sites version 9 was deployed at source commit 6ae2aa02be08ece2b2417d25ad5b21302ca96617. Deployment appgdep_6ae0661a7c9c8191aab12bc85234cd22 succeeded with environment revision 1. GitHub is a source backup with its own commit history; GitHub CI checks the code and does not deploy production. The app and legal-page footers now say Produced by Futura Group. WordPress page 382 was updated separately: the launch credit, footer, search title/description and inherited Open Graph/Twitter title/description now use Produced by Futura Group. The wordpress directory stores its matching launch HTML and metadata settings.

The minimal interface has one URL field and Run audit action, Review findings first, a direct Test speed link in the results toolbar, and collapsed help and Google panels. The WordPress landing now matches FlowTrack and BizTrack: dark full-width layout, shared navigation and typography, PA logo and one launch button. The Google report now adds 7/28/90-day periods, independent previous-period totals, and on-demand Search terms, Top pages, Devices, Countries and Trends views. Charts and tables use returned Google rows only. The custom domain returns HTTP 200. The hosted Google client is configured; testing status is explicit. No client secret is used by PINSEO.

## Google Search Console

Google Cloud project PINSEO Audit (cryptic-album-512817-n3) belongs to the intended Ikomeflow account. Search Console API is enabled. Branding uses the app, privacy and terms URLs, with ikomeflow.com as authorized domain. The web client is restricted to https://audit.ikomeflow.com. Only webmasters.readonly is requested. The owner approved Google’s User Data Policy, the web client, the contact email, the test user and the read-only grant.

Live Chrome testing successfully completed consent, listed accessible properties, and displayed actual Google Search Analytics totals for Futura Group. The report used a final-data window of 26 September–23 October 2026 in Pacific Time. Private measurements and tokens are not stored in this repository. The account does not list ikomeflow.com; that site needs a verified property or an account with access.

At the earlier verification, Google publishing status was Testing and only approved test users could connect. The current production status and remaining branding issue are recorded above. The general public can still use page audits without signing in. See SEARCH_CONSOLE_SETUP.md.

## Earlier verification

The current app includes domain-friendly entry, finding search and priority filters, same-page repeat comparisons, an action checklist with progress and notes, and search/sort/opportunity filters for returned Google terms and pages. Notes and progress remain in tab memory; Save includes them in the downloaded JSON. The checklist and keyword controls passed local interface checks; the keyword controls used explicitly labelled sample data. A live audit and the published credits were verified in Chrome. The existing Google authorization flow was unchanged; a new authenticated Google check and phone-size check were not completed for these updates.

Thirty-seven automated tests pass, including public/private URL restrictions, redirect validation, bounded responses, HTML/entity extraction, accurate status handling, direct PageSpeed URL handling, API origin/rate checks, Google property boundaries, Pacific date windows, invalid/missing metrics, token endpoint restrictions, exact-page filtering, independent totals, partial failure and authorization expiration. Added tests cover selectable date windows, adjacent comparison periods, all detail dimensions, bounded row limits and missing trend dates. The current local build and production deployment pass. GitHub CI runs tests and build for the source backup. New authenticated detail views still require live verification; the existing consent, traffic and indexing checks below describe earlier completed verification.

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
