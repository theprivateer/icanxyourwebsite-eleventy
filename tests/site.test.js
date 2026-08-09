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

async function firstMarkdownSlug(directory, excluded = []) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".md") && !excluded.includes(file))
    .sort();

  assert.ok(files.length > 0, `expected archived Markdown in ${directory}`);
  return path.basename(files[0], ".md");
}

test("build publishes only the retirement surface", async () => {
  const files = (await filesBelow(outputDirectory))
    .map((file) => path.relative(outputDirectory, file))
    .sort();

  assert.deepEqual(files, [
    "404.html",
    "_headers",
    "assets/favicon.svg",
    "assets/fonts/poppins-latin-400-normal.woff2",
    "assets/fonts/poppins-latin-600-normal.woff2",
    "assets/fonts/poppins-latin-800-normal.woff2",
    "assets/retired.css",
    "index.html",
    "robots.txt",
  ]);
});

test("homepage is the site-specific holding page", async () => {
  const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");

  assert.match(html, new RegExp(`<title>${site.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| This site is no longer active<\\/title>`));
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.match(html, /<h1>This site is no longer active<\/h1>/);
  assert.match(html, /I’m not currently taking on website work through this site\./);
  assert.match(html, /For my current work, projects and writing, visit philstephens\.com\./);
  assert.match(html, /<a class="action" href="https:\/\/philstephens\.com">Visit philstephens\.com<\/a>/);
});

test("holding page remains accessible and dependency-free", async () => {
  const html = await readFile(path.join(outputDirectory, "index.html"), "utf8");
  const css = await readFile(path.join(outputDirectory, "assets/retired.css"), "utf8");

  assert.match(html, /<!doctype html>/i);
  assert.match(html, new RegExp(`<html lang="${site.language}">`));
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<main class="notice">/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script\b|<form\b|<nav\b|<img\b/);
  assert.doesNotMatch(html, /https?:\/\/(?!philstephens\.com)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:\s*100svh/);
  assert.match(css, /font-family:\s*"Poppins"/);
  assert.match(css, /font-display:\s*swap/);
  assert.doesNotMatch(css, /@import|url\(["']?https?:\/\//);
});

test("representative old service and article routes are absent", async () => {
  const serviceSlug = await firstMarkdownSlug(pagesDirectory, ["home.md"]);
  const articleSlug = await firstMarkdownSlug(postsDirectory);

  for (const slug of [serviceSlug, `blog/${articleSlug}`]) {
    await assert.rejects(stat(path.join(outputDirectory, slug, "index.html")), { code: "ENOENT" });
  }

  const notFound = await readFile(path.join(outputDirectory, "404.html"), "utf8");
  assert.match(notFound, /<meta name="robots" content="noindex, follow">/);
  assert.match(notFound, /<h1>This page is no longer available<\/h1>/);
  assert.match(notFound, /href="https:\/\/philstephens\.com"/);
});

test("feeds, sitemaps, analytics, and old marketing are not generated", async () => {
  const files = await filesBelow(outputDirectory);
  const publicText = (await Promise.all(files
    .filter((file) => /\.(?:css|html|txt)$/.test(file) || path.basename(file) === "_headers")
    .map((file) => readFile(file, "utf8"))))
    .join("\n");

  for (const removedPath of ["blog", "feed.xml", "llms.txt", "manifest.webmanifest", "privacy", "sitemap.xml"]) {
    await assert.rejects(stat(path.join(outputDirectory, removedPath)), { code: "ENOENT" });
  }

  assert.doesNotMatch(publicText, /fathom|usefathom|analytics|LinkedIn|True North Labs|Freehold Web/i);
  assert.doesNotMatch(publicText, /rel="alternate"|application\/rss\+xml|Sitemap:/i);
  assert.doesNotMatch(publicText, /mailto:|website design|website development|Get in touch|Contact/i);
});

test("Cloudflare headers retain a compact security and cache policy", async () => {
  const headers = await readFile(path.join(outputDirectory, "_headers"), "utf8");

  assert.match(headers, /Content-Security-Policy: default-src 'self';[^\n]+script-src 'none'/);
  assert.match(headers, /Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers, /Strict-Transport-Security: max-age=63072000; includeSubDomains/);
  assert.doesNotMatch(headers, /^\s*Link:/m);
});
