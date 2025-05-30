import * as ef from "@/ef";
import {
  config,
  from_Href_to_iconRoute,
  from_Reference_to_Href,
  from_Route_to_Href,
  from_URL_to_hostHref,
  isoHref,
  isoRoute,
  join_Href_with_Route,
  schemaHref,
  type Reference,
  type Resource,
  type Route,
} from "@/ontology";
import { showNode } from "@/unified_util";
import { do_, encodeURIComponent_better, type Tree } from "@/util";
import * as mdast from "mdast";
import { visit } from "unist-util-visit";

// export const addPrefixIconsToLinks: ef.T<{ root: mdast.Root }> =
//   (input) => async (ctx) => {
//     const links: mdast.Link[] = [];
//     visit(input.root, (node) => {
//       switch (node.type) {
//         case "link": {
//           links.push(node);
//           break;
//         }
//       }
//     });
//     for (const link of links) await addPrefixIcon({ link })(ctx);
//   };

export const addTableOfContents: ef.T<{ route: Route; root: mdast.Root }> =
  ef.run({ label: "addTableOfContents" }, (input) => async (ctx) => {
    const headings_forest: Tree<{ id: string; value: string }>[] = [];
    visit(input.root, (node) => {
      if (node.type === "heading") {
        const value = showNode(node);
        const id = encodeURIComponent_better(value);
        node.data = node.data ?? {};
        node.data.hProperties = node.data.hProperties ?? {};
        node.data.hProperties.id = id;
        node.children = [
          {
            type: "link",
            url: `${join_Href_with_Route(from_URL_to_hostHref(config.url_of_website), input.route)}#${id}`,
            children: node.children,
          },
        ];

        if (node.depth === 1) return;
        let headings_subforest = headings_forest;
        let depth = 1;
        while (headings_subforest.length > 0 && depth + 1 < node.depth) {
          headings_subforest = headings_subforest.at(-1)!.kids;
          depth++;
        }
        headings_subforest.push({ value: { id, value }, kids: [] });
      }
    });

    const go_nodes = (
      nodes: Tree<{ id: string; value: string }>[],
    ): mdast.List => ({
      type: "list",
      ordered: true,
      children: nodes.map((kid) => go_node(kid)),
    });

    const go_node = (
      node: Tree<{ id: string; value: string }>,
    ): mdast.ListItem => ({
      type: "listItem",
      children: [
        [
          {
            type: "paragraph" as "paragraph",
            children: [
              {
                type: "link",
                url: `#${node.value.id}`,
                title: node.value.value,
                children: [{ type: "text", value: node.value.value }],
              },
            ],
          } as mdast.Paragraph,
        ],
        node.kids.length === 0 ? [] : [go_nodes(node.kids)],
      ].flat<mdast.BlockContent[][]>(),
    });

    const tableOfContents = go_nodes(headings_forest);
    if (tableOfContents.children.length === 0) return;

    const title_index = input.root.children.findIndex(
      (node) => node.type === "heading" && node.depth === 1,
    );
    if (title_index === -1) return;

    input.root.children.splice(title_index + 1, 0, tableOfContents);
  });

export const addReferencesSection: ef.T<
  { root: mdast.Root; resources: Resource[]; references: Reference[] },
  void
> = ef.run({ label: "addReferencesSection" }, (input) => async (ctx) => {
  if (input.references.length === 0) return;

  const heading: mdast.Heading = {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "References",
      },
    ],
  };

  const refs: mdast.List = {
    type: "list",
    ordered: false,
    children: input.references.map<mdast.ListItem>((ref) => ({
      type: "listItem",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: isoHref.unwrap(from_Reference_to_Href(ref)),
              children: [
                {
                  type: "text",
                  value: do_(() => {
                    switch (ref.type) {
                      case "external":
                        return ref.metadata.name ?? ref.value.href;
                      case "internal":
                        return (
                          input.resources.find((res) => res.route === ref.value)
                            ?.metadata.name ?? isoRoute.unwrap(ref.value)
                        );
                    }
                  }),
                },
              ],
            },
          ],
        },
      ],
    })),
  };

  input.root.children.splice(input.root.children.length, 0, heading, refs);
});

export type Backlink = {
  name: string;
  route: Route;
};

export const addBacklinksSection: ef.T<
  { root: mdast.Root; backlinks: Backlink[] },
  void
> = ef.run({ label: "addBacklinksSection" }, (input) => async (ctx) => {
  if (input.backlinks.length === 0) return;

  const heading: mdast.Heading = {
    type: "heading",
    depth: 2,
    children: [
      {
        type: "text",
        value: "Backlinks",
      },
    ],
  };

  const backlinks: mdast.List = {
    type: "list",
    ordered: false,
    children: input.backlinks.map<mdast.ListItem>((bl) => ({
      type: "listItem",
      children: [
        {
          type: "paragraph",
          children: [
            {
              type: "link",
              url: isoHref.unwrap(from_Route_to_Href(bl.route)),
              children: [
                {
                  type: "text",
                  value: bl.name,
                },
              ],
            },
          ],
        },
      ],
    })),
  };

  input.root.children.splice(input.root.children.length, 0, heading, backlinks);
});
