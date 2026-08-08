function byDateDescending(a, b) {
  return new Date(b.data.date) - new Date(a.data.date);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function xmlEscape(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function ordinalSuffix(day) {
  if (day % 100 >= 11 && day % 100 <= 13) {
    return "th";
  }

  return { 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th";
}

export default function (eleventyConfig) {
  let markdownLibrary;

  eleventyConfig.configureErrorReporting({ allowMissingExtensions: true });
  eleventyConfig.amendLibrary("md", (markdown) => {
    markdown.set({ linkify: true });
    markdownLibrary = markdown;
    return markdown;
  });

  eleventyConfig.addPairedShortcode("section", (content, type, title) => {
    const heading = type === "hero" ? "h1" : "h2";
    const headingHtml = markdownLibrary.renderInline(title);
    const bodyHtml = markdownLibrary.render(content.trim());

    return `<section class="prose lg:prose-xl max-w-none py-8 prose-a:text-blue-600 prose-a:hover:text-blue-500">
  <${heading}>${headingHtml}</${heading}>
  ${bodyHtml}
</section>`;
  });

  eleventyConfig.addPairedShortcode("cta", (content, buttonLink, buttonLabel) => {
    const bodyHtml = markdownLibrary.render(content.trim());

    return `<section class="prose lg:prose-xl max-w-none p-8 bg-blue-200 rounded-2xl">
  ${bodyHtml}
  <div><a href="${escapeHtml(buttonLink)}" class="rounded-md bg-blue-600 inline-block no-underline px-3 py-2 text-white shadow-xs hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">${escapeHtml(buttonLabel)}</a></div>
</section>`;
  });

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  eleventyConfig.addWatchTarget("src/assets/");

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/content/posts/*.md").sort(byDateDescending),
  );

  eleventyConfig.addFilter("readableDate", (value) => {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Australia/Brisbane",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const day = Number(part("day"));

    return `${part("month")} ${day}${ordinalSuffix(day)}, ${part("year")}`;
  });
  eleventyConfig.addFilter("rfc3339Date", (value) => new Date(value).toISOString());
  eleventyConfig.addFilter("rfc822Date", (value) => new Date(value).toUTCString());
  eleventyConfig.addFilter("absoluteUrl", (url, baseUrl) => new URL(url, baseUrl).toString());
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addGlobalData("environment", process.env.ELEVENTY_ENV ?? "production");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["md", "njk"],
  };
}
