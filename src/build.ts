import * as transform from "@/build/analyze";
import * as generate from "@/build/generate";
import * as parse from "@/build/parse";
import * as ef from "@/ef";

const build: ef.T = ef.run({ label: "build" }, (input) => async (ctx) => {
  const website = await parse.parseWebsite({})(ctx);
  await transform.analyzeWebsite({ website })(ctx);
  await generate.generateWebsite({ website })(ctx);
});

build({})({
  depth: 0,
  tell_mode: { type: "console" },
});
