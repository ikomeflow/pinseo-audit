# Google Search Console setup

Status: integration code implemented and deployed; Google project PINSEO Audit (cryptic-album-512817-n3) created under the correct Ikomeflow account. API enable submitted; OAuth client, consent verification and live Google-data verification pending. Public page audits remain available without signing in.

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

No authenticated Google read has been performed in the current environment; supplied-response tests are not proof of a working live consent flow.

## Data handling and quotas

Google Identity Services is loaded from Google only when the visitor opens the configured Google panel. Tokens and results stay in memory for that tab. Requests go directly to fixed Google endpoints with a bearer header, omit cookies and reject redirects. There is no refresh token or background polling. Disconnect clears the report and requests consent revocation; the visitor can also revoke from their Google account connections.

Each load makes two Search Analytics calls, plus one URL Inspection call for a page view. Property discovery adds one call per connection. Google enforces short-term and daily load quotas. URL Inspection currently permits 2,000 calls per property per day and 600 per minute. Errors display unavailable, never sample metrics. No paid SEO provider is used.

Official references:

- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/identity/protocols/oauth2/policies
- https://developers.google.com/webmaster-tools/v1/how-tos/authorizing
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- https://developers.google.com/webmaster-tools/limits
