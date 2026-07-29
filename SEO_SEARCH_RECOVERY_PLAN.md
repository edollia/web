# doll.gg Search Result Recovery Plan

Status: planning only

Prepared: 2026-07-28

Target homepage: `https://doll.gg/`

## Goal

Improve the homepage result shown for searches such as `doll.gg` while preserving the existing design and interactions.

The implementation must:

- Keep the current decorative page title unchanged.
- Use the exact approved description:

  `The official doll.gg, Lia's little space`

- Add no visible SEO paragraph or new visible heading.
- Prevent header artwork and interactive interface text from being selected for Google snippets.
- Make the `doll.gg` website identity consistent without using the phrase `Lia at doll.gg`.
- Update crawler freshness signals.
- Avoid CSS, layout, media, wishlist, community, payment, and Rooms changes.

## Current Findings

The live homepage is technically crawlable:

- `https://doll.gg/` returns HTTP `200`.
- HTTP and `www` versions redirect to `https://doll.gg/`.
- The page declares `https://doll.gg/` as canonical.
- `robots.txt` allows the homepage and references the sitemap.
- `sitemap.xml` includes the homepage.
- Googlebot receives the same homepage HTML as a normal visitor.
- Most interactive content already has `data-nosnippet`.

The poor result is therefore not caused by a basic crawl block. The likely immediate causes are an older Google crawl, a very short current description, remaining snippet-eligible artwork text, and weak/inconsistent site-name signals.

## Approved Copy

### Page title

Keep the existing title exactly:

`Lia ⋆౨ৎ˚⟡`

Do not replace it with:

- `Lia at doll.gg`
- `Lia — doll.gg`
- `Lia at doll.gg — Official Links`
- Any other combined Lia/domain title

### Search description

Use this exact text everywhere a page description is expected:

`The official doll.gg, Lia's little space`

Do not add a period or alter capitalization, punctuation, or apostrophes.

### Existing page heading

Keep the existing visually hidden H1:

`Lia's little space`

Do not add a new visible SEO heading or paragraph.

## Planned File Changes

Only the following files should be edited:

1. `index.html`
2. `script.js`
3. `admin.js`
4. `admin/index.html`
5. `sitemap.xml`

No other files should be changed unless validation reveals a direct requirement.

## Implementation Details

### 1. Static homepage metadata

In `index.html`:

- Keep `<title>` unchanged.
- Change `meta[name="description"]` to the approved description.
- Keep `og:title` unchanged.
- Change `og:description` to the approved description.
- Keep `twitter:title` unchanged.
- Change `twitter:description` to the approved description.
- Keep the canonical URL unchanged.
- Keep the robots directive unchanged.

Expected values:

```html
<title>Lia ⋆౨ৎ˚⟡</title>
<meta name="description" content="The official doll.gg, Lia's little space">
<meta property="og:title" content="Lia ⋆౨ৎ˚⟡">
<meta property="og:description" content="The official doll.gg, Lia's little space">
<meta name="twitter:title" content="Lia ⋆౨ৎ˚⟡">
<meta name="twitter:description" content="The official doll.gg, Lia's little space">
```

### 2. Structured data

In the JSON-LD graph in `index.html`:

- Set `WebSite.name` to `doll.gg`.
- Set `WebSite.alternateName` to `Lia`.
- Keep the Person name as `Lia`.
- Keep WebPage and ProfilePage names as `Lia ⋆౨ৎ˚⟡`.
- Set the descriptions on WebSite, Person, WebPage, and ProfilePage to the approved description.
- Keep all canonical IDs and URLs unchanged.
- Keep `sameAs` links unchanged.
- Keep ProfilePage `mainEntity` pointing to the Lia Person node.
- Update WebPage and ProfilePage `dateModified` to the deployment date and a valid ISO 8601 timestamp.

The structured data must continue to parse as valid JSON.

### 3. Site-name metadata

In `index.html`:

- Change `og:site_name` from `Lia` to `doll.gg`.

The resulting identity model will be:

