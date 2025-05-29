import express from "express";
import http from "http";
import { do_ } from "@/util";
import { config } from "@/ontology";

do_(async () => {
  const app = express();
  app.use(express.static(config.dirpath_of_server));
  const server = http.createServer(app);
  server.listen(config.port_of_server, () => {
    console.log(
      `server: ${JSON.stringify(
        {
          static_dirpath: config.dirpath_of_server,
          url: `http://localhost:${config.port_of_server}`,
        },
        null,
        4,
      )}`,
    );
  });
});
