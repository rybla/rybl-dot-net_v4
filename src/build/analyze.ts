import * as config from "@/config";
import * as mdast from "mdast";
import * as ef from "@/ef";
import {
  fromHref_to_Reference,
  getHostHref_of_URL,
  getHref_of_Reference,
  getIconHref_of_URL,
  getIconRoute_of_URL,
  ResourceMetadata_Schema,
  type ExternalReference,
  type Reference,
  type Website,
} from "@/ontology";
import { showNode } from "@/unified_util";
import { dedup, dedupInPlace, do_, isoHref, schemaHref } from "@/util";
import { visit } from "unist-util-visit";
import YAML from "yaml";
import * as transforms from "./analyze/transforms";

export const analyzeWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "analyzeWebsite" }, (input) => async (ctx) => {
  const references_global: Reference[] = [];

  // collect stuff

  for (const res of input.website.resources) {
    if (res.type === "markdown") {
      const links: mdast.Link[] = [];

      await ef.all({
        opts: {},
        input: {},
        ks: do_(() => {
          const ks: ef.T[] = [];
          visit(res.root, (node) => {
            ks.push(
              ef.run({}, () => async (ctx) => {
                switch (node.type) {
                  case "yaml": {
                    const frontmatter = YAML.parse(node.value);
                    const metadata = ResourceMetadata_Schema.parse(frontmatter);
                    res.metadata = metadata;
                    break;
                  }
                  //
                  case "heading": {
                    if (node.depth === 1) res.metadata.name === showNode(node);
                    break;
                  }
                  case "textDirective": {
                    break;
                  }
                  //
                  case "link": {
                    links.push(node);
                    const href = await ef.successulSafeParse(
                      schemaHref.safeParse(node.url),
                    )(ctx);
                    const ref = fromHref_to_Reference(href);
                    res.references.push(ref);
                    references_global.push(ref);
                    break;
                  }
                }
              }),
            );
          });
          return ks;
        }),
      })(ctx);

      dedupInPlace(res.references, (x) =>
        isoHref.unwrap(getHref_of_Reference(x)),
      );

      await transforms.addReferencesSection({ root: res.root, links })(ctx);
      await transforms.addPrefixIconsToLinks({ root: res.root })(ctx);
      await transforms.addTableOfContents({ root: res.root })(ctx);
    }
  }

  dedupInPlace(references_global, (x) =>
    isoHref.unwrap(getHref_of_Reference(x)),
  );
  // await ef.tellJSON(references_global)(ctx);
  await useIcons_of_References({ references: references_global })(ctx);
});

const useIcons_of_References: ef.T<{ references: Reference[] }> = ef.run(
  { label: "useIcons_of_References" },
  (input) => async (ctx) => {
    const references_external: ExternalReference[] = input.references.flatMap(
      (ref) => {
        switch (ref.type) {
          case "external":
            return [ref];
          default:
            return [];
        }
      },
    );

    // await ef.tellJSON({ references_external })(ctx);

    await ef.all({
      opts: {},
      input: {},
      ks: references_external.map((ref) =>
        ef.run(
          {
            catch: (e) => async (ctx) => {
              /** TODO: set reference's icon href to be the placeholder {@link config.route_of_placeholder_favicon} */
              // throw e;
              await ef.tell(e.message)(ctx);
            },
          },
          () => async (ctx) => {
            await ef.useRemoteFile({
              href: getIconHref_of_URL(ref.value),
              route: getIconRoute_of_URL(ref.value),
            })(ctx);
          },
        ),
      ),
    })(ctx);
  },
);
