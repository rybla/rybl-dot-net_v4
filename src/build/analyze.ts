import * as transforms from "@/build/analyze/transforms";
import * as ef from "@/ef";
import {
  config,
  from_Href_to_Reference,
  from_Reference_to_Href,
  from_Reference_to_IconRoute,
  from_URL_to_iconHref,
  from_URL_to_iconRoute,
  isoHref,
  isoRoute,
  schemaHref,
  schemaResourceMetadata,
  type ExternalReference,
  type Reference,
  type Website,
} from "@/ontology";
import { showNode } from "@/unified_util";
import { dedup, dedupInPlace, do_ } from "@/util";
import { visit } from "unist-util-visit";
import * as YAML from "yaml";

export const analyzeWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "analyzeWebsite" }, (input) => async (ctx) => {
  const references_global: Reference[] = [];

  // collect stuff

  for (const res of input.website.resources) {
    if (res.type === "markdown") {
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
                    const metadata = schemaResourceMetadata.parse(frontmatter);
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
                    // convert all fragment hrefs to full hrefs
                    if (node.url.startsWith("#")) {
                      node.url = `${res.route}/${node.url}`;
                    }

                    const href = await ef.successulSafeParse(
                      schemaHref.safeParse(node.url),
                    )(ctx);
                    const ref = from_Href_to_Reference(href);
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

      // organize references

      dedupInPlace(res.references, (x) =>
        isoHref.unwrap(from_Reference_to_Href(x)),
      );

      await transforms.addReferencesSection({
        root: res.root,
        references: res.references,
      })(ctx);

      await transforms.addPrefixIconsToLinks({ root: res.root })(ctx);

      // table of contents

      await transforms.addTableOfContents({ root: res.root })(ctx);
    }
  }

  dedupInPlace(references_global, (x) =>
    isoHref.unwrap(from_Reference_to_Href(x)),
  );
  await useIcons_of_References({ references: references_global })(ctx);
});

export const useIcons_of_References: ef.T<{ references: Reference[] }> = ef.run(
  { label: "useIcons_of_References" },
  (input) => async (ctx) => {
    const references = dedup(input.references, (x) =>
      isoRoute.unwrap(from_Reference_to_IconRoute(x)),
    );

    const references_external: ExternalReference[] = [];
    for (const ref of references) {
      switch (ref.type) {
        case "external": {
          references_external.push(ref);
          break;
        }
        default: {
          break;
        }
      }
    }

    await ef.all({
      opts: {},
      input: {},
      ks: references_external.map((ref) =>
        ef.run(
          {
            catch: (e) => async (ctx) => {
              /** TODO: set reference's icon href to be the placeholder {@link config.iconRoute_placeholder} */
              // throw e;
              await ef.tell(e.message)(ctx);
            },
          },
          () => async (ctx) => {
            await ef.useRemoteFile({
              href: from_URL_to_iconHref(ref.value),
              output: from_URL_to_iconRoute(ref.value),
              input_default: config.iconRoute_placeholder,
            })(ctx);
          },
        ),
      ),
    })(ctx);
  },
);
