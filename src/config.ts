import { schemaRoute } from "@/util";

export const dirpath_of_server = "./docs";
export const port_of_server = 3000;

export const url_of_website = new URL("https://rybl.net");
export const name_of_website = "rybl.net";

export const dirpaths_of_watchers = ["./src", "./input"];

export const dirpath_of_output = "./docs";
export const dirpath_of_input = "./input";

export const route_of_placeholder_favicon = schemaRoute.parse(
  "/placeholder_favicon.png",
);

export const timeout_of_fetch = 5000;
export const size_of_batched_posts_batch = 10;

export const using_cache = true;
export const using_batched_posts = true;
