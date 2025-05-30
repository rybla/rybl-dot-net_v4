import * as mutation from "@/build/analysis/mutation";
import * as homomorphism from "@/build/analysis/homomorphism";
import * as ef from "@/ef";
import {
  config,
  from_Href_to_Reference,
  from_Reference_to_Href,
  from_Reference_to_IconRoute,
  from_URL_to_iconHref,
  from_URL_to_iconRoute,
  get_name_of_Resource,
  isoHref,
  isoRoute,
  schemaHref,
  schemaResourceMetadata,
  type ExternalReference,
  type Reference,
  type Route,
  type Website,
} from "@/ontology";
import { showNode } from "@/unified_util";
import { dedup, dedupInPlace, do_ } from "@/util";
import * as mdast from "mdast";
import { visit } from "unist-util-visit";
import * as YAML from "yaml";

export const analyzeWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "analyzeWebsite" }, (input) => async (ctx) => {
  const references_global: Reference[] = [];

  // TODO: expand directives

  await ef.run({ label: "individual processing" }, () => async (ctx) => {
    for (const res of input.website.resources) {
      await ef.run({ label: `route: ${res.route}` }, () => async (ctx) => {
        if (res.type === "post") {
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
                        const metadata =
                          schemaResourceMetadata.parse(frontmatter);
                        res.metadata = metadata;
                        break;
                      }
                      //
                      case "heading": {
                        if (node.depth === 1) {
                          res.metadata.name = showNode(node);
                        }
                        break;
                      }
                      case "textDirective": {
                        break;
                      }
                      //
                      case "image": {
                        const href = await ef.successfulSafeParse(
                          schemaHref.safeParse(node.url),
                        )(ctx);
                        const ref = from_Href_to_Reference(href);
                        res.references.push(ref);
                        references_global.push(ref);
                        break;
                      }
                      //
                      case "link": {
                        // convert all fragment hrefs to full hrefs
                        if (node.url.startsWith("#")) {
                          node.url = `${res.route}/${node.url}`;
                        }

                        const href = await ef.successfulSafeParse(
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

          dedupInPlace(res.references, (x) =>
            isoHref.unwrap(from_Reference_to_Href(x)),
          );
        }
      })(undefined)(ctx);
    }
  })(undefined)(ctx);

  const map_Route_to_Backlinks: Map<Route, mutation.Backlink[]> = new Map();

  await ef.run({ label: "relationship processing" }, () => async (ctx) => {
    for (const thisRes of input.website.resources) {
      await ef.run({ label: `route: ${thisRes.route}` }, () => async (ctx) => {
        switch (thisRes.type) {
          case "post": {
            const backlinks: mutation.Backlink[] = [];
            for (const otherRes of input.website.resources) {
              if (
                otherRes.references.filter((ref) => {
                  switch (ref.type) {
                    case "internal":
                      return ref.value === thisRes.route;
                    default:
                      return false;
                  }
                }).length !== 0
              ) {
                backlinks.push({
                  name: get_name_of_Resource(otherRes),
                  route: otherRes.route,
                });
              }
            }

            map_Route_to_Backlinks.set(thisRes.route, backlinks);
          }
        }
      })(undefined)(ctx);
    }
  })(undefined)(ctx);

  dedupInPlace(references_global, (x) =>
    isoHref.unwrap(from_Reference_to_Href(x)),
  );

  await populateMetadata_of_References({ references: references_global })(ctx);
  await useIcons_of_References({ references: references_global })(ctx);

  await ef.run(
    {
      label: "final transformations",
    },
    () => async (ctx) => {
      for (const res of input.website.resources) {
        await ef.run({ label: `route: ${res.route}` }, () => async (ctx) => {
          if (res.type === "post") {
            await mutation.addReferencesSection({
              root: res.root,
              resources: input.website.resources,
              references: res.references,
            })(ctx);

            const backlinks = await ef.defined(
              map_Route_to_Backlinks.get(res.route),
            )(ctx);
            await mutation.addBacklinksSection({
              root: res.root,
              backlinks,
            })(ctx);

            await homomorphism.applyHomomorphisms({
              root: res.root,
              params: {},
              homomorphisms: {
                stylizeLink: homomorphism.stylizeLink,
              },
            })(ctx);

            await mutation.addTableOfContents({
              route: res.route,
              root: res.root,
            })(ctx);
          }
        })(undefined)(ctx);
      }
    },
  )(undefined)(ctx);
});

export const populateMetadata_of_References: ef.T<{ references: Reference[] }> =
  ef.run(
    { label: "populateMetadata_of_References" },
    (input) => async (ctx) => {
      for (const ref of input.references) {
        switch (ref.type) {
          case "external": {
            ref.metadata = await ef.fetchExternalReferenceMetadata({
              url: ref.value,
            })(ctx);
            break;
          }
          default: {
            break;
          }
        }
      }
    },
  );

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
        ef.run({}, () => async (ctx) => {
          await ef.useRemoteFile({
            href: from_URL_to_iconHref(ref.value),
            output: from_URL_to_iconRoute(ref.value),
            input_default: config.iconRoute_placeholder,
          })(ctx);
        }),
      ),
    })(ctx);
  },
);
