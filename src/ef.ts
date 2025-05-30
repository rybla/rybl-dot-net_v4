import { JSDOM } from "jsdom";
import { do_, encodeURIComponent_better, indentString } from "@/util";
import * as fsSync from "fs";
import * as fs from "fs/promises";
import path from "path";
import { z } from "zod/v4";
import {
  config,
  isoFilepath,
  isoHref,
  isoRoute,
  joinFilepaths,
  joinRoutes,
  schemaFilepath,
  schemaRoute,
  type ExternalReferenceMetadata,
  type Filepath,
  type Href,
  type Route,
} from "@/ontology";

const from_Route_to_Filepath = (r: Route): Filepath =>
  schemaFilepath.parse(isoRoute.unwrap(r).slice(1));

const from_Route_to_inputFilepath = (r: Route): Filepath =>
  schemaFilepath.parse(
    joinFilepaths(config.dirpath_of_input, from_Route_to_Filepath(r)),
  );

const from_Route_to_outputFilepath = (r: Route): Filepath =>
  schemaFilepath.parse(
    joinFilepaths(config.dirpath_of_output, from_Route_to_Filepath(r)),
  );

const from_Route_to_memoFilepath = (r: Route): Filepath =>
  schemaFilepath.parse(
    joinFilepaths(config.dirpath_of_memo, from_Route_to_Filepath(r)),
  );

export type T<A = unknown, B = void> = (input: A) => (ctx: Ctx.T) => Promise<B>;

export namespace Ctx {
  export type T = {
    readonly depth: number;
    readonly tell_mode:
      | { type: "console" }
      | { type: "writer"; tells: { depth: number; content: string }[] };
  };

  export const nest: (ctx: T) => T = (ctx) => ({
    ...ctx,
    depth: ctx.depth + 1,
  });
}

export class EfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EfError";
  }
}

export const label = (name: string, args: any, content?: string) =>
  `${name}(${JSON.stringify(args)})${content === undefined ? "" : `: ${content}`}`;

export const tell: T<string> = (content) => async (ctx) => {
  if (ctx.tell_mode.type === "console") {
    console.log(indentString(ctx.depth, content));
  } else if (ctx.tell_mode.type === "writer") {
    ctx.tell_mode.tells.push({ depth: ctx.depth, content });
  }
};

export const tellSync = (content: string) => (ctx: Ctx.T) => {
  if (ctx.tell_mode.type === "console") {
    console.log(indentString(ctx.depth, content));
  } else if (ctx.tell_mode.type === "writer") {
    ctx.tell_mode.tells.push({ depth: ctx.depth, content });
  }
};

export const tellJSON: T<any> = (r) => async (ctx) => {
  const s = JSON.stringify(r, null, 2);
  if (ctx.tell_mode.type === "console") {
    console.log(indentString(ctx.depth, s));
  } else if (ctx.tell_mode.type === "writer") {
    ctx.tell_mode.tells.push({
      depth: ctx.depth,
      content: s,
    });
  }
};

export const run: <A, B>(
  opts: {
    label?: string | ((input: A) => string);
    catch?: T<EfError, B>;
  },
  t: T<A, B>,
) => T<A, B> = (opts, t) => (input) => async (ctx) => {
  const ctx_new: Ctx.T = opts.label === undefined ? ctx : Ctx.nest(ctx);
  if (opts.label !== undefined) {
    if (typeof opts.label === "function") await tell(opts.label(input))(ctx);
    else await tell(opts.label)(ctx);
  }
  try {
    return await t(input)(ctx_new);
  } catch (e: any) {
    if (e instanceof EfError && opts.catch !== undefined)
      return await opts.catch(e)(ctx_new);
    throw e;
  }
};

export const useMemo: <A>(input: {
  key: string;
  initialize: T<unknown, A>;
}) => (ctx: Ctx.T) => Promise<A> = run(
  { label: (input) => label("useMemo", input.key) },
  (input) => async (ctx) => {
    const filepath = joinFilepaths(
      config.dirpath_of_memo,
      schemaFilepath.parse(`${encodeURIComponent_better(input.key)}.json`),
    );
    if (!fsSync.existsSync(isoFilepath.unwrap(filepath))) {
      await tell("initializing memo")(ctx);
      const val = await input.initialize({})(ctx);
      if (!fsSync.existsSync(isoFilepath.unwrap(config.dirpath_of_memo)))
        fs.mkdir(isoFilepath.unwrap(config.dirpath_of_memo), {
          recursive: true,
        });
      await fs.writeFile(
        isoFilepath.unwrap(filepath),
        JSON.stringify(val, null, 4),
      );
      return val;
    }
    return JSON.parse(
      await fs.readFile(isoFilepath.unwrap(filepath), { encoding: "utf8" }),
    );
  },
);

