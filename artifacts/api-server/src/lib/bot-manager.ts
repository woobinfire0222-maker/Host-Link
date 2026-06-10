import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import type { Response } from "express";
import { db, botsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const BOT_DATA_DIR = path.resolve(process.cwd(), "../../bot-data");
const MAX_LOG_LINES = 500;

interface BotState {
  process: ChildProcess | null;
  logs: string[];
  clients: Set<Response>;
  startedAt: Date;
}

class BotManager {
  private states = new Map<number, BotState>();
  private recentLogs = new Map<number, string[]>();

  getBotDir(botId: number): string {
    const dir = path.join(BOT_DATA_DIR, String(botId));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  isRunning(botId: number): boolean {
    return this.states.has(botId);
  }

  getLogs(botId: number): string[] {
    return this.states.get(botId)?.logs ?? this.recentLogs.get(botId) ?? [];
  }

  addLog(botId: number, line: string) {
    const state = this.states.get(botId);
    if (!state) return;
    const timestamp = new Date().toLocaleTimeString("ko-KR", { hour12: false });
    const entry = `[${timestamp}] ${line}`;
    state.logs.push(entry);
    if (state.logs.length > MAX_LOG_LINES) state.logs.shift();
    for (const client of state.clients) {
      try {
        client.write(`data: ${JSON.stringify({ line: entry })}\n\n`);
      } catch {
        state.clients.delete(client);
      }
    }
  }

  addSSEClient(botId: number, res: Response) {
    const state = this.states.get(botId);
    if (state) {
      state.clients.add(res);
      for (const log of state.logs) {
        try {
          res.write(`data: ${JSON.stringify({ line: log })}\n\n`);
        } catch { break; }
      }
    } else {
      const recent = this.recentLogs.get(botId) ?? [];
      for (const log of recent) {
        try {
          res.write(`data: ${JSON.stringify({ line: log })}\n\n`);
        } catch { break; }
      }
      try {
        res.write(`data: ${JSON.stringify({ line: recent.length ? "--- 봇이 종료됐습니다 ---" : "[봇이 실행 중이 아닙니다]", closed: true })}\n\n`);
      } catch {}
    }
  }

  removeSSEClient(botId: number, res: Response) {
    this.states.get(botId)?.clients.delete(res);
  }

  async start(botId: number, entryFile: string): Promise<{ ok: boolean; error?: string }> {
    if (this.isRunning(botId)) return { ok: false, error: "이미 실행 중입니다" };

    const workDir = this.getBotDir(botId);
    const entryPath = path.join(workDir, entryFile);

    if (!existsSync(entryPath)) {
      return { ok: false, error: `진입 파일을 찾을 수 없습니다: ${entryFile}` };
    }

    const state: BotState = { process: null, logs: [], clients: new Set(), startedAt: new Date() };
    this.states.set(botId, state);
    this.recentLogs.delete(botId);

    try {
      await db.update(botsTable).set({ status: "running" }).where(eq(botsTable.id, botId));
    } catch {}

    // Run install + spawn in background — do NOT await so HTTP responds immediately
    void this._installAndRun(botId, workDir, entryFile, state);

    logger.info({ botId }, "Bot start initiated");
    return { ok: true };
  }

  private async _installAndRun(botId: number, workDir: string, entryFile: string, state: BotState): Promise<void> {
    const isJS = entryFile.endsWith(".js");

    if (isJS) {
      const pkgJson = path.join(workDir, "package.json");
      if (existsSync(pkgJson)) {
        this.addLog(botId, "📦 package.json 설치 중 (npm install)...");
        await new Promise<void>((resolve) => {
          const npm = spawn("npm", ["install", "--prefer-offline"], { cwd: workDir });
          npm.stdout.on("data", (d: Buffer) => {
            const text = d.toString().trim();
            if (text) this.addLog(botId, text);
          });
          npm.stderr.on("data", (d: Buffer) => {
            const text = d.toString().trim();
            if (text && !text.startsWith("npm warn")) this.addLog(botId, text);
          });
          npm.on("error", (err) => {
            this.addLog(botId, `⚠️ npm 실행 오류: ${err.message}`);
            resolve();
          });
          npm.on("close", (code) => {
            if (code === 0) this.addLog(botId, "✅ 패키지 설치 완료");
            else this.addLog(botId, `⚠️ npm 종료 코드: ${code}`);
            resolve();
          });
        });
      }
    } else {
      const pkgDir = path.join(workDir, ".packages");
      const reqFile = path.join(workDir, "requirements.txt");
      if (existsSync(reqFile)) {
        this.addLog(botId, "📦 requirements.txt 설치 중...");
        await new Promise<void>((resolve) => {
          const pip = spawn("python3", ["-m", "pip", "install", "-r", reqFile, "--target", pkgDir, "--no-user", "--quiet", "--disable-pip-version-check"], { cwd: workDir });
          pip.stdout.on("data", (d: Buffer) => {
            const text = d.toString().trim();
            if (text) this.addLog(botId, text);
          });
          pip.stderr.on("data", (d: Buffer) => {
            const text = d.toString().trim();
            if (text && !text.startsWith("WARNING")) this.addLog(botId, text);
          });
          pip.on("error", (err) => {
            this.addLog(botId, `⚠️ pip 실행 오류: ${err.message}`);
            resolve();
          });
          pip.on("close", (code) => {
            if (code === 0) this.addLog(botId, "✅ 패키지 설치 완료");
            else this.addLog(botId, `⚠️ pip 종료 코드: ${code}`);
            resolve();
          });
        });
      }
    }

    // Check if stop was requested while installing
    if (!this.states.has(botId)) {
      this.addLog(botId, "🛑 시작 전 중지됨");
      return;
    }

    let proc;
    if (isJS) {
      proc = spawn("node", [entryFile], { cwd: workDir, env: { ...process.env } });
    } else {
      const pkgDir = path.join(workDir, ".packages");
      const existingPythonPath = process.env.PYTHONPATH ?? "";
      const pythonPath = existingPythonPath ? `${pkgDir}:${existingPythonPath}` : pkgDir;
      proc = spawn("python3", ["-u", entryFile], {
        cwd: workDir,
        env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONPATH: pythonPath },
      });
    }

    state.process = proc;

    const runtime = isJS ? "node" : "python3";
    this.addLog(botId, `🚀 봇 시작: ${runtime} ${entryFile} (PID: ${proc.pid ?? "?"})`);

    proc.on("error", (err) => {
      this.addLog(botId, `💥 프로세스 오류: ${err.message}`);
    });

    proc.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter((l) => l.trim());
      lines.forEach((l) => this.addLog(botId, l));
    });

    proc.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n").filter((l) => l.trim());
      lines.forEach((l) => this.addLog(botId, `⚠️ ${l}`));
    });

    proc.on("close", async (code) => {
      this.addLog(botId, `\n🔴 봇 종료 (종료 코드: ${code ?? "N/A"})`);
      this.recentLogs.set(botId, [...state.logs]);
      for (const client of state.clients) {
        try { client.write(`data: ${JSON.stringify({ line: "[연결 종료]", closed: true })}\n\n`); } catch {}
      }
      this.states.delete(botId);
      try {
        await db.update(botsTable).set({ status: "stopped" }).where(eq(botsTable.id, botId));
      } catch {}
    });
  }

  async stop(botId: number): Promise<{ ok: boolean; error?: string }> {
    const state = this.states.get(botId);
    if (!state) return { ok: true };
    this.addLog(botId, "🛑 중지 요청...");
    if (state.process) {
      state.process.kill("SIGTERM");
      setTimeout(() => {
        if (this.states.has(botId) && state.process) state.process.kill("SIGKILL");
      }, 3000);
    } else {
      // Process not spawned yet (still installing) — remove state so _installAndRun aborts
      this.states.delete(botId);
      try {
        await db.update(botsTable).set({ status: "stopped" }).where(eq(botsTable.id, botId));
      } catch {}
    }
    return { ok: true };
  }

  async restoreRunningBots() {
    try {
      const runningBots = await db.select().from(botsTable).where(eq(botsTable.status, "running"));
      for (const bot of runningBots) {
        logger.info({ botId: bot.id }, "Restoring bot after server restart");
        await this.start(bot.id, bot.entryFile);
      }
    } catch (err) {
      logger.warn({ err }, "Failed to restore running bots");
    }
  }
}

export const botManager = new BotManager();
