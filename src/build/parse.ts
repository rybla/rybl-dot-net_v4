import config from "@/config.json";
import * as ef from "@/ef";
import {
  addResource,
  type MarkdownResource,
  type Resource,
  type Website,
} from "@/ontology";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";

export const parseWebsite: ef.T<unknown, Website> = ef.run(
  { label: "parseWebsite" },
  (input) => async (ctx) => {
    const website = {
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
        opts: { batch_size: config.size_of_batched_posts_batch },
        ks: (await ef.inputDir({ dirpath_relative: "post" })(ctx)).map(
          (filepath) =>
            ef.run(
              {
                catch: (e) => async (ctx) => {
                  await ef.tell(`${e}`)(ctx);
                  return [
                    {
                      route: filepath,
                      references: [],
                      metadata: {},
                      type: "markdown",
                      root: {
                        type: "root",
                        children: [
                          {
                            type: "code",
                            value: e.toString(),
                          },
                        ],
                      },
                    } as MarkdownResource,
                  ];
                },
              },
              () => async (ctx) => [await parsePost({ filepath })(ctx)],
            ),
        ),
        input: {},
      })(ctx)
    ).flat();
    return resources;
  },
);

const parsePost: ef.T<{ filepath: string }, Resource> = ef.run(
  { label: (input) => ef.label("parsePost", input.filepath) },
  (input) => async (ctx) => {
    const content = await ef.inputFile_text({
      filepath_relative: `post/${input.filepath}`,
    })(ctx);

    const root = unified()
      .use(remarkParse)
      .use(remarkFrontmatter, ["yaml"])
      .use(remarkDirective)
      .use(remarkGfm)
      .use(remarkMath)
      .parse(content);

    return {
      route: input.filepath,
      references: [],
      metadata: {},
      type: "markdown",
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
