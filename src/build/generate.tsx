import * as ef from "@/ef";
import type { MarkdownResource, Website } from "@/ontology";
import { unified } from "unified";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import * as hast from "hast";
import * as mdast from "mdast";
import * as unist from "unist";
import rehypeStringify from "rehype-stringify";
import rehypeFormat from "rehype-format";

export const generateWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "generateWebsite" }, (input) => async (ctx) => {
  await ef.all({
    opts: {},
    input: {},
    ks: input.website.resources.flatMap((resource) => {
      switch (resource.type) {
        case "markdown": {
          return [ef.run({}, () => generateMarkdown({ resource }))];
        }
        default:
          return [];
      }
    }),
  })(ctx);
});

const generateMarkdown: ef.T<{ resource: MarkdownResource }> = ef.run(
  {
    label: (input) => ef.label("generateMarkdown", input.resource.route),
  },
  (input) => async (ctx) => {
    const root_hast: hast.Root = await unified()
      //
      .use(remarkRehype)
      .run(input.resource.root);
    const content = unified()
      //
      .use(rehypeFormat, {})
      .use(rehypeStringify, {})
      .stringify(root_hast);

    await ef.setRoute_textFile({
      route: input.resource.route,
      content,
    })(ctx);
  },
);
