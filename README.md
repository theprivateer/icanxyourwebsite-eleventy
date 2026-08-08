# I Can … Your Website

This repository contains the shared Eleventy implementation for three related static websites:

| Branch | Website |
| --- | --- |
| `build` | [icanbuildyour.website](https://icanbuildyour.website) |
| `fix` | [icanfixyour.website](https://icanfixyour.website) |
| `manage` | [icanmanageyour.website](https://icanmanageyour.website) |

The sites share their layouts, build configuration, tests, routes, feeds, and Cloudflare Pages support. Each deployment branch owns its identity, compiled stylesheet, pages, and blog posts.

## Branch strategy

`main` is the content-neutral base. It deliberately contains no site Markdown and uses placeholder values in `src/_data/site.js`. Shared Eleventy changes should be made and tested on `main`.

The three site branches are parallel branches from `main`:

- `build` contains the I Can Build Your Website configuration and content.
- `fix` contains the I Can Fix Your Website configuration and content.
- `manage` contains the I Can Manage Your Website configuration and content.

Site-specific work should be committed only to the relevant site branch. When shared code changes on `main`, merge `main` into each deployment branch and verify each branch before deployment:

```sh
git switch build
git merge main
npm test

git switch fix
git merge main
npm test

git switch manage
git merge main
npm test
```

Do not merge one deployment branch into another. Doing so would mix their configurations and content.

## Site configuration

Branch-specific identity is defined in `src/_data/site.js`:

- site key and full name
- two-line masthead wording
- canonical URL
- meta description
- LinkedIn URL
- Fathom site ID

The contact email, True North Labs footer, copyright years, templates, content routes, RSS feed, sitemap, date formatting, and Cloudflare headers are shared.

## Content

Content lives in:

```text
src/content/pages/
src/content/posts/
```

Page frontmatter contains only the page title. Blog post filenames contain only their slug, while the original Statamic publication timestamp is stored in frontmatter. Dates are rendered in the Australia/Brisbane timezone.

The migration script converts a Statamic site's collections into the format expected by Eleventy:

```sh
ruby scripts/migrate-statamic.rb ../../ICanXYourWebsite/icanfixyour.website
```

Run it only after switching to the corresponding deployment branch. The script removes the existing Markdown files from `src/content/pages/` and `src/content/posts/` before importing the selected Statamic content.

After migrating, review the changes and run the test suite before committing:

```sh
npm test
git diff --check
git status
```

## Local development

Node.js 22 or newer is required.

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The generated site is written to `_site/`.

## Testing

```sh
npm test
```

The tests verify migrated routes, cleaned frontmatter, post filenames and dates, blog ordering, site configuration, unresolved template syntax, internal links, and Cloudflare security headers.

## Cloudflare Pages

Create one Cloudflare Pages project for each website and target its corresponding deployment branch.

Use the same build settings for all three projects:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `_site` |
| Node version | `22` |

Set the production branch to `build`, `fix`, or `manage` for the appropriate project. The generated `_headers`, `robots.txt`, RSS feed, and sitemap are included in the deployment output.
