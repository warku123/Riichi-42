"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

interface Player {
  id: number;
  name: string;
}

interface MatchResult {
  id?: number;
  player: { id: number; name: string };
  seat: "E" | "S" | "W" | "N";
  points: number;
  rank: number;
  score?: number;
  player_id?: number;
}

interface Match {
  id: number;
  played_at: string;
  note: string | null;
  table_no: string | null;
  results?: MatchResult[];
}

type SeatKey = "E" | "S" | "W" | "N";

const seatOptions: { key: SeatKey; label: string }[] = [
  { key: "E", label: "东" },
  { key: "S", label: "南" },
  { key: "W", label: "西" },
  { key: "N", label: "北" },
];

interface Option {
  value: number;
  label: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: Option[];
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return options;
    const lower = keyword.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, keyword]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) setKeyword("");
  }, [open]);

  return (
    <div className={styles.select} ref={ref}>
      <div
        className={`${styles.selectControl} ${
          disabled ? styles.selectDisabled : ""
        }`}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
      >
        {selected ? (
          <span className={styles.selectValue}>{selected.label}</span>
        ) : (
          <span className={styles.selectPlaceholder}>
            {placeholder || "请选择"}
          </span>
        )}
        <span className={styles.selectArrow}>{open ? "▲" : "▼"}</span>
      </div>
      {open && !disabled && (
        <div className={styles.selectDropdown}>
          <div className={styles.selectSearch}>
            <input
              type="text"
              placeholder="搜索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.selectOptions}>
            {filtered.length === 0 ? (
              <div className={styles.selectOptionEmpty}>暂无匹配</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  className={styles.selectOption}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const [note, setNote] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [playedAt, setPlayedAt] = useState<string>(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16); // datetime-local 格式
  });

  const [resultsForm, setResultsForm] = useState<Record<
    SeatKey,
    { player_id: number | ""; points: number | "" }
  >>({
    E: { player_id: "", points: 25000 },
    S: { player_id: "", points: 25000 },
    W: { player_id: "", points: 25000 },
    N: { player_id: "", points: 25000 },
  });

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const apiHeaders =
    typeof process !== "undefined"
      ? { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET ?? "" }
      : undefined;

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadPlayers();
    loadMatches();
  }, [router]);

  const playerOptions = useMemo<Option[]>(() => {
    return players
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ value: p.id, label: p.name }));
  }, [players]);

  const loadPlayers = async () => {
    try {
      const res = await fetch("/api/players", { headers: apiHeaders });
      const data = await res.json();
      if (data.data) {
        setPlayers(data.data);
      }
    } catch (err) {
      console.error("加载玩家失败", err);
    }
  };

  const loadMatches = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", PAGE_SIZE.toString());
      params.set("offset", ((targetPage - 1) * PAGE_SIZE).toString());
      
      if (startDate) {
        const [y, m, d] = startDate.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        params.set("start", start.toISOString());
      }
      
      if (endDate) {
        const [y, m, d] = endDate.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        params.set("end", end.toISOString());
      }

      const res = await fetch(`/api/matches?${params.toString()}`, {
        headers: apiHeaders,
      });
      const data = await res.json();
      if (data.data) {
        setTotal(data.total || 0);
        const matchesData: Match[] = data.data;
        const matchesWithResults = await Promise.all(
          matchesData.map(async (m) => {
            try {
              const rRes = await fetch(`/api/matches/${m.id}/results`, {
                headers: apiHeaders,
              });
              const rData = await rRes.json();
              return { ...m, results: rData.data || [] };
            } catch {
              return { ...m, results: [] };
            }
          })
        );
        setMatches(matchesWithResults);
      }
    } catch (err) {
      console.error("加载对局失败", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNote("");
    setTableNo("");
    const now = new Date();
    now.setSeconds(0, 0);
    setPlayedAt(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );
    setResultsForm({
      E: { player_id: "", points: 25000 },
      S: { player_id: "", points: 25000 },
      W: { player_id: "", points: 25000 },
      N: { player_id: "", points: 25000 },
    });
  };

  const validateForm = () => {
    const playersSelected = new Set<number>();
    let totalPoints = 0;
    for (const seat of seatOptions.map((s) => s.key)) {
      const { player_id, points } = resultsForm[seat];
      if (player_id === "" || points === "") {
        setMessage("请填写完整的玩家和点数");
        return false;
      }
      const pid = Number(player_id);
      const pts = Number(points);
      if (playersSelected.has(pid)) {
        setMessage("同一玩家不能重复选择");
        return false;
      }
      playersSelected.add(pid);
      totalPoints += pts;
    }
    if (totalPoints !== 100000) {
      setMessage(`点数总和必须为 100000，当前为 ${totalPoints}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      // 计算名次：按点数从高到低，1~4
      const seatPoints: { seat: SeatKey; points: number }[] = seatOptions.map(
        ({ key }) => ({
          seat: key,
          points: Number(resultsForm[key].points),
        })
      );
      seatPoints.sort((a, b) => b.points - a.points);
      const rankMap = new Map<SeatKey, number>();
      seatPoints.forEach((item, idx) => {
        rankMap.set(item.seat, idx + 1);
      });

      let matchId = editingId;
      const payload = {
        note: note || null,
        table_no: tableNo || null,
        played_at: playedAt ? new Date(playedAt).toISOString() : undefined,
      };

      if (editingId) {
        // 更新对局基础信息
        const res = await fetch(`/api/matches/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(apiHeaders || {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "更新对局失败");
        }
      } else {
        // 创建新对局
        const res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(apiHeaders || {}) },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "创建对局失败");
        }
        matchId = data.data.id;
      }

      // 提交成绩
      const results = seatOptions.map(({ key }) => {
        const r = resultsForm[key];
        return {
          player_id:
            typeof r.player_id === "string"
              ? parseInt(r.player_id as string, 10)
              : r.player_id,
          seat: key,
          points: Number(r.points),
          rank: rankMap.get(key) || 1,
        };
      });

      const resResult = await fetch(`/api/matches/${matchId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(apiHeaders || {}) },
        body: JSON.stringify({ results }),
      });
      const resData = await resResult.json();
      if (!resResult.ok) {
        throw new Error(resData.error || "提交成绩失败");
      }

      setMessage(editingId ? "更新成功" : "创建成功");
      await loadMatches();
      resetForm();
    } catch (err: any) {
      setMessage(err.message || "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (match: Match) => {
    setEditingId(match.id);
    setNote(match.note || "");
    setTableNo(match.table_no || "");
    setPlayedAt(
      new Date(match.played_at).toISOString().slice(0, 16) // assume UTC
    );
    const nextForm: typeof resultsForm = {
      E: { player_id: "", points: "" },
      S: { player_id: "", points: "" },
      W: { player_id: "", points: "" },
      N: { player_id: "", points: "" },
    };
    (match.results || []).forEach((r) => {
      nextForm[r.seat] = {
        player_id: r.player.id,
        points: r.points,
      };
    });
    setResultsForm(nextForm);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("确认删除该对局？（包含成绩）");
    if (!confirmed) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: "DELETE",
        headers: apiHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "删除失败");
      }
      await loadMatches();
      if (editingId === id) resetForm();
    } catch (err: any) {
      setMessage(err.message || "删除失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadMatches(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadMatches(p);
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
        <h1 className={styles.title}>对局管理</h1>
      </header>

      <div className={styles.content}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>
              {editingId ? `编辑对局 #${editingId}` : "新增对局"}
            </h2>
            {editingId && (
              <button
                className={styles.secondaryButton}
                onClick={resetForm}
                disabled={submitting}
              >
                取消编辑
              </button>
            )}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label>备注</label>
                <input
                  type="text"
                  placeholder="备注（可选）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className={styles.formRow}>
                <label>桌号</label>
                <input
                  type="text"
                  placeholder="桌号（可选）"
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className={styles.formRow}>
                <label>对局时间</label>
                <input
                  type="datetime-local"
                  value={playedAt}
                  onChange={(e) => setPlayedAt(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.grid}>
              {seatOptions.map(({ key, label }) => (
                <div key={key} className={styles.seatCard}>
                  <div className={styles.seatHeader}>
                    <span>{label} 位</span>
                  </div>
                  <div className={styles.formRow}>
                    <label>玩家</label>
                    <SearchableSelect
                      options={playerOptions}
                      value={resultsForm[key].player_id}
                      onChange={(val) =>
                        setResultsForm((prev) => ({
                          ...prev,
                          [key]: { ...prev[key], player_id: val },
                        }))
                      }
                      placeholder="选择玩家"
                      disabled={submitting}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <label>点数</label>
                    <input
                      type="number"
                      value={resultsForm[key].points}
                      onChange={(e) =>
                        setResultsForm((prev) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            points:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          },
                        }))
                      }
                      disabled={submitting}
                    />
                  </div>
                </div>
              ))}
            </div>

            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.actions}>
              <button type="submit" disabled={submitting}>
                {submitting ? "提交中..." : editingId ? "保存修改" : "创建对局"}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>对局列表</h2>
            <div className={styles.filters}>
              <div className={styles.filterGroup}>
                <label>开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className={styles.filterGroup}>
                <label>结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <button 
                className={styles.filterButton}
                onClick={handleSearch} 
                disabled={loading || submitting}
              >
                {loading ? "搜索中..." : "筛选对局"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.placeholder}>加载中...</div>
          ) : matches.length === 0 ? (
            <div className={styles.placeholder}>暂无对局</div>
          ) : (
            <>
              <div className={styles.matchList}>
                {matches.map((m) => (
                  <div key={m.id} className={styles.matchCard}>
                    <div className={styles.matchHeader}>
                      <div>
                        <div className={styles.matchTitle}>
                          对局 #{m.id} {m.note ? `- ${m.note}` : ""}
                        </div>
                        <div className={styles.matchMeta}>
                          {new Date(m.played_at).toLocaleString("zh-CN")}{" "}
                          {m.table_no ? `| 桌号 ${m.table_no}` : ""}
                        </div>
                      </div>
                      <div className={styles.matchActions}>
                        <button
                          className={styles.secondaryButton}
                          onClick={() => handleEdit(m)}
                          disabled={submitting}
                        >
                          编辑
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(m.id)}
                          disabled={submitting}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>座位</th>
                          <th>玩家</th>
                          <th>名次</th>
                          <th>点数</th>
                          <th>得分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(m.results || []).map((r) => (
                          <tr key={`${m.id}-${r.seat}`}>
                            <td>{r.seat}</td>
                            <td>{r.player.name}</td>
                            <td>{r.rank}</td>
                            <td>{r.points}</td>
                            <td>{r.score?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {total > PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button
                    disabled={page === 1 || loading}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    上一页
                  </button>
                  <span className={styles.pageInfo}>
                    第 {page} / {Math.ceil(total / PAGE_SIZE)} 页 (共 {total} 条)
                  </span>
                  <button
                    disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

