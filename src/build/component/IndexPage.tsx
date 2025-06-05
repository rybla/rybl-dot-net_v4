import * as ef from "@/ef";
import Top from "@/build/component/Top";
import type { PromiseElement, Resource } from "@/ontology";
import PostPreview from "./PostPreview";

type Preview = { resource: Resource; element: JSX.Element };

export default async function IndexPage(props: {
  ctx: ef.Ctx.T;
  resources: Resource[];
}): PromiseElement {
  const previews: Preview[] = await ef.all<{}, Preview>({
    opts: {},
    input: {},
    ks: props.resources.filterMap<ef.T<{}, Preview>>((res) => {
      switch (res.type) {
        case "post": {
          return ef.run({}, () => async (ctx) => ({
            resource: res,
            element: <PostPreview ctx={ctx} resource={res} />,
          }));
        }
      }
    }),
  })(props.ctx);

  previews.sort((p1, p2) => {
    if (
      p1.resource.metadata.publishDate?.type === "ok" &&
      p2.resource.metadata.publishDate?.type === "ok"
    ) {
      const date1 = p1.resource.metadata.publishDate.value;
      const date2 = p2.resource.metadata.publishDate.value;
      return date2.getDate() - date1.getDate();
    }
    return 0;
  });

  return (
    <Top
      resource_name="Index"
      resource_shortname="Index"
      content_head={
        <>
          <link rel="stylesheet" href="/asset/style/IndexPage.css" />
          <link rel="stylesheet" href="/asset/style/PostPreview.css" />
        </>
      }
    >
      <div class="previews">
        {previews.map((preview) => (
          <div class="preview">{preview.element}</div>
        ))}
      </div>
    </Top>
  );
}
