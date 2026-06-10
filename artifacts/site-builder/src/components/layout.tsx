import React from "react";
import { Link, useLocation } from "wouter";
import { Plus, Layers, LogOut, LogIn, ShieldCheck, Bot, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const { user, isLoading, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80" data-testid="link-home">
            <img src="/logo-icon-black.png" alt="Host Link" className="h-8 w-8 dark:hidden" />
            <img src="/logo-icon-white.png" alt="Host Link" className="h-8 w-8 hidden dark:block" />
            <div className="flex flex-col leading-none">
              <span className="font-black text-base tracking-widest uppercase">Host Link</span>
              <span className="text-[10px] text-muted-foreground tracking-wider">호스트 링크</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {user && (
              <>
                <Link href="/" data-testid="link-dashboard">
                  <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="font-medium">
                    <Layers className="w-4 h-4 mr-1.5" />
                    홈
                  </Button>
                </Link>
                <Link href="/sites" data-testid="link-sites">
                  <Button variant={location.startsWith("/sites") ? "secondary" : "ghost"} size="sm" className="font-medium">
                    <Globe className="w-4 h-4 mr-1.5" />
                    사이트 호스팅
                  </Button>
                </Link>
                <Link href="/bots" data-testid="link-bots">
                  <Button variant={location.startsWith("/bots") ? "secondary" : "ghost"} size="sm" className="font-medium">
                    <Bot className="w-4 h-4 mr-1.5" />
                    봇 호스팅
                  </Button>
                </Link>
                <Link href="/create" data-testid="link-create">
                  <Button size="sm" className="font-medium shadow-sm ml-1" variant={location === "/create" ? "secondary" : "default"}>
                    <Plus className="w-4 h-4 mr-1" />
                    새로 만들기
                  </Button>
                </Link>
              </>
            )}

            {!isLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="font-medium gap-2 ml-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {user.username[0].toUpperCase()}
                      </div>
                      {user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-3 py-2 text-xs text-muted-foreground">{user.email}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      관리자 모드
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button size="sm" variant="outline" className="font-medium">
                    <LogIn className="w-4 h-4 mr-2" />
                    로그인
                  </Button>
                </Link>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col">
        {children}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo-icon-black.png" alt="" className="h-4 w-4 dark:hidden opacity-50" />
              <img src="/logo-icon-white.png" alt="" className="h-4 w-4 hidden dark:block opacity-50" />
              <p>Host Link &copy; {new Date().getFullYear()}</p>
            </div>
            <Link href="/admin">
              <button className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <ShieldCheck className="w-3 h-3" />
                관리자
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-2" title={`API 상태: ${health?.status || '알 수 없음'}`}>
            <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-destructive animate-pulse'}`} />
            API {health?.status === 'ok' ? '정상' : '오프라인'}
          </div>
        </div>
      </footer>
    </div>
  );
}
