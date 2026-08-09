const archivedTemplates = [
  "src/blog.njk",
  "src/feed.njk",
  "src/llms.njk",
  "src/manifest.njk",
  "src/privacy.njk",
  "src/security.njk",
  "src/sitemap.njk",
];

export default function (eleventyConfig) {
  for (const template of archivedTemplates) {
    eleventyConfig.ignores.add(template);
  }

  eleventyConfig.ignores.add("src/content/**");
  eleventyConfig.addPassthroughCopy({ "src/assets/retired.css": "assets/retired.css" });
  eleventyConfig.addPassthroughCopy({ "src/assets/favicon.svg": "assets/favicon.svg" });
  eleventyConfig.addPassthroughCopy({
    "src/assets/fonts/poppins-latin-400-normal.woff2": "assets/fonts/poppins-latin-400-normal.woff2",
    "src/assets/fonts/poppins-latin-600-normal.woff2": "assets/fonts/poppins-latin-600-normal.woff2",
    "src/assets/fonts/poppins-latin-800-normal.woff2": "assets/fonts/poppins-latin-800-normal.woff2",
  });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
      output: "_site",
    },
    htmlTemplateEngine: "njk",
    templateFormats: ["njk"],
  };
}
