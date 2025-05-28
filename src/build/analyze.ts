import * as ef from "@/ef";
import {
  getHref_of_Reference,
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
  fromUrlToFilename,
  getHostHref,
} from "@/util";
import { visit } from "unist-util-visit";
import YAML from "yaml";

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
          visit(resource.root, (node) =>
            ks.push(
              ef.run({}, () => async (ctx) => {
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
                  //
                  case "link": {
                    if (node.url.startsWith("/")) {
                      const href = node.url;
                      const ref: Reference = {
                        type: "internal",
                        route: href,
                      };
                      resource.references.push(ref);
                      references_global.push(ref);
                    } else {
                      try {
                        const url = new URL(node.url);
                        const ref: Reference = { type: "external", url };
                        resource.references.push(ref);
                        references_global.push(ref);
                      } catch (e: any) {
                        await ef.tell(`Invalid link url "${node.url}": ${e}`)(
                          ctx,
                        );
                      }
                    }
                    break;
                  }
                }
              }),
            ),
          );
          return ks;
        }),
      })(ctx);

      // dedup references
      resource.references = Array.from(
        dedup(resource.references, getHref_of_Reference),
      );
    }
  }

  dedupInPlace(references_global, getHref_of_Reference);

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
        (ref) => getHostHref(ref.url),
      ),
    );

    await ef.all({
      opts: {},
      input: {},
      ks: Array.from(externalReferences).map((ref) => () => async (ctx) => {
        await ef.useRemoteFile({
          href: `${getHostHref(ref.url)}/favicon.ico`,
          route: `${fromUrlToFilename(ref.url)}.ico`,
        })(ctx);
      }),
    })(ctx);
  },
);
