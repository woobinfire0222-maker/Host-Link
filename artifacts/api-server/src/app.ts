import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { createSiteViewRouter } from "./routes/sites";
import { subdomainMiddleware } from "./lib/subdomain";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PgStore = connectPgSimple(session);

const app: Express = express();

// Trust Replit's reverse proxy so secure cookies work over HTTPS in production
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "sitedrop-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);

app.use(subdomainMiddleware);
app.use("/api", router);
app.use(createSiteViewRouter());

// Production: serve React frontend static files
// Works for both Render (single-service) and Replit fallback
if (process.env.NODE_ENV === "production") {
  // Try several possible paths depending on where the built file is run from
  const possibleDists = [
    path.resolve(__dirname, "../../site-builder/dist/public"),
    path.resolve(process.cwd(), "artifacts/site-builder/dist/public"),
  ];
  const fs = await import("fs");
  const frontendDist = possibleDists.find((p) => fs.existsSync(p));

  if (frontendDist) {
    app.use(express.static(frontendDist));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
}

// Global JSON error handler — must be last, after all routes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "서버 오류가 발생했습니다" });
});

export default app;
