import { z } from "zod";
import * as ef from "./ef";
import * as mdast from "mdast";

/**
 * Everything that describes a website.
 */
export type Website = {
  url: string;
  name: string;
  resources: Resource[];
};

/**
 * Adds a {@link Resource} to a {@link Website}. Throws an error if a
 * {@link Resource} with the same `route` already exists.
 *
 * @param website
 * @param resource
 */
export const addResource: ef.T<
  { website: Website; resource: Resource },
  void
> = (input) => async (ctx) => {
  if (
    input.website.resources.find(
      (resource_old) => resource_old.route === input.resource.route,
    ) !== undefined
  ) {
    throw new ef.EfError(
      `attempted to add a new Resource to a Website that already has a Resource at that Route: ${input.resource.route}`,
    );
  }
  input.website.resources.push(input.resource);
};

/**
 * A thing that exists in a {@link Website}.
 */
export type Resource = MarkdownResource | HtmlResource | RawResource;

/**
 * A type common to all {@link Resource}s.
 */
export type ResourceBase = {
  route: string;
  references: Reference[];
  metadata: ResourceMetadata;
};

export type MarkdownResource = ResourceBase & {
  type: "markdown";
  root: mdast.Root;
};

export type HtmlResource = ResourceBase & {
  type: "html";
  content: string;
};

export type ResourceMetadata = z.infer<typeof ResourceMetadata_Schema>;
export const ResourceMetadata_Schema = z.object({
  name: z.optional(z.string()),
  pubDate: z.optional(z.string()),
  tags: z.optional(z.array(z.string())),
  abstract: z.optional(z.string()),
});

export type RawResource = ResourceBase & {
  type: "raw";
};

export type Reference =
  | ({ type: "external" } & ExternalReference)
  | ({ type: "internal" } & InternalReference);

export type ExternalReference = { url: URL };
export type InternalReference = { route: string };

export const getHref_of_Reference = (ref: Reference) => {
  switch (ref.type) {
    case "internal":
      return ref.route;
    case "external":
      return ref.url.href;
  }
};
