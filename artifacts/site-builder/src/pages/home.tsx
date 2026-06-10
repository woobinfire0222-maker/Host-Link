import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Globe, Bot, Plus, ArrowRight, FileCode2, ExternalLink } from "lucide-react";
import { useGetSiteStats, getGetSiteStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface BotInfo {
  id: number;
  name: string;
  running: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: stats } = useGetSiteStats({ query: { queryKey: getGetSiteStatsQueryKey(), enabled: !!user } });
  const [bots, setBots] = useState<BotInfo[]>([]);

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  useEffect(() => {
    if (user) {
      fetch("/api/bots", { credentials: "include" })
        .then((r) => r.ok ? r.json() : [])
        .then(setBots)
        .catch(() => {});
    }
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const runningBots = bots.filter((b) => b.running).length;

  return (
    <Layout>
      <div className="flex flex-col gap-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <section className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            안녕하세요, {user.username}님 👋
          </h1>
          <p className="text-muted-foreground">무엇을 호스팅할까요?</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 사이트 호스팅 */}
          <div className="group flex flex-col border rounded-2xl bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400/50 transition-all">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 px-8 pt-8 pb-6 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/15 text-blue-600 flex-shrink-0">
                <Globe className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">사이트 호스팅</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  HTML을 업로드하거나 AI로 생성해<br />즉시 고유 링크로 배포하세요.
                </p>
              </div>
            </div>

            <div className="px-8 py-4 border-t bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <span className="text-2xl font-bold text-foreground mr-1.5">{stats?.totalSites ?? 0}</span>
                  개 사이트
                </span>
                {(stats?.totalSites ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-0">운영 중</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Link href="/create">
                  <Button size="sm" variant="outline">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    새 사이트
                  </Button>
                </Link>
                <Link href="/sites">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                    관리
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="px-8 py-5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
                <span>HTML 직접 업로드</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileCode2 className="w-3.5 h-3.5 text-blue-500" />
                <span>AI 사이트 생성 (GPT)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span>고유 링크 즉시 발급 (/s/이름)</span>
              </div>
            </div>
          </div>

          {/* 봇 호스팅 */}
          <div className="group flex flex-col border rounded-2xl bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-purple-400/50 transition-all">
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 px-8 pt-8 pb-6 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600 flex-shrink-0">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">봇 호스팅</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  디스코드 봇 코드를 업로드하고<br />24/7 끊김 없이 실행하세요.
                </p>
              </div>
            </div>

            <div className="px-8 py-4 border-t bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  <span className="text-2xl font-bold text-foreground mr-1.5">{bots.length}</span>
                  개 봇
                </span>
                {runningBots > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-0">
                    {runningBots}개 실행 중
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Link href="/bots">
                  <Button size="sm" variant="outline">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    새 봇
                  </Button>
                </Link>
                <Link href="/bots">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    관리
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="px-8 py-5 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                <span>Python 코드 에디터 내장</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                <span>실시간 터미널 로그 확인</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                <span>requirements.txt 자동 설치</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
