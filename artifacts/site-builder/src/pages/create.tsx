import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCreateSite, useCheckSiteName, getCheckSiteNameQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Layout } from "@/components/layout";
import { useDebounce } from "@/lib/use-debounce";
import { useToast } from "@/hooks/use-toast";

const siteNameRegex = /^[a-z0-9-]+$/;

const uploadSchema = z.object({
  name: z.string()
    .min(1, "사이트 이름을 입력해주세요")
    .max(50, "50자 이하로 입력해주세요")
    .regex(siteNameRegex, "영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().optional(),
  htmlContent: z.string().min(1, "HTML 내용을 입력해주세요")
});

export default function CreateSite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { name: "", title: "", description: "", htmlContent: "" }
  });

  const nameValue = form.watch("name");
  const debouncedName = useDebounce(nameValue, 400);

  const { data: nameCheck, isLoading: isCheckingName } = useCheckSiteName(debouncedName, {
    query: {
      enabled: debouncedName.length > 0 && siteNameRegex.test(debouncedName),
      queryKey: getCheckSiteNameQueryKey(debouncedName)
    }
  });

  const createSite = useCreateSite();

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (nameCheck && !nameCheck.available) {
      form.setError("name", { message: "이미 사용 중인 이름입니다" });
      return;
    }

    createSite.mutate({ data: values }, {
      onSuccess: (site) => {
        toast({ title: "사이트가 성공적으로 배포되었습니다!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error) => {
        toast({
          title: "배포 실패",
          description: error.error || "알 수 없는 오류가 발생했습니다",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">새 사이트 만들기</h1>
          <p className="text-muted-foreground text-lg">HTML을 업로드하면 즉시 고유 링크로 접속 가능합니다.</p>
        </div>

        <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            className={`pl-8 font-mono ${nameCheck?.available === true ? 'border-green-500 focus-visible:ring-green-500' : ''} ${nameCheck?.available === false ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            data-testid="input-site-name"
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
                        {nameCheck?.available === false && (
                          <span className="text-destructive font-medium ml-1">이미 사용 중인 이름입니다.</span>
                        )}
                        {nameCheck?.available === true && (
                          <span className="text-green-600 font-medium ml-1 dark:text-green-400">사용 가능한 이름입니다!</span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>제목</FormLabel>
                      <FormControl>
                        <Input placeholder="내 멋진 사이트" {...field} data-testid="input-site-title" />
                      </FormControl>
                      <FormDescription>브라우저 탭에 표시됩니다.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명 (선택)</FormLabel>
                    <FormControl>
                      <Input placeholder="사이트에 대한 간단한 설명" {...field} data-testid="input-site-desc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="htmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML 내용</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={"<!DOCTYPE html>\n<html>\n  <body>\n    <h1>안녕하세요!</h1>\n  </body>\n</html>"}
                        className="font-mono h-[320px] bg-muted/50 border-input"
                        {...field}
                        data-testid="input-site-html"
                      />
                    </FormControl>
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
                    <>
                      <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                      배포 중...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 mr-2" />
                      사이트 배포
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
