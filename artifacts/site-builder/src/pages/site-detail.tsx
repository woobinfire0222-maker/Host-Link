import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ExternalLink, Copy, Check, Trash2, Code2, Monitor, ArrowLeft, AlertTriangle, Database, QrCode, Download } from "lucide-react";
import { useGetSite, useDeleteSite, getGetSiteQueryKey, getListSitesQueryKey, getGetSiteStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layout } from "@/components/layout";
import { useCopy } from "@/hooks/use-copy";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function SiteDetail() {
  const { name } = useParams<{ name: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: isAuthLoading } = useAuth();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copy } = useCopy();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "db">("preview");
  const [qrOpen, setQrOpen] = useState(false);

  const { data: site, isLoading, isError } = useGetSite(name || "", {
    query: {
      enabled: !!name && !!user,
      queryKey: getGetSiteQueryKey(name || ""),
      retry: 1
    }
  });

  const deleteSite = useDeleteSite();

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

  const handleCopyLink = async () => {
    if (!site) return;
    const url = `${window.location.origin}/s/${site.name}`;
    const success = await copy(url, "라이브 링크가 복사되었습니다");
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    if (!site) return;
    deleteSite.mutate({ name: site.name }, {
      onSuccess: () => {
        toast({ title: "사이트가 삭제되었습니다" });
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSiteStatsQueryKey() });
        setLocation("/");
      },
      onError: (error: unknown) => {
        const msg = (error as { error?: string })?.error;
        toast({
          title: "삭제 실패",
          description: msg || "알 수 없는 오류가 발생했습니다",
          variant: "destructive"
        });
      }
    });
  };

  if (isError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">사이트를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-6">"{name}" 사이트가 존재하지 않거나 삭제되었습니다.</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-full animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight truncate" title={site?.title}>{site?.title}</h1>
                  <Badge variant="outline" className="text-xs bg-card/50">v1</Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono bg-muted/50 px-2 py-1 rounded">
                    /s/{site?.name}
                  </span>
                  {site?.createdAt && (
                    <span className="hidden sm:inline">
                      {format(new Date(site.createdAt), "yyyy년 M월 d일 HH:mm", { locale: ko })} 생성
                    </span>
                  )}
                </div>
                {site?.description && (
                  <p className="mt-3 text-foreground/80 max-w-2xl">{site.description}</p>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2 self-start">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-10" />
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCopyLink}
                  className="bg-card shadow-sm"
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                  링크 복사
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setQrOpen(true)}
                  className="bg-card shadow-sm"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR 코드
                </Button>
                
                <Button 
                  variant="default"
                  className="shadow-sm"
                  asChild
                  data-testid="button-visit-live"
                >
                  <a href={`/s/${site?.name}`} target="_blank" rel="noopener noreferrer">
                    바로 열기
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="shadow-sm" data-testid="button-delete-site">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{site?.name}</strong> 사이트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없으며, 해당 URL은 다시 사용 가능해집니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        disabled={deleteSite.isPending}
                      >
                        {deleteSite.isPending ? "삭제 중..." : "사이트 삭제"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 mt-4 border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col min-h-[600px]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full flex flex-col h-full">
            <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
              <TabsList className="h-9">
                <TabsTrigger value="preview" className="text-sm px-4 data-[state=active]:bg-background" data-testid="tab-preview">
                  <Monitor className="w-4 h-4 mr-2" />
                  미리보기
                </TabsTrigger>
                <TabsTrigger value="code" className="text-sm px-4 data-[state=active]:bg-background" data-testid="tab-code">
                  <Code2 className="w-4 h-4 mr-2" />
                  소스 코드
                </TabsTrigger>
                <TabsTrigger value="db" className="text-sm px-4 data-[state=active]:bg-background" data-testid="tab-db">
                  <Database className="w-4 h-4 mr-2" />
                  데이터베이스
                </TabsTrigger>
              </TabsList>

              {activeTab === 'preview' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-background border rounded-full text-xs font-mono text-muted-foreground shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                  {window.location.host}/s/{site?.name}
                </div>
              )}
            </div>

            <TabsContent value="preview" className="flex-1 m-0 p-0 relative outline-none h-full min-h-[500px]">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                </div>
              ) : (
                <iframe
                  src={`/s/${site?.name}`}
                  className="w-full h-full absolute inset-0 border-0 bg-white"
                  title="사이트 미리보기"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
                  data-testid="iframe-preview"
                />
              )}
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 p-0 outline-none overflow-hidden flex flex-col bg-[#1e1e1e]">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                  <Skeleton className="h-4 w-1/4 bg-white/10" />
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-4 text-sm font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                  {site?.htmlContent || "내용 없음"}
                </div>
              )}
            </TabsContent>

            <TabsContent value="db" className="flex-1 m-0 outline-none overflow-auto">
              <div className="p-6 max-w-3xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-1">사이트 데이터베이스</h3>
                  <p className="text-muted-foreground text-sm">
                    이 사이트의 HTML 안에서 JavaScript로 데이터를 읽고 쓸 수 있습니다. key-value 형태로 저장됩니다.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      label: "📥 값 저장 (set)",
                      code: `// 값 저장\nawait fetch('/api/sitedb/${site?.name}/방문자수', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ value: '42' })\n});\n`,
                    },
                    {
                      label: "📤 값 불러오기 (get)",
                      code: `// 값 불러오기\nconst res = await fetch('/api/sitedb/${site?.name}/방문자수');\nconst data = await res.json();\nconsole.log(data.value); // '42'\n`,
                    },
                    {
                      label: "📋 전체 목록 조회 (list)",
                      code: `// 저장된 모든 key-value 가져오기\nconst res = await fetch('/api/sitedb/${site?.name}');\nconst all = await res.json();\nconsole.log(all); // { 방문자수: '42', ... }\n`,
                    },
                    {
                      label: "🗑️ 값 삭제 (delete)",
                      code: `// 키 삭제\nawait fetch('/api/sitedb/${site?.name}/방문자수', {\n  method: 'DELETE'\n});\n`,
                    },
                  ].map(({ label, code }) => (
                    <div key={label} className="rounded-lg overflow-hidden border">
                      <div className="bg-muted px-4 py-2 text-sm font-medium">{label}</div>
                      <pre className="bg-[#1e1e1e] text-gray-300 text-xs font-mono p-4 overflow-auto leading-relaxed">{code}</pre>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                  <strong className="text-foreground">💡 사용 팁:</strong> 위 코드를 업로드한 HTML의{" "}
                  <code className="bg-muted px-1 rounded text-xs">&lt;script&gt;</code> 태그 안에 붙여넣으면 바로 사용 가능합니다.
                  저장된 데이터는 서버 DB에 영구 보관됩니다.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR 코드
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-sm text-muted-foreground text-center break-all">
              {window.location.origin}/s/{site?.name}
            </p>
            {site?.name && (
              <div className="border rounded-xl p-3 bg-white shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=4&data=${encodeURIComponent(`${window.location.origin}/s/${site.name}`)}`}
                  alt="QR 코드"
                  width={220}
                  height={220}
                  className="block"
                />
              </div>
            )}
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&margin=8&data=${encodeURIComponent(`${window.location.origin}/s/${site?.name}`)}`}
              download={`qr-${site?.name}.png`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                PNG 다운로드
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