export const getRoute_textFile: T<{ route: Route }, string> =
  (input) => async (ctx) => {
    try {
      const filepath_input = from_Route_to_inputFilepath(input.route);
      return await fs.readFile(isoFilepath.unwrap(filepath_input), {
        encoding: "utf8",
      });
    } catch (e: any) {
      throw new EfError(label("getRoute_textFile", input, e.toString()));
    }
  };

export const setRoute_textFile: T<{
  route: Route;
  content: string;
}> = (input) => async (ctx) => {
  try {
    const filepath_output = from_Route_to_outputFilepath(input.route);
    await fs.mkdir(path.dirname(isoFilepath.unwrap(filepath_output)), {
      recursive: true,
    });
    await fs.writeFile(isoFilepath.unwrap(filepath_output), input.content, {
      encoding: "utf8",
    });
  } catch (e: any) {
    throw new EfError(label("setRoute_textFile", input, e.toString()));
  }
};

export const getSubRoutes: T<{ route: Route }, Route[]> =
  (input) => async (ctx) => {
    try {
      const dirpath = from_Route_to_inputFilepath(input.route);
      const filenames = await fs.readdir(isoFilepath.unwrap(dirpath));
      return filenames.map((x) =>
        schemaRoute.parse(joinRoutes(input.route, schemaRoute.parse(`/${x}`))),
      );
    } catch (e: any) {
      throw new EfError(label("getSubRoutes", input, e.toString()));
    }
  };

export const useLocalFile: T<{ input: Route; output?: Route }> = run(
  {
    label: (input) =>
      `useLocalFile("${input.input}" ==> ${input.output ?? "~"})`,
  },
  (input) => async (ctx) => {
    try {
      const filepath_input = from_Route_to_inputFilepath(input.input);
      const filepath_output = from_Route_to_outputFilepath(
        input.output ?? input.input,
      );
      await fs.mkdir(path.dirname(isoFilepath.unwrap(filepath_output)), {
        recursive: true,
      });
      await fs.copyFile(
        isoFilepath.unwrap(filepath_input),
        isoFilepath.unwrap(filepath_output),
      );
    } catch (e: any) {
      throw new EfError(label("useLocalFile", input, e.toString()));
    }
  },
);

// TODO: write another version of this that lets you analyze the result of the output to get the content to write to the output route
export const useRemoteFile: T<{
  href: Href;
  output: Route;
  /**
   * If {@link href} cannot be downloaded, then copy the input
   * {@link default} to output {@link target}.
   */
  input_default?: Route;
}> = run(
  { label: (input) => label("useRemoteFile", { href: input.href }) },
  (input) => async (ctx) => {
    const filepath_output = from_Route_to_outputFilepath(input.output);
    try {
      if (fsSync.existsSync(isoFilepath.unwrap(filepath_output))) {
        // already downloaded, so, don't need to download again
        await tell(`Already downloaded to ${input.output}`)(ctx);
        return;
      } else {
        const response = await fetch(isoHref.unwrap(input.href), {
          redirect: "follow",
          signal: AbortSignal.timeout(config.timeout_of_fetch),
        });
        if (!response.ok)
          throw new Error(`Failed to download file from ${input.href}`);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.mkdir(path.dirname(isoFilepath.unwrap(filepath_output)), {
          recursive: true,
        });
        await fs.writeFile(isoFilepath.unwrap(filepath_output), buffer);
      }
    } catch (e: any) {
      if (input.input_default) {
        await tell(
          `Failed to download, so using copying\n  ${input.input_default} ~~>\n  ${input.output}`,
        )(ctx);
        const filepath_input = from_Route_to_inputFilepath(input.input_default);
        await fs.copyFile(
          isoFilepath.unwrap(filepath_input),
          isoFilepath.unwrap(filepath_output),
        );
      } else {
        throw new EfError(e.message);
      }
    }
  },
);

