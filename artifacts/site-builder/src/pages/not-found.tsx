import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Layout>
      <div className="min-h-[60vh] w-full flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="w-full max-w-md border-border/50 shadow-md">
          <CardContent className="pt-6 pb-8 text-center flex flex-col items-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-6">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight mb-3 text-foreground">404 - 페이지 없음</h1>
            
            <p className="text-muted-foreground mb-8 max-w-[280px]">
              찾으시는 페이지가 존재하지 않거나 삭제되었습니다.
            </p>
            
            <Link href="/">
              <Button size="lg" className="shadow-sm w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
