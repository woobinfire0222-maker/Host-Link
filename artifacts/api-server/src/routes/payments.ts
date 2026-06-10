import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usersTable, paymentRequestsTable, paymentMessagesTable } from "@workspace/db";
import "./session-types";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "로그인이 필요합니다" });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.adminUnlocked) next();
  else res.status(401).json({ error: "관리자 인증이 필요합니다" });
}

// Create a payment request
router.post("/payments/request", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const { slotType, message } = req.body as { slotType: string; message?: string };
  if (!["site", "bot", "upgrade"].includes(slotType)) {
    res.status(400).json({ error: "유효하지 않은 slotType입니다" });
    return;
  }

  const [request] = await db.insert(paymentRequestsTable).values({
    userId: req.session!.userId!,
    slotType,
    status: "pending",
    amount: 5000,
  }).returning();

  if (message?.trim()) {
    await db.insert(paymentMessagesTable).values({
      requestId: request.id,
      isAdmin: false,
      message: message.trim(),
    });
  }

  res.status(201).json(request);
});

// Get current user's payment requests
router.get("/payments/my", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const requests = await db
    .select()
    .from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.userId, req.session!.userId!))
    .orderBy(desc(paymentRequestsTable.createdAt));

  res.json(requests);
});

// Get messages for a payment request (owner or admin)
router.get("/payments/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const [request] = await db.select().from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "결제 요청을 찾을 수 없습니다" }); return; }

  const isOwner = request.userId === req.session!.userId;
  const isAdmin = req.session?.adminUnlocked;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "접근 권한이 없습니다" });
    return;
  }

  const messages = await db.select().from(paymentMessagesTable)
    .where(eq(paymentMessagesTable.requestId, id))
    .orderBy(paymentMessagesTable.createdAt);

  res.json({ request, messages });
});

// Send a message on a payment request (owner or admin)
router.post("/payments/:id/messages", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const { message } = req.body as { message: string };
  if (!message?.trim()) { res.status(400).json({ error: "메시지를 입력해주세요" }); return; }

  const [request] = await db.select().from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "결제 요청을 찾을 수 없습니다" }); return; }

  const isOwner = request.userId === req.session!.userId;
  const isAdmin = req.session?.adminUnlocked;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "접근 권한이 없습니다" });
    return;
  }

  const [msg] = await db.insert(paymentMessagesTable).values({
    requestId: id,
    isAdmin: !!isAdmin,
    message: message.trim(),
  }).returning();

  res.status(201).json(msg);
});

// ── Admin routes ──────────────────────────────────────────

// Get all payment requests
router.get("/admin/payments", requireAdmin, async (req, res): Promise<void> => {
  const requests = await db
    .select({
      id: paymentRequestsTable.id,
      userId: paymentRequestsTable.userId,
      slotType: paymentRequestsTable.slotType,
      status: paymentRequestsTable.status,
      amount: paymentRequestsTable.amount,
      adminNote: paymentRequestsTable.adminNote,
      createdAt: paymentRequestsTable.createdAt,
      updatedAt: paymentRequestsTable.updatedAt,
      username: usersTable.username,
      email: usersTable.email,
    })
    .from(paymentRequestsTable)
    .leftJoin(usersTable, eq(paymentRequestsTable.userId, usersTable.id))
    .orderBy(desc(paymentRequestsTable.createdAt));

  res.json(requests);
});

// Approve a payment request
router.post("/admin/payments/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const [request] = await db.select().from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "결제 요청을 찾을 수 없습니다" }); return; }
  if (request.status !== "pending") {
    res.status(400).json({ error: "이미 처리된 요청입니다" });
    return;
  }

  const { note } = req.body as { note?: string };

  // Increment user's slot
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, request.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "사용자를 찾을 수 없습니다" }); return; }

  // Each upgrade grants +1 site slot AND +1 bot slot
  await db.update(usersTable)
    .set({
      extraSiteSlots: user.extraSiteSlots + 1,
      extraBotSlots: user.extraBotSlots + 1,
    })
    .where(eq(usersTable.id, user.id));

  await db.update(paymentRequestsTable)
    .set({ status: "approved", adminNote: note ?? null, updatedAt: new Date() })
    .where(eq(paymentRequestsTable.id, id));

  if (note?.trim()) {
    await db.insert(paymentMessagesTable).values({
      requestId: id,
      isAdmin: true,
      message: `✅ 결제 승인됨. ${note.trim()}`,
    });
  } else {
    await db.insert(paymentMessagesTable).values({
      requestId: id,
      isAdmin: true,
      message: `✅ 결제가 승인됐습니다. 사이트 슬롯과 봇 슬롯이 각 1개씩 추가됐습니다.`,
    });
  }

  res.json({ ok: true });
});

// Reject a payment request
router.post("/admin/payments/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return; }

  const [request] = await db.select().from(paymentRequestsTable)
    .where(eq(paymentRequestsTable.id, id)).limit(1);
  if (!request) { res.status(404).json({ error: "결제 요청을 찾을 수 없습니다" }); return; }
  if (request.status !== "pending") {
    res.status(400).json({ error: "이미 처리된 요청입니다" });
    return;
  }

  const { note } = req.body as { note?: string };

  await db.update(paymentRequestsTable)
    .set({ status: "rejected", adminNote: note ?? null, updatedAt: new Date() })
    .where(eq(paymentRequestsTable.id, id));

  await db.insert(paymentMessagesTable).values({
    requestId: id,
    isAdmin: true,
    message: `❌ 결제가 거절됐습니다.${note?.trim() ? " " + note.trim() : ""}`,
  });

  res.json({ ok: true });
});

export { router as paymentsRouter };
