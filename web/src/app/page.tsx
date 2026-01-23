"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout, getUsername } from "@/lib/auth";
import styles from "./page.module.css";

interface PlayerTotal {
  player_id: number;
  name: string;
  total_score: number;
  match_count: number;
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

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

// API headers 定义在组件外部，避免每次渲染重新创建
const apiHeaders = { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET ?? "" };

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerTotal[]>([]);
  const [sortMode, setSortMode] = useState<"total" | "avg">("total");
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 赛季相关状态
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | "all">("all");
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStartDate, setNewSeasonStartDate] = useState("");
  
  // 用于防止初始化时重复加载
  const initializedRef = useRef(false);
  const seasonsRef = useRef<Season[]>([]);

  // 初始化
  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // 加载赛季列表
    const initData = async () => {
      try {
        const res = await fetch("/api/seasons", { headers: apiHeaders });
        if (res.ok) {
          const data = await res.json();
          const seasonsList = data.data || [];
          setSeasons(seasonsList);
          seasonsRef.current = seasonsList;
          
          // 默认选中当前活跃赛季
          const activeSeason = seasonsList.find((s: Season) => s.is_active);
          if (activeSeason) {
            setSelectedSeasonId(activeSeason.id);
            // 加载活跃赛季的数据
            loadData(activeSeason.id, seasonsList);
          } else {
            // 没有活跃赛季，加载全部数据
            loadData("all", seasonsList);
          }
        } else {
          // 加载失败，也加载全部数据
          loadData("all", []);
        }
      } catch (err) {
        console.error("加载赛季列表失败:", err);
        loadData("all", []);
      }
    };
    
    initData();
  }, [router]);

  const sortedLeaderboard = useMemo(() => {
    const data = [...leaderboard];
    if (sortMode === "total") {
      return data.sort((a, b) => b.total_score - a.total_score);
    } else {
      // 均分排序：至少10场的人排在前面
      return data.sort((a, b) => {
        const aHas10 = a.match_count >= 10;
        const bHas10 = b.match_count >= 10;
        
        if (aHas10 && !bHas10) return -1;
        if (!aHas10 && bHas10) return 1;
        
        if (aHas10 && bHas10) {
          const aAvg = a.total_score / a.match_count;
          const bAvg = b.total_score / b.match_count;
          return bAvg - aAvg;
        }
        
        // 都没有10场则按场次排
        return b.match_count - a.match_count;
      });
    }
  }, [leaderboard, sortMode]);

  // 获取赛季时间范围
  const getSeasonTimeRange = (seasonId: number | "all", seasonsList: Season[]) => {
    if (seasonId === "all") {
      return { start: undefined, end: undefined };
    }
    const season = seasonsList.find(s => s.id === seasonId);
    if (!season) {
      return { start: undefined, end: undefined };
    }
    return {
      start: season.start_date,
      end: season.end_date || undefined
    };
  };

  // 加载数据（天梯榜 + 最近对局）
  const loadData = async (seasonId: number | "all", seasonsList: Season[]) => {
    try {
      setLoading(true);
      const { start, end } = getSeasonTimeRange(seasonId, seasonsList);

      // 构建天梯榜查询参数
      const statsParams = new URLSearchParams();
      if (start) statsParams.set("start", start);
      if (end) statsParams.set("end", end);
      const statsUrl = `/api/stats/totals${statsParams.toString() ? `?${statsParams}` : ""}`;

      // 加载天梯榜
      const leaderboardRes = await fetch(statsUrl, {
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

      // 构建对局查询参数
      const matchParams = new URLSearchParams();
      matchParams.set("limit", "5");
      if (start) matchParams.set("start", start);
      if (end) matchParams.set("end", end);

      // 加载最近5场对局
      const matchesRes = await fetch(`/api/matches?${matchParams}`, {
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

  // 赛季切换时重新加载数据
  const handleSeasonChange = (newSeasonId: number | "all") => {
    setSelectedSeasonId(newSeasonId);
    loadData(newSeasonId, seasonsRef.current);
  };

  // 创建新赛季
  const handleCreateSeason = async () => {
    if (!newSeasonName.trim() || !newSeasonStartDate) {
      alert("请填写赛季名称和开始时间");
      return;
    }

    try {
      const res = await fetch("/api/seasons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...apiHeaders,
        },
        body: JSON.stringify({
          name: newSeasonName.trim(),
          start_date: new Date(newSeasonStartDate).toISOString(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowSeasonModal(false);
        setNewSeasonName("");
        setNewSeasonStartDate("");
        
        // 重新加载赛季列表
        const seasonsRes = await fetch("/api/seasons", { headers: apiHeaders });
        if (seasonsRes.ok) {
          const seasonsData = await seasonsRes.json();
          const newSeasonsList = seasonsData.data || [];
          setSeasons(newSeasonsList);
          seasonsRef.current = newSeasonsList;
          
          // 自动切换到新赛季
          if (data.data?.id) {
            setSelectedSeasonId(data.data.id);
            loadData(data.data.id, newSeasonsList);
          }
        }
      } else {
        const error = await res.json();
        alert("创建赛季失败: " + (error.error || "未知错误"));
      }
    } catch (err) {
      console.error("创建赛季失败:", err);
      alert("创建赛季失败");
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
        <div className={styles.navLinks}>
          <Link href="/matches" className={styles.navButton}>
            对局记录修改
          </Link>
          <Link href="/players" className={styles.navButton}>
            用户管理
          </Link>
        </div>
        <div className={styles.seasonSelector}>
          <label className={styles.seasonLabel}>赛季：</label>
          <select
            value={selectedSeasonId}
            onChange={(e) => handleSeasonChange(e.target.value === "all" ? "all" : Number(e.target.value))}
            className={styles.seasonSelect}
          >
            <option value="all">全部数据</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}{season.is_active ? " (当前)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowSeasonModal(true)}
            className={styles.seasonManageButton}
          >
            赛季管理
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>分数天梯榜</h2>
                <div className={styles.sortToggle}>
                  <button 
                    className={`${styles.sortButton} ${sortMode === "total" ? styles.activeSort : ""}`}
                    onClick={() => setSortMode("total")}
                  >
                    总分
                  </button>
                  <button 
                    className={`${styles.sortButton} ${sortMode === "avg" ? styles.activeSort : ""}`}
                    onClick={() => setSortMode("avg")}
                  >
                    均分
                  </button>
                </div>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>选手</th>
                      <th>场次</th>
                      <th>总分</th>
                      <th>均分</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.empty}>
                          暂无数据
                        </td>
                      </tr>
                    ) : (
                      sortedLeaderboard.map((player, index) => (
                        <tr key={player.player_id}>
                          <td>
                            <span className={`${styles.rankBadge} ${index < 3 ? styles.topRank : ""}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{player.name}</td>
                          <td className={styles.matchCount}>{player.match_count || 0}</td>
                          <td className={styles.score}>
                            {(player.total_score || 0).toFixed(2)}
                          </td>
                          <td className={styles.avgScore}>
                            {player.match_count >= 10 
                              ? ((player.total_score || 0) / player.match_count).toFixed(2)
                              : "-"}
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

      {/* 赛季管理弹窗 */}
      {showSeasonModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSeasonModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>赛季管理</h3>
              <button 
                onClick={() => setShowSeasonModal(false)}
                className={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {/* 创建新赛季 */}
              <div className={styles.createSeasonForm}>
                <h4>创建新赛季</h4>
                <p className={styles.formHint}>
                  创建新赛季会自动结束当前活跃的赛季
                </p>
                <div className={styles.formRow}>
                  <input
                    type="text"
                    placeholder="赛季名称（如：S2 - 2026春季赛）"
                    value={newSeasonName}
                    onChange={(e) => setNewSeasonName(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formRow}>
                  <input
                    type="datetime-local"
                    value={newSeasonStartDate}
                    onChange={(e) => setNewSeasonStartDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <button
                  onClick={handleCreateSeason}
                  className={styles.createButton}
                >
                  创建新赛季
                </button>
              </div>

              {/* 赛季列表 */}
              <div className={styles.seasonList}>
                <h4>赛季列表</h4>
                {seasons.length === 0 ? (
                  <p className={styles.emptyHint}>暂无赛季</p>
                ) : (
                  <ul className={styles.seasonItems}>
                    {seasons.map((season) => (
                      <li key={season.id} className={styles.seasonItem}>
                        <div className={styles.seasonInfo}>
                          <span className={styles.seasonName}>
                            {season.name}
                            {season.is_active && (
                              <span className={styles.activeBadge}>当前</span>
                            )}
                          </span>
                          <span className={styles.seasonDate}>
                            {new Date(season.start_date).toLocaleDateString("zh-CN")}
                            {" - "}
                            {season.end_date 
                              ? new Date(season.end_date).toLocaleDateString("zh-CN")
                              : "至今"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
  );
}
