import React from "react";
import { Link, useLocation } from "wouter";
import { Zap, Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthCheck, getHealthCheckQueryKey } from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });

  return (
    <div className="min-h-screen flex flex-col w-full bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80 group" data-testid="link-home">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-lg tracking-tight">SiteDrop</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link href="/" data-testid="link-dashboard">
              <Button variant={location === "/" ? "secondary" : "ghost"} size="sm" className="font-medium">
                <Layers className="w-4 h-4 mr-2" />
                대시보드
              </Button>
            </Link>
            <Link href="/create" data-testid="link-create">
              <Button size="sm" className="font-medium shadow-sm" variant={location === "/create" ? "secondary" : "default"}>
                <Plus className="w-4 h-4 mr-1" />
                새 사이트
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col">
        {children}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between text-sm text-muted-foreground">
          <p>SiteDrop &copy; {new Date().getFullYear()}</p>
          <div className="flex items-center gap-2" title={`API 상태: ${health?.status || '알 수 없음'}`}>
            <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-green-500' : 'bg-destructive animate-pulse'}`} />
            API {health?.status === 'ok' ? '정상' : '오프라인'}
          </div>
        </div>
      </footer>
    </div>
  );
}
