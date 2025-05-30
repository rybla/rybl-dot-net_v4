import * as ef from "@/ef";
import { type Plugin } from "unified";
import * as unist from "unist";
import * as mdast from "mdast";
import * as hast from "hast";

// const mkPlugin: <
//   Opts extends { [key: string]: any } & { ctx: ef.Ctx.T },
//   Input extends unist.Node,
//   Output extends unist.Node,
// >(
//   label: string,
//   k: ef.T<Opts & { root: Input }, void>,
// ) => Plugin<[Opts], Input, Output> =
//   (label, k) =>
//   (opts) =>
//   // @ts-ignore
//   (root: Input) =>
//     ef.run({ label }, k)({ ...opts, root })(opts.ctx);

// export const stylizeLinks = mkPlugin<{}, mdast.Node, mdast.Node>(
//   "stylizeLinks",
//   (input) => async (ctx) => {

//     input.root;
//   },
// );
