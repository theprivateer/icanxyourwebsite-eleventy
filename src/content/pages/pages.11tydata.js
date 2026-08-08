export default {
  layout: "page.njk",
  eleventyComputed: {
    permalink: (data) => data.page.fileSlug === "home"
      ? "/index.html"
      : `/${data.page.fileSlug}/index.html`,
  },
};
