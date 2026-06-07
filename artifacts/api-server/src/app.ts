import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { createSiteViewRouter } from "./routes/sites";
import { subdomainMiddleware } from "./lib/subdomain";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Subdomain routing: when BASE_DOMAIN env var is set (e.g. "dropsite.com"),
// requests to <sitename>.dropsite.com are served directly.
// While BASE_DOMAIN is unset, this is a no-op and /s/:name path routing works as usual.
app.use(subdomainMiddleware);

app.use("/api", router);
app.use(createSiteViewRouter());

export default app;
