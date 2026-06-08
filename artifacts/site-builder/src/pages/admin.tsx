import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, Globe, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AdminUser {
  id: number; username: string; email: string; isAdmin: boolean; createdAt: string;
}
interface AdminSite {
  id: number; name: string; title: string; description: string | null; userId: number | null; createdAt: string;
}

const ADMIN_PASSWORD = "2434";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [wrongPass, setWrongPass] = useState(false);
  const [tab, setTab] = useState<"users" | "sites">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loading, setLoading] = useState(false);

  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setUnlocked(true);
      setWrongPass(false);
      loadData();
    } else {
      setWrongPass(true);
      setPasswordInput("");
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/sites", { credentials: "include" }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (sRes.ok) setSites(await sRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id: number, username: string) {
    if (!confirm(`"${username}" 사용자를 삭제하시겠습니까? 해당 사용자의 사이트도 모두 삭제됩니다.`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setUsers(u => u.filter(x => x.id !== id));
      setSites(s => s.filter(x => x.userId !== id));
      toast({ title: "삭제 완료", description: `${username} 사용자가 삭제됐습니다` });
    } else {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  }

  async function deleteSite(name: string) {
    if (!confirm(`"${name}" 사이트를 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/sites/${name}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setSites(s => s.filter(x => x.name !== name));
      toast({ title: "삭제 완료", description: `${name} 사이트가 삭제됐습니다` });
    } else {
      toast({ title: "삭제 실패", variant: "destructive" });
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">관리자 모드</h1>
            <p className="text-muted-foreground text-sm mt-1">관리자 비밀번호를 입력하세요</p>
          </div>
          <form onSubmit={handleUnlock} className="bg-card border rounded-2xl shadow-sm p-6 space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              autoFocus
              className={wrongPass ? "border-destructive" : ""}
            />
            {wrongPass && <p className="text-destructive text-sm">비밀번호가 틀렸습니다</p>}
            <Button type="submit" className="w-full">입장</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const getUsernameById = (id: number | null) => {
    if (id === null) return <span className="text-muted-foreground text-xs">비로그인</span>;
    const u = users.find(u => u.id === id);
    return u ? <span className="font-medium">@{u.username}</span> : <span className="text-muted-foreground text-xs">ID:{id}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold text-lg">관리자 패널</h1>
            <p className="text-muted-foreground text-xs">SiteDrop 플랫폼 관리</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> 앱으로 돌아가기
        </Button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{users.length}</div>
              <div className="text-muted-foreground text-xs">전체 사용자</div>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{sites.length}</div>
              <div className="text-muted-foreground text-xs">전체 사이트</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b pb-2">
          <Button variant={tab === "users" ? "default" : "ghost"} size="sm" onClick={() => setTab("users")}>
            <Users className="w-4 h-4 mr-2" /> 사용자 관리
          </Button>
          <Button variant={tab === "sites" ? "default" : "ghost"} size="sm" onClick={() => setTab("sites")}>
            <Globe className="w-4 h-4 mr-2" /> 사이트 관리
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
        ) : tab === "users" ? (
          <div className="space-y-2">
            {users.length === 0 && <div className="text-center py-12 text-muted-foreground">등록된 사용자가 없습니다</div>}
            {users.map(u => (
              <div key={u.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    @{u.username}
                    {u.isAdmin && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">관리자</span>}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {u.email} · {format(new Date(u.createdAt), "yyyy.MM.dd", { locale: ko })} 가입
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    사이트 {sites.filter(s => s.userId === u.id).length}개
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteUser(u.id, u.username)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {sites.length === 0 && <div className="text-center py-12 text-muted-foreground">등록된 사이트가 없습니다</div>}
            {sites.map(s => (
              <div key={s.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    /s/{s.name} · {getUsernameById(s.userId)} · {format(new Date(s.createdAt), "yyyy.MM.dd", { locale: ko })}
                  </div>
                  {s.description && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{s.description}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs" asChild>
                    <a href={`/s/${s.name}`} target="_blank" rel="noopener noreferrer">보기</a>
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteSite(s.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
