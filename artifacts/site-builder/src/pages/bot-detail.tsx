import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { Bot, Play, Square, Save, FileCode, Plus, Trash2, RefreshCw, ArrowLeft, Terminal, Upload, Settings } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface BotInfo {
  id: number;
  name: string;
  description: string | null;
  entryFile: string;
  status: string;
  running: boolean;
}

interface FileInfo {
  name: string;
  size: number;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "오류" }));
    throw new Error(body.error || "요청 실패");
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const botId = parseInt(params?.id ?? "");

  const [bot, setBot] = useState<BotInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [saved, setSaved] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entryFileInput, setEntryFileInput] = useState("");
  const logsRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading]);

  const loadBot = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/bots/${botId}`);
      setBot(data);
      setRunning(data.running);
      setEntryFileInput(data.entryFile);
    } catch {
      setLocation("/bots");
    }
  }, [botId]);

  const loadFiles = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/bots/${botId}/files`);
      setFiles(data);
    } catch {}
  }, [botId]);

  const openFile = async (name: string) => {
    if (!saved && !confirm("저장하지 않은 변경 사항이 있습니다. 계속할까요?")) return;
    try {
      const data = await apiFetch(`/api/bots/${botId}/files/${name}`);
      setActiveFile(name);
      setFileContent(data.content);
      setSaved(true);
    } catch (e: any) {
      toast({ title: "파일 열기 실패", description: e.message, variant: "destructive" });
    }
  };

  const saveFile = async () => {
    if (!activeFile) return;
    try {
      await apiFetch(`/api/bots/${botId}/files/${activeFile}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fileContent }),
      });
      setSaved(true);
      toast({ title: `${activeFile} 저장 완료` });
    } catch (e: any) {
      toast({ title: "저장 실패", description: e.message, variant: "destructive" });
    }
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/api/bots/${botId}/files/${name}`, { method: "DELETE" });
      if (activeFile === name) { setActiveFile(null); setFileContent(""); }
      await loadFiles();
      toast({ title: "파일이 삭제됐습니다" });
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e.message, variant: "destructive" });
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    try {
      await apiFetch(`/api/bots/${botId}/files/${newFileName.trim()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "" }),
      });
      await loadFiles();
      setNewFileOpen(false);
      setNewFileName("");
      openFile(newFileName.trim());
    } catch (e: any) {
      toast({ title: "파일 생성 실패", description: e.message, variant: "destructive" });
    }
  };

  const connectSSE = useCallback(() => {
    sseRef.current?.close();
    const es = new EventSource(`/api/bots/${botId}/logs`, { withCredentials: true });
    es.onmessage = (e) => {
      const { line, closed } = JSON.parse(e.data);
      setLogs((prev) => [...prev.slice(-499), line]);
      if (closed) {
        setRunning(false);
        es.close();
        sseRef.current = null;
      }
    };
    es.onerror = () => {};
    sseRef.current = es;
  }, [botId]);

  const startBot = async () => {
    setActionLoading(true);
    try {
      setLogs([]);
      await apiFetch(`/api/bots/${botId}/start`, { method: "POST" });
      setRunning(true);
      connectSSE();
      toast({ title: "봇이 시작됐습니다 🚀" });
    } catch (e: any) {
      toast({ title: "시작 실패", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const stopBot = async () => {
    setActionLoading(true);
    try {
      await apiFetch(`/api/bots/${botId}/stop`, { method: "POST" });
      setRunning(false);
      toast({ title: "봇이 중지됩니다..." });
    } catch (e: any) {
      toast({ title: "중지 실패", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const updateEntryFile = async () => {
    try {
      await apiFetch(`/api/bots/${botId}/entry-file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryFile: entryFileInput }),
      });
      setBot((b) => b ? { ...b, entryFile: entryFileInput } : b);
      setSettingsOpen(false);
      toast({ title: "진입 파일이 변경됐습니다" });
    } catch (e: any) {
      toast({ title: "변경 실패", description: e.message, variant: "destructive" });
    }
  };

  const handleZipUpload = async (file: File) => {
    const buf = await file.arrayBuffer();
    try {
      await fetch(`/api/bots/${botId}/files/upload-zip`, {
        method: "POST",
        credentials: "include",
        body: buf,
      });
      await loadFiles();
      toast({ title: "파일 업로드 완료" });
    } catch (e: any) {
      toast({ title: "업로드 실패", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (user && botId) {
      loadBot();
      loadFiles();
    }
    return () => sseRef.current?.close();
  }, [user, botId]);

  useEffect(() => {
    if (running && botId && !sseRef.current) connectSSE();
  }, [running, botId, connectSSE]);

  if (isAuthLoading || !user || !bot) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mt-2">
          <Link href="/bots">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              봇 목록
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <Bot className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">{bot.name}</h1>
          </div>
          <Badge variant={running ? "default" : "secondary"} className={cn("ml-1", running && "bg-green-500 text-white")}>
            {running ? "● 실행 중" : "○ 중지됨"}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-1" />
              설정
            </Button>
            {running ? (
              <Button variant="destructive" size="sm" onClick={stopBot} disabled={actionLoading}>
                {actionLoading ? <div className="w-4 h-4 mr-1 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Square className="w-4 h-4 mr-1 fill-current" />}
                중지
              </Button>
            ) : (
              <Button size="sm" onClick={startBot} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                {actionLoading ? <div className="w-4 h-4 mr-1 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Play className="w-4 h-4 mr-1 fill-current" />}
                시작
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[600px]">
          <div className="border rounded-lg bg-card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">파일</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewFileOpen(true)} title="새 파일">
                  <Plus className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => fileInputRef.current?.click()} title="ZIP 업로드">
                  <Upload className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadFiles} title="새로고침">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleZipUpload(e.target.files[0])}
            />
            <div className="flex-1 overflow-y-auto py-1">
              {files.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">파일 없음</p>
              ) : (
                files.map((f) => (
                  <div
                    key={f.name}
                    className={cn(
                      "group flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm hover:bg-muted/50 transition-colors",
                      activeFile === f.name && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => openFile(f.name)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              진입점: <span className="font-mono text-foreground">{bot.entryFile}</span>
            </div>
          </div>

          <div className="grid grid-rows-[1fr_auto] lg:grid-rows-[1fr_280px] gap-4">
            <div className="border rounded-lg bg-card overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  {activeFile || "파일을 선택하세요"}
                  {!saved && activeFile && <span className="text-yellow-500">●</span>}
                </span>
                {activeFile && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={saveFile}>
                    <Save className="w-3 h-3" />
                    저장 (Ctrl+S)
                  </Button>
                )}
              </div>
              {activeFile ? (
                <textarea
                  className="flex-1 p-4 font-mono text-sm bg-transparent resize-none outline-none w-full h-full text-foreground"
                  value={fileContent}
                  onChange={(e) => { setFileContent(e.target.value); setSaved(false); }}
                  onKeyDown={(e) => {
                    if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveFile(); }
                    if (e.key === "Tab") { e.preventDefault(); const s = e.currentTarget.selectionStart; const en = e.currentTarget.selectionEnd; setFileContent((v) => v.substring(0, s) + "    " + v.substring(en)); setTimeout(() => { e.currentTarget.setSelectionRange(s + 4, s + 4); }, 0); }
                  }}
                  spellCheck={false}
                  placeholder="여기에 코드를 작성하세요..."
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <FileCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>왼쪽에서 파일을 선택하세요</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg bg-[#0d1117] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  터미널
                  {running && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs text-white/40 hover:text-white/80"
                  onClick={() => setLogs([])}
                >
                  지우기
                </Button>
              </div>
              <div
                ref={logsRef}
                className="flex-1 overflow-y-auto p-3 font-mono text-xs text-green-300 space-y-0.5"
              >
                {logs.length === 0 ? (
                  <span className="text-white/30">{running ? "봇 시작 중..." : "봇을 시작하면 로그가 여기에 표시됩니다."}</span>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{line}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={newFileOpen} onOpenChange={setNewFileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>새 파일 만들기</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>파일 이름</Label>
            <Input
              placeholder="helper.py"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFile()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileOpen(false)}>취소</Button>
            <Button onClick={createFile} disabled={!newFileName.trim()}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>봇 설정</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>진입 파일 (Entry Point)</Label>
              <Input
                placeholder="bot.py"
                value={entryFileInput}
                onChange={(e) => setEntryFileInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">봇 시작 시 실행되는 파일</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>취소</Button>
            <Button onClick={updateEntryFile}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
