import * as ef from "@/ef";
import { do_, encodeURIComponent_better } from "@/util";
import * as mdast from "mdast";
import { iso, type Newtype } from "newtype-ts";
import path from "path";
import { z } from "zod";

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
    "a Filepath must NOT include: ':', ' ', '../', './'",
  )
  .transform(isoFilepath.wrap);

export const joinFilepaths = (...xs: Filepath[]): Filepath =>
  schemaFilepath.parse(path.join(...xs.map((x) => isoFilepath.unwrap(x))));

export const schemaURL = z
  .string()
  .url()
  .transform((s) => new URL(s));

export type HrefUnion =
  | { type: "route"; value: Route }
  | { type: "url"; value: URL };

export const from_Href_to_HrefUnion = (href: Href): HrefUnion => {
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
  .refine((s) => s.startsWith("/"), `a Route must start with a '/'`)
  .refine(
    (s) =>
      !(
        s.includes(":") ||
        s.includes(" ") ||
        s.includes("../") ||
        s.includes("./")
      ),
    `a Route must NOT include: ':', ' ', '../', './'`,
  )
  .transform(isoRoute.wrap);

export const from_Route_to_Href = (route: Route): Href =>
  schemaHref.parse(isoRoute.unwrap(route));

export const from_Href_to_Route = (href: Href): Route | undefined => {
  const href_string = isoHref.unwrap(href);
  if (href_string.startsWith("/")) return schemaRoute.parse(href_string);
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

export const get_name_of_Resource = (res: Resource) =>
  res.metadata.name ?? isoRoute.unwrap(res.route);

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
      return config.iconRoute_of_website;
  }
};

// from_URL_*

export const from_URL_to_Href = (url: URL): Href => isoHref.wrap(url.href);

export const from_URL_to_hostHref = (url: URL): Href => {
  return schemaHref.parse(`${url.protocol}//${url.host}`);
};

export const join_Href_with_Route = (href: Href, route: Route): Href => {
  const href_string = isoHref.unwrap(href);
  return schemaHref.parse(
    `${href_string.endsWith("/") ? href_string.slice(0, -1) : href_string}${route}`,
  );
};

export const from_URL_to_iconHref = (url: URL): Href => {
  const hostHref = from_URL_to_hostHref(url);
  return join_Href_with_Route(hostHref, schemaRoute.parse("/favicon.ico"));
};

/**
 * Note that it doesn't add a file extension. This is file for URLs, apparently.
 */
export const from_URL_to_iconRoute = (url: URL): Route =>
  schemaRoute.parse(`/icon/${encodeURIComponent_better(url.hostname)}`);

// from_HRef_*

export const from_Href_to_iconRoute = (href: Href): Route => {
  const result = from_Href_to_HrefUnion(href);
  switch (result.type) {
    case "route":
      return config.iconRoute_of_website;
    case "url":
      return from_URL_to_iconRoute(result.value);
  }
};

export const from_Href_to_Reference = (href: Href): Reference => {
  const route_or_url = from_Href_to_HrefUnion(href);
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

export const config = do_(() => {
  const port_of_server = 3000;

  return {
    dirpath_of_server: schemaFilepath.parse("docs"),
    port_of_server,

    url_of_website: process.env.PRODUCTION
      ? new URL("https://rybl.net")
      : new URL(`http://localhost:${port_of_server}`),
    name_of_website: "rybl.net",
    input_iconRoute_of_website: schemaRoute.parse("/asset/icon/favicon.ico"),
    iconRoute_of_website: schemaRoute.parse("/favicon.ico"),

    dirpaths_of_watchers: ["src", "input"].map((x) => schemaFilepath.parse(x)),

    dirpath_of_output: schemaFilepath.parse("docs"),
    dirpath_of_input: schemaFilepath.parse("input"),

    iconRoute_placeholder: schemaRoute.parse("/asset/icon/placeholder.ico"),

    timeout_of_fetch: 5000,
    size_of_batched_posts_batch: 10,

    using_cache: true,
    using_batched_posts: true,

    route_of_styles: schemaRoute.parse("/asset/style"),
  };
});