export const defined: <A>(
  a: A | undefined | null,
) => (ctx: Ctx.T) => Promise<A> = (a) => async (ctx) => {
  if (a === undefined)
    throw new EfError("expected to be defined, but was undefined");
  if (a === null) throw new EfError("expected to be defined, but was null");
  return a;
};

export const successfulSafeParse =
  <A>(x: z.ZodSafeParseResult<A>) =>
  async (ctx: Ctx.T): Promise<A> => {
    if (x.success) {
      return x.data;
    } else {
      throw new EfError(label("successfulSafeParse", x, x.error.toString()));
    }
  };

export const pure =
  <A>(a: A) =>
  (ctx: Ctx.T) =>
    a;

export const all =
  <Input, Output>(input: {
    opts: { batch_size?: number };
    ks: T<Input, Output>[];
    input: Input;
  }) =>
  async (ctx: Ctx.T): Promise<Output[]> => {
    const batch_size = input.opts.batch_size ?? input.ks.length;
    const batches: T<Input, Output>[][] = [];
    for (let i = 0; i < input.ks.length; i += batch_size)
      batches.push(input.ks.slice(i, i + batch_size));

    const tellss: { depth: number; content: string }[][] = [];
    const results: Output[] = [];

    for (const batch of batches) {
      results.push(
        ...(await Promise.all(
          batch.map((k, i) => {
            const tells: { depth: number; content: string }[] = [];
            tellss.push(tells);
            return run({}, k)(input.input)({
              ...ctx,
              tell_mode: { type: "writer", tells },
            });
          }),
        )),
      );

      for (const ts of tellss) {
        for (const t of ts) await tell(t.content)({ ...ctx, depth: t.depth });
      }
    }

    return results;
  };

export const todo = <A>(msg?: string): A => {
  if (msg === undefined) throw new EfError(`[TODO]`);
  else throw new EfError(`[TODO]\n${msg}`);
};

export const fetchExternalReferenceMetadata: T<
  { url: URL },
  ExternalReferenceMetadata
> = run(
  { label: (input) => label("fetchExternalReferenceMetadata", input) },
  (input) => async (ctx) => {
    return await useMemo({
      key: encodeURIComponent_better(input.url.href),
      initialize: () => async (ctx) => {
        const metadata: ExternalReferenceMetadata = {};
        await all({
          opts: {},
          input: {},
          ks: [
            run({}, () => async (ctx) => {
              metadata.name = await fetchTitle({ url: input.url })(ctx);
            }),
          ],
        })(ctx);
        return metadata;
      },
    })(ctx);
  },
);

export const fetchTitle: T<{ url: URL }, string | undefined> = run(
  { label: (input) => label("fetchTitle", input) },
  (input) => async (ctx) => {
    try {
      const response = await fetch(input.url.toString(), {
        redirect: "follow",
        signal: AbortSignal.timeout(config.timeout_of_fetch),
      });

      if (!response.ok) {
        await tell(
          `Failed to fetch article: ${response.status} ${response.statusText}`,
        )(ctx);
        return undefined;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) {
        await tell(`Expected HTML content, but got ${contentType}`)(ctx);
        return undefined;
      }

      const htmlContent = await response.text();
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      const title = await do_(async () => {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
          const title = ogTitle.getAttribute("content")?.trim();
          if (title) return title;
        }

        const twitterTitle = document.querySelector(
          'meta[name="twitter:title"]',
        );
        if (twitterTitle) {
          const title = twitterTitle.getAttribute("content")?.trim();
          if (title) return title;
        }

        const titleTag = document.querySelector("title");
        if (titleTag) {
          const title = titleTag.textContent?.trim();
          if (title) return title;
        }

        const h1Tag = document.querySelector("h1");
        if (h1Tag) {
          const title = h1Tag.textContent?.trim();
          if (title) return title;
        }
      });
      if (title === undefined) return undefined;

      if (input.url.hash !== "") {
        const e = document.getElementById(input.url.hash);
        if (e === null) return title;
        if (e.textContent === null) return title;
        if (e.textContent === "") return title;
        return `${title} –– ${e.textContent}`;
      } else {
        return title;
      }
    } catch (e: any) {
      await tell(e.toString())(ctx);
      return undefined;
    }
  },
);
