type SiteType = "portfolio" | "landing" | "blog" | "restaurant" | "shop" | "company" | "personal" | "default";

function detectType(text: string): SiteType {
  const t = text.toLowerCase();
  if (/포트폴리오|portfolio|작품|개발자|디자이너|photographer|사진작가/.test(t)) return "portfolio";
  if (/랜딩|landing|서비스|product|제품|소개/.test(t)) return "landing";
  if (/블로그|blog|글|기사|article|뉴스|news/.test(t)) return "blog";
  if (/음식|식당|레스토랑|카페|restaurant|cafe|menu|메뉴/.test(t)) return "restaurant";
  if (/쇼핑|shop|store|상품|판매|buy|구매/.test(t)) return "shop";
  if (/회사|company|기업|비즈니스|business|팀|team/.test(t)) return "company";
  if (/개인|personal|소개|about me|자기소개/.test(t)) return "personal";
  return "default";
}

function pickColors(type: SiteType): { primary: string; accent: string; bg: string; text: string } {
  const palettes: Record<SiteType, { primary: string; accent: string; bg: string; text: string }> = {
    portfolio:  { primary: "#0f172a", accent: "#6366f1", bg: "#f8fafc",  text: "#1e293b" },
    landing:    { primary: "#1d4ed8", accent: "#f59e0b", bg: "#ffffff",  text: "#111827" },
    blog:       { primary: "#18181b", accent: "#10b981", bg: "#fafafa",  text: "#27272a" },
    restaurant: { primary: "#7f1d1d", accent: "#d97706", bg: "#fffbeb",  text: "#1c1917" },
    shop:       { primary: "#1e3a5f", accent: "#f43f5e", bg: "#f9fafb",  text: "#111827" },
    company:    { primary: "#0c4a6e", accent: "#0ea5e9", bg: "#f0f9ff",  text: "#0c4a6e" },
    personal:   { primary: "#4c1d95", accent: "#ec4899", bg: "#fdf4ff",  text: "#3b0764" },
    default:    { primary: "#111827", accent: "#3b82f6", bg: "#ffffff",  text: "#111827" },
  };
  return palettes[type];
}

