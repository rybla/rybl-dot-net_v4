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
import {
  dedup,
  dedupInPlace,
  do_,
  fromHrefToRouteOrURL,
  isoHref,
  schemaHref,
} from "@/util";
import { visit } from "unist-util-visit";
import YAML from "yaml";
import * as transforms from "./analyze/transforms";

export const analyzeWebsite: ef.T<{
  website: Website;
}> = ef.run({ label: "analyzeWebsite" }, (input) => async (ctx) => {
  const references_global: Reference[] = [];

  // collect stuff

  for (const resource of input.website.resources) {
    if (resource.type === "markdown") {
      // analyzes:
      //   - references
      //   - metadata
      await ef.all({
        opts: {},
        input: {},
        ks: do_(() => {
          const ks: ef.T[] = [];
          visit(resource.root, (node) => {
            // ef.tellSync(`[before] node type: ${node.type}`)(ctx);
            ks.push(
              ef.run({}, () => async (ctx) => {
                // ef.tellSync(`[after] node type: ${node.type}`)(ctx);
                switch (node.type) {
                  case "yaml": {
                    const frontmatter = YAML.parse(node.value);
                    const metadata = ResourceMetadata_Schema.parse(frontmatter);
                    resource.metadata = metadata;
                    break;
                  }
                  //
                  case "heading": {
                    if (node.depth === 1)
                      resource.metadata.name === showNode(node);
                    break;
                  }
                  case "textDirective": {
                    break;
                  }
                  //
                  case "link": {
                    try {
                      const href = await ef.successulSafeParse(
                        schemaHref.safeParse(node.url),
                      )(ctx);
                      const ref = fromHref_to_Reference(href);
                      resource.references.push(ref);
                      references_global.push(ref);

                      await transforms.addPrefixIconToLink({ link: node })(ctx);
                    } catch (e: any) {
                      await ef.tell(`Invalid link: ${e}`)(ctx);
                    }
                    break;
                  }
                }
              }),
            );
          });
          return ks;
        }),
      })(ctx);

      // dedup references
      resource.references = Array.from(
        dedup(resource.references, (x) =>
          isoHref.unwrap(getHref_of_Reference(x)),
        ),
      );
    }
  }

  dedupInPlace(references_global, (x) =>
    isoHref.unwrap(getHref_of_Reference(x)),
  );

  await useFaviconsOfReferences({ references: references_global })(ctx);
});

const useFaviconsOfReferences: ef.T<{ references: Reference[] }> = ef.run(
  { label: "useFaviconsOfReferences" },
  (input) => async (ctx) => {
    const externalReferences: ExternalReference[] = Array.from(
      dedup(
        input.references.flatMap((ref) => {
          switch (ref.type) {
            case "external":
              return [ref];
            default:
              return [];
          }
        }),
        (ref) => isoHref.unwrap(getHostHref_of_URL(ref.value)),
      ),
    );

    await ef.all({
      opts: {},
      input: {},
      ks: Array.from(externalReferences).map((ref) => () => async (ctx) => {
        await ef.useRemoteFile({
          href: getIconHref_of_URL(ref.value),
          route: getIconRoute_of_URL(ref.value),
        })(ctx);
      }),
    })(ctx);
  },
);
