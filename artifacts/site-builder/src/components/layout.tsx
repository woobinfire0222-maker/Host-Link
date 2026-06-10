import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Layers, LogOut, LogIn, ShieldCheck, Bot, Globe, ChevronDown, Menu, X } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = user ? [
    { href: "/", label: "홈", icon: Layers, active: location === "/" },
    { href: "/sites", label: "사이트", icon: Globe, active: location.startsWith("/sites") || location.startsWith("/create") },
    { href: "/bots", label: "봇", icon: Bot, active: location.startsWith("/bots") },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-6xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 flex-shrink-0">
            <img src="/logo-icon-black.png" alt="Host Link" className="h-7 w-7 dark:hidden" />
            <img src="/logo-icon-white.png" alt="Host Link" className="h-7 w-7 hidden dark:block" />
            <div className="flex flex-col leading-none">
              <span className="font-black text-sm tracking-widest uppercase">Host Link</span>
              <span className="text-[9px] text-muted-foreground tracking-wider hidden sm:block">호스트 링크</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, active }) => (
              <Link key={href} href={href}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="font-medium">
                  <Icon className="w-4 h-4 mr-1.5" />
                  {label}
                </Button>
              </Link>
            ))}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="font-medium shadow-sm ml-1" variant="default">
                    <Plus className="w-4 h-4 mr-1" />
                    새로 만들기
                    <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setLocation("/create")} className="cursor-pointer gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    사이트 만들기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/bots?new=1")} className="cursor-pointer gap-2">
                    <Bot className="w-4 h-4 text-purple-500" />
                    봇 만들기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isLoading && (
              user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="font-medium gap-2 ml-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="hidden lg:inline">{user.username}</span>
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

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="default" className="h-8 px-2.5">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => { setLocation("/create"); setMobileMenuOpen(false); }} className="cursor-pointer gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    사이트 만들기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setLocation("/bots?new=1"); setMobileMenuOpen(false); }} className="cursor-pointer gap-2">
                    <Bot className="w-4 h-4 text-purple-500" />
                    봇 만들기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileMenuOpen((o) => !o)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/98 backdrop-blur px-4 pb-4 pt-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
            {navItems.map(({ href, label, icon: Icon, active }) => (
              <Link key={href} href={href} onClick={() => setMobileMenuOpen(false)}>
                <Button variant={active ? "secondary" : "ghost"} className="w-full justify-start font-medium">
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              </Link>
            ))}

            {user && (
              <>
                <div className="border-t my-1" />
                <div className="px-2 py-1 text-xs text-muted-foreground">{user.email}</div>
                <Button variant="ghost" className="w-full justify-start" onClick={() => { setLocation("/admin"); setMobileMenuOpen(false); }}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  관리자 모드
                </Button>
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </>
            )}

            {!isLoading && !user && (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full mt-1">
                  <LogIn className="w-4 h-4 mr-2" />
                  로그인
                </Button>
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl flex flex-col">
        {children}
      </main>

      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <img src="/logo-icon-black.png" alt="" className="h-3.5 w-3.5 dark:hidden opacity-50" />
              <img src="/logo-icon-white.png" alt="" className="h-3.5 w-3.5 hidden dark:block opacity-50" />
              <p className="text-xs">Host Link &copy; {new Date().getFullYear()}</p>
            </div>
            <Link href="/admin">
              <button className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden sm:inline">관리자</span>
              </button>
            </Link>
          </div>
          <div className="flex items-center gap-1.5" title={`API 상태: ${health?.status || '알 수 없음'}`}>
            <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-destructive animate-pulse'}`} />
            <span className="text-xs">API {health?.status === 'ok' ? '정상' : '오프라인'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