- Website: `doll.gg`
- Alternate website name: `Lia`
- Person/profile owner: `Lia`
- Page title: `Lia ⋆౨ৎ˚⟡`
- Existing page heading: `Lia's little space`

The phrase `Lia at doll.gg` will not be introduced.

### 4. Snippet exclusions

The implementation will preserve all existing `data-nosnippet` attributes.

Add `data-nosnippet` to:

- The homepage `<header>` containing the header artwork.
- The homepage brand `<footer>`.

Keep the existing exclusions on:

- Loading screen
- Interactive toggle container
- Social and wishlist interface
- Community tools
- Submission confirmation
- Admin gate
- Maintenance overlay

Do not add `data-nosnippet` to the entire `.main-screen`. The existing H1 should remain eligible page content so Google is not left with an entirely snippet-ineligible body.

`data-nosnippet` is a crawler-facing attribute. No CSS or JavaScript behavior should be attached to it, so these additions must not change appearance or interactions.

### 5. Public runtime SEO settings

The public page loads `site_settings` from Supabase and can replace the static description after JavaScript starts.

In `script.js`:

- Keep the default SEO title unchanged.
- Change `DEFAULT_LINK_SETTINGS.seo_description` to the approved description.
- Keep `site_tagline` as `Lia's little space.` unless separately requested.
- Preserve the existing runtime synchronization of meta and structured-data descriptions.

Add a narrow legacy-default migration:

- If a stored or cached SEO description is exactly `Lia's little space`, treat it as the retired default and use the new approved description.
- If the stored description is empty, use the new approved description.
- If the stored description is any other non-empty custom value, preserve it.

This prevents an old Supabase row or browser cache from restoring the retired description while preserving the admin's ability to use a genuinely custom description later.

### 6. Admin SEO settings

In `admin.js`:

- Keep the default SEO title unchanged.
- Change the default SEO description to the approved description.
- Apply the same narrow legacy-default migration used by the public page.
- Keep the profile tagline unchanged.
- Preserve the existing save, preview, and crawler-copy comparison behavior.

In `admin/index.html`:

- Keep the preview title unchanged.
- Change the preview description to the approved description.
- Change the SEO-description field placeholder to the approved description.

This ensures the admin preview, saved settings, public runtime, and crawler-facing HTML agree.

### 7. Cache versions

Because `script.js` and `admin.js` will change:

- Increment the `script.js` query-string version in `index.html`.
- Increment the `admin.js` query-string version in `admin/index.html`.
- Update the release/cache identifier only where needed to ensure the edited scripts are fetched.
- Do not change stylesheet versions when no stylesheet changes are made.

The version changes must be limited and must not trigger unrelated media or layout changes.

### 8. Sitemap and freshness

In `sitemap.xml`:

- Keep the single canonical homepage URL.
- Update `<lastmod>` to the actual implementation/deployment date in `YYYY-MM-DD` format.

In `index.html`:

- Use the same deployment date for structured-data `dateModified`, expressed as a valid ISO 8601 timestamp.

The sitemap date should be updated only when the planned content changes are implemented, not merely because this plan was created.

## Explicit Non-Goals

The implementation will not:

- Change the visible design.
- Add a visible SEO paragraph.
- Add a new visible H1.
- Use the phrase `Lia at doll.gg`.
- Change the decorative title.
- Add keywords unrelated to the homepage.
- Add new pages.
- Change social destinations or usernames.
- Change wishlist behavior.
- Change Ko-fi, Throne, Apple Pay, or payment behavior.
- Change questions, doodles, reactions, or community-wall behavior.
- Change Rooms.
- Change loading or entry animations.
- Modify CSS.
- Attempt to guarantee a particular Google ranking or snippet.

## Safety and Validation Plan

### Before editing

- Confirm the worktree state.
- Preserve all unrelated modified and untracked files.
- Record the current relevant metadata and script versions.

### Static validation

