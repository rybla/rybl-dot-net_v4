import * as ef from "@/ef";
import {
  get_name_of_Resource,
  isoRoute,
  type PromiseElement,
  type Resource,
} from "@/ontology";
import Tag from "./Tag";
import ParsedDate from "./ParsedDate";
import Markdown from "./Markdown";

export default async function PostPreview(props: {
  ctx: ef.Ctx.T;
  resource: Resource;
}): PromiseElement {
  return (
    <div class="PostPreview">
      <h1 class="name">
        <a href={isoRoute.unwrap(props.resource.route)} safe>
          {get_name_of_Resource(props.resource)}
        </a>
      </h1>
      {props.resource.metadata.tags !== undefined ? (
        <div class="tags">
          <div class="label">Tags.</div>
          <div class="value">
            {props.resource.metadata.tags.map((tag) => (
              <Tag tag={tag} />
            ))}
          </div>
        </div>
      ) : (
        <></>
      )}
      {props.resource.metadata.publishDate !== undefined ? (
        <div class="pubDate">
          <div class="label">Published.</div>
          <div class="value">
            <ParsedDate parsedDate={props.resource.metadata.publishDate} />
          </div>
        </div>
      ) : (
        <></>
      )}
      {props.resource.metadata.abstract_markdown !== undefined ? (
        <div class="abstract">
          <div class="label">Abstract.</div>
          <div class="value">
            <Markdown
              ctx={props.ctx}
              root={props.resource.metadata.abstract_markdown}
            />
          </div>
        </div>
      ) : props.resource.metadata.abstract !== undefined ? (
        <div class="abstract">
          <div class="label">Abstract.</div>
          <div class="value" safe>
            {props.resource.metadata.abstract}
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}
