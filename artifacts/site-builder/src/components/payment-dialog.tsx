import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, MessageCircle, Send, Globe, Bot } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export interface PaymentRequest {
  id: number;
  slotType: string;
  status: string;
  amount: number;
  createdAt: string;
}

export interface PaymentMessage {
  id: number;
  requestId: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "요청 실패");
  return body;
}

const BANK_INFO = "카카오뱅크 3333-01-1234567 홍길동";

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500 text-white text-xs">승인됨</Badge>;
  if (status === "rejected") return <Badge variant="destructive" className="text-xs">거절됨</Badge>;
  return <Badge variant="secondary" className="text-xs">대기 중</Badge>;
}

function ChatArea({ messages, chatEndRef }: { messages: PaymentMessage[]; chatEndRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="border rounded-xl bg-muted/20 h-56 overflow-y-auto p-3 space-y-2 flex flex-col">
      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground m-auto">메시지가 없습니다.</p>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className={`flex flex-col max-w-[80%] ${msg.isAdmin ? "self-start" : "self-end items-end"}`}>
          <div className={`px-3 py-2 rounded-2xl text-sm ${msg.isAdmin ? "bg-muted text-foreground rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
            {msg.message}
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">
            {msg.isAdmin ? "관리자 · " : ""}{format(new Date(msg.createdAt), "HH:mm", { locale: ko })}
          </span>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );
}

function MessageInput({ newMsg, setNewMsg, onSend, sending }: {
  newMsg: string; setNewMsg: (v: string) => void; onSend: () => void; sending: boolean;
}) {
  return (
    <div className="flex gap-2">
      <Textarea
        placeholder="메시지를 입력하세요..."
        value={newMsg}
        onChange={(e) => setNewMsg(e.target.value)}
        rows={2}
        className="resize-none text-sm flex-1"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
      />
      <Button size="icon" onClick={onSend} disabled={sending || !newMsg.trim()} className="self-end">
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ── New Payment Request Dialog ──────────────────────────

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCreated?: () => void;
}

export function PaymentDialog({ open, onOpenChange, onPaymentCreated }: PaymentDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "chat">("info");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PaymentMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) { setStep("info"); setMessage(""); setRequestId(null); setMessages([]); setNewMsg(""); }
  }, [open]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const req = await apiFetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotType: "upgrade",
          message: message.trim() || "안녕하세요. 슬롯 업그레이드를 신청합니다. 위 계좌로 5,000원 입금했습니다.",
        }),
      });
      setRequestId(req.id);
      const data = await apiFetch(`/api/payments/${req.id}/messages`);
      setMessages(data.messages ?? []);
      setStep("chat");
      onPaymentCreated?.();
    } catch (e: unknown) {
      toast({ title: "신청 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !requestId) return;
    setSendingMsg(true);
    try {
      const msg = await apiFetch(`/api/payments/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMsg.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch (e: unknown) {
      toast({ title: "전송 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally { setSendingMsg(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            슬롯 업그레이드
          </DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold">업그레이드 내용</p>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> 사이트 슬롯 +1</div>
                <div className="flex items-center gap-1.5"><Bot className="w-4 h-4" /> 봇 슬롯 +1</div>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-muted-foreground text-sm">가격</span>
                <span className="text-xl font-bold text-primary">5,000원</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">입금 계좌</p>
                <div className="bg-background border rounded-lg px-3 py-2 text-sm font-mono select-all">{BANK_INFO}</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">관리자에게 남길 메시지 (선택)</p>
              <Textarea
                placeholder={`"홍길동으로 5,000원 입금했습니다. 슬롯 업그레이드 부탁드립니다."`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
              위 계좌로 입금 후 결제 신청하세요. 관리자 확인 후 슬롯이 추가됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              관리자와 채팅 — 입금 정보나 문의사항을 남기세요.
            </div>
            <ChatArea messages={messages} chatEndRef={chatEndRef} />
            <MessageInput newMsg={newMsg} setNewMsg={setNewMsg} onSend={handleSend} sending={sendingMsg} />
          </div>
        )}

        <DialogFooter>
          {step === "info" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />}
                <CreditCard className="w-4 h-4 mr-2" />
                결제 신청
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── My Payments Dialog ──────────────────────────────────

interface MyPaymentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MyPaymentsDialog({ open, onOpenChange }: MyPaymentsDialogProps) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<PaymentMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) loadRequests();
    else { setSelected(null); setMessages([]); }
  }, [open]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadRequests = async () => {
    setLoading(true);
    try { const data = await apiFetch("/api/payments/my"); setRequests(data); }
    catch {} finally { setLoading(false); }
  };

  const openChat = async (id: number) => {
    setSelected(id);
    try { const data = await apiFetch(`/api/payments/${id}/messages`); setMessages(data.messages ?? []); }
    catch {}
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !selected) return;
    setSendingMsg(true);
    try {
      const msg = await apiFetch(`/api/payments/${selected}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMsg.trim() }),
      });
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch (e: unknown) {
      toast({ title: "전송 실패", description: e instanceof Error ? e.message : "오류", variant: "destructive" });
    } finally { setSendingMsg(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            내 결제 내역
          </DialogTitle>
        </DialogHeader>

        {selected === null ? (
          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {loading && <p className="text-center py-8 text-muted-foreground text-sm">불러오는 중...</p>}
            {!loading && requests.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">결제 내역이 없습니다.</p>
            )}
            {requests.map((r) => (
              <button key={r.id} onClick={() => openChat(r.id)}
                className="w-full text-left bg-muted/30 hover:bg-muted/60 border rounded-xl px-4 py-3 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">슬롯 업그레이드</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{r.amount.toLocaleString()}원</span>
                  <span>·</span>
                  <span>{format(new Date(r.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                  <span className="ml-auto text-primary">채팅 열기 →</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setMessages([]); }} className="text-xs px-2">
              ← 목록으로
            </Button>
            <ChatArea messages={messages} chatEndRef={chatEndRef} />
            <MessageInput newMsg={newMsg} setNewMsg={setNewMsg} onSend={handleSend} sending={sendingMsg} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