- Run `git diff --check`.
- Confirm only the five planned files changed.
- Parse the JSON-LD block as JSON.
- Parse `sitemap.xml` as XML.
- Confirm there is exactly one canonical homepage declaration.
- Confirm the robots directive still permits indexing.
- Confirm all static description fields use the exact approved description.
- Confirm all static and default title fields remain `Lia ⋆౨ৎ˚⟡`.
- Confirm no `Lia at doll.gg` phrase was introduced.
- Confirm the structured-data IDs and `sameAs` URLs did not change.

### Runtime validation

Verify the following cases:

1. No Supabase settings are available:
   - The approved default description remains active.

2. Supabase contains the retired value `Lia's little space`:
   - The approved description replaces it in memory.

3. Supabase contains an empty description:
   - The approved default description is used.

4. Supabase contains a different custom description:
   - The custom value is preserved.

5. Cached settings contain the retired value:
   - The approved description is used.

6. Admin preview and crawler-copy comparison:
   - Title and description checks agree with `index.html`.

### UI regression validation

Load the homepage locally at desktop and mobile viewport sizes and verify:

- Loading/entry screen still works.
- Header art renders normally.
- Socials menu opens and closes.
- Wishlist link still opens its configured destination.
- Action/community interface opens and closes.
- Questions and doodles remain usable.
- Footer remains visually unchanged.
- No new visible text appears.
- No console error is introduced by the SEO changes.

Since no CSS or interaction logic is planned, any visual or functional difference should stop the implementation until investigated.

### Live validation after deployment

Once deployed:

- Fetch `https://doll.gg/` and confirm HTTP `200`.
- Confirm HTTP and `www` still redirect to the canonical HTTPS URL.
- Confirm the live raw HTML contains the approved description.
- Confirm Googlebot receives the same HTML.
- Confirm `robots.txt` remains accessible.
- Confirm `sitemap.xml` contains the updated `<lastmod>`.
- Confirm the deployed script URLs contain the new cache versions.

## Deployment and Google Search Console Runbook

After the changes are committed and deployed:

1. Wait until `https://doll.gg/` serves the new raw HTML.
2. Open Google Search Console.
3. Select the domain property for `doll.gg`.
4. Open URL Inspection.
5. Inspect `https://doll.gg/`.
6. Record the indexed page's last crawl date.
7. Confirm the Google-selected canonical is `https://doll.gg/`.
8. Select **Test live URL**.
9. Confirm:
   - Page fetch is successful.
   - Indexing is allowed.
   - No blocking resource or fetch error is reported.
10. Select **Request indexing**.
11. Open the Sitemaps report.
12. Submit `https://doll.gg/sitemap.xml`.
13. Confirm the sitemap status becomes successful.
14. Check:
   - Manual Actions
   - Security Issues
   - Removals
15. In Performance, monitor these queries:
   - `doll.gg`
   - `"doll.gg"`
   - `lia doll.gg`
   - `pawswirl`

Google controls the final title link, snippet, and ranking. A recrawl may occur quickly, but visible changes can take several days or longer.

## Off-Site Follow-Up

Where profile fields allow it, use the exact canonical URL:

`https://doll.gg/`

Add it to relevant public profiles such as Instagram, Ko-fi, Throne, Telegram, Snapchat, and other enabled profiles. Use one consistent URL rather than mixing HTTP, `www`, `/index.html`, and the canonical homepage.

This is a manual account-level action and is not part of the repository patch.

## Implementation Order

When implementation is approved:

1. Update static metadata and structured data in `index.html`.
2. Finish the narrow `data-nosnippet` coverage.
3. Update public runtime defaults and legacy handling in `script.js`.
4. Update admin defaults, legacy handling, preview, and placeholder.
5. Update script cache versions.
6. Update structured-data and sitemap dates to the real deployment date.
7. Run static and runtime validation.
8. Run local desktop/mobile regression checks.
9. Review the final diff for scope.
10. Deploy only after all checks pass.
11. Verify the live deployment.
12. Complete the Search Console runbook.

## Approval Gate

This document does not authorize or perform the implementation itself.

Implementation should begin only after approval of:

- The exact description: `The official doll.gg, Lia's little space`
- The site identity model: website `doll.gg`, person `Lia`
- The five-file change scope
- The legacy-default migration behavior
- The Search Console rollout
