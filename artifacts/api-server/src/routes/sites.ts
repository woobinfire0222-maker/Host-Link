import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, sitesTable } from "@workspace/db";
import {
  CreateSiteBody,
  GenerateSiteBody,
  CheckSiteNameParams,
  GetSiteParams,
  DeleteSiteParams,
} from "@workspace/api-zod";
import { generateSiteHtml } from "../lib/site-generator";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_NAME_RE = /^[a-z0-9-]+$/;

function validateName(name: string): string | null {
  if (!name || name.length < 1) return "사이트 이름을 입력해주세요";
  if (name.length > 50) return "사이트 이름은 50자 이하여야 합니다";
  if (!VALID_NAME_RE.test(name))
    return "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다";
  return null;
}

router.get("/sites", async (_req, res): Promise<void> => {
  const sites = await db
    .select()
    .from(sitesTable)
    .orderBy(desc(sitesTable.createdAt));

  res.json(
    sites.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      description: s.description,
      htmlContent: null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  );
});

router.post("/sites", async (req, res): Promise<void> => {
  const parsed = CreateSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, title, description, htmlContent } = parsed.data;

  const nameError = validateName(name);
  if (nameError) {
    res.status(400).json({ error: nameError });
    return;
  }

  const existing = await db
    .select()
    .from(sitesTable)
    .where(eq(sitesTable.name, name))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "이미 사용 중인 사이트 이름입니다" });
    return;
  }

  const [site] = await db
    .insert(sitesTable)
    .values({
      name,
      title,
      description: description ?? null,
      htmlContent,
    })
    .returning();

  res.status(201).json({
    id: site.id,
    name: site.name,
    title: site.title,
    description: site.description,
    htmlContent: null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  });
});

router.post("/sites/generate", async (req, res): Promise<void> => {
  const parsed = GenerateSiteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, title, description } = parsed.data;

  const nameError = validateName(name);
  if (nameError) {
    res.status(400).json({ error: nameError });
    return;
  }

  const existing = await db
    .select()
    .from(sitesTable)
    .where(eq(sitesTable.name, name))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "이미 사용 중인 사이트 이름입니다" });
    return;
  }

  const htmlContent = generateSiteHtml(title, description);

  const [site] = await db
    .insert(sitesTable)
    .values({ name, title, description, htmlContent })
    .returning();

  res.status(201).json({
    id: site.id,
    name: site.name,
    title: site.title,
    description: site.description,
    htmlContent: null,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  });
});

router.get("/sites/check-name/:name", async (req, res): Promise<void> => {
  const params = CheckSiteNameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { name } = params.data;

  const nameError = validateName(name);
  if (nameError) {
    res.json({ available: false, name });
    return;
  }

  const existing = await db
    .select()
    .from(sitesTable)
    .where(eq(sitesTable.name, name))
    .limit(1);

  res.json({ available: existing.length === 0, name });
});

router.get("/sites/stats", async (_req, res): Promise<void> => {
  const [{ total }] = await db
    .select({ total: count() })
    .from(sitesTable);

  const recentSites = await db
    .select()
    .from(sitesTable)
    .orderBy(desc(sitesTable.createdAt))
    .limit(5);

  res.json({
    totalSites: total,
    recentSites: recentSites.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      description: s.description,
      htmlContent: null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
});

router.get("/sites/:name", async (req, res): Promise<void> => {
  const params = GetSiteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [site] = await db
    .select()
    .from(sitesTable)
    .where(eq(sitesTable.name, params.data.name))
    .limit(1);

  if (!site) {
    res.status(404).json({ error: "사이트를 찾을 수 없습니다" });
    return;
  }

  res.json({
    id: site.id,
    name: site.name,
    title: site.title,
    description: site.description,
    htmlContent: site.htmlContent,
    createdAt: site.createdAt.toISOString(),
    updatedAt: site.updatedAt.toISOString(),
  });
});

router.delete("/sites/:name", async (req, res): Promise<void> => {
  const params = DeleteSiteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(sitesTable)
    .where(eq(sitesTable.name, params.data.name))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "사이트를 찾을 수 없습니다" });
    return;
  }

  res.sendStatus(204);
});

export { router as sitesRouter };

export function createSiteViewRouter(): IRouter {
  const viewRouter: IRouter = Router();

  viewRouter.get("/s/:name", async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const name = raw;

    const [site] = await db
      .select()
      .from(sitesTable)
      .where(eq(sitesTable.name, name))
      .limit(1);

    if (!site) {
      res.status(404).send(`<!DOCTYPE html><html><head><title>404 - 사이트 없음</title>
      <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#fff;}
      .box{text-align:center;}.title{font-size:4rem;font-weight:700;margin:0;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      .sub{color:#888;margin-top:1rem;}.link{color:#667eea;text-decoration:none;margin-top:2rem;display:inline-block;border:1px solid #667eea;padding:0.5rem 1.5rem;border-radius:6px;}
      </style></head><body><div class="box"><div class="title">404</div><p class="sub">"<strong>${name}</strong>" 사이트가 존재하지 않습니다.</p><a href="/" class="link">SiteDrop으로 가기</a></div></body></html>`);
      return;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(site.htmlContent);
  });

  return viewRouter;
}
