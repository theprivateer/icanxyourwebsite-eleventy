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

  assert.equal(htmlFiles.length, pages.length + posts.length + 2, "content routes plus blog and 404");
  assert.equal(postPages.length, posts.length + 1, "posts plus the blog index");

  for (const file of pages) {
    const slug = path.basename(file, ".md");
    const target = slug === "home" ? "index.html" : `${slug}/index.html`;
    assert.ok((await stat(path.join(outputDirectory, target))).isFile(), target);
  }

  for (const relativePath of ["404.html", "blog/index.html", "feed.xml", "robots.txt", "sitemap.xml", "_headers"]) {
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
  assert.doesNotMatch(blog, /<script\b/);
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
  assert.match(headers, /Content-Security-Policy: frame-ancestors 'none';/);
  assert.match(headers, /Strict-Transport-Security: max-age=63072000; includeSubDomains/);
  assert.match(headers, /X-Frame-Options: DENY/);
});
