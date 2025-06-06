import * as ef from "@/ef";
import YAML from "yaml";
import * as mdast from "mdast";
import {
  addResource,
  config,
  isoRoute,
  schemaResourceMetadata,
  schemaRoute,
  type PostResource,
  type Resource,
  type ResourceMetadata,
  type Route,
  type Website,
} from "@/ontology";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { showNode } from "@/unified_util";

export const parseWebsite: ef.T<unknown, Website> = ef.run(
  { label: "parseWebsite" },
  (input) => async (ctx) => {
    const website: Website = {
      name: config.name_of_website,
      url: config.url_of_website,
      resources: [],
    };

    const posts = await parsePosts({})(ctx);
    for (const post of posts)
      await addResource({ resource: post, website: website })(ctx);

    const assets = await parseAssets({})(ctx);

    return website;
  },
);

const parsePosts: ef.T<unknown, Resource[]> = ef.run(
  { label: "parsePosts" },
  (input) => async (ctx) => {
    const resources: Resource[] = (
      await ef.all<{}, Resource[]>({
        opts: { batch_size: config.batchSize_of_postAnalysis },
        ks: (
          await ef.getSubRoutes({
            route: schemaRoute.parse("/post"),
          })(ctx)
        ).map((route) =>
          ef.run(
            {
              catch: (e) => async (ctx) => {
                await ef.tell(`${e}`)(ctx);
                return [
                  {
                    route: isoRoute.modify((r) => r.replace(".md", ".html"))(
                      route,
                    ),
                    references: [],
                    metadata: {},
                    type: "post",
                    root: {
                      type: "root",
                      children: [
                        {
                          type: "code",
                          value: e.toString(),
                        },
                      ],
                    },
                  } as PostResource,
                ];
              },
            },
            () => async (ctx) => [await parsePost({ route: route })(ctx)],
          ),
        ),
        input: {},
      })(ctx)
    ).flat();
    return resources;
  },
);

const parsePost: ef.T<{ route: Route }, Resource> = ef.run(
  { label: (input) => ef.label("parsePost", input.route) },
  (input) => async (ctx) => {
    const content = await ef.getRoute_textFile({ route: input.route })(ctx);
    const root = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkGfm)
      .use(remarkDirective)
      .use(remarkMath, { singleDollarTextMath: false })
      .parse(content);
    return {
      route: isoRoute.modify((r) => r.replace(".md", ".html"))(input.route),
      references: [],
      metadata: {},
      type: "post",
      root,
    };
  },
);

const parseAssets: ef.T<unknown, Resource[]> = ef.run(
  { label: "parseAssets" },
  (input) => async (ctx) => {
    ef.tell("TODO");
    return [];
  },
);
