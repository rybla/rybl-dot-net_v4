import Top from "@/build/component/Top";
import * as ef from "@/ef";
import type { PromiseElement, Resource } from "@/ontology";
import PostPreview from "./PostPreview";
import Tag from "./Tag";

type Preview = { resource: Resource; element: JSX.Element };

export default async function TagsPage(props: {
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

  const mapTagsToPreviews: Map<string, Preview[]> = new Map();

  for (const preview of previews) {
    if (preview.resource.metadata.tags === undefined) continue;
    for (const tag of preview.resource.metadata.tags) {
      if (!mapTagsToPreviews.has(tag)) mapTagsToPreviews.set(tag, []);
      const tagPreviews = mapTagsToPreviews.get(tag)!;
      tagPreviews.push(preview);
    }
  }

  const tags = Array.from(mapTagsToPreviews.keys());
  tags.sort();

  return (
    <Top
      resource_name="Tags"
      content_head={
        <>
          <link rel="stylesheet" href="/asset/style/TagsPage.css" />
          <link rel="stylesheet" href="/asset/style/PostPreview.css" />
        </>
      }
    >
      <div class="tags_and_previews">
        {tags.map((tag) => {
          return (
            <>
              <h2 class="heading">
                <Tag tag={tag} />
              </h2>
              {mapTagsToPreviews.get(tag)!.map((preview) => (
                <div class="preview">{preview.element}</div>
              ))}
            </>
          );
        })}
      </div>
    </Top>
  );
}
