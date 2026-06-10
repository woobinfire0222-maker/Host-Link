import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && user) setLocation("/");
  }, [user, isAuthLoading, setLocation]);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  async function parseJson(res: Response) {
    try { return await res.json(); } catch { return null; }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast({ title: "로그인 실패", description: data?.error ?? "서버 오류가 발생했습니다", variant: "destructive" });
        return;
      }
      queryClient.setQueryData(["auth", "me"], data);
      toast({ title: "로그인 성공", description: `${data.username}님, 환영합니다!` });
      setLocation("/");
    } catch {
      toast({ title: "로그인 실패", description: "네트워크 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm) {
      toast({ title: "오류", description: "비밀번호가 일치하지 않습니다", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: registerForm.username, email: registerForm.email, password: registerForm.password }),
      });
      const data = await parseJson(res);
      if (!res.ok) {
        toast({ title: "가입 실패", description: data?.error ?? "서버 오류가 발생했습니다", variant: "destructive" });
        return;
      }
      queryClient.setQueryData(["auth", "me"], data);
      toast({ title: "가입 완료", description: `${data.username}님, 환영합니다!` });
      setLocation("/");
    } catch {
      toast({ title: "가입 실패", description: "네트워크 오류가 발생했습니다", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <img src="/hl-icon-dark.png" alt="Host Link" className="h-40 w-40 dark:hidden" />
            <img src="/hl-icon-white.png" alt="Host Link" className="h-40 w-40 hidden dark:block" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-muted-foreground">Host Link</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1">로그인</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">아이디</Label>
                  <Input id="login-username" placeholder="아이디 입력" value={loginForm.username}
                    onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">비밀번호</Label>
                  <Input id="login-password" type="password" placeholder="비밀번호 입력" value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">아이디</Label>
                  <Input id="reg-username" placeholder="2~30자, 영문/숫자" value={registerForm.username}
                    onChange={e => setRegisterForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">이메일</Label>
                  <Input id="reg-email" type="email" placeholder="example@email.com" value={registerForm.email}
                    onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">비밀번호</Label>
                  <Input id="reg-password" type="password" placeholder="4자 이상" value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">비밀번호 확인</Label>
                  <Input id="reg-confirm" type="password" placeholder="비밀번호 재입력" value={registerForm.confirm}
                    onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "가입 중..." : "회원가입"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
