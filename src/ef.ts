import { indentString } from "@/util";
import * as fsSync from "fs";
import * as fs from "fs/promises";
import path from "path";
import { z } from "zod";
import {
  config,
  isoFilepath,
  isoHref,
  isoRoute,
  joinFilepaths,
  joinRoutes,
  schemaFilepath,
  schemaRoute,
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

export const getCache =
  <A>(input: { key: string; default: T<unknown, A> }) =>
  async (ctx: Ctx.T): Promise<A> => {
    await tell(`get cache at "${input.key}"`)(ctx);
    const filepath = `cache/${input.key}.json`;
    if (!fsSync.existsSync(filepath)) return await input.default({})(ctx);
    return JSON.parse(await fs.readFile(filepath, { encoding: "utf8" }));
  };

export const setCache =
  <A>(input: { key: string; value: A }) =>
  async (ctx: Ctx.T): Promise<void> => {
    await tell(`set cache at "${input.key}"`)(ctx);
    if (!fsSync.existsSync("cache")) fs.mkdir("cache", { recursive: true });
    const filepath = `cache/${input.key}.json`;
    await fs.writeFile(filepath, JSON.stringify(input.value, null, 4));
  };

export const withCache: T<void, void> = (input) => async (ctx) => {
  // TODO: wrapper around using cached values
};

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
  {
    label: (input) => label("useRemoteFile", { href: input.href }),
  },
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
        throw new EfError(label("useRemoteFile", input, e.message));
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
  <Input, Output>(x: z.SafeParseReturnType<Input, Output>) =>
  async (ctx: Ctx.T): Promise<Output> => {
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
