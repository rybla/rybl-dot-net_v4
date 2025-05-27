import * as ef from "@/ef";
import type { MarkdownResource, Website } from "@/ontology";

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
    await ef.tell("TODO")(ctx);
  },
);
