import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Copy, Check, ExternalLink, Globe, Server, Activity, Plus, FileCode2, Bot, ArrowRight } from "lucide-react";
import { useGetSiteStats, useListSites, getListSitesQueryKey, getGetSiteStatsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout";
import { useCopy } from "@/hooks/use-copy";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: stats, isLoading: isStatsLoading } = useGetSiteStats({ query: { queryKey: getGetSiteStatsQueryKey(), enabled: !!user } });
  const { data: sites, isLoading: isSitesLoading } = useListSites({ query: { queryKey: getListSitesQueryKey(), enabled: !!user } });
  const { copy } = useCopy();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) setLocation("/login");
  }, [user, isAuthLoading, setLocation]);

  if (isAuthLoading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const handleCopyLink = async (name: string, id: number) => {
    const url = `${window.location.origin}/s/${name}`;
    const success = await copy(url, "링크가 복사되었습니다");
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">대시보드</h1>
            <p className="text-muted-foreground text-lg">사이트와 봇을 한 곳에서 관리하세요.</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/create" data-testid="button-create-hero">
              <Button size="lg" className="shadow-md shadow-primary/20 group">
                <Plus className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
                새 사이트
              </Button>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
          <Link href="/create">
            <div className="group flex items-center justify-between p-5 border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">사이트 호스팅</p>
                  <p className="text-xs text-muted-foreground">HTML 업로드 또는 AI 생성</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transform transition-transform" />
            </div>
          </Link>
          <Link href="/bots">
            <div className="group flex items-center justify-between p-5 border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">봇 호스팅</p>
                  <p className="text-xs text-muted-foreground">디스코드 봇 24/7 실행</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 transform transition-transform" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium flex items-center">
                <Globe className="w-4 h-4 mr-2 text-primary" />
                전체 사이트 수
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="text-4xl font-bold">{stats?.totalSites || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium flex items-center">
                <Server className="w-4 h-4 mr-2 text-primary" />
                인프라 상태
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <span className="text-green-500 mr-2">●</span> 정상 운영중
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="font-medium flex items-center">
                <Activity className="w-4 h-4 mr-2 text-primary" />
                네트워크 지연
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">&lt; 10ms</div>
            </CardContent>
          </Card>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">내 사이트</h2>
          </div>

          {isSitesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader><Skeleton className="h-6 w-1/2 mb-2" /><Skeleton className="h-4 w-1/3" /></CardHeader>
                  <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                  <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                </Card>
              ))}
            </div>
          ) : !sites || sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card/50 shadow-sm border-dashed">
              <div className="bg-muted p-4 rounded-full mb-4">
                <FileCode2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">아직 사이트가 없습니다</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                HTML을 업로드하거나 AI로 새 사이트를 만들어 보세요.
              </p>
              <Link href="/create" data-testid="button-create-empty">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 사이트 만들기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map((site, idx) => (
                <Card 
                  key={site.id} 
                  className="group hover-elevate transition-all border-border/50 shadow-sm hover:border-primary/30 flex flex-col"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="truncate pr-2">{site.title}</CardTitle>
                      <Badge variant="secondary" className="font-mono text-xs">/{site.name}</Badge>
                    </div>
                    <CardDescription className="truncate">
                      {site.description || "설명 없음"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-3 flex-1 flex flex-col justify-end">
                    <div className="text-xs text-muted-foreground mb-4">
                      {formatDistanceToNow(new Date(site.createdAt), { addSuffix: true, locale: ko })} 생성됨
                    </div>
                    <div className="bg-muted rounded-md p-2 flex items-center justify-between overflow-hidden">
                      <span className="text-xs font-mono truncate text-muted-foreground select-all w-full pr-2">
                        {window.location.host}/s/{site.name}
                      </span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 gap-2 flex-wrap">
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => handleCopyLink(site.name, site.id)}
                      data-testid={`button-copy-${site.id}`}
                    >
                      {copiedId === site.id ? (
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      링크 복사
                    </Button>
                    <Link href={`/sites/${site.name}`} className="flex-1" data-testid={`link-manage-${site.id}`}>
                      <Button variant="outline" className="w-full">
                        관리
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
