import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, botsTable, usersTable } from "@workspace/db";
import { botManager } from "../lib/bot-manager";
import { logger } from "../lib/logger";
import {
  existsSync, readdirSync, readFileSync,
  writeFileSync, unlinkSync, statSync
} from "fs";
import path from "path";
import AdmZip from "adm-zip";
import "./session-types";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "로그인이 필요합니다" });
    return false;
  }
  return true;
}

async function checkBotLimit(userId: number): Promise<{ allowed: boolean; current: number; max: number }> {
  const [user] = await db.select({ extraBotSlots: usersTable.extraBotSlots })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return { allowed: false, current: 0, max: 1 };
  const [{ total }] = await db.select({ total: count() })
    .from(botsTable).where(eq(botsTable.userId, userId));
  const max = 1 + user.extraBotSlots;
  return { allowed: Number(total) < max, current: Number(total), max };
}

async function getOwnedBot(req: Request, res: Response) {
  if (!requireAuth(req, res)) return null;
  const id = parseInt(String(req.params.id ?? ""));
  if (isNaN(id)) { res.status(400).json({ error: "잘못된 ID" }); return null; }
  const [bot] = await db.select().from(botsTable).where(
    and(eq(botsTable.id, id), eq(botsTable.userId, req.session!.userId!))
  ).limit(1);
  if (!bot) { res.status(404).json({ error: "봇을 찾을 수 없습니다" }); return null; }
  return bot;
}

router.get("/bots", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const bots = await db.select().from(botsTable)
    .where(eq(botsTable.userId, req.session!.userId!));
  const withStatus = bots.map((b) => ({ ...b, running: botManager.isRunning(b.id) }));
  res.json(withStatus);
});

router.post("/bots", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;
  const limit = await checkBotLimit(req.session!.userId!);
  if (!limit.allowed) {
    res.status(402).json({ error: `봇 슬롯이 꽉 찼습니다 (${limit.current}/${limit.max}). 추가 슬롯을 구매하세요.`, code: "BOT_LIMIT" });
    return;
  }
  const { name, description, language } = req.body as Record<string, string>;
  if (!name?.trim()) { res.status(400).json({ error: "봇 이름을 입력해주세요" }); return; }
  const isJS = language === "javascript";
  const entryFile = isJS ? "bot.js" : "bot.py";
  const [bot] = await db.insert(botsTable).values({
    userId: req.session!.userId!,
    name: name.trim(),
    description: description?.trim() ?? null,
    entryFile,
    status: "stopped",
  }).returning();
  const dir = botManager.getBotDir(bot.id);
  if (isJS) {
    writeFileSync(path.join(dir, "bot.js"), `const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(\`✅ \${client.user.tag} 봇이 온라인입니다!\`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content === '!ping') {
    await message.reply(\`🏓 Pong! 지연: \${Math.round(client.ws.ping)}ms\`);
  }
  if (message.content === '!hello') {
    await message.reply(\`안녕하세요, \${message.author}!\`);
  }
});

// 봇 토큰을 환경변수나 아래에 직접 입력하세요
client.login(process.env.DISCORD_TOKEN || 'YOUR_BOT_TOKEN_HERE');
`, "utf-8");
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      main: "bot.js",
      dependencies: { "discord.js": "^14.0.0" },
    }, null, 2), "utf-8");
  } else {
    writeFileSync(path.join(dir, "bot.py"), `import discord
from discord.ext import commands
import os

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix='!', intents=intents)

@bot.event
async def on_ready():
    print(f'✅ {bot.user} 봇이 온라인입니다!')

@bot.command()
async def ping(ctx):
    await ctx.send(f'🏓 Pong! 지연: {round(bot.latency * 1000)}ms')

@bot.command()
async def hello(ctx):
    await ctx.send(f'안녕하세요, {ctx.author.mention}!')

# 봇 토큰을 환경변수나 아래에 직접 입력하세요
bot.run(os.environ.get('DISCORD_TOKEN', 'YOUR_BOT_TOKEN_HERE'))
`, "utf-8");
    writeFileSync(path.join(dir, "requirements.txt"), "discord.py>=2.0\n", "utf-8");
  }
  res.status(201).json({ ...bot, running: false });
});

router.get("/bots/:id", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  res.json({ ...bot, running: botManager.isRunning(bot.id) });
});

router.delete("/bots/:id", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  if (botManager.isRunning(bot.id)) await botManager.stop(bot.id);
  await db.delete(botsTable).where(eq(botsTable.id, bot.id));
  res.sendStatus(204);
});

router.get("/bots/:id/files", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const dir = botManager.getBotDir(bot.id);
  const files = readdirSync(dir).map((f) => {
    const st = statSync(path.join(dir, f));
    return { name: f, size: st.size, isDir: st.isDirectory() };
  }).filter((f) => !f.isDir);
  res.json(files);
});

router.get("/bots/:id/files/:filename", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/")) { res.status(400).json({ error: "잘못된 파일명" }); return; }
  const filePath = path.join(botManager.getBotDir(bot.id), filename);
  if (!existsSync(filePath)) { res.status(404).json({ error: "파일 없음" }); return; }
  const content = readFileSync(filePath, "utf-8");
  res.json({ name: filename, content });
});

router.put("/bots/:id/files/:filename", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/")) { res.status(400).json({ error: "잘못된 파일명" }); return; }
  const { content } = req.body as { content: string };
  writeFileSync(path.join(botManager.getBotDir(bot.id), filename), content ?? "", "utf-8");
  res.json({ ok: true });
});

router.delete("/bots/:id/files/:filename", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const filename = req.params.filename;
  if (filename.includes("..") || filename.includes("/")) { res.status(400).json({ error: "잘못된 파일명" }); return; }
  const filePath = path.join(botManager.getBotDir(bot.id), filename);
  if (existsSync(filePath)) unlinkSync(filePath);
  res.json({ ok: true });
});

router.post("/bots/:id/files/upload-zip", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const dir = botManager.getBotDir(bot.id);
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    try {
      const buf = Buffer.concat(chunks);
      const zip = new AdmZip(buf);
      zip.getEntries().forEach((entry) => {
        if (!entry.isDirectory) {
          const name = path.basename(entry.entryName);
          if (!name.includes("..")) {
            writeFileSync(path.join(dir, name), entry.getData());
          }
        }
      });
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: "ZIP 압축 해제 실패" });
    }
  });
});

router.put("/bots/:id/entry-file", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const { entryFile } = req.body as { entryFile: string };
  if (!entryFile?.trim()) { res.status(400).json({ error: "파일명을 입력해주세요" }); return; }
  await db.update(botsTable).set({ entryFile: entryFile.trim() }).where(eq(botsTable.id, bot.id));
  res.json({ ok: true });
});

router.post("/bots/:id/start", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const result = await botManager.start(bot.id, bot.entryFile);
  if (result.ok) res.json({ ok: true, running: true });
  else res.status(400).json({ error: result.error });
});

router.post("/bots/:id/stop", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  const result = await botManager.stop(bot.id);
  if (result.ok) res.json({ ok: true, running: false });
  else res.status(400).json({ error: result.error });
});

router.get("/bots/:id/logs", async (req, res): Promise<void> => {
  const bot = await getOwnedBot(req, res);
  if (!bot) return;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  botManager.addSSEClient(bot.id, res);
  req.on("close", () => botManager.removeSSEClient(bot.id, res));
});

export { router as botsRouter };
