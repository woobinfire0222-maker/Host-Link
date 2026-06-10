import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, Globe, Lock, ShieldCheck, ArrowLeft, Bot, Play, Square, CreditCard, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface AdminUser {
  id: number; username: string; email: string; isAdmin: boolean; createdAt: string;
  extraSiteSlots: number; extraBotSlots: number;
}
interface AdminSite {
  id: number; name: string; title: string; description: string | null; userId: number | null; createdAt: string;
}
interface AdminBot {
  id: number; name: string; description: string | null; entryFile: string; status: string; running: boolean; userId: number | null; createdAt: string;
}
interface AdminPayment {
  id: number; userId: number; slotType: string; status: string; amount: number;
  createdAt: string; updatedAt: string; username: string | null; email: string | null;
}
interface PaymentMessage {
  id: number; requestId: number; isAdmin: boolean; message: string; createdAt: string;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [wrongPass, setWrongPass] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tab, setTab] = useState<"users" | "sites" | "bots" | "payments">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);

  // Payment chat state
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<PaymentMessage[]>([]);
  const [chatMsg, setChatMsg] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) { setUnlocked(true); setWrongPass(false); loadData(); }
      else { setWrongPass(true); setPasswordInput(""); }
    } catch {
      toast({ title: "오류", description: "서버에 연결할 수 없습니다", variant: "destructive" });
    } finally { setVerifying(false); }
  }

  async function loadData() {
    setLoading(true);
    try {
      const [uRes, sRes, bRes, pRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/sites", { credentials: "include" }),
        fetch("/api/admin/bots", { credentials: "include" }),
        fetch("/api/admin/payments", { credentials: "include" }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (sRes.ok) setSites(await sRes.json());
      if (bRes.ok) setBots(await bRes.json());
      if (pRes.ok) setPayments(await pRes.json());
    } finally { setLoading(false); }
  }

  async function deleteUser(id: number, username: string) {
    if (!confirm(`"${username}" 사용자를 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setUsers(u => u.filter(x => x.id !== id));
      setSites(s => s.filter(x => x.userId !== id));
      setBots(b => b.filter(x => x.userId !== id));
      toast({ title: "삭제 완료", description: `${username} 사용자가 삭제됐습니다` });
    } else toast({ title: "삭제 실패", variant: "destructive" });
  }

  async function deleteSite(name: string) {
    if (!confirm(`"${name}" 사이트를 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/sites/${name}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { setSites(s => s.filter(x => x.name !== name)); toast({ title: "삭제 완료" }); }
    else toast({ title: "삭제 실패", variant: "destructive" });
  }

  async function deleteBot(id: number, name: string) {
    if (!confirm(`"${name}" 봇을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/admin/bots/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { setBots(b => b.filter(x => x.id !== id)); toast({ title: "삭제 완료" }); }
    else toast({ title: "삭제 실패", variant: "destructive" });
  }

  async function stopBot(id: number, name: string) {
    const res = await fetch(`/api/admin/bots/${id}/stop`, { method: "POST", credentials: "include" });
    if (res.ok) { setBots(b => b.map(x => x.id === id ? { ...x, running: false, status: "stopped" } : x)); toast({ title: `${name} 봇이 중지됐습니다` }); }
    else toast({ title: "중지 실패", variant: "destructive" });
  }

  async function openPaymentChat(id: number) {
    setSelectedPayment(id);
    try {
      const res = await fetch(`/api/payments/${id}/messages`, { credentials: "include" });
      if (res.ok) { const data = await res.json(); setChatMessages(data.messages ?? []); }
    } catch {}
  }

  async function sendChatMsg() {
    if (!chatMsg.trim() || !selectedPayment) return;
    setSendingChat(true);
    try {
      const res = await fetch(`/api/payments/${selectedPayment}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMsg.trim() }),
      });
      if (res.ok) { const msg = await res.json(); setChatMessages(prev => [...prev, msg]); setChatMsg(""); }
    } finally { setSendingChat(false); }
  }

  async function approvePayment(id: number) {
    const res = await fetch(`/api/admin/payments/${id}/approve`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: approveNote }),
    });
    if (res.ok) {
      setPayments(p => p.map(x => x.id === id ? { ...x, status: "approved" } : x));
      setApproveNote("");
      setSelectedPayment(null);
      toast({ title: "결제 승인됨", description: "슬롯이 추가됐습니다." });
      loadData();
    } else toast({ title: "승인 실패", variant: "destructive" });
  }

  async function rejectPayment(id: number) {
    if (!confirm("이 결제 요청을 거절하시겠습니까?")) return;
    const res = await fetch(`/api/admin/payments/${id}/reject`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "" }),
    });
    if (res.ok) {
      setPayments(p => p.map(x => x.id === id ? { ...x, status: "rejected" } : x));
      setSelectedPayment(null);
      toast({ title: "결제 거절됨" });
    } else toast({ title: "거절 실패", variant: "destructive" });
  }

  const getUsernameById = (id: number | null) => {
    if (id === null) return <span className="text-muted-foreground text-xs">비로그인</span>;
    const u = users.find(u => u.id === id);
    return u ? <span className="font-medium">@{u.username}</span> : <span className="text-muted-foreground text-xs">ID:{id}</span>;
  };

  const pendingCount = payments.filter(p => p.status === "pending").length;

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
            <Input type="password" placeholder="비밀번호" value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)} autoFocus className={wrongPass ? "border-destructive" : ""} />
            {wrongPass && <p className="text-destructive text-sm">비밀번호가 틀렸습니다</p>}
            <Button type="submit" className="w-full" disabled={verifying}>입장</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> 돌아가기
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-bold text-lg">관리자 패널</h1>
            <p className="text-muted-foreground text-xs">Host Link 플랫폼 관리</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> 앱으로 돌아가기
        </Button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: "전체 사용자", value: users.length, color: "blue" },
            { icon: Globe, label: "전체 사이트", value: sites.length, color: "green" },
            { icon: Bot, label: "전체 봇", value: bots.length, sub: `${bots.filter(b => b.running).length} 실행중`, color: "purple" },
            { icon: CreditCard, label: "결제 요청", value: payments.length, sub: pendingCount > 0 ? `${pendingCount} 대기중` : undefined, color: "orange" },
          ].map(({ icon: Icon, label, value, sub, color }) => (
            <div key={label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-500`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-muted-foreground text-xs">{label}{sub && <span className="text-green-500 ml-1">({sub})</span>}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b pb-2">
          {([
            { key: "users", icon: Users, label: "사용자", badge: 0 },
            { key: "sites", icon: Globe, label: "사이트", badge: 0 },
            { key: "bots", icon: Bot, label: "봇", badge: 0 },
            { key: "payments", icon: CreditCard, label: "결제", badge: pendingCount },
          ] as const).map(({ key, icon: Icon, label, badge }) => (
            <Button key={key} variant={tab === key ? "default" : "ghost"} size="sm" onClick={() => { setTab(key); setSelectedPayment(null); }}>
              <Icon className="w-4 h-4 mr-2" />
              {label}
              {badge ? <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{badge}</span> : null}
            </Button>
          ))}
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
                    사이트 {sites.filter(s => s.userId === u.id).length}개 · 봇 {bots.filter(b => b.userId === u.id).length}개 ·{" "}
                    사이트슬롯 {1 + (u.extraSiteSlots || 0)}개 · 봇슬롯 {1 + (u.extraBotSlots || 0)}개
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteUser(u.id, u.username)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : tab === "sites" ? (
          <div className="space-y-2">
            {sites.length === 0 && <div className="text-center py-12 text-muted-foreground">등록된 사이트가 없습니다</div>}
            {sites.map(s => (
              <div key={s.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    /s/{s.name} · {getUsernameById(s.userId)} · {format(new Date(s.createdAt), "yyyy.MM.dd", { locale: ko })}
                  </div>
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
        ) : tab === "bots" ? (
          <div className="space-y-2">
            {bots.length === 0 && <div className="text-center py-12 text-muted-foreground">등록된 봇이 없습니다</div>}
            {bots.map(b => (
              <div key={b.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    {b.name}
                    <Badge variant={b.running ? "default" : "secondary"} className={b.running ? "bg-green-500 text-white text-xs" : "text-xs"}>
                      {b.running ? "실행 중" : "중지됨"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {getUsernameById(b.userId)} · 진입점: {b.entryFile} · {format(new Date(b.createdAt), "yyyy.MM.dd", { locale: ko })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.running && (
                    <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 text-xs"
                      onClick={() => stopBot(b.id, b.name)}>
                      <Square className="w-3 h-3 mr-1" /> 중지
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteBot(b.id, b.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── 결제 관리 탭 ── */
          selectedPayment === null ? (
            <div className="space-y-2">
              {payments.length === 0 && <div className="text-center py-12 text-muted-foreground">결제 요청이 없습니다</div>}
              {payments.map(p => (
                <div key={p.id} className="bg-card border rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">@{p.username ?? `ID:${p.userId}`}</span>
                      <span className="text-muted-foreground text-xs">— 슬롯 업그레이드</span>
                      {p.status === "pending" && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">대기 중</Badge>}
                      {p.status === "approved" && <Badge className="text-xs bg-green-500 text-white">승인됨</Badge>}
                      {p.status === "rejected" && <Badge variant="destructive" className="text-xs">거절됨</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.amount.toLocaleString()}원 · {format(new Date(p.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openPaymentChat(p.id)}>
                    채팅 열기
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(null); setChatMessages([]); }} className="text-xs px-2">
                ← 목록으로
              </Button>

              {/* Payment info + approve/reject */}
              {(() => {
                const p = payments.find(x => x.id === selectedPayment);
                if (!p) return null;
                return (
                  <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">@{p.username ?? `ID:${p.userId}`}</span>
                        <span className="text-muted-foreground text-sm ml-2">슬롯 업그레이드 · {p.amount.toLocaleString()}원</span>
                      </div>
                      {p.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Input placeholder="승인 메시지 (선택)" value={approveNote} onChange={e => setApproveNote(e.target.value)} className="h-8 text-xs w-48" />
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs" onClick={() => approvePayment(p.id)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 승인
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => rejectPayment(p.id)}>
                              <XCircle className="w-3.5 h-3.5 mr-1" /> 거절
                            </Button>
                          </div>
                        </div>
                      )}
                      {p.status === "approved" && <Badge className="bg-green-500 text-white">승인됨</Badge>}
                      {p.status === "rejected" && <Badge variant="destructive">거절됨</Badge>}
                    </div>
                  </div>
                );
              })()}

              {/* Chat */}
              <div className="border rounded-xl bg-muted/20 h-64 overflow-y-auto p-3 space-y-2 flex flex-col">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.isAdmin ? "self-end items-end" : "self-start"}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${msg.isAdmin ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted text-foreground rounded-tl-none"}`}>
                      {msg.message}
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {msg.isAdmin ? "관리자 · " : "@" + (payments.find(p => p.id === selectedPayment)?.username ?? "사용자") + " · "}
                      {format(new Date(msg.createdAt), "HH:mm", { locale: ko })}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <Textarea placeholder="사용자에게 메시지..." value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  rows={2} className="resize-none text-sm flex-1"
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } }} />
                <Button size="icon" onClick={sendChatMsg} disabled={sendingChat || !chatMsg.trim()} className="self-end">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
