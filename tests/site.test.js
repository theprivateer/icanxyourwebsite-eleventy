import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const outputDirectory = path.resolve("_site");

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

test("build creates every migrated route", async () => {
  const files = await filesBelow(outputDirectory);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const postPages = htmlFiles.filter((file) => file.includes(`${path.sep}blog${path.sep}`));

  assert.equal(htmlFiles.length, 29, "home, six detail pages, blog index, 20 posts, and 404");
  assert.equal(postPages.length, 21, "20 posts plus the blog index");

  for (const relativePath of [
    "index.html",
    "404.html",
    "blog/index.html",
    "accessibility-is-part-of-quality-not-an-extra/index.html",
    "clean-design-strong-seo-and-solid-performance/index.html",
    "easy-updates-with-statamic/index.html",
    "fair-pricing-honest-advice/index.html",
    "websites-for-growing-businesses-of-all-kinds/index.html",
    "you-own-your-content-always/index.html",
    "feed.xml",
    "sitemap.xml",
    "_headers",
  ]) {
    assert.ok((await stat(path.join(outputDirectory, relativePath))).isFile(), relativePath);
  }
});

test("post filenames contain only their slug and dates live in frontmatter", async () => {
  const files = (await readdir(path.resolve("src/content/posts"))).filter((file) => file.endsWith(".md"));

  assert.equal(files.length, 20);
  assert.equal(files.some((file) => /^\d{4}-\d{2}-\d{2}/.test(file)), false);

  for (const file of files) {
    const markdown = await readFile(path.resolve("src/content/posts", file), "utf8");
    assert.match(markdown, /^date: \d{4}-\d{2}-\d{2}T14:00:00Z$/m, file);
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
  const blog = await readFile(path.join(outputDirectory, "blog/index.html"), "utf8");

  assert.ok(blog.indexOf("The moment most businesses realise their website matters") < blog.indexOf("What &quot;owning your website&quot; really means"));
  assert.match(blog, /April 19th, 2026/);
});

test("shared presentation and calls to action are retained", async () => {
  const home = await readFile(path.join(outputDirectory, "index.html"), "utf8");
  const post = await readFile(path.join(outputDirectory, "blog/how-a-hacked-website-affects-your-business-reputation/index.html"), "utf8");

  assert.match(home, /Web design and development that works for your business/);
  assert.match(home, /class="prose lg:prose-xl max-w-none p-8 bg-blue-200 rounded-2xl"/);
  assert.match(home, /Get in touch and let(?:'|&#39;)s discuss what you need/);
  assert.match(post, /Let(?:'|&#39;)s secure your site/);
  assert.match(post, /data-site="KJQJWDCE"/);
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
  const missing = [];

  for (const file of files) {
    const html = await readFile(file, "utf8");
    const links = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);

    for (const link of links) {
      const pathname = link.split(/[?#]/, 1)[0];
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
