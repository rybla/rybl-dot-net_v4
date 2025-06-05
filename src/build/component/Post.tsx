import * as ef from "@/ef";
import {
  get_hash_of_Resource,
  get_name_of_Resource,
  type PostResource,
  type PromiseElement,
} from "@/ontology";
import Markdown from "./Markdown";
import Top from "./Top";

export default async function Post(props: {
  ctx: ef.Ctx.T;
  resource: PostResource;
}): PromiseElement {
  return (
    <Top
      resource_name={get_name_of_Resource(props.resource)}
      resource_shortname={`#${get_hash_of_Resource(props.resource)}`}
      content_head={
        <>
          <link rel="stylesheet" href="/asset/style/Post.css" />
          <script src="/asset/script/Post.js" />
        </>
      }
    >
      <div class="content">
        <Markdown ctx={props.ctx} root={props.resource.root} />
      </div>
    </Top>
  );
}
