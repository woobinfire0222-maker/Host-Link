import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, UploadCloud, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCreateSite, useGenerateSite, useCheckSiteName, getCheckSiteNameQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Layout } from "@/components/layout";
import { useDebounce } from "@/lib/use-debounce";
import { useToast } from "@/hooks/use-toast";

const siteNameRegex = /^[a-z0-9-]+$/;

const uploadSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters")
    .regex(siteNameRegex, "Only lowercase letters, numbers, and hyphens allowed"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  htmlContent: z.string().min(1, "HTML content is required")
});

const generateSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters")
    .regex(siteNameRegex, "Only lowercase letters, numbers, and hyphens allowed"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Please provide more details for AI generation (at least 10 chars)")
});

export default function CreateSite() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"upload" | "generate">("upload");
  
  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { name: "", title: "", description: "", htmlContent: "" }
  });

  const generateForm = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { name: "", title: "", description: "" }
  });

  const currentFormName = activeTab === "upload" ? uploadForm.watch("name") : generateForm.watch("name");
  const debouncedName = useDebounce(currentFormName, 400);

  const { data: nameCheck, isLoading: isCheckingName } = useCheckSiteName(debouncedName, {
    query: {
      enabled: debouncedName.length > 0 && siteNameRegex.test(debouncedName),
      queryKey: getCheckSiteNameQueryKey(debouncedName)
    }
  });

  const createSite = useCreateSite();
  const generateSite = useGenerateSite();

  const onUploadSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (nameCheck && !nameCheck.available) {
      uploadForm.setError("name", { message: "Name is already taken" });
      return;
    }
    
    createSite.mutate({ data: values }, {
      onSuccess: (site) => {
        toast({ title: "Site published successfully!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to publish",
          description: error.error || "An unknown error occurred",
          variant: "destructive"
        });
      }
    });
  };

  const onGenerateSubmit = async (values: z.infer<typeof generateSchema>) => {
    if (nameCheck && !nameCheck.available) {
      generateForm.setError("name", { message: "Name is already taken" });
      return;
    }

    generateSite.mutate({ data: values }, {
      onSuccess: (site) => {
        toast({ title: "Site generated successfully!" });
        setLocation(`/sites/${site.name}`);
      },
      onError: (error) => {
        toast({
          title: "Generation failed",
          description: error.error || "An unknown error occurred",
          variant: "destructive"
        });
      }
    });
  };

  const renderNameField = (form: any) => (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>URL Slug</FormLabel>
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
            Only lowercase letters, numbers, and hyphens.
            {nameCheck?.available === false && (
              <span className="text-destructive font-medium ml-1">This name is unavailable.</span>
            )}
            {nameCheck?.available === true && (
              <span className="text-green-600 font-medium ml-1 dark:text-green-400">Name is available!</span>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Create New Site</h1>
          <p className="text-muted-foreground text-lg">Upload your own HTML or let AI build it for you.</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-14 mb-8">
            <TabsTrigger value="upload" className="text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md" data-testid="tab-upload">
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload HTML
            </TabsTrigger>
            <TabsTrigger value="generate" className="text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md" data-testid="tab-generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </TabsTrigger>
          </TabsList>

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
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="My Awesome Site" {...field} data-testid="input-site-title" />
                          </FormControl>
                          <FormDescription>Displayed in browser tab.</FormDescription>
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
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="A brief description for internal tracking" {...field} data-testid="input-site-desc" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={uploadForm.control}
                    name="htmlContent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="<!DOCTYPE html>&#10;<html>&#10;  <body>&#10;    <h1>Hello World</h1>&#10;  </body>&#10;</html>" 
                            className="font-mono h-[300px] bg-muted/50 border-input"
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
                      disabled={createSite.isPending || (nameCheck && !nameCheck.available)}
                      data-testid="button-submit-upload"
                    >
                      {createSite.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4 mr-2" />
                          Publish Site
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="mt-0 outline-none">
            <div className="bg-card border rounded-xl shadow-sm p-6 md:p-8">
              <Form {...generateForm}>
                <form onSubmit={generateForm.handleSubmit(onGenerateSubmit)} className="space-y-6">
                  
                  <Alert className="bg-primary/5 border-primary/20 text-primary-foreground mb-6">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <AlertTitle className="text-foreground font-semibold">AI Powered</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                      Describe what you want, and we'll generate a single-page HTML layout with Tailwind CSS.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderNameField(generateForm)}
                    
                    <FormField
                      control={generateForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Yuna's Portfolio" {...field} data-testid="input-site-title-ai" />
                          </FormControl>
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
                        <FormLabel>Prompt</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A clean, minimalist portfolio for a photographer named Yuna. Include a hero section with a headline, a grid of placeholder images, and a contact footer. Use dark mode and elegant typography." 
                            className="h-[200px] resize-y text-base"
                            {...field} 
                            data-testid="input-site-prompt"
                          />
                        </FormControl>
                        <FormDescription>Be as descriptive as possible for best results.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t flex justify-end">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full sm:w-auto overflow-hidden relative group" 
                      disabled={generateSite.isPending || (nameCheck && !nameCheck.available)}
                      data-testid="button-submit-generate"
                    >
                      {generateSite.isPending ? (
                        <>
                          <div className="w-4 h-4 mr-2 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                          Generating... (This may take a minute)
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-10" />
                          <Sparkles className="w-4 h-4 mr-2 z-20 relative" />
                          <span className="z-20 relative">Generate & Publish</span>
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