export function generateSiteHtml(title: string, description: string): string {
  const type = detectType(description + " " + title);
  const colors = pickColors(type);

  const sections = buildSections(type, title, description, colors);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --color-primary: ${colors.primary};
      --color-accent: ${colors.accent};
    }
    html { scroll-behavior: smooth; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: ${colors.bg}; color: ${colors.text}; }
    .gradient-text {
      background: linear-gradient(135deg, ${colors.primary}, ${colors.accent});
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .btn-primary {
      display: inline-block;
      background: ${colors.accent};
      color: #fff;
      padding: 0.75rem 2rem;
      border-radius: 9999px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn-primary:hover { opacity: 0.85; }
    .card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
      padding: 2rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
    .nav-link { transition: color 0.2s; }
    .nav-link:hover { color: ${colors.accent}; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up { animation: fadeUp 0.6s ease both; }
    .fade-up-delay { animation: fadeUp 0.6s ease 0.2s both; }
    .fade-up-delay2 { animation: fadeUp 0.6s ease 0.4s both; }
  </style>
</head>
<body>
${sections}
</body>
</html>`;
}

function buildSections(type: SiteType, title: string, desc: string, colors: ReturnType<typeof pickColors>): string {
  const nav = buildNav(title, type, colors);
  const hero = buildHero(type, title, desc, colors);
  const middle = buildMiddle(type, desc, colors);
  const footer = buildFooter(title, colors);
  return [nav, hero, middle, footer].join("\n");
}

function buildNav(title: string, type: SiteType, colors: ReturnType<typeof pickColors>): string {
  const links: Record<SiteType, string[]> = {
    portfolio:  ["작품", "소개", "연락처"],
    landing:    ["서비스", "특징", "시작하기"],
    blog:       ["홈", "글 목록", "소개"],
    restaurant: ["메뉴", "위치", "예약"],
    shop:       ["상품", "이벤트", "문의"],
    company:    ["서비스", "팀", "연락처"],
    personal:   ["소개", "스킬", "연락처"],
    default:    ["소개", "서비스", "연락처"],
  };
  const navLinks = (links[type] || links.default)
    .map(l => `<a href="#" class="nav-link text-sm font-medium" style="color:${colors.text}">${l}</a>`)
    .join("");

  return `<nav style="background:${colors.primary}" class="sticky top-0 z-50 shadow-md">
  <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
    <span class="text-white font-bold text-lg tracking-tight">${escHtml(title)}</span>
    <div class="hidden md:flex items-center gap-6 text-white">
      ${(links[type] || links.default).map(l => `<a href="#" class="nav-link text-sm font-medium opacity-90 hover:opacity-100">${l}</a>`).join("")}
    </div>
    <a href="#contact" class="btn-primary text-sm py-2 px-5 hidden md:inline-block">시작하기</a>
  </div>
</nav>`;
}

function buildHero(type: SiteType, title: string, desc: string, colors: ReturnType<typeof pickColors>): string {
  const subtitles: Record<SiteType, string> = {
    portfolio:  "창의적인 작품들을 소개합니다",
    landing:    "더 나은 경험을 제공합니다",
    blog:       "생각과 이야기를 공유합니다",
    restaurant: "특별한 맛과 분위기를 경험하세요",
    shop:       "엄선된 제품을 만나보세요",
    company:    "함께 성장하는 파트너",
    personal:   "안녕하세요, 만나서 반갑습니다",
    default:    "새로운 경험을 시작하세요",
  };

  return `<section style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%);" class="relative overflow-hidden py-32 px-6">
  <div class="absolute inset-0 opacity-10">
    <div class="absolute top-20 left-20 w-72 h-72 rounded-full" style="background:white; filter:blur(80px);"></div>
    <div class="absolute bottom-10 right-20 w-96 h-96 rounded-full" style="background:white; filter:blur(100px);"></div>
  </div>
  <div class="relative max-w-4xl mx-auto text-center text-white">
    <div class="fade-up inline-block bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1 rounded-full mb-6">${subtitles[type]}</div>
    <h1 class="fade-up text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">${escHtml(title)}</h1>
    <p class="fade-up-delay text-xl md:text-2xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">${escHtml(desc)}</p>
    <div class="fade-up-delay2 flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#main" style="background:white; color:${colors.primary};" class="btn-primary font-bold">자세히 보기</a>
      <a href="#contact" class="inline-block border-2 border-white text-white py-3 px-8 rounded-full font-semibold hover:bg-white/10 transition-colors">연락하기</a>
    </div>
  </div>
</section>`;
}

function buildMiddle(type: SiteType, desc: string, colors: ReturnType<typeof pickColors>): string {
  if (type === "portfolio") return buildPortfolioMiddle(colors);
  if (type === "restaurant") return buildRestaurantMiddle(colors);
  if (type === "blog") return buildBlogMiddle(colors);
  if (type === "shop") return buildShopMiddle(colors);
  return buildDefaultMiddle(colors);
}

function buildDefaultMiddle(colors: ReturnType<typeof pickColors>): string {
  const features = [
    { icon: "⚡", title: "빠른 속도", desc: "최적화된 성능으로 빠른 로딩을 제공합니다." },
    { icon: "🔒", title: "안전한 보안", desc: "최신 보안 기술로 안전하게 보호합니다." },
    { icon: "📱", title: "반응형 디자인", desc: "모든 기기에서 완벽하게 동작합니다." },
    { icon: "🎨", title: "모던 디자인", desc: "세련되고 직관적인 인터페이스를 제공합니다." },
    { icon: "🌐", title: "글로벌 접근", desc: "전 세계 어디서나 접속 가능합니다." },
    { icon: "💬", title: "고객 지원", desc: "24시간 전문 고객 지원팀이 도와드립니다." },
  ];

  const cards = features.map(f => `
    <div class="card">
      <div class="text-4xl mb-4">${f.icon}</div>
      <h3 class="text-xl font-bold mb-2" style="color:${colors.primary}">${f.title}</h3>
      <p class="text-gray-500 text-sm leading-relaxed">${f.desc}</p>
    </div>`).join("");

  return `<section id="main" class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4 gradient-text">주요 특징</h2>
      <p class="text-gray-500 text-lg">저희가 제공하는 핵심 가치를 소개합니다</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${cards}</div>
  </div>
</section>
${buildContactSection(colors)}`;
}

function buildPortfolioMiddle(colors: ReturnType<typeof pickColors>): string {
  const items = ["프로젝트 A", "프로젝트 B", "프로젝트 C", "프로젝트 D", "프로젝트 E", "프로젝트 F"];
  const cards = items.map((name, i) => {
    const hues = [220, 280, 340, 170, 30, 60];
    return `<div class="card overflow-hidden p-0">
      <div class="h-48 flex items-center justify-center text-white text-2xl font-bold" style="background: linear-gradient(135deg, hsl(${hues[i]},70%,45%), hsl(${hues[i] + 40},70%,55%))">${name}</div>
      <div class="p-5">
        <h3 class="font-bold text-lg mb-1" style="color:${colors.primary}">${name}</h3>
        <p class="text-gray-400 text-sm">웹 디자인 · 개발</p>
      </div>
    </div>`;
  }).join("");

  return `<section id="main" class="py-20 px-6" style="background:${colors.bg}">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4 gradient-text">작품 갤러리</h2>
      <p class="text-gray-500">지금까지 완성한 프로젝트들을 소개합니다</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${cards}</div>
  </div>
</section>
${buildContactSection(colors)}`;
}

function buildRestaurantMiddle(colors: ReturnType<typeof pickColors>): string {
  const menu = [
    { name: "시그니처 파스타", desc: "신선한 재료로 만든 셰프 특선", price: "18,000원" },
    { name: "트러플 리조또", desc: "풍부한 트러플 향이 가득", price: "24,000원" },
    { name: "그릴드 스테이크", desc: "최상급 한우로 구운 스테이크", price: "45,000원" },
    { name: "시저 샐러드", desc: "신선한 채소와 특제 드레싱", price: "12,000원" },
    { name: "티라미수", desc: "정통 이탈리아 디저트", price: "9,000원" },
    { name: "셰프의 특선", desc: "매일 바뀌는 오늘의 요리", price: "문의" },
  ];
  const cards = menu.map(m => `
    <div class="card flex justify-between items-center">
      <div>
        <h3 class="font-bold text-lg" style="color:${colors.primary}">${m.name}</h3>
        <p class="text-gray-400 text-sm mt-1">${m.desc}</p>
      </div>
      <span class="font-bold text-lg ml-4 whitespace-nowrap" style="color:${colors.accent}">${m.price}</span>
    </div>`).join("");

  return `<section id="main" class="py-20 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4 gradient-text">메뉴</h2>
      <p class="text-gray-500">엄선된 식재료로 만든 특별한 요리들</p>
    </div>
    <div class="space-y-4">${cards}</div>
  </div>
</section>
${buildContactSection(colors)}`;
}

function buildBlogMiddle(colors: ReturnType<typeof pickColors>): string {
  const posts = [
    { title: "첫 번째 이야기", date: "2025년 1월", tag: "에세이" },
    { title: "생각의 흐름", date: "2025년 2월", tag: "일상" },
    { title: "새로운 시작", date: "2025년 3월", tag: "회고" },
  ];
  const cards = posts.map(p => `
    <div class="card cursor-pointer">
      <span class="text-xs font-semibold uppercase tracking-widest" style="color:${colors.accent}">${p.tag}</span>
      <h3 class="text-2xl font-bold mt-2 mb-3" style="color:${colors.primary}">${p.title}</h3>
      <p class="text-gray-400 text-sm mb-4">글을 클릭해 전체 내용을 읽어보세요. 다양한 이야기와 생각을 공유합니다.</p>
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-300">${p.date}</span>
        <span style="color:${colors.accent}" class="text-sm font-medium">읽기 →</span>
      </div>
    </div>`).join("");

  return `<section id="main" class="py-20 px-6">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4 gradient-text">최근 글</h2>
    </div>
    <div class="space-y-6">${cards}</div>
  </div>
</section>
${buildContactSection(colors)}`;
}

function buildShopMiddle(colors: ReturnType<typeof pickColors>): string {
  const products = [
    { name: "인기 상품 A", price: "29,000원", badge: "베스트" },
    { name: "신상품 B", price: "45,000원", badge: "NEW" },
    { name: "특가 상품 C", price: "15,000원", badge: "SALE" },
    { name: "프리미엄 D", price: "89,000원", badge: "추천" },
  ];
  const cards = products.map(p => `
    <div class="card p-0 overflow-hidden">
      <div class="relative h-52 flex items-center justify-center" style="background: linear-gradient(135deg, ${colors.primary}22, ${colors.accent}33)">
        <span class="text-6xl">🛍️</span>
        <span class="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full text-white" style="background:${colors.accent}">${p.badge}</span>
      </div>
      <div class="p-4">
        <h3 class="font-bold text-lg mb-1" style="color:${colors.primary}">${p.name}</h3>
        <div class="flex items-center justify-between mt-3">
          <span class="font-bold" style="color:${colors.accent}">${p.price}</span>
          <button class="text-sm px-4 py-1 rounded-full text-white font-medium" style="background:${colors.primary}">담기</button>
        </div>
      </div>
    </div>`).join("");

  return `<section id="main" class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4 gradient-text">인기 상품</h2>
      <p class="text-gray-500">엄선된 최고의 제품들을 만나보세요</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${cards}</div>
  </div>
</section>
${buildContactSection(colors)}`;
}

function buildContactSection(colors: ReturnType<typeof pickColors>): string {
  return `<section id="contact" style="background: linear-gradient(135deg, ${colors.primary}, ${colors.accent})" class="py-20 px-6 text-white">
  <div class="max-w-2xl mx-auto text-center">
    <h2 class="text-4xl font-extrabold mb-4">연락하기</h2>
    <p class="text-white/80 mb-10 text-lg">궁금한 점이 있으신가요? 언제든 연락주세요.</p>
    <form class="space-y-4" onsubmit="event.preventDefault(); alert('메시지가 전송되었습니다!')">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="이름" class="w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white placeholder-white/60 border border-white/30 focus:outline-none focus:border-white" />
        <input type="email" placeholder="이메일" class="w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white placeholder-white/60 border border-white/30 focus:outline-none focus:border-white" />
      </div>
      <textarea rows="4" placeholder="메시지를 입력해주세요..." class="w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white placeholder-white/60 border border-white/30 focus:outline-none focus:border-white resize-none"></textarea>
      <button type="submit" class="w-full py-3 rounded-xl font-bold text-lg transition-opacity hover:opacity-90" style="background:white; color:${colors.primary}">보내기</button>
    </form>
  </div>
</section>`;
}

function buildFooter(title: string, colors: ReturnType<typeof pickColors>): string {
  return `<footer style="background:${colors.primary}" class="py-8 px-6 text-center text-white/60 text-sm">
  <p>© ${new Date().getFullYear()} ${escHtml(title)}. All rights reserved.</p>
  <p class="mt-2 text-white/30 text-xs">Powered by SiteDrop</p>
</footer>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
