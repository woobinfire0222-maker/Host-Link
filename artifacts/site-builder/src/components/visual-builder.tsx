import { useState, useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import {
  ChevronUp, ChevronDown, Trash2, Plus, Eye, Pencil,
  GripVertical, LayoutTemplate, Type, Columns3, Megaphone,
  Mail, Footprints, Navigation, Image as ImageIcon, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type BlockType = "navbar" | "hero" | "features" | "text" | "cta" | "image" | "contact" | "footer";

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, string>;
}

interface BlockMeta {
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  defaults: Record<string, string>;
  fields: Array<{ key: string; label: string; type: "text" | "textarea" | "select" | "url"; options?: string[]; placeholder?: string }>;
}

const BLOCK_META: Record<BlockType, BlockMeta> = {
  navbar: {
    label: "네비게이션",
    icon: <Navigation className="w-4 h-4" />,
    description: "상단 메뉴바",
    color: "bg-slate-500",
    defaults: { logo: "MySite", links: "홈, 소개, 서비스, 연락" },
    fields: [
      { key: "logo", label: "로고 텍스트", type: "text", placeholder: "MySite" },
      { key: "links", label: "메뉴 항목 (쉼표 구분)", type: "text", placeholder: "홈, 소개, 서비스, 연락" },
      { key: "bgColor", label: "배경색", type: "select", options: ["흰색", "어두운색", "파란색", "보라색"] },
    ],
  },
  hero: {
    label: "히어로",
    icon: <LayoutTemplate className="w-4 h-4" />,
    description: "대형 헤더 섹션",
    color: "bg-indigo-500",
    defaults: { heading: "멋진 제목을 입력하세요", subtext: "서비스나 제품을 소개하는 한 줄 설명을 입력하세요.", buttonText: "시작하기", buttonUrl: "#", theme: "파란색" },
    fields: [
      { key: "heading", label: "메인 제목", type: "text", placeholder: "멋진 제목을 입력하세요" },
      { key: "subtext", label: "부제목", type: "textarea", placeholder: "서비스나 제품을 소개하는 설명" },
      { key: "buttonText", label: "버튼 텍스트", type: "text", placeholder: "시작하기" },
      { key: "buttonUrl", label: "버튼 링크", type: "url", placeholder: "#" },
      { key: "theme", label: "색상 테마", type: "select", options: ["파란색", "보라색", "녹색", "어두운색", "밝은색"] },
    ],
  },
  features: {
    label: "피처 섹션",
    icon: <Columns3 className="w-4 h-4" />,
    description: "3열 기능 소개",
    color: "bg-cyan-500",
    defaults: {
      heading: "주요 기능",
      f1icon: "🚀", f1title: "빠른 속도", f1desc: "최적화된 성능으로 빠르게 동작합니다.",
      f2icon: "🔒", f2title: "보안", f2desc: "최신 보안 기술로 데이터를 보호합니다.",
      f3icon: "💡", f3title: "사용 편의", f3desc: "직관적인 인터페이스로 누구나 쉽게 사용합니다.",
    },
    fields: [
      { key: "heading", label: "섹션 제목", type: "text", placeholder: "주요 기능" },
      { key: "f1icon", label: "기능1 이모지", type: "text", placeholder: "🚀" },
      { key: "f1title", label: "기능1 제목", type: "text", placeholder: "빠른 속도" },
      { key: "f1desc", label: "기능1 설명", type: "textarea", placeholder: "설명을 입력하세요" },
      { key: "f2icon", label: "기능2 이모지", type: "text", placeholder: "🔒" },
      { key: "f2title", label: "기능2 제목", type: "text", placeholder: "보안" },
      { key: "f2desc", label: "기능2 설명", type: "textarea", placeholder: "설명을 입력하세요" },
      { key: "f3icon", label: "기능3 이모지", type: "text", placeholder: "💡" },
      { key: "f3title", label: "기능3 제목", type: "text", placeholder: "사용 편의" },
      { key: "f3desc", label: "기능3 설명", type: "textarea", placeholder: "설명을 입력하세요" },
    ],
  },
  text: {
    label: "텍스트 섹션",
    icon: <Type className="w-4 h-4" />,
    description: "제목 + 본문 텍스트",
    color: "bg-green-500",
    defaults: { heading: "섹션 제목", content: "여기에 본문 내용을 입력하세요. 서비스, 소개, 설명 등 다양한 내용을 담을 수 있습니다.", align: "가운데" },
    fields: [
      { key: "heading", label: "제목", type: "text", placeholder: "섹션 제목" },
      { key: "content", label: "본문 내용", type: "textarea", placeholder: "내용을 입력하세요" },
      { key: "align", label: "정렬", type: "select", options: ["가운데", "왼쪽", "오른쪽"] },
    ],
  },
  cta: {
    label: "CTA 섹션",
    icon: <Megaphone className="w-4 h-4" />,
    description: "행동 유도 배너",
    color: "bg-orange-500",
    defaults: { heading: "지금 시작해보세요", subtext: "무료로 체험해보세요. 언제든지 취소 가능합니다.", buttonText: "무료 시작", buttonUrl: "#", bg: "파란색" },
    fields: [
      { key: "heading", label: "제목", type: "text", placeholder: "지금 시작해보세요" },
      { key: "subtext", label: "설명", type: "text", placeholder: "부제목을 입력하세요" },
      { key: "buttonText", label: "버튼 텍스트", type: "text", placeholder: "무료 시작" },
      { key: "buttonUrl", label: "버튼 링크", type: "url", placeholder: "#" },
      { key: "bg", label: "배경색", type: "select", options: ["파란색", "보라색", "어두운색", "녹색"] },
    ],
  },
  image: {
    label: "이미지 섹션",
    icon: <ImageIcon className="w-4 h-4" />,
    description: "이미지 + 캡션",
    color: "bg-pink-500",
    defaults: { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80", alt: "이미지", caption: "", layout: "전체 너비" },
    fields: [
      { key: "src", label: "이미지 URL", type: "url", placeholder: "https://..." },
      { key: "alt", label: "이미지 설명 (alt)", type: "text", placeholder: "이미지 설명" },
      { key: "caption", label: "캡션 (선택)", type: "text", placeholder: "이미지 아래 캡션" },
      { key: "layout", label: "레이아웃", type: "select", options: ["전체 너비", "가운데 정렬", "좌우 분할"] },
    ],
  },
  contact: {
    label: "연락처",
    icon: <Mail className="w-4 h-4" />,
    description: "연락처 + 폼",
    color: "bg-teal-500",
    defaults: { heading: "연락하기", email: "contact@example.com", phone: "", showForm: "예" },
    fields: [
      { key: "heading", label: "섹션 제목", type: "text", placeholder: "연락하기" },
      { key: "email", label: "이메일", type: "text", placeholder: "contact@example.com" },
      { key: "phone", label: "전화번호 (선택)", type: "text", placeholder: "010-0000-0000" },
      { key: "showForm", label: "문의 폼 표시", type: "select", options: ["예", "아니오"] },
    ],
  },
  footer: {
    label: "푸터",
    icon: <Footprints className="w-4 h-4" />,
    description: "하단 푸터",
    color: "bg-gray-600",
    defaults: { company: "MySite", links: "이용약관, 개인정보처리방침", year: new Date().getFullYear().toString() },
    fields: [
      { key: "company", label: "회사/사이트명", type: "text", placeholder: "MySite" },
      { key: "links", label: "링크 (쉼표 구분)", type: "text", placeholder: "이용약관, 개인정보처리방침" },
      { key: "year", label: "연도", type: "text", placeholder: "2025" },
    ],
  },
};

function renderBlock(block: Block): string {
  const d = block.data;
  switch (block.type) {
    case "navbar": {
      const isDark = d.bgColor === "어두운색";
      const isBlue = d.bgColor === "파란색";
      const isPurple = d.bgColor === "보라색";
      const bg = isDark ? "bg-gray-900 text-white" : isBlue ? "bg-blue-600 text-white" : isPurple ? "bg-purple-600 text-white" : "bg-white text-gray-900 border-b border-gray-200";
      const links = (d.links || "").split(",").map(l => l.trim()).filter(Boolean);
      return `<nav class="${bg} shadow-sm"><div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between"><div class="text-xl font-bold">${d.logo || "MySite"}</div><div class="hidden md:flex gap-6">${links.map(l => `<a href="#" class="hover:opacity-75 transition-opacity text-sm font-medium">${l}</a>`).join("")}</div></div></nav>`;
    }
    case "hero": {
      const themes: Record<string, string> = {
        "파란색": "bg-gradient-to-br from-blue-600 to-blue-800 text-white",
        "보라색": "bg-gradient-to-br from-purple-600 to-indigo-800 text-white",
        "녹색": "bg-gradient-to-br from-emerald-500 to-teal-700 text-white",
        "어두운색": "bg-gradient-to-br from-gray-900 to-gray-700 text-white",
        "밝은색": "bg-gray-50 text-gray-900",
      };
      const btnThemes: Record<string, string> = {
        "파란색": "bg-white text-blue-700 hover:bg-blue-50",
        "보라색": "bg-white text-purple-700 hover:bg-purple-50",
        "녹색": "bg-white text-emerald-700 hover:bg-emerald-50",
        "어두운색": "bg-white text-gray-900 hover:bg-gray-100",
        "밝은색": "bg-blue-600 text-white hover:bg-blue-700",
      };
      const theme = themes[d.theme || "파란색"] || themes["파란색"];
      const btn = btnThemes[d.theme || "파란색"] || btnThemes["파란색"];
      return `<section class="${theme} py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h1 class="text-5xl font-extrabold mb-6 leading-tight">${d.heading || "제목"}</h1><p class="text-xl mb-10 opacity-90 max-w-2xl mx-auto">${d.subtext || ""}</p>${d.buttonText ? `<a href="${d.buttonUrl || "#"}" class="${btn} font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg inline-block">${d.buttonText}</a>` : ""}</div></section>`;
    }
    case "features": {
      const features = [
        { icon: d.f1icon, title: d.f1title, desc: d.f1desc },
        { icon: d.f2icon, title: d.f2title, desc: d.f2desc },
        { icon: d.f3icon, title: d.f3title, desc: d.f3desc },
      ];
      return `<section class="py-20 px-6 bg-white"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center text-gray-900 mb-14">${d.heading || "주요 기능"}</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-8">${features.map(f => `<div class="text-center p-8 rounded-2xl bg-gray-50 hover:shadow-lg transition-shadow"><div class="text-5xl mb-4">${f.icon || "✨"}</div><h3 class="text-xl font-semibold text-gray-900 mb-3">${f.title || ""}</h3><p class="text-gray-600 leading-relaxed">${f.desc || ""}</p></div>`).join("")}</div></div></section>`;
    }
    case "text": {
      const alignClass = d.align === "왼쪽" ? "text-left" : d.align === "오른쪽" ? "text-right" : "text-center";
      return `<section class="py-16 px-6 bg-white"><div class="max-w-3xl mx-auto ${alignClass}"><h2 class="text-3xl font-bold text-gray-900 mb-6">${d.heading || ""}</h2><p class="text-lg text-gray-600 leading-relaxed whitespace-pre-line">${d.content || ""}</p></div></section>`;
    }
    case "cta": {
      const bgs: Record<string, string> = {
        "파란색": "bg-blue-600 text-white",
        "보라색": "bg-purple-600 text-white",
        "어두운색": "bg-gray-900 text-white",
        "녹색": "bg-emerald-600 text-white",
      };
      const bg = bgs[d.bg || "파란색"] || bgs["파란색"];
      return `<section class="${bg} py-20 px-6"><div class="max-w-3xl mx-auto text-center"><h2 class="text-4xl font-bold mb-4">${d.heading || ""}</h2><p class="text-xl opacity-90 mb-8">${d.subtext || ""}</p>${d.buttonText ? `<a href="${d.buttonUrl || "#"}" class="bg-white text-gray-900 font-semibold px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition-colors shadow-lg inline-block">${d.buttonText}</a>` : ""}</div></section>`;
    }
    case "image": {
      if (d.layout === "좌우 분할") {
        return `<section class="py-16 px-6 bg-white"><div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center"><img src="${d.src}" alt="${d.alt || ""}" class="rounded-2xl shadow-xl w-full object-cover"/><div><p class="text-xl text-gray-600 leading-relaxed">${d.caption || d.alt || ""}</p></div></div></section>`;
      }
      const isCenter = d.layout === "가운데 정렬";
      return `<section class="py-8 px-6 bg-white"><div class="${isCenter ? "max-w-3xl mx-auto text-center" : "w-full"}"><img src="${d.src}" alt="${d.alt || ""}" class="rounded-2xl shadow-xl w-full object-cover"/>${d.caption ? `<p class="text-sm text-gray-500 mt-3 text-center">${d.caption}</p>` : ""}</div></section>`;
    }
    case "contact": {
      const formHtml = d.showForm === "예" ? `<form class="space-y-4 mt-6" onsubmit="return false"><input type="text" placeholder="이름" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/><input type="email" placeholder="이메일" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"/><textarea placeholder="메시지" rows="4" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea><button type="submit" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">메시지 전송</button></form>` : "";
      return `<section class="py-20 px-6 bg-gray-50"><div class="max-w-2xl mx-auto"><h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">${d.heading || "연락하기"}</h2><div class="space-y-3 text-center">${d.email ? `<p class="text-gray-600">✉️ <a href="mailto:${d.email}" class="text-blue-600 hover:underline">${d.email}</a></p>` : ""}${d.phone ? `<p class="text-gray-600">📞 ${d.phone}</p>` : ""}</div>${formHtml}</div></section>`;
    }
    case "footer": {
      const links = (d.links || "").split(",").map(l => l.trim()).filter(Boolean);
      return `<footer class="bg-gray-900 text-gray-400 py-12 px-6"><div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"><p class="text-white font-semibold">${d.company || "MySite"}</p><div class="flex gap-6">${links.map(l => `<a href="#" class="hover:text-white transition-colors text-sm">${l}</a>`).join("")}</div><p class="text-sm">© ${d.year || new Date().getFullYear()} ${d.company || "MySite"}. All rights reserved.</p></div></footer>`;
    }
    default:
      return "";
  }
}

export function generateHtmlFromBlocks(blocks: Block[], title: string): string {
  const bodyContent = blocks.map(renderBlock).join("\n");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title || "My Site"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>*{box-sizing:border-box;}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

const BLOCK_ORDER: BlockType[] = ["navbar", "hero", "features", "text", "cta", "image", "contact", "footer"];

interface BlockCardProps {
  block: Block;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (key: string, value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function BlockCard({ block, index, total, isExpanded, onToggle, onUpdate, onMoveUp, onMoveDown, onDelete }: BlockCardProps) {
  const meta = BLOCK_META[block.type];

  return (
    <div className={cn("border rounded-xl overflow-hidden transition-all", isExpanded ? "border-primary shadow-sm" : "border-border")}>
      <div
        className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer select-none", isExpanded ? "bg-primary/5" : "bg-card hover:bg-muted/50")}
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-xs", meta.color)}>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">{meta.label}</span>
          <span className="text-xs text-muted-foreground ml-2">
            {block.data[Object.keys(block.data)[0]]?.slice(0, 30) || ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0}>
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1}>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-card border-t border-border space-y-4">
          {meta.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  className="text-sm h-20 resize-none"
                  placeholder={field.placeholder}
                  value={block.data[field.key] ?? ""}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                />
              ) : field.type === "select" ? (
                <Select value={block.data[field.key] ?? field.options?.[0] ?? ""} onValueChange={(v) => onUpdate(field.key, v)}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="text-sm h-9"
                  placeholder={field.placeholder}
                  value={block.data[field.key] ?? ""}
                  onChange={(e) => onUpdate(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface VisualBuilderProps {
  title: string;
  onHtmlChange: (html: string) => void;
}

export function VisualBuilder({ title, onHtmlChange }: VisualBuilderProps) {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: nanoid(), type: "navbar", data: { ...BLOCK_META.navbar.defaults } },
    { id: nanoid(), type: "hero", data: { ...BLOCK_META.hero.defaults } },
  ]);
  const [expandedId, setExpandedId] = useState<string | null>(blocks[0]?.id ?? null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getHtml = useCallback(() => generateHtmlFromBlocks(blocks, title), [blocks, title]);

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = getHtml();
    }
    onHtmlChange(getHtml());
  }, [getHtml, onHtmlChange]);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = { id: nanoid(), type, data: { ...BLOCK_META[type].defaults } };
    setBlocks((prev) => [...prev, newBlock]);
    setExpandedId(newBlock.id);
    onHtmlChange(generateHtmlFromBlocks([...blocks, newBlock], title));
  };

  const updateBlock = (id: string, key: string, value: string) => {
    setBlocks((prev) => {
      const updated = prev.map((b) => b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b);
      onHtmlChange(generateHtmlFromBlocks(updated, title));
      return updated;
    });
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const arr = [...prev];
      const swapIdx = index + dir;
      if (swapIdx < 0 || swapIdx >= arr.length) return arr;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      onHtmlChange(generateHtmlFromBlocks(arr, title));
      return arr;
    });
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      onHtmlChange(generateHtmlFromBlocks(updated, title));
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border rounded-lg p-1 w-fit">
        <Button
          variant={mode === "edit" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setMode("edit")}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          편집
        </Button>
        <Button
          variant={mode === "preview" ? "default" : "ghost"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => { setMode("preview"); setTimeout(refreshPreview, 50); }}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          미리보기
        </Button>
        {mode === "preview" && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={refreshPreview}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            새로고침
          </Button>
        )}
      </div>

      {mode === "edit" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">블록 추가</p>
            {BLOCK_ORDER.map((type) => {
              const meta = BLOCK_META[type];
              return (
                <button
                  key={type}
                  onClick={() => addBlock(type)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/60 hover:border-primary/40 transition-all text-left group"
                >
                  <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0", meta.color)}>
                    {meta.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>

          <div className="space-y-2 min-h-[200px]">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              현재 블록 {blocks.length > 0 ? `(${blocks.length}개)` : ""}
            </p>
            {blocks.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
                <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">왼쪽에서 블록을 추가해보세요</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  index={index}
                  total={blocks.length}
                  isExpanded={expandedId === block.id}
                  onToggle={() => setExpandedId(expandedId === block.id ? null : block.id)}
                  onUpdate={(key, value) => updateBlock(block.id, key, value)}
                  onMoveUp={() => moveBlock(index, -1)}
                  onMoveDown={() => moveBlock(index, 1)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-muted/30">
          <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 flex-1 text-center font-mono">{title ? `/s/${title}` : "미리보기"}</span>
          </div>
          <iframe
            ref={iframeRef}
            className="w-full h-[500px] border-0"
            title="미리보기"
            sandbox="allow-scripts"
            srcDoc={getHtml()}
          />
        </div>
      )}
    </div>
  );
}
