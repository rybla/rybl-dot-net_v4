import * as ef from "@/ef";
import {
  fromHref_to_Reference,
  getHref_of_Reference,
  getIconRoute_of_Href,
} from "@/ontology";
import { do_, fromRouteToHref, isoHref, schemaHref } from "@/util";
import * as mdast from "mdast";

export const addPrefixIconToLink: ef.T<{ link: mdast.Link }, void> =
  (input) => async (ctx) => {
    const href = await ef.successulSafeParse(
      schemaHref.safeParse(input.link.url),
    )(ctx);

    input.link.data = input.link.data ?? {};
    input.link.data.hProperties = input.link.data.hProperties ?? {};
    input.link.data.hProperties.class = "LinkWithIcon";
    input.link.children = [
      {
        type: "image",
        data: {
          hProperties: {
            class: "icon",
          },
        },
        url: isoHref.unwrap(fromRouteToHref(getIconRoute_of_Href(href))),
      },
      {
        type: "textDirective",
        name: "span",
        data: {
          hProperties: {
            class: "label",
          },
        },
        children: input.link.children,
      },
    ];
  };
