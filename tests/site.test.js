import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import site from "../src/_data/site.js";

const outputDirectory = path.resolve("_site");
const pagesDirectory = path.resolve("src/content/pages");
const postsDirectory = path.resolve("src/content/posts");

async function filesBelow(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    if ((await stat(fullPath)).isDirectory()) {
      files.push(...await filesBelow(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function markdownFiles(directory) {
  return (await readdir(directory)).filter((file) => file.endsWith(".md")).sort();
}

function frontmatterValue(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) {
    return undefined;
  }

  const value = match[1].trim();
  return value.startsWith('"') ? JSON.parse(value) : value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

test("build creates every migrated route", async () => {
  const outputFiles = await filesBelow(outputDirectory);
  const htmlFiles = outputFiles.filter((file) => file.endsWith(".html"));
  const pages = await markdownFiles(pagesDirectory);
  const posts = await markdownFiles(postsDirectory);
  const postPages = htmlFiles.filter((file) => file.includes(`${path.sep}blog${path.sep}`));

  assert.equal(htmlFiles.length, pages.length + posts.length + 3, "content routes plus blog, privacy, and 404");
  assert.equal(postPages.length, posts.length + 1, "posts plus the blog index");

  for (const file of pages) {
    const slug = path.basename(file, ".md");
    const target = slug === "home" ? "index.html" : `${slug}/index.html`;
    assert.ok((await stat(path.join(outputDirectory, target))).isFile(), target);
  }

  for (const relativePath of [
    ".well-known/security.txt",
    "404.html",
    "assets/apple-touch-icon.png",
    "assets/favicon.svg",
    "assets/icon-192.png",
    "assets/icon-512.png",
    "assets/social-card.png",
    "blog/index.html",
    "favicon.ico",
    "feed.xml",
    "llms.txt",
    "manifest.webmanifest",
    "privacy/index.html",
    "robots.txt",
    "sitemap.xml",
    "_headers",
  ]) {
    assert.ok((await stat(path.join(outputDirectory, relativePath))).isFile(), relativePath);
  }
});

test("post filenames contain only their slug and dates live in frontmatter", async () => {
  const files = await markdownFiles(postsDirectory);

  assert.equal(files.some((file) => /^\d{4}-\d{2}-\d{2}/.test(file)), false);

  for (const file of files) {
    const markdown = await readFile(path.join(postsDirectory, file), "utf8");
    assert.match(markdown, /^date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/m, file);
  }
});

test("content omits Statamic-only frontmatter", async () => {
  const files = (await filesBelow(path.resolve("src/content"))).filter((file) => file.endsWith(".md"));

  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const relativePath = path.relative("src/content", file);
    assert.doesNotMatch(markdown, /^(?:id|blueprint|author|updated_by|updated_at|template|content):/m, relativePath);
  }
});

test("blog archive is sorted newest first", async () => {
  const files = await markdownFiles(postsDirectory);
  if (files.length === 0) {
    return;
  }

  const posts = await Promise.all(files.map(async (file) => {
    const markdown = await readFile(path.join(postsDirectory, file), "utf8");
    return {
      date: frontmatterValue(markdown, "date"),
      title: frontmatterValue(markdown, "title"),
    };
  }));
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const blog = await readFile(path.join(outputDirectory, "blog/index.html"), "utf8");
  assert.ok(blog.indexOf(escapeHtml(posts[0].title)) < blog.indexOf(escapeHtml(posts.at(-1).title)));
});

test("site configuration drives shared presentation and metadata", async () => {
  const blog = await readFile(path.join(outputDirectory, "blog/index.html"), "utf8");
  const robots = await readFile(path.join(outputDirectory, "robots.txt"), "utf8");

  assert.match(blog, new RegExp(`<title>${escapeHtml(site.name)} \\| Blog</title>`));
  assert.match(blog, new RegExp(`${escapeHtml(site.headerLineOne)}<br>${escapeHtml(site.headerLineTwo)}`));
  assert.match(blog, new RegExp(`href="${escapeHtml(site.linkedinUrl)}"`));
  assert.match(robots, new RegExp(`Sitemap: ${site.url.replaceAll(".", "\\.")}\\/sitemap\\.xml`));
  assert.doesNotMatch(blog, /<script\b(?![^>]*type="application\/ld\+json")/);
});

test("every HTML page has complete, page-specific metadata", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));
  const descriptions = new Map();

  for (const file of files) {
    const relativePath = path.relative(outputDirectory, file);
    const html = await readFile(file, "utf8");
    const titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)];
    const description = html.match(/<meta name="description" content="([^"]+)">/);

    assert.equal(titles.length, 1, `${relativePath}: one title`);
    assert.ok(titles[0][1].trim(), `${relativePath}: non-empty title`);
    assert.match(html, new RegExp(`<html lang="${site.language}">`), `${relativePath}: document language`);
    assert.ok(description?.[1], `${relativePath}: meta description`);
    assert.ok(description[1].length <= 160, `${relativePath}: description length`);

    if (relativePath === "404.html") {
      assert.match(html, /<meta name="robots" content="noindex">/);
      assert.doesNotMatch(html, /rel="canonical"/);
      assert.doesNotMatch(html, /property="og:/);
      continue;
    }

    const previousPage = descriptions.get(description[1]);
    assert.equal(previousPage, undefined, `${relativePath}: description also used by ${previousPage}`);
    descriptions.set(description[1], relativePath);

    assert.match(html, new RegExp(`<link rel="canonical" href="${site.url.replaceAll(".", "\\.")}\/`));
    for (const property of ["og:title", "og:description", "og:image", "og:url", "og:type"]) {
      assert.match(html, new RegExp(`<meta property="${property}" content="[^"]+">`), `${relativePath}: ${property}`);
    }

    const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLd, `${relativePath}: JSON-LD`);
    const data = JSON.parse(jsonLd[1]);
    assert.equal(data["@context"], "https://schema.org");
    assert.ok(data["@graph"].some((item) => item["@type"] === "WebSite"));
  }
});

