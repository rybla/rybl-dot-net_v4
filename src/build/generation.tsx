import * as ef from "@/ef";
import {
  config,
  get_name_of_Resource,
  type PostResource,
  type Resource,
  type Website,
} from "@/ontology";
import { render_jsx } from "@/util";
import IndexPage from "./component/IndexPage";
import Markdown from "./component/Markdown";
import TagsPage from "./component/TagsPage";
import Top from "./component/Top";

export const generateWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "generateWebsite" }, (input) => async (ctx) => {
  await useStyles({})(ctx);
  await useIcons({})(ctx);
  await useImages({})(ctx);
  await useFonts({})(ctx);
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

const useFonts: ef.T = ef.run({ label: "useFonts" }, () => async (ctx) => {
  const routes_of_fonts = await ef.getSubRoutes({
    route: config.route_of_fonts,
  })(ctx);

  await ef.all({
    opts: {},
    input: {},
    ks: routes_of_fonts.map((route) =>
      ef.run({}, () => ef.useLocalFile({ input: route })),
    ),
  })(ctx);
});

const generatePages: ef.T<{ website: Website }> = ef.run(
  { label: "generatePages" },
  (input) => async (ctx) => {
    await ef.all({
      opts: {},
      input: { website: input.website },
      ks: [generateIndexPage, generateTagsPage],
    })(ctx);
  },
);

const generateIndexPage: ef.T<{ website: Website }> = ef.run(
  { label: "generateIndexPage" },
  (input) => async (ctx) => {
    await ef.setRoute_textFile({
      route: config.route_of_IndexPage,
      content: await render_jsx(
        <IndexPage ctx={ctx} resources={input.website.resources} />,
      ),
    })(ctx);
  },
);

const generateTagsPage: ef.T<{ website: Website }> = ef.run(
  { label: "generateTagsPage" },
  (input) => async (ctx) => {
    await ef.setRoute_textFile({
      route: config.route_of_TagsPage,
      content: await render_jsx(
        <TagsPage ctx={ctx} resources={input.website.resources} />,
      ),
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
          case "post": {
            return [ef.run({}, () => generatePost({ resource }))];
          }
          default:
            return [];
        }
      }),
    })(ctx);
  },
);

const generatePost: ef.T<{ resource: PostResource }> = ef.run(
  {
    label: (input) => ef.label("generatePost", input.resource.route),
  },
  (input) => async (ctx) => {
    const content = await render_jsx(
      <Top
        resource_name={get_name_of_Resource(input.resource)}
        content_head={
          <>
            <link rel="stylesheet" href="/asset/style/Post.css" />
          </>
        }
      >
        <div class="content">
          <Markdown ctx={ctx} root={input.resource.root} />
        </div>
      </Top>,
    );

    await ef.setRoute_textFile({
      route: input.resource.route,
      content,
    })(ctx);
  },
);
