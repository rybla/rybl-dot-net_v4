import * as ef from "@/ef";
import {
  config,
  get_name_of_Resource,
  isoRoute,
  type MarkdownResource,
  type Resource,
  type Website,
} from "@/ontology";
import { render_jsx } from "@/util";
import * as hast from "hast";
import rehypeFormat from "rehype-format";
import rehypeStringify from "rehype-stringify";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import Top from "./component/Top";
import rehypeMathJaxSvg from "rehype-mathjax/svg";
import Index from "./component/Index";
import Html from "@kitajs/html";

export const generateWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "generateWebsite" }, (input) => async (ctx) => {
  await useStyles({})(ctx);
  await useIcons({})(ctx);
  await useImages({})(ctx);
  await generatePages({ website: input.website })(ctx);
  await generateResources({ resources: input.website.resources })(ctx);
});

const useStyles: ef.T = ef.run({ label: "useStyles" }, () => async (ctx) => {
  const routes_of_styles = await ef.getSubRoutes({
    route: config.route_of_styles,
  })(ctx);

  await ef.all({
    opts: {},
    input: {},
    ks: routes_of_styles.map((route) =>
      ef.run({}, () => ef.useLocalFile({ input: route })),
    ),
  })(ctx);
});

const useIcons: ef.T = ef.run({ label: "useIcons" }, () => async (ctx) => {
  await ef.useLocalFile({
    input: config.input_iconRoute_of_website,
    output: config.iconRoute_of_website,
  })(ctx);
});

const useImages: ef.T = ef.run({ label: "useImages" }, () => async (ctx) => {
  const routes_of_images = await ef.getSubRoutes({
    route: config.route_of_images,
  })(ctx);

  await ef.all({
    opts: {},
    input: {},
    ks: routes_of_images.map((route) =>
      ef.run({}, () => ef.useLocalFile({ input: route })),
    ),
  })(ctx);
});

const generatePages: ef.T<{ website: Website }> = ef.run(
  { label: "generatePages" },
  (input) => async (ctx) => {
    await ef.all({
      opts: {},
      input: {},
      ks: [
        ef.run({ label: "generateIndex" }, () => async (ctx) => {
          const previews: JSX.Element[] = await ef.all({
            opts: {},
            input: {},
            ks: input.website.resources.flatMap((res) => {
              switch (res.type) {
                case "markdown": {
                  return [
                    ef.run({}, () => async (ctx) => {
                      return await render_jsx(
                        <div safe>
                          TODO: PostPreview for {isoRoute.unwrap(res.route)}
                        </div>,
                      );
                    }),
                  ];
                }
                default:
                  return [];
              }
            }),
          })(ctx);

          await ef.setRoute_textFile({
            route: config.route_of_Index,
            content: await render_jsx(<Index previews={previews} />),
          })(ctx);
        }),
      ],
    })(ctx);
  },
);

const generateResources: ef.T<{ resources: Resource[] }> = ef.run(
  { label: "generateResources" },
  (input) => async (ctx) => {
    await ef.all({
      opts: {},
      input: {},
      ks: input.resources.flatMap((resource) => {
        switch (resource.type) {
          case "markdown": {
            return [ef.run({}, () => generateMarkdownPost({ resource }))];
          }
          default:
            return [];
        }
      }),
    })(ctx);
  },
);

const generateMarkdownPost: ef.T<{ resource: MarkdownResource }> = ef.run(
  {
    label: (input) => ef.label("generateMarkdownPost", input.resource.route),
  },
  (input) => async (ctx) => {
    const root_hast: hast.Root = await unified()
      //
      .use(remarkRehype)
      .run(input.resource.root);
    const mainContent = unified()
      //
      .use(rehypeMathJaxSvg)
      .use(rehypeFormat, {})
      .use(rehypeStringify, {})
      .stringify(root_hast);

    const content = await render_jsx(
      <Top
        resource_name={get_name_of_Resource(input.resource)}
        content_head={
          <>
            <link rel="stylesheet" href="/asset/style/Post.css" />
          </>
        }
      >
        <div class="content">{mainContent as "safe"}</div>
      </Top>,
    );

    await ef.setRoute_textFile({
      route: input.resource.route,
      content,
    })(ctx);
  },
);
