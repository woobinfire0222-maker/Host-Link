import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import "./session-types";

const router: IRouter = Router();

router.post("/auth/register", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: "아이디, 이메일, 비밀번호를 모두 입력해주세요" });
      return;
    }
    if (username.length < 2 || username.length > 30) {
      res.status(400).json({ error: "아이디는 2~30자 사이여야 합니다" });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "비밀번호는 4자 이상이어야 합니다" });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "이미 사용 중인 아이디 또는 이메일입니다" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ username, email, passwordHash })
      .returning();

    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ id: user.id, username: user.username, email: user.email });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/login", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다" });
      return;
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.session.userId) {
      res.status(401).json({ error: "로그인이 필요합니다" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
      return;
    }
    res.json({ id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
