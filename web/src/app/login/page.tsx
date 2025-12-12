"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 如果已登录，重定向到主页
    if (isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        router.push("/");
      } else {
        setError("用户名或密码错误");
        setLoading(false);
      }
    } catch (err) {
      setError("登录失败，请重试");
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Riichi 记分系统</h1>
        <p className={styles.subtitle}>请登录以继续</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.button}
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </main>
  );
}

