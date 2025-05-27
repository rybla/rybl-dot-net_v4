import * as ef from "@/ef";
import config from "@/config.json";
import type { Resource, Website } from "@/ontology";

export const parseWebsite: ef.T<{}, Website> = (input) => async (ctx) => {
  // return ef.todo("parseWebsite");

  const resources: Resource[] = [];

  // posts
  const filepaths_posts = await ef.inputDir({ dirpath_relative: "posts" })(ctx);

  // pages

  // assets

  return {
    name: config.website_name,
    url: config.website_url,
    resources,
  };
};
