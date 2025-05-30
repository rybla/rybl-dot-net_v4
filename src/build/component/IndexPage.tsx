import * as ef from "@/ef";
import Top from "@/build/component/Top";
import type { PromiseElement, Resource } from "@/ontology";
import PostPreview from "./PostPreview";

export default async function IndexPage(props: {
  ctx: ef.Ctx.T;
  resources: Resource[];
}): PromiseElement {
  const previews: JSX.Element[] = await ef.all<{}, JSX.Element>({
    opts: {},
    input: {},
    ks: props.resources.filterMap<ef.T<{}, JSX.Element>>((res) => {
      switch (res.type) {
        case "post": {
          return ef.run({}, () => async (ctx) => (
            <PostPreview ctx={ctx} resource={res} />
          ));
        }
      }
    }),
  })(props.ctx);

  return (
    <Top
      resource_name="Index"
      content_head={
        <>
          <link rel="stylesheet" href="/asset/style/IndexPage.css" />
          <link rel="stylesheet" href="/asset/style/PostPreview.css" />
        </>
      }
    >
      <div class="previews">
        {previews.map((e) => (
          <div class="preview">{e}</div>
        ))}
      </div>
    </Top>
  );
}
