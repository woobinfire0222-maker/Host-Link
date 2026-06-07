import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ExternalLink, Copy, Check, Trash2, Code2, Monitor, ArrowLeft, AlertTriangle } from "lucide-react";
import { useGetSite, useDeleteSite, getGetSiteQueryKey, getListSitesQueryKey, getGetSiteStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Layout } from "@/components/layout";
import { useCopy } from "@/hooks/use-copy";
import { useToast } from "@/hooks/use-toast";

export default function SiteDetail() {
  const { name } = useParams<{ name: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { copy } = useCopy();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const { data: site, isLoading, isError } = useGetSite(name || "", { 
    query: { 
      enabled: !!name, 
      queryKey: getGetSiteQueryKey(name || ""),
      retry: 1
    } 
  });

  const deleteSite = useDeleteSite();

  const handleCopyLink = async () => {
    if (!site) return;
    const url = `${window.location.origin}/s/${site.name}`;
    const success = await copy(url, "Live link copied");
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    if (!site) return;
    deleteSite.mutate({ name: site.name }, {
      onSuccess: () => {
        toast({ title: "Site deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSiteStatsQueryKey() });
        setLocation("/");
      },
      onError: (error) => {
        toast({
          title: "Delete failed",
          description: error.error || "An unknown error occurred",
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
          <h2 className="text-2xl font-bold mb-2">Site Not Found</h2>
          <p className="text-muted-foreground mb-6">The site "{name}" does not exist or has been deleted.</p>
          <Button onClick={() => setLocation("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
                      Created {format(new Date(site.createdAt), "MMM d, yyyy 'at' h:mm a")}
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
                  Copy Link
                </Button>
                
                <Button 
                  variant="default"
                  className="shadow-sm"
                  asChild
                  data-testid="button-visit-live"
                >
                  <a href={`/s/${site?.name}`} target="_blank" rel="noopener noreferrer">
                    Visit Live
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
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the site <strong>{site?.name}</strong>. This action cannot be undone. The URL will become available for others to use.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        disabled={deleteSite.isPending}
                      >
                        {deleteSite.isPending ? "Deleting..." : "Delete Site"}
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
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="text-sm px-4 data-[state=active]:bg-background" data-testid="tab-code">
                  <Code2 className="w-4 h-4 mr-2" />
                  Source Code
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
                  title="Site Preview"
                  sandbox="allow-scripts allow-same-origin"
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
                  {site?.htmlContent || "No content"}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </Layout>
  );
}
