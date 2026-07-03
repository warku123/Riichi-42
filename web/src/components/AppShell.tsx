"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUsername, logout } from "@/lib/auth";
import styles from "./AppShell.module.css";

const navItems = [
  { href: "/", label: "天梯榜", icon: "leaderboard" },
  { href: "/overview", label: "总览", icon: "dashboard" },
  { href: "/matches", label: "对局管理", icon: "casino" },
  { href: "/players", label: "玩家管理", icon: "group" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const username = getUsername() ?? "";
  const initial = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <div className={styles.shell}>
      {/* 桌面侧边栏 */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={`material-symbols-outlined ${styles.brandIcon}`}>
            style
          </span>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Riichi</span>
            <span className={styles.brandSub}>记分系统</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <span
                  className={`material-symbols-outlined ${active ? "fill" : ""}`}
                >
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/matches" className={styles.cta}>
            <span className="material-symbols-outlined">add</span>
            新建对局
          </Link>

          <div className={styles.userBlock}>
            <span className={styles.userAvatar}>{initial}</span>
            <span className={styles.userName}>{username || "未登录"}</span>
            <button
              onClick={handleLogout}
              className={styles.iconBtn}
              aria-label="退出登录"
              type="button"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 移动顶栏 */}
      <header className={styles.mobileTop}>
        <div className={styles.mobileBrand}>
          <span className={`material-symbols-outlined ${styles.brandIcon}`}>
            style
          </span>
          <span>Riichi 记分</span>
        </div>
        <button
          onClick={handleLogout}
          className={styles.iconBtn}
          aria-label="退出登录"
          type="button"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      {/* 主内容 */}
      <main className={styles.main}>{children}</main>

      {/* 移动底栏 */}
      <nav className={styles.bottomNav}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.bottomItem} ${active ? styles.bottomActive : ""}`}
            >
              <span
                className={`material-symbols-outlined ${active ? "fill" : ""}`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
