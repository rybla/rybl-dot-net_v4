import * as ef from "@/ef";
import { config, type MarkdownResource, type Website } from "@/ontology";
import { render_jsx } from "@/util";
import * as hast from "hast";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export const generateWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "generateWebsite" }, (input) => async (ctx) => {
  await useStyles({})(ctx);

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

const useStyles: ef.T = ef.run({ label: "useStyles" }, () => async (ctx) => {
  const routes_of_styles = await ef.getSubRoutes({
    route: config.route_of_styles,
  })(ctx);

  await ef.all({
    opts: {},
    input: {},
    ks: routes_of_styles.map(
      (route) => () => ef.useLocalFile({ input: route }),
    ),
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
    const mainContent = unified()
      //
      .use(rehypeFormat, {})
      .use(rehypeStringify, {})
      .stringify(root_hast);

    const content = await render_jsx(
      <>
        {"<!doctype html>"}
        <html>
          <head>
            <link rel="icon" href="/asset/style/top.css" />
          </head>
          <body>{mainContent as "safe"}</body>
        </html>
      </>,
    );

    await ef.setRoute_textFile({
      route: input.resource.route,
      content,
    })(ctx);
  },
);
