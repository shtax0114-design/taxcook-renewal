# Taxcook renewal preview notes

Preview channel:

https://taxcook-vat--renewal-test-s5q3egt6.web.app

This folder is a static homepage renewal preview. Do not deploy it to the live
channel as-is, because the current production site is a Nuxt app with working
routes such as `/vatax`, `/gitax`, `/office`, `/mypage`, `/doc1`, and `/doc2`.

Before production release, choose one of these paths:

1. Recover the original Nuxt source and apply the redesign there.
2. Rebuild the required functional routes in the new frontend.
3. Preserve the current Nuxt app under a separate legacy target and update links
   intentionally.

SEO additions included in this preview:

- `robots.txt`
- `sitemap.xml`
- canonical URL
- meta description
- Open Graph metadata
- semantic heading structure
- descriptive image alt text