test("rendered pages provide keyboard navigation and semantic landmarks", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const relativePath = path.relative(outputDirectory, file);
    const html = await readFile(file, "utf8");

    assert.match(html, /<body[^>]*>\s*<a class="skip-link" href="#main-content">Skip to main content<\/a>/, `${relativePath}: skip link first`);
    assert.match(html, /<nav aria-label="Primary">/, `${relativePath}: primary navigation landmark`);
    assert.match(html, /<main id="main-content"[^>]*tabindex="-1">/, `${relativePath}: focusable skip target`);
  }
});

test("rendered headings do not skip levels and each page has one h1", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const relativePath = path.relative(outputDirectory, file);
    const html = await readFile(file, "utf8");
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));

    assert.equal(levels.filter((level) => level === 1).length, 1, `${relativePath}: one h1`);
    for (let index = 1; index < levels.length; index += 1) {
      assert.ok(levels[index] <= levels[index - 1] + 1, `${relativePath}: h${levels[index - 1]} followed by h${levels[index]}`);
    }
  }
});

test("ambiguous repeated links have unique accessible names", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const readMoreLinks = [...html.matchAll(/<a\b([^>]*)>Read more<\/a>/gi)];

    for (const link of readMoreLinks) {
      assert.match(link[1], /aria-(?:label|labelledby)="[^"]+"/, path.relative(outputDirectory, file));
    }
  }
});

test("content images are accessible and defer offscreen work", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);

    for (const image of images) {
      assert.match(image, /\balt="[^"]*"/, `${path.relative(outputDirectory, file)}: alt`);
      assert.match(image, /\bloading="lazy"/, `${path.relative(outputDirectory, file)}: lazy loading`);
      assert.match(image, /\bdecoding="async"/, `${path.relative(outputDirectory, file)}: async decoding`);
    }
  }
});

test("fonts and runtime assets are self-hosted", async () => {
  const css = await readFile(path.resolve("src/assets/site.css"), "utf8");
  const enhancements = await readFile(path.resolve("src/assets/site-enhancements.css"), "utf8");

  assert.doesNotMatch(css, /@import\s+["']https?:\/\//);
  assert.doesNotMatch(enhancements, /url\(["']?https?:\/\//);
  assert.match(enhancements, /font-display:\s*swap/);
});

test("machine-readable discovery files are valid and self-identifying", async () => {
  const feed = await readFile(path.join(outputDirectory, "feed.xml"), "utf8");
  const llms = await readFile(path.join(outputDirectory, "llms.txt"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(outputDirectory, "manifest.webmanifest"), "utf8"));
  const security = await readFile(path.join(outputDirectory, ".well-known/security.txt"), "utf8");

  assert.match(feed, /xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/);
  assert.match(feed, new RegExp(`<atom:link href="${site.url.replaceAll(".", "\\.")}\/feed\\.xml" rel="self"`));
  assert.match(feed, /<sy:updatePeriod>weekly<\/sy:updatePeriod>/);
  assert.match(llms, new RegExp(`^# ${site.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.equal(manifest.name, site.name);
  assert.ok(manifest.icons.some((icon) => icon.purpose?.includes("maskable")));
  assert.match(security, new RegExp(`Contact: mailto:${site.author.email.replaceAll(".", "\\.")}`));
});

test("rendered pages contain no unresolved template syntax", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));

  for (const file of files) {
    const html = await readFile(file, "utf8");
    assert.doesNotMatch(html, /\{[{%]|[%}]\}/, path.relative(outputDirectory, file));
    assert.match(html, /<!doctype html>/i, path.relative(outputDirectory, file));
  }
});

test("internal links resolve to generated files", async () => {
  const files = (await filesBelow(outputDirectory)).filter((file) => file.endsWith(".html"));
  const pages = await markdownFiles(pagesDirectory);
  const hasHomePage = pages.includes("home.md");
  const missing = [];

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const links = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);

    for (const link of links) {
      const pathname = link.split(/[?#]/, 1)[0];
      if (pathname === "/" && !hasHomePage) {
        continue;
      }

      const relativeTarget = pathname === "/"
        ? "index.html"
        : path.extname(pathname)
          ? pathname.slice(1)
          : `${pathname.slice(1).replace(/\/$/, "")}/index.html`;

      try {
        await stat(path.join(outputDirectory, relativeTarget));
      } catch {
        missing.push(`${path.relative(outputDirectory, file)} -> ${pathname}`);
      }
    }
  }

  assert.deepEqual([...new Set(missing)].sort(), []);
});

test("Cloudflare security headers are included", async () => {
  const headers = await readFile(path.join(outputDirectory, "_headers"), "utf8");

  assert.match(headers, /^\/\*$/m);
  assert.match(headers, /Content-Security-Policy: default-src 'self';[^\n]+frame-ancestors 'none';[^\n]+upgrade-insecure-requests/);
  assert.match(headers, /Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers, /\/assets\/\*\n  Cache-Control: public, max-age=604800/);
  assert.match(headers, /Permissions-Policy:/);
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
  assert.match(headers, /Strict-Transport-Security: max-age=63072000; includeSubDomains/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
});
