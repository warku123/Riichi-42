"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

interface Player {
  id: number;
  name: string;
}

export default function PlayersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadPlayers();
  }, [router]);

  const loadPlayers = async () => {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (data.data) {
        setPlayers(data.data);
      } else if (data.error) {
        setMessage(`加载失败：${data.error}`);
      }
    } catch (err) {
      setMessage("加载用户失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage("用户名不能为空");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "添加失败");
      } else {
        setName("");
        await loadPlayers();
      }
    } catch (err) {
      setMessage("添加失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, username: string) => {
    const confirmed = window.confirm(`确认删除用户 ${username} 吗？`);
    if (!confirmed) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/players", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "删除失败，可能存在关联对局记录");
      } else {
        await loadPlayers();
      }
    } catch (err) {
      setMessage("删除失败");
    } finally {
      setSubmitting(false);
    }
  };

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
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>添加用户</h2>
          <form className={styles.form} onSubmit={handleAdd}>
            <input
              type="text"
              placeholder="输入用户名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting}>
              {submitting ? "处理中..." : "添加"}
            </button>
          </form>
          {message && <div className={styles.message}>{message}</div>}
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>用户列表</h2>
          {loading ? (
            <div className={styles.placeholder}>加载中...</div>
          ) : players.length === 0 ? (
            <div className={styles.placeholder}>暂无用户</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={submitting}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}

