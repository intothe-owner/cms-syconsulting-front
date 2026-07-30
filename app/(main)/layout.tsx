// src/app/(main)/layout.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import ClientLayoutWrapper from "./ClientLayoutWrapper";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings`, { cache: "no-store" });
    const json = await res.json();
    if (json.success && json.data) {
      return {
        title: json.data.siteName,
        description: json.data.metaDescription,
        keywords: json.data.metaKeywords,
        icons: { icon: json.data.faviconUrl || "/favicon.ico" },
      };
    }
  } catch (e) {}
  return { title: "기본 사이트명" };
}
export const dynamic = 'force-dynamic';
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  
  // 💡 1. 최고관리자 존재 여부 확인 (경로 검사 없이 무조건 체크)
  let hasAdmin = true;
  try {
    const adminCheckRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/check-admin`, { 
      cache: "no-store" 
    });
    const adminCheckJson = await adminCheckRes.json();
    if (adminCheckJson.success) {
      hasAdmin = adminCheckJson.hasAdmin;
    }
  } catch (error) {
    console.error("관리자 확인 통신 실패:", error);
  }

  // 💡 2. 관리자가 없으면 /setup 으로 강제 이동
  // 이제 /setup 페이지는 (main) 바깥에 있으므로 layout.tsx를 타지 않아 무한루프가 발생하지 않습니다.
  if (!hasAdmin) {
    redirect("/setup");
  }

  // --- 3. 이후 기존 데이터 페칭 로직 정상 실행 ---
  const [settingsRes, menusRes, memberSettingsRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/settings`, { cache: "no-store" }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/menus`, { cache: "no-store" }),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/member-settings`, { cache: "no-store" }),
  ]);

  const settingsJson = await settingsRes.json();
  const menusJson = await menusRes.json();
  const memberSettingsJson = await memberSettingsRes.json();

  const settings = settingsJson.success ? settingsJson.data : null;
  const flatMenus = menusJson.success ? menusJson.data : [];
  const memberSettings = memberSettingsJson.success ? memberSettingsJson.data : null;

  const buildMenuTree = (flat: any[]) => {
    const map: Record<number, any> = {};
    const roots: any[] = [];
    flat.forEach(m => { map[m.id] = { ...m, children: [] }; });
    flat.forEach(m => {
      if (m.parentId && map[m.parentId]) map[m.parentId].children.push(map[m.id]);
      else roots.push(map[m.id]);
    });
    return roots;
  };

  return (
    <ClientLayoutWrapper settings={settings} menus={buildMenuTree(flatMenus)} memberSettings={memberSettings} hasSlider={false}>
      {children}
    </ClientLayoutWrapper>
  );
}