import {
  at_id_of_Route,
  config,
  isoRoute,
  type PromiseElement,
} from "@/ontology";
import Icon from "./Icon";

export default async function Tag(props: { tag: string }): PromiseElement {
  return (
    <a
      class="Tag"
      href={isoRoute.unwrap(
        at_id_of_Route(config.route_of_TagsPage, props.tag),
      )}
    >
      <Icon.Hash />
      <div class="name" safe>
        {props.tag}
      </div>
    </a>
  );
}
