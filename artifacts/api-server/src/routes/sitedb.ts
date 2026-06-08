import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, siteDataTable, sitesTable } from "@workspace/db";

const router: IRouter = Router();

async function siteExists(name: string): Promise<boolean> {
  const [site] = await db.select({ id: sitesTable.id }).from(sitesTable).where(eq(sitesTable.name, name)).limit(1);
  return !!site;
}

// GET /api/sitedb/:sitename — list all key-value pairs for a site
router.get("/sitedb/:sitename", async (req, res): Promise<void> => {
  const { sitename } = req.params;
  if (!(await siteExists(sitename))) {
    res.status(404).json({ error: "사이트를 찾을 수 없습니다" });
    return;
  }
  const rows = await db.select().from(siteDataTable).where(eq(siteDataTable.siteName, sitename));
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

// GET /api/sitedb/:sitename/:key — get a single value
router.get("/sitedb/:sitename/:key", async (req, res): Promise<void> => {
  const { sitename, key } = req.params;
  if (!(await siteExists(sitename))) {
    res.status(404).json({ error: "사이트를 찾을 수 없습니다" });
    return;
  }
  const [row] = await db.select().from(siteDataTable)
    .where(and(eq(siteDataTable.siteName, sitename), eq(siteDataTable.key, key)))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "키를 찾을 수 없습니다" });
    return;
  }
  res.json({ key: row.key, value: row.value, updatedAt: row.updatedAt });
});

// POST /api/sitedb/:sitename/:key — set a value (upsert)
router.post("/sitedb/:sitename/:key", async (req, res): Promise<void> => {
  const { sitename, key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    res.status(400).json({ error: "'value' 필드가 필요합니다" });
    return;
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    res.status(400).json({ error: "'value'는 문자열, 숫자, 또는 불리언이어야 합니다" });
    return;
  }
  if (key.length > 200) {
    res.status(400).json({ error: "키는 200자 이하여야 합니다" });
    return;
  }

  if (!(await siteExists(sitename))) {
    res.status(404).json({ error: "사이트를 찾을 수 없습니다" });
    return;
  }

  const strValue = String(value);

  const [existing] = await db.select({ id: siteDataTable.id })
    .from(siteDataTable)
    .where(and(eq(siteDataTable.siteName, sitename), eq(siteDataTable.key, key)))
    .limit(1);

  if (existing) {
    await db.update(siteDataTable)
      .set({ value: strValue })
      .where(eq(siteDataTable.id, existing.id));
  } else {
    await db.insert(siteDataTable).values({ siteName: sitename, key, value: strValue });
  }

  res.json({ ok: true, key, value: strValue });
});

// DELETE /api/sitedb/:sitename/:key — delete a key
router.delete("/sitedb/:sitename/:key", async (req, res): Promise<void> => {
  const { sitename, key } = req.params;
  const [deleted] = await db.delete(siteDataTable)
    .where(and(eq(siteDataTable.siteName, sitename), eq(siteDataTable.key, key)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "키를 찾을 수 없습니다" });
    return;
  }
  res.json({ ok: true });
});

export { router as sitedbRouter };
