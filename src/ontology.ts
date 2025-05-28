import * as config from "@/config";
import * as ef from "@/ef";
import {
  fromHrefToRouteOrURL,
  fromRouteToHref,
  fromUrlToFilename,
  isoHref,
  isoRoute,
  type Href,
  type Route,
} from "@/util";
import * as mdast from "mdast";
import { z } from "zod";

/**
 * Everything that describes a website.
 */
export type Website = {
  url: URL;
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
  route: Route;
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

export type ExternalReference = { value: URL };
export type InternalReference = { value: Route };

export const fromHref_to_Reference = (href: Href): Reference => {
  const route_or_url = fromHrefToRouteOrURL(href);
  switch (route_or_url.type) {
    case "route": {
      return {
        type: "internal",
        value: route_or_url.value,
      };
    }
    case "url": {
      return {
        type: "external",
        value: route_or_url.value,
      };
    }
  }
};

export const getHref_of_Reference = (ref: Reference): Href => {
  switch (ref.type) {
    case "internal":
      return fromRouteToHref(ref.value);
    case "external":
      return getHref_of_URL(ref.value);
  }
};

export const getIconRoute_of_Reference = (ref: Reference): Route => {
  switch (ref.type) {
    case "external":
      return getIconRoute_of_URL(ref.value);
    case "internal":
      return config.route_of_placeholder_favicon;
  }
};

export const getHref_of_URL = (url: URL): Href => isoHref.wrap(url.href);

export const getHostHref_of_URL = (url: URL): Href =>
  isoHref.wrap(`${url.protocol}//${url.hostname}`);

export const getIconHref_of_URL = (url: URL): Href =>
  isoHref.wrap(`${getHostHref_of_URL(url)}/favicon.ico`);

export const getIconRoute_of_URL = (url: URL): Route =>
  isoRoute.wrap(`${fromUrlToFilename(url)}.ico`);

export const getIconRoute_of_Href = (href: Href): Route => {
  const result = fromHrefToRouteOrURL(href);
  switch (result.type) {
    case "route":
      return config.route_of_placeholder_favicon;
    case "url":
      return getIconRoute_of_URL(result.value);
  }
};
