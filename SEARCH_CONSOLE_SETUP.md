# Google Search Console setup

## Public-release status — 27 October 2026

Google Auth Platform Audience now reports **In production** for PINSEO Audit (cryptic-album-512817-n3), under ikome2flow@gmail.com. The existing web client is retained. GOOGLE_SEARCH_CONSOLE_MODE is now live in hosted environment revision 2, applied by a successful deployment. No new OAuth client, permission scope or verified-owner grant was created. A new consent test by an account outside the former test-user list remains unverified.

Google lists webmasters.readonly as non-sensitive. Verification Center confirms that sensitive-scope verification is not required. Branding contains PINSEO Audit, ikome2flow@gmail.com as support/developer contact, https://audit.ikomeflow.com/ as homepage, /privacy and /terms on that host, and ikomeflow.com as the authorized domain. The privacy page describes data use, memory-only token handling, revocation and Google's Limited Use requirements.

The automated brand verification was run. Google returned one issue: the homepage https://audit.ikomeflow.com/ is not registered to the account. Branding is therefore not yet shown to users. Google instructs the owner to verify the homepage and wait 24 hours before retrying, so that its systems can update. Do not request re-verification before addressing this issue, and do not describe the app as brand-verified.

Prepared next action: add/verify the narrow URL-prefix Search Console property https://audit.ikomeflow.com/ for ikome2flow@gmail.com. This establishes verified-owner access and needs the user's specific approval before completing verification or publishing a verification tag. It is separate from PinPets, which must not be verified. Do not grant other accounts access. Once ownership is confirmed and Google's waiting period has elapsed, retry the branding check. Any legal declarations require owner acceptance. No email or support message has been sent.

The existing project is now the production configuration. Use a separate Google project for any future development/testing client, consistent with Google's production-readiness guidance. Keep the production origin restricted to https://audit.ikomeflow.com, request only webmasters.readonly, and do not add offline access, server redirects, localhost origins or a client secret to PINSEO. No billing upgrade is needed for this setup.

References: https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance and https://support.google.com/cloud/answer/13807376.

Initial setup history: integration code implemented and deployed; Google project PINSEO Audit (cryptic-album-512817-n3) created under the correct Ikomeflow account. Search Console API enabled, consent branding and read-only scope saved, and a web client restricted to https://audit.ikomeflow.com created. Google connection initially used Testing. The approved Ikomeflow test account completed consent, property discovery and a live Futura Group traffic report. Exact-page traffic, top queries and URL Inspection were verified live; Google returned “Submitted and indexed” for the Futura Group homepage. Public Google release/verification remains outstanding. Public page audits remain available without signing in.

## Owner configuration

1. Sign in to Google Cloud with the account that should own PINSEO (the Ikomeflow account is available in Chrome). Review and accept first-time Google Cloud Terms of Service yourself if acceptable. The earlier MFA blocker belonged to another signed-in Google account. Account-security steps and legal acceptance require the owner’s involvement.
2. Select or create the intended Google Cloud project. Enable **Google Search Console API**. Do not enable a paid hosting plan or billing upgrade for this integration.
3. In Google Auth Platform, configure the app name **PINSEO Audit**, external audience, support/developer email chosen by the owner, and the authorized domain **ikomeflow.com**. The homepage is https://audit.ikomeflow.com/, privacy is https://audit.ikomeflow.com/privacy, and terms are https://audit.ikomeflow.com/terms. Verify domain ownership as required by Google.
4. Declare only `https://www.googleapis.com/auth/webmasters.readonly`. Do not request the read/write scope, email, profile, offline access or unrelated permissions.
5. Create an OAuth **Web application** client. This creates a persistent authorization credential and requires the owner’s explicit approval at creation. Authorized JavaScript origin: `https://audit.ikomeflow.com`. The GIS token popup model needs no server redirect URL or client secret. Use the custom domain for Google sign-in; the hosting fallback remains a page-audit fallback unless separately authorized by Google.
6. Set the hosted environment variable **GOOGLE_SEARCH_CONSOLE_CLIENT_ID** to that client ID using the Sites environment tool. It is a public identifier; a client secret must never be supplied or exposed. `/api/config` returns only a syntactically valid client ID and no other environment data.
7. Start in Testing with explicitly chosen test users. Follow Google’s consent and sensitive-scope verification requirements before treating the connection as available to the general public. An OAuth client ID alone does not imply production verification.

## End-to-end checks after setup

In regular Chrome, open the optional Google panel, approve read-only access yourself, choose an accessible Search Console property, and load data. Check exact-page versus whole-property labeling, the 28-day dates, real totals, empty results, property mismatch, indexing errors, expired access, disconnect, and a different audited page. The API may return no data for new or low-traffic properties. Index inspection is Google’s recorded version and cannot run a live indexability test.

Authenticated property discovery and Search Analytics totals were verified in Chrome with the approved test account. Exact-page traffic, top queries and URL Inspection were also verified live. Live disconnect/revocation has not been verified; supplied-response tests cover request and failure handling. No private Google token or report data is committed to source.

## Data handling and quotas

Google Identity Services is loaded from Google only when the visitor opens the configured Google panel. Tokens and results stay in memory for that tab. Requests go directly to fixed Google endpoints with a bearer header, omit cookies and reject redirects. There is no refresh token or background polling. Disconnect clears the report and requests consent revocation; the visitor can also revoke from their Google account connections.

Each report load makes three Search Analytics calls: current totals, previous-period totals, and up to 20 search terms. A page view adds one URL Inspection call. Opening Top pages, Devices, Countries or Trends makes one additional read on demand, then caches the returned view for that report. Changing period, scope or property clears the cache and report; reconnecting or expiry also clears it. Property discovery adds one call per connection. Google enforces short-term and daily load quotas. Errors display unavailable, never sample metrics. No paid SEO provider is used.

The period selector supports 7, 28 and 90 days with final data ending three days before today in Pacific Time. Previous periods are equal-length, adjacent and non-overlapping. Queries, pages and countries are limited to 20 returned rows, devices to 10, and dates to the selected window length. Country values are Google's three-letter codes. Charts show only returned dates; omitted dates are never inserted as zero traffic. Average positions are historical and all breakdowns retain the chosen exact-page or whole-property scope. Page aggregation and privacy omissions mean tables may not add up to ungrouped totals. These additions use the existing read-only permission.

Official references:

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- https://developers.google.com/webmaster-tools/limits

Runtime keys: GOOGLE_SEARCH_CONSOLE_CLIENT_ID is the public web-client identifier. GOOGLE_SEARCH_CONSOLE_MODE defaults to testing; set it to live only after the corresponding Google publishing status is Production. Deploy a saved version after environment changes. The app shows the testing restriction in its Google panel. Referrer policy follows Google’s strict-origin-when-cross-origin recommendation.

## Current access and branding limit

Google publishing status is In production and the hosted mode is live. The scope is non-sensitive, so the sensitive/unapproved-scope lifetime cap shown by Google is not an asserted cap on this app's read-only flow. Brand verification remains blocked on homepage ownership as described above. General page checks remain public without Google sign-in. Confirm a real consent flow with a separate permitted account before claiming a new public-user end-to-end test.
