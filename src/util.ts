type Record = { [key: string]: any };

export const do_ = <A>(k: () => A) => k();

export const indentation = (level: number) => " ".repeat(level * 2);

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

// export const defined = <A>(a: A | undefined | null): A => {
//   if (a === undefined) throw Error("expected to be defined, but was undefined");
//   if (a === null) throw Error("expected to be defined, but was null");
//   return a;
// };

export const ifDefined = <A, B>(
  a: A | undefined | null,
  b: B | (() => B),
  k: (a: A) => B,
): B => {
  // @ts-ignore
  if (a === undefined || a === null) return typeof b === "function" ? b() : b;
  return k(a);
};
