import { iso, type Newtype } from "newtype-ts";
import { z } from "zod";

export type Record = { [key: string]: any };

export const do_ = <A>(k: () => A) => k();

export const indentation = (level: number) => " ".repeat(level * 2);

export const indentString = (level: number, s: string) => {
  const i = indentation(level);
  return s
    .split("\n")
    .map((s) => `${i}│ ${s}`)
    .join("\n");
};

export const render_jsx = async (jsx: JSX.Element) =>
  jsx instanceof Promise ? await jsx : jsx;

export const sleep = async (duration_ms: number) =>
  new Promise((res) => setTimeout(res, duration_ms));

export type Tree<A> = { value: A; kids: Tree<A>[] };

export type OptionalizeRecord<R extends Record> = {
  [K in keyof R]: R[K] | undefined;
};

export const encodeURIComponent_id = (uriComponent: string) =>
  encodeURIComponent(uriComponent.replaceAll(" ", "_"));

export type Ref<A> = { value: A };
export const Ref = <A>(value: A): Ref<A> => ({ value });

export const intercalate = <A>(xss: A[][], sep: A[]): A[] => {
  const ys: A[] = [];
  for (const xs of xss.slice(0, -1)) ys.push(...xs, ...sep);
  for (const xs of xss.slice(-1)) ys.push(...xs);
  return ys;
};

export const ifDefined = <A, B>(
  a: A | undefined | null,
  b: B | (() => B),
  k: (a: A) => B,
): B => {
  // @ts-ignore
  if (a === undefined || a === null) return typeof b === "function" ? b() : b;
  return k(a);
};

export const dedup = <A>(
  xs: Iterable<A>,
  getId: (x: A) => string,
): Iterable<A> => {
  const map_of_ys: Map<string, A> = new Map();
  for (const x of xs) map_of_ys.set(getId(x), x);
  return map_of_ys.values();
};

/**
 * Removes all duplicates from {@link xs} in place, which are elements with
 * equal {@link getId} values.
 * @param xs
 */
export const dedupInPlace = <A>(xs: A[], getId: (x: A) => string): void => {
  if (!xs || xs.length === 0) {
    return;
  }

  const seen = new Set<string>();
  let writeIndex = 0;

  for (let readIndex = 0; readIndex < xs.length; readIndex++) {
    const currentElement = xs[readIndex]!;
    if (!seen.has(getId(currentElement))) {
      seen.add(getId(currentElement));
      if (readIndex !== writeIndex) {
        xs[writeIndex] = currentElement;
      }
      writeIndex++;
    }
  }
  xs.length = writeIndex;
};

/**
 * Converts a {@link URL} to a safe filename by replacing characters that are
 * not valid in filenames, which still keeping the {@link URL} looking mostly
 * the same.
 *
 * @param url
 */
export function fromUrlToFilename(url: URL): string {
  let filename = url.toString();

  filename = filename.replace(/^[a-z][a-z0-9+.-]*:\/\//i, (match) => {
    return match.substring(0, match.length - 3) + "_";
  });

  filename = filename.replace(/\//g, "_");
  filename = filename.replace(/\?/g, "_Q_");
  filename = filename.replace(/&/g, "_A_");
  filename = filename.replace(/=/g, "_E_");
  filename = filename.replace(/#/g, "_H_");

  filename = filename.replace(/:/g, "_colon_");
  filename = filename.replace(/\*/g, "_star_");
  filename = filename.replace(/"/g, "_quote_");
  filename = filename.replace(/</g, "_lt_");
  filename = filename.replace(/>/g, "_gt_");
  filename = filename.replace(/\|/g, "_pipe_");
  filename = filename.replace(/\\/g, "_bslash_");
  filename = filename.replace(/\s/g, "_");

  return filename;
}

// TODO: does this actually work well?
export function fromStringToFilename(
  input: string,
  defaultName: string = "untitled",
): string {
  let filename = input.trim();
  if (filename === "") return defaultName;
  filename = filename.replaceAll(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  filename = filename.replaceAll(/_+/g, "_");
  filename = filename.replaceAll(/^_+|_+$/g, "");
  if (filename === "") return defaultName;
  return filename;
}

export interface Filename
  extends Newtype<{ readonly tagFilename: unique symbol }, string> {}
export const isoFilename = iso<Filename>();
const regexFilename = /^(?!^\.$|^\.\.$)[^\/:]+$/;
export const schemaFilename = z
  .string()
  .regex(regexFilename)
  .transform(isoFilename.wrap);

export interface RelativeFilepath
  extends Newtype<{ readonly tagFilepath: unique symbol }, string> {}
export const isoRelativeFilepath = iso<RelativeFilepath>();
const regexRelativeFilepath = /^[^/]+(?:\/[^\/]+)*\/?$/;
export const schemaRelativeFilepath = z
  .string()
  .regex(regexRelativeFilepath)
  .transform(isoRelativeFilepath.wrap);

export const schemaURL = z
  .string()
  .url()
  .transform((s) => new URL(s));

export const fromHrefToRouteOrURL = (
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
  .refine((s) => s.startsWith("/"), `a Route must start with a "/"`)
  .refine((s) => !s.includes(":"), `a Route cannot include ":"`)
  .transform(isoRoute.wrap);

export const fromRouteToHref = (route: Route): Href =>
  isoHref.wrap(`/${isoRoute.unwrap(route)}`);

export const fromHrefToRoute = (href: Href): Route | undefined => {
  const href_string = isoHref.unwrap(href);
  if (href_string.startsWith("/")) return isoRoute.wrap(href_string.slice(1));
};

export const joinRoutes = (...rs: Route[]): Route =>
  schemaRoute.parse(rs.map(isoRoute.unwrap).join(""));

/**
 * An {@link Href} is a hyper-reference that can be either local ("/" followed by a valid relative filepath) or remote (a valid URL).
 * Local {@link Href}s always begin with "/".
 */
export interface Href
  extends Newtype<{ readonly tagHref: unique symbol }, string> {}
export const isoHref = iso<Href>();
export const schemaHref = z.union([
  schemaRoute.transform((r) => isoHref.wrap(isoRoute.unwrap(r))),
  schemaURL.transform((url) => isoHref.wrap(url.href)),
]);
