import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, MessageCircle, Send, CheckCircle2, XCircle, Clock, Bot, Globe } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PaymentRequest {
  id: number;
  slotType: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface PaymentMessage {
  id: number;
  requestId: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

type Step = "info" | "chat";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotType: "site" | "bot";
  onPaymentCreated?: () => void;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "요청 실패");
  return body;
}

export function PaymentDialog({ open, onOpenChange, slotType, onPaymentCreated }: PaymentDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("info");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PaymentMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const BANK_INFO = "카카오뱅크 3333-01-1234567 홍길동 (예시)";

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!open) {
      setStep("info");
      setMessage("");
      setRequestId(null);
      setMessages([]);
      setNewMsg("");
    }
  }, [open]);

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      const req = await apiFetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotType,
          message: message.trim() || `안녕하세요. ${slotType === "site" ? "사이트" : "봇"} 추가 슬롯을 구매하고 싶습니다. 위 계좌로 5,000원 입금했습니다.`,
        }),
      });
      setRequestId(req.id);
      const data = await apiFetch(`/api/payments/${req.id}/messages`);
      setMessages(data.messages ?? []);
      setStep("chat");
      onPaymentCreated?.();
    } catch (e: any) {
      toast({ title: "신청 실패", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
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
    } catch (e: any) {
      toast({ title: "전송 실패", description: e.message, variant: "destructive" });
    } finally {
      setSendingMsg(false);
    }
  };

  const slotLabel = slotType === "site" ? "사이트" : "봇";
  const SlotIcon = slotType === "site" ? Globe : Bot;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {slotLabel} 슬롯 추가 구매
          </DialogTitle>
        </DialogHeader>

        {step === "info" ? (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlotIcon className="w-4 h-4 text-primary" />
                {slotLabel} 슬롯 1개 추가
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">가격</span>
                <span className="text-lg font-bold text-primary">5,000원</span>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">입금 계좌</p>
                <div className="bg-background border rounded-lg px-3 py-2 text-sm font-mono select-all">
                  {BANK_INFO}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">관리자에게 남길 메시지 (선택)</p>
              <Textarea
                placeholder={`"홍길동으로 ${slotType === "site" ? "사이트" : "봇"} 슬롯 구매 입금했습니다."`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              위 계좌로 입금 후 결제 신청을 누르세요. 관리자 확인 후 슬롯이 추가됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              관리자와의 채팅 — 문의사항을 남기거나 입금 정보를 알려주세요.
            </div>
            <div className="border rounded-xl bg-muted/20 h-64 overflow-y-auto p-3 space-y-2 flex flex-col">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${msg.isAdmin ? "self-start" : "self-end items-end"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm ${
                      msg.isAdmin
                        ? "bg-muted text-foreground rounded-tl-none"
                        : "bg-primary text-primary-foreground rounded-tr-none"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {msg.isAdmin ? "관리자 · " : ""}
                    {format(new Date(msg.createdAt), "HH:mm", { locale: ko })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="메시지를 입력하세요..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                rows={2}
                className="resize-none text-sm flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={sendingMsg || !newMsg.trim()}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "info" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}>
                {submitting ? (
                  <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
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

// ── My Payments Dialog ───────────────────────────────────

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
    try {
      const data = await apiFetch("/api/payments/my");
      setRequests(data);
    } catch {}
    finally { setLoading(false); }
  };

  const openChat = async (id: number) => {
    setSelected(id);
    try {
      const data = await apiFetch(`/api/payments/${id}/messages`);
      setMessages(data.messages ?? []);
    } catch {}
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
    } catch (e: any) {
      toast({ title: "전송 실패", description: e.message, variant: "destructive" });
    } finally { setSendingMsg(false); }
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500 text-white text-xs">승인됨</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="text-xs">거절됨</Badge>;
    return <Badge variant="secondary" className="text-xs">대기 중</Badge>;
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
          <div className="space-y-2 py-2 max-h-96 overflow-y-auto">
            {loading && <div className="text-center py-8 text-muted-foreground text-sm">불러오는 중...</div>}
            {!loading && requests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">결제 내역이 없습니다.</div>
            )}
            {requests.map((r) => (
              <button
                key={r.id}
                onClick={() => openChat(r.id)}
                className="w-full text-left bg-muted/30 hover:bg-muted/60 border rounded-xl px-4 py-3 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.slotType === "site" ? <Globe className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-primary" />}
                    <span className="text-sm font-medium">{r.slotType === "site" ? "사이트" : "봇"} 슬롯 추가</span>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{r.amount.toLocaleString()}원</span>
                  <span>·</span>
                  <span>{format(new Date(r.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                  <span className="ml-auto text-primary text-xs">채팅 열기 →</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setMessages([]); }} className="text-xs px-2">
              ← 목록으로
            </Button>
            <div className="border rounded-xl bg-muted/20 h-64 overflow-y-auto p-3 space-y-2 flex flex-col">
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
            <div className="flex gap-2">
              <Textarea
                placeholder="메시지 입력..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                rows={2}
                className="resize-none text-sm flex-1"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button size="icon" onClick={handleSend} disabled={sendingMsg || !newMsg.trim()} className="self-end">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
