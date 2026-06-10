import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db, usersTable, sitesTable, botsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { botManager } from "../lib/bot-manager";
import "./session-types";

const ADMIN_PASSWORD = "2434";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.adminUnlocked) {
    next();
  } else {
    res.status(401).json({ error: "관리자 인증이 필요합니다" });
  }
}

// Verify admin password and set session flag
router.post("/admin/verify", (req, res): void => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.adminUnlocked = true;
    req.session.save(() => {
      res.json({ ok: true });
    });
  } else {
    res.status(401).json({ error: "비밀번호가 틀렸습니다" });
  }
});

// Get all users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

// Delete a user
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "사용자를 찾을 수 없습니다" }); return; }
  res.json({ ok: true });
});

// Get all sites (admin view)
router.get("/admin/sites", requireAdmin, async (req, res): Promise<void> => {
  const sites = await db
    .select({
      id: sitesTable.id,
      name: sitesTable.name,
      title: sitesTable.title,
      description: sitesTable.description,
      userId: sitesTable.userId,
      createdAt: sitesTable.createdAt,
    })
    .from(sitesTable)
    .orderBy(desc(sitesTable.createdAt));
  res.json(sites);
});

// Delete any site
router.delete("/admin/sites/:name", requireAdmin, async (req, res): Promise<void> => {
  const name = String(req.params["name"]);
  const [deleted] = await db.delete(sitesTable).where(eq(sitesTable.name, name)).returning();
  if (!deleted) { res.status(404).json({ error: "사이트를 찾을 수 없습니다" }); return; }
  res.json({ ok: true });
});

// Get all bots (admin view)
router.get("/admin/bots", requireAdmin, async (req, res): Promise<void> => {
  const bots = await db
    .select()
    .from(botsTable)
    .orderBy(desc(botsTable.createdAt));
  const withStatus = bots.map((b) => ({ ...b, running: botManager.isRunning(b.id) }));
  res.json(withStatus);
});

// Stop any bot
router.post("/admin/bots/:id/stop", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  const result = await botManager.stop(id);
  if (result.ok) res.json({ ok: true });
  else res.status(400).json({ error: result.error });
});

// Delete any bot
router.delete("/admin/bots/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }
  if (botManager.isRunning(id)) await botManager.stop(id);
  const [deleted] = await db.delete(botsTable).where(eq(botsTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "봇을 찾을 수 없습니다" }); return; }
  res.json({ ok: true });
});

export { router as adminRouter };
