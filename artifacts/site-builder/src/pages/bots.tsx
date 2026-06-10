import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bot, Plus, Play, Square, Trash2, Clock, AlertCircle } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface BotInfo {
  id: number;
  name: string;
  description: string | null;
  entryFile: string;
  status: string;
  running: boolean;
  createdAt: string;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "오류" }));
    throw new Error(body.error || "요청 실패");
  }
  return res.json();
}

export default function Bots() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading]);

  const loadBots = async () => {
    try {
      const data = await apiFetch("/api/bots");
      setBots(data);
    } catch (e: any) {
      toast({ title: "봇 목록 로드 실패", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadBots();
  }, [user]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const bot = await apiFetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast({ title: `"${bot.name}" 봇이 생성됐습니다!` });
      setLocation(`/bots/${bot.id}`);
    } catch (e: any) {
      toast({ title: "생성 실패", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (bot: BotInfo) => {
    if (!confirm(`"${bot.name}" 봇을 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(`/api/bots/${bot.id}`, { method: "DELETE" });
      setBots((prev) => prev.filter((b) => b.id !== bot.id));
      toast({ title: "봇이 삭제됐습니다" });
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e.message, variant: "destructive" });
    }
  };

  if (isAuthLoading || !user) {
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
      <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">봇 호스팅</h1>
            <p className="text-muted-foreground text-lg">디스코드 봇을 업로드하고 24/7 호스팅하세요.</p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)} className="shadow-md shadow-primary/20 group">
            <Plus className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
            새 봇 만들기
          </Button>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-40" />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card/50 shadow-sm border-dashed">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">아직 봇이 없습니다</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              디스코드 봇을 만들어 24/7 호스팅해보세요. 코드 에디터와 실시간 로그를 제공합니다.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              첫 봇 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <Card key={bot.id} className="group hover-elevate transition-all border-border/50 shadow-sm hover:border-primary/30 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="truncate flex items-center gap-2">
                      <Bot className="w-4 h-4 flex-shrink-0 text-primary" />
                      {bot.name}
                    </CardTitle>
                    <Badge variant={bot.running ? "default" : "secondary"} className={bot.running ? "bg-green-500 text-white" : ""}>
                      {bot.running ? "실행 중" : "중지됨"}
                    </Badge>
                  </div>
                  <CardDescription className="truncate">
                    {bot.description || "설명 없음"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 flex-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(bot.createdAt), { addSuffix: true, locale: ko })} 생성됨
                  </div>
                  <div className="mt-2 text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-1">
                    진입점: {bot.entryFile}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 gap-2">
                  <Link href={`/bots/${bot.id}`} className="flex-1">
                    <Button variant="default" className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      관리
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(bot)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              새 봇 만들기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>봇 이름</Label>
              <Input
                placeholder="My Discord Bot"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>설명 (선택)</Label>
              <Input
                placeholder="봇에 대한 간단한 설명"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              생성 시 <code className="bg-muted px-1 rounded">bot.py</code>와 <code className="bg-muted px-1 rounded">requirements.txt</code> 기본 파일이 자동으로 만들어집니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" /> : null}
              만들기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
