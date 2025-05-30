export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type Record = { [key: string]: any };

export const do_ = <A>(k: () => A) => k();

export const indentation = (level: number) => "│   ".repeat(level);

export const indentString = (level: number, s: string) => {
  const i = indentation(level);
  return s
    .split("\n")
    .map((s) => `${i}${s}`)
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

export const encodeURIComponent_better = (s: string) =>
  encodeURIComponent(s.replaceAll(/(:|_|\/)/g, "_")).slice(0, 225);

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

declare global {
  interface Array<T> {
    filterMap<B>(this: Array<T>, f: (x: T) => B | undefined): Array<B>;
  }
}

Array.prototype.filterMap = function <T, B>(
  this: T[],
  f: (x: T) => B | undefined,
) {
  const ys: B[] = [];
  for (const x of this) {
    const y = f(x);
    if (y !== undefined) ys.push(y);
  }
  return ys;
};
