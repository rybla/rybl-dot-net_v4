import * as ef from "@/ef";
import { encodeURIComponent_better } from "@/util";
import * as mdast from "mdast";
import { z } from "zod";
import { iso, type Newtype } from "newtype-ts";
import path from "path";

export interface Filename
  extends Newtype<{ readonly tagFilename: unique symbol }, string> {}
export const isoFilename = iso<Filename>();
export const schemaFilename = z
  .string()
  .refine((s) => {
    try {
      path.parse(s);
      return true;
    } catch {
      return false;
    }
  }, "a Filename must be a valid path")
  .refine((s) => !s.includes("/"), "a Filename must not include '/'")
  .transform(isoFilename.wrap);

export interface Filepath
  extends Newtype<{ readonly tagFilepath: unique symbol }, string> {}
export const isoFilepath = iso<Filepath>();
// const regexRelativeFilepath = /^[^/]+(?:\/[^\/]+)*\/?$/;
export const schemaFilepath = z
  .string()
  .refine((s) => {
    try {
      path.parse(s);
      return true;
    } catch {
      return false;
    }
  }, "a Filepath must be a valid path")
  .refine((s) => !s.startsWith("/"), "a Filepath must not start with '/'")
  .refine(
    (s) =>
      !(
        s.includes(":") ||
        s.includes(" ") ||
        s.includes("../") ||
        s.includes("./")
      ),
    `a Filepath must NOT include: ":", " ", "../", "./"`,
  )
  .transform(isoFilepath.wrap);

export const schemaURL = z
  .string()
  .url()
  .transform((s) => new URL(s));

export const from_Href_to_Route_or_URL = (
  href: Href,
): { type: "route"; value: Route } | { type: "url"; value: URL } => {
  const href_string = isoHref.unwrap(href);
  if (href_string.startsWith("/")) {
    return { type: "route", value: schemaRoute.parse(href) };
  } else {
    return { type: "url", value: new URL(href_string) };
  }
};

/**
 * A {@link Route} is a path to access a resource in the {@link Website}.
 */
export interface Route
  extends Newtype<{ readonly tagRoute: unique symbol }, string> {}
export const isoRoute = iso<Route>();
export const schemaRoute = z
  .string()
  .refine((s) => {
    try {
      path.parse(s);
      return true;
    } catch {
      return false;
    }
  }, "a Route must be a valid path")
  .refine((s) => s.startsWith("/"), `a Route must start with a "/"`)
  .refine(
    (s) =>
      !(
        s.includes(":") ||
        s.includes(" ") ||
        s.includes("../") ||
        s.includes("./")
      ),
    `a Route must NOT include: ":", " ", "../", "./"`,
  )
  .transform(isoRoute.wrap);

export const from_Route_to_Href = (route: Route): Href =>
  isoHref.wrap(`/${isoRoute.unwrap(route)}`);

export const from_Href_to_Route = (href: Href): Route | undefined => {
  const href_string = isoHref.unwrap(href);
  if (href_string.startsWith("/")) return isoRoute.wrap(href_string.slice(1));
};

export const joinRoutes = (...rs: Route[]): Route =>
  schemaRoute.parse(rs.map(isoRoute.unwrap).join(""));

/**
 * An {@link Href} is a hyper-reference that can be either local ("/" followed by a filepath) or remote (a URL).
 * Local {@link Href}s always begin with "/".
 */
export interface Href
  extends Newtype<{ readonly tagHref: unique symbol }, string> {}
export const isoHref = iso<Href>();
export const schemaHref = z.union([
  schemaRoute.transform((r) => isoHref.wrap(isoRoute.unwrap(r))),
  schemaURL.transform((url) => isoHref.wrap(url.href)),
]);

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

export type ResourceMetadata = z.infer<typeof schemaResourceMetadata>;
export const schemaResourceMetadata = z.object({
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

// from_Reference_*

export const from_Reference_to_Href = (ref: Reference): Href => {
  switch (ref.type) {
    case "internal":
      return from_Route_to_Href(ref.value);
    case "external":
      return from_URL_to_Href(ref.value);
  }
};

export const from_Reference_to_IconRoute = (ref: Reference): Route => {
  switch (ref.type) {
    case "external":
      return from_URL_to_iconRoute(ref.value);
    case "internal":
      return config.route_of_favicon_of_website;
  }
};

// from_URL_*

export const from_URL_to_Href = (url: URL): Href => isoHref.wrap(url.href);

export const from_URL_to_hostHref = (url: URL): Href =>
  isoHref.wrap(`${url.protocol}//${url.hostname}`);

export const from_URL_to_iconHref = (url: URL): Href =>
  isoHref.wrap(`${from_URL_to_hostHref(url)}/favicon.ico`);

/**
 * Note that it doesn't add a file extension. This is file for URLs, apparently.
 */
export const from_URL_to_iconRoute = (url: URL): Route =>
  isoRoute.wrap(
    encodeURIComponent_better(isoHref.unwrap(from_URL_to_hostHref(url))),
  );

// from_HRef_*

export const from_Href_to_iconRoute = (href: Href): Route => {
  const result = from_Href_to_Route_or_URL(href);
  switch (result.type) {
    case "route":
      return config.route_of_favicon_of_website;
    case "url":
      return from_URL_to_iconRoute(result.value);
  }
};

export const from_Href_to_Reference = (href: Href): Reference => {
  const route_or_url = from_Href_to_Route_or_URL(href);
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

export const config = {
  dirpath_of_server: "./docs",
  port_of_server: 3000,

  url_of_website: new URL("https://rybl.net"),
  name_of_website: "rybl.net",
  route_of_favicon_of_website: schemaRoute.parse("/favicon.ico"),

  dirpaths_of_watchers: ["./src", "./input"],

  dirpath_of_output: "./docs",
  dirpath_of_input: "./input",

  route_of_placeholder_favicon: schemaRoute.parse(
    "/asset/placeholder_favicon.ico",
  ),

  timeout_of_fetch: 5000,
  size_of_batched_posts_batch: 10,

  using_cache: true,
  using_batched_posts: true,
};
