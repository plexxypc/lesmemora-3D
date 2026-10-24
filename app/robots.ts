import type { MetadataRoute } from "next";

/**
 * Allow the public site to be crawled. Museum pages send noindex themselves
 * and are not listed in a sitemap, so shared links can still show a preview.
 *
 * @returns The robots policy.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
