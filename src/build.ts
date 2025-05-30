import * as analysis from "@/build/analysis";
import * as generation from "@/build/generation";
import * as parsing from "@/build/parsing";
import * as ef from "@/ef";

const build: ef.T = ef.run({ label: "build" }, (input) => async (ctx) => {
  const website = await parsing.parseWebsite({})(ctx);
  await analysis.analyzeWebsite({ website })(ctx);
  await generation.generateWebsite({ website })(ctx);
});

build({})({
  depth: 0,
  tell_mode: { type: "console" },
});
