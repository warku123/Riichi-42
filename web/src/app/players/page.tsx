"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

export default function PlayersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  if (!mounted || !isAuthenticated()) {
    return null;
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backButton}>
          ← 返回首页
        </Link>
        <h1 className={styles.title}>用户管理</h1>
      </header>

      <div className={styles.content}>
        <p className={styles.placeholder}>用户管理功能开发中...</p>
      </div>
    </main>
  );
}

