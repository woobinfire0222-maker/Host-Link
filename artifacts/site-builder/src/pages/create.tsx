import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, UploadCloud, Link, AlertCircle, CheckCircle2, FileUp, Wand2 } from "lucide-react";
import { useCreateSite, useGenerateSite, useImportSite, useCheckSiteName, getCheckSiteNameQueryKey, getListSitesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Layout } from "@/components/layout";
import { useDebounce } from "@/lib/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { VisualBuilder, generateHtmlFromBlocks } from "@/components/visual-builder";

const siteNameRegex = /^[a-z0-9-]+$/;

const uploadSchema = z.object({
  name: z.string().min(1, "사이트 이름을 입력해주세요").max(50, "50자 이하로 입력해주세요").regex(siteNameRegex, "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  htmlContent: z.string().min(1, "HTML 내용을 입력해주세요"),
});

const generateSchema = z.object({
  name: z.string().min(1, "사이트 이름을 입력해주세요").max(50, "50자 이하로 입력해주세요").regex(siteNameRegex, "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(10, "좀 더 자세히 설명해주세요 (10자 이상)"),
});

const importSchema = z.object({
  name: z.string().min(1, "사이트 이름을 입력해주세요").max(50, "50자 이하로 입력해주세요").regex(siteNameRegex, "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  url: z.string().min(1, "URL을 입력해주세요"),
});

const builderSchema = z.object({
  name: z.string().min(1, "사이트 이름을 입력해주세요").max(50, "50자 이하로 입력해주세요").regex(siteNameRegex, "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
});

export default function CreateSite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"upload" | "import" | "generate" | "builder">("upload");
  const [builderHtml, setBuilderHtml] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { name: "", title: "", description: "", htmlContent: "" },
  });

  const generateForm = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { name: "", title: "", description: "" },
  });

  const importForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: { name: "", title: "", description: "", url: "" },
  });

  const builderForm = useForm<z.infer<typeof builderSchema>>({
    resolver: zodResolver(builderSchema),
    defaultValues: { name: "", title: "", description: "" },
  });

  const currentFormName =
    activeTab === "upload" ? uploadForm.watch("name") :
    activeTab === "generate" ? generateForm.watch("name") :
    activeTab === "import" ? importForm.watch("name") :
    builderForm.watch("name");

  const debouncedName = useDebounce(currentFormName, 400);

  const { data: nameCheck, isLoading: isCheckingName } = useCheckSiteName(debouncedName, {
    query: {
      enabled: !!user && debouncedName.length > 0 && siteNameRegex.test(debouncedName),
      queryKey: getCheckSiteNameQueryKey(debouncedName),
    },
  });

  const queryClient = useQueryClient();
  const createSite = useCreateSite();
  const generateSite = useGenerateSite();
  const importSite = useImportSite();

  const extractErrorMsg = (error: unknown): string => {
    if (error && typeof error === "object") {
      const data = (error as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
      const msg = (error as Error).message;
      if (msg) return msg;
    }
    return "알 수 없는 오류";
  };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      toast({ title: "HTML 파일만 업로드 가능합니다", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      uploadForm.setValue("htmlContent", content);
      if (!uploadForm.getValues("title")) {
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) uploadForm.setValue("title", titleMatch[1].trim());
      }
      toast({ title: `"${file.name}" 파일을 불러왔습니다` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onUploadSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (nameCheck && !nameCheck.available) { uploadForm.setError("name", { message: "이미 사용 중인 이름입니다" }); return; }
    createSite.mutate({ data: values }, {
      onSuccess: (site) => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "사이트가 성공적으로 배포되었습니다!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error: unknown) => {
        toast({ title: "배포 실패", description: extractErrorMsg(error), variant: "destructive" });
      },
    });
  };

  const onGenerateSubmit = async (values: z.infer<typeof generateSchema>) => {
    if (nameCheck && !nameCheck.available) { generateForm.setError("name", { message: "이미 사용 중인 이름입니다" }); return; }
    generateSite.mutate({ data: values }, {
      onSuccess: (site) => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "사이트가 생성되었습니다!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error: unknown) => {
        toast({ title: "생성 실패", description: extractErrorMsg(error), variant: "destructive" });
      },
    });
  };

  const onImportSubmit = async (values: z.infer<typeof importSchema>) => {
    if (nameCheck && !nameCheck.available) { importForm.setError("name", { message: "이미 사용 중인 이름입니다" }); return; }
    importSite.mutate({ data: values }, {
      onSuccess: (site) => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "사이트를 성공적으로 가져왔습니다!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error: unknown) => {
        toast({ title: "가져오기 실패", description: extractErrorMsg(error), variant: "destructive" });
      },
    });
  };

  const onBuilderSubmit = async (values: z.infer<typeof builderSchema>) => {
    if (nameCheck && !nameCheck.available) { builderForm.setError("name", { message: "이미 사용 중인 이름입니다" }); return; }
    if (!builderHtml) { toast({ title: "블록을 하나 이상 추가해주세요", variant: "destructive" }); return; }
    createSite.mutate({ data: { ...values, htmlContent: builderHtml } }, {
      onSuccess: (site) => {
        queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
        toast({ title: "사이트가 배포되었습니다!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error: unknown) => {
        toast({ title: "배포 실패", description: extractErrorMsg(error), variant: "destructive" });
      },
    });
  };

  const renderNameField = (form: any, testId = "input-site-name") => (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>URL 슬러그</FormLabel>
          <FormControl>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-muted-foreground text-sm font-mono">/s/</span>
              <Input
                placeholder="my-awesome-site"
                className={`pl-8 font-mono ${nameCheck?.available === true ? "border-green-500 focus-visible:ring-green-500" : ""} ${nameCheck?.available === false ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...field}
                onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                data-testid={testId}
              />
              <div className="absolute right-3">
                {isCheckingName ? (
                  <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                ) : nameCheck?.available === true ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : nameCheck?.available === false ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : null}
              </div>
            </div>
          </FormControl>
          <FormDescription>
            영문 소문자, 숫자, 하이픈만 사용 가능합니다.
            {nameCheck?.available === false && <span className="text-destructive font-medium ml-1">이미 사용 중입니다.</span>}
            {nameCheck?.available === true && <span className="text-green-600 font-medium ml-1 dark:text-green-400">사용 가능합니다!</span>}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">새 사이트 만들기</h1>
          <p className="text-muted-foreground text-lg">HTML 업로드, URL 가져오기, 비주얼 빌더, AI 자동 생성 — 원하는 방법을 선택하세요.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-14 mb-8">
            <TabsTrigger value="upload" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
              <UploadCloud className="w-4 h-4 mr-1.5" />
              HTML 업로드
            </TabsTrigger>
            <TabsTrigger value="builder" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
              <Wand2 className="w-4 h-4 mr-1.5" />
              비주얼 빌더
            </TabsTrigger>
            <TabsTrigger value="import" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
              <Link className="w-4 h-4 mr-1.5" />
              URL 가져오기
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md">
              <Sparkles className="w-4 h-4 mr-1.5" />
              자동 생성
            </TabsTrigger>
          </TabsList>

          {/* ─── HTML 업로드 탭 ─── */}
          <TabsContent value="upload" className="mt-0 outline-none">
            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNameField(uploadForm)}
                    <FormField
                      control={uploadForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>제목</FormLabel>
                          <FormControl><Input placeholder="내 멋진 사이트" {...field} /></FormControl>
                          <FormDescription>브라우저 탭에 표시됩니다.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={uploadForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>설명 (선택)</FormLabel>
                        <FormControl><Input placeholder="사이트에 대한 간단한 설명" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={uploadForm.control}
                    name="htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-1.5">
                          <FormLabel className="mb-0">HTML 내용</FormLabel>
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".html,.htm"
                              className="hidden"
                              onChange={handleFileUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <FileUp className="w-3.5 h-3.5" />
                              파일 선택
                            </Button>
                          </div>
                        </div>
                        <FormControl>
                          <Textarea
                            placeholder={"<!DOCTYPE html>\n<html>\n  <body>\n    <h1>안녕하세요!</h1>\n  </body>\n</html>"}
                            className="font-mono h-[320px] bg-muted/50 border-input"
                            {...field}
                            data-testid="input-site-html"
                          />
                        </FormControl>
                        <FormDescription>HTML 파일을 직접 선택하거나, 코드를 붙여넣으세요.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={createSite.isPending || (nameCheck != null && !nameCheck.available)}
                      data-testid="button-submit-upload"
                    >
                      {createSite.isPending ? (
                        <><div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />배포 중...</>
                      ) : (
                        <><UploadCloud className="w-4 h-4 mr-2" />사이트 배포</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ─── 비주얼 빌더 탭 ─── */}
          <TabsContent value="builder" className="mt-0 outline-none">
            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8 space-y-6">
              <Form {...builderForm}>
                <form onSubmit={builderForm.handleSubmit(onBuilderSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNameField(builderForm, "input-builder-name")}
                    <FormField
                      control={builderForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>사이트 제목</FormLabel>
                          <FormControl><Input placeholder="내 멋진 사이트" {...field} /></FormControl>
                          <FormDescription>브라우저 탭에 표시됩니다.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={builderForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>설명 (선택)</FormLabel>
                        <FormControl><Input placeholder="사이트에 대한 간단한 설명" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="border-t pt-6">
                    <VisualBuilder
                      title={builderForm.watch("title")}
                      onHtmlChange={setBuilderHtml}
                    />
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={createSite.isPending || (nameCheck != null && !nameCheck.available)}
                    >
                      {createSite.isPending ? (
                        <><div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />배포 중...</>
                      ) : (
                        <><Wand2 className="w-4 h-4 mr-2" />사이트 배포</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ─── URL 가져오기 탭 ─── */}
          <TabsContent value="import" className="mt-0 outline-none">
            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
              <Form {...importForm}>
                <form onSubmit={importForm.handleSubmit(onImportSubmit)} className="space-y-6">
                  <Alert className="bg-primary/5 border-primary/20">
                    <Link className="w-4 h-4 text-primary" />
                    <AlertTitle className="text-foreground font-semibold">URL에서 사이트 가져오기</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                      웹사이트 URL을 입력하면 해당 페이지의 HTML을 그대로 가져와서 호스팅합니다. 공개 접근 가능한 URL이어야 합니다.
                    </AlertDescription>
                  </Alert>
                  <FormField
                    control={importForm.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>웹사이트 URL</FormLabel>
                        <FormControl><Input placeholder="https://example.com" type="url" {...field} /></FormControl>
                        <FormDescription>가져올 사이트의 전체 URL을 입력하세요.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNameField(importForm, "input-import-name")}
                    <FormField
                      control={importForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>제목</FormLabel>
                          <FormControl><Input placeholder="가져온 사이트 이름" {...field} /></FormControl>
                          <FormDescription>브라우저 탭에 표시됩니다.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={importForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>설명 (선택)</FormLabel>
                        <FormControl><Input placeholder="사이트에 대한 간단한 설명" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto"
                      disabled={importSite.isPending || (nameCheck != null && !nameCheck.available)}
                    >
                      {importSite.isPending ? (
                        <><div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />가져오는 중...</>
                      ) : (
                        <><Link className="w-4 h-4 mr-2" />사이트 가져오기</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          {/* ─── 자동 생성 탭 ─── */}
          <TabsContent value="generate" className="mt-0 outline-none">
            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
              <Form {...generateForm}>
                <form onSubmit={generateForm.handleSubmit(onGenerateSubmit)} className="space-y-6">
                  <Alert className="bg-primary/5 border-primary/20">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <AlertTitle className="text-foreground font-semibold">자동 사이트 생성</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                      원하는 사이트를 설명하면 서버가 직접 완성된 HTML 페이지를 만들어 즉시 배포합니다.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNameField(generateForm, "input-generate-name")}
                    <FormField
                      control={generateForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>제목</FormLabel>
                          <FormControl><Input placeholder="유나의 포트폴리오" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={generateForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>사이트 설명</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={"예: 사진작가 유나의 포트폴리오 사이트. 다크모드, 갤러리 그리드, 연락처 포함.\n예: 이탈리안 레스토랑 랜딩 페이지. 메뉴, 위치, 예약 폼 포함.\n예: 개인 블로그. 미니멀한 디자인, 글 목록, 소개 섹션."}
                            className="h-[180px] resize-y text-base"
                            {...field}
                            data-testid="input-site-prompt"
                          />
                        </FormControl>
                        <FormDescription>포트폴리오, 블로그, 식당, 쇼핑몰, 회사 소개 등 — 유형을 언급하면 더 잘 맞는 레이아웃으로 생성됩니다.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full sm:w-auto overflow-hidden relative group"
                      disabled={generateSite.isPending || (nameCheck != null && !nameCheck.available)}
                      data-testid="button-submit-generate"
                    >
                      {generateSite.isPending ? (
                        <><div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />생성 중...</>
                      ) : (
                        <>
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-10" />
                          <Sparkles className="w-4 h-4 mr-2 z-20 relative" />
                          <span className="z-20 relative">자동 생성 및 배포</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
