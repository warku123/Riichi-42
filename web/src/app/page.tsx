"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout, getUsername } from "@/lib/auth";
import styles from "./page.module.css";

interface PlayerTotal {
  player_id: number;
  name: string;
  total_score: number;
}

interface MatchResult {
  id: number;
  player: {
    id: number;
    name: string;
  };
  seat: string;
  points: number;
  rank: number;
  score: number;
}

interface Match {
  id: number;
  played_at: string;
  note: string | null;
  table_no: string | null;
  results?: MatchResult[];
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerTotal[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

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
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      // 加载天梯榜
      const leaderboardRes = await fetch("/api/stats/totals", {
        headers: apiHeaders,
      });
      if (!leaderboardRes.ok) {
        console.error("加载天梯榜失败:", leaderboardRes.statusText);
      } else {
        const leaderboardData = await leaderboardRes.json();
        if (leaderboardData.data) {
          setLeaderboard(leaderboardData.data);
        } else if (leaderboardData.error) {
          console.error("天梯榜错误:", leaderboardData.error);
        }
      }

      // 加载最近5场对局
      const matchesRes = await fetch("/api/matches?limit=5", {
        headers: apiHeaders,
      });
      if (!matchesRes.ok) {
        console.error("加载对局列表失败:", matchesRes.statusText);
      } else {
        const matchesData = await matchesRes.json();
        if (matchesData.data && Array.isArray(matchesData.data)) {
          // 为每场对局加载成绩
          const matchesWithResults = await Promise.all(
            matchesData.data.map(async (match: Match) => {
              try {
                const resultsRes = await fetch(
                  `/api/matches/${match.id}/results`,
                  { headers: apiHeaders }
                );
                if (!resultsRes.ok) {
                  console.error(`加载对局 ${match.id} 成绩失败:`, resultsRes.statusText);
                  return { ...match, results: [] };
                }
                const resultsData = await resultsRes.json();
                return {
                  ...match,
                  results: resultsData.data || [],
                };
              } catch (err) {
                console.error(`加载对局 ${match.id} 成绩时出错:`, err);
                return { ...match, results: [] };
              }
            })
          );
          setRecentMatches(matchesWithResults);
        } else if (matchesData.error) {
          console.error("对局列表错误:", matchesData.error);
        }
      }
    } catch (err) {
      console.error("加载数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeatName = (seat: string) => {
    const map: Record<string, string> = {
      E: "东",
      S: "南",
      W: "西",
      N: "北",
    };
    return map[seat] || seat;
  };

  if (!mounted || !isAuthenticated()) {
    return null;
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Riichi 记分系统</h1>
        <div className={styles.userInfo}>
          <span>欢迎，{getUsername()}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>
            退出登录
          </button>
        </div>
      </header>

      <nav className={styles.nav}>
        <Link href="/matches" className={styles.navButton}>
          对局记录修改
        </Link>
        <Link href="/players" className={styles.navButton}>
          用户管理
        </Link>
      </nav>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>分数天梯榜</h2>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>选手</th>
                      <th>总分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={styles.empty}>
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((player, index) => (
                        <tr key={player.player_id}>
                          <td>
                            <span className={`${styles.rankBadge} ${index < 3 ? styles.topRank : ""}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{player.name}</td>
                          <td className={styles.score}>
                            {player.total_score.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>最近五场对局</h2>
              <div className={styles.matchesContainer}>
                {recentMatches.length === 0 ? (
                  <div className={styles.empty}>暂无对局记录</div>
                ) : (
                  recentMatches.map((match) => (
                    <div key={match.id} className={styles.matchCard}>
                      <div className={styles.matchHeader}>
                        <span className={styles.matchDate}>
                          {formatDate(match.played_at)}
                        </span>
                        {match.note && (
                          <span className={styles.matchNote}>{match.note}</span>
                        )}
                      </div>
                      <table className={styles.matchTable}>
                        <thead>
                          <tr>
                            <th>排名</th>
                            <th>选手</th>
                            <th>座位</th>
                            <th>点数</th>
                            <th>得分</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.results
                            ?.sort((a, b) => a.rank - b.rank)
                            .map((result) => (
                              <tr key={result.id}>
                                <td>{result.rank}</td>
                                <td>{result.player.name}</td>
                                <td>{getSeatName(result.seat)}</td>
                                <td>{result.points.toLocaleString()}</td>
                                <td className={styles.score}>
                                  {result.score.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>统计图表</h2>
              <div className={styles.chartPlaceholder}>
                <p>统计图表功能开发中...</p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
