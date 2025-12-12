"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import styles from "./page.module.css";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("未测试");

  const handleTestConnection = useCallback(async () => {
    setLoading(true);
    setMessage("测试中...");
    const { data, error } = await supabase.from("scores").select("*").limit(1);
    if (error) {
      setMessage(`连接失败：${error.message}`);
    } else {
      setMessage(`连接成功，样例数据：${JSON.stringify(data)}`);
    }
    setLoading(false);
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Riichi 记分</h1>
        <p className={styles.desc}>
          前端直接连接 Supabase。请在项目根的 .env.local 填写
          NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY。
        </p>
        <button
          className={styles.button}
          onClick={handleTestConnection}
          disabled={loading}
        >
          {loading ? "测试中..." : "测试 Supabase 连接"}
        </button>
        <p className={styles.status}>{message}</p>
      </div>
    </main>
  );
}
