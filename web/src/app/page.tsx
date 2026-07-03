"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { isAuthenticated } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import styles from "./page.module.css";

interface PlayerTotal {
  player_id: number;
  name: string;
  total_score: number;
  match_count: number;
}

interface Player {
  id: number;
  name: string;
}

interface MatchHistory {
  match_id: number;
  played_at: string;
  rank: number;
  score: number;
  points: number;
  seat: string;
}

interface Option {
  value: number;
  label: string;
}

// 可搜索下拉选择组件
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: Option[];
  value: number | "";
  onChange: (val: number | "") => void;
  placeholder?: string;
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

  const closeSelect = () => {
    setOpen(false);
    setKeyword("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeSelect();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={styles.select} ref={ref}>
      <div
        className={styles.selectControl}
        onClick={() => {
          if (open) {
            closeSelect();
          } else {
            setOpen(true);
          }
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
      {open && (
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
                    closeSelect();
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
  
  // 图表相关状态
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">("");
  const [historyData, setHistoryData] = useState<MatchHistory[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  
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
    
    // 加载赛季列表和玩家列表
    const initData = async () => {
      try {
        // 并行加载赛季和玩家列表
        const [seasonsRes, playersRes] = await Promise.all([
          fetch("/api/seasons", { headers: apiHeaders }),
          fetch("/api/players", { headers: apiHeaders }),
        ]);
        
        // 处理玩家列表
        if (playersRes.ok) {
          const playersData = await playersRes.json();
          setPlayers(playersData.data || []);
        }
        
        // 处理赛季列表
        if (seasonsRes.ok) {
          const data = await seasonsRes.json();
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
        console.error("加载数据失败:", err);
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
    // 如果已选择了玩家，重新加载该玩家的图表数据
    if (selectedPlayerId !== "") {
      loadPlayerHistory(selectedPlayerId, newSeasonId);
    }
  };

  // 加载玩家历史数据
  const loadPlayerHistory = async (playerId: number, seasonId: number | "all" = selectedSeasonId) => {
    setChartLoading(true);
    try {
      const { start, end } = getSeasonTimeRange(seasonId, seasonsRef.current);
      const params = new URLSearchParams();
      params.set("player_id", String(playerId));
      params.set("limit", "10");
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      const res = await fetch(`/api/stats/player-history?${params}`, {
        headers: apiHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.data || []);
      }
    } catch (err) {
      console.error("加载玩家历史失败:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // 玩家选择变化
  const handlePlayerChange = (playerId: number | "") => {
    setSelectedPlayerId(playerId);
    if (playerId !== "") {
      loadPlayerHistory(playerId);
    } else {
      setHistoryData([]);
    }
  };

  // 获取选中玩家的名字
  const selectedPlayerName = players.find(p => p.id === selectedPlayerId)?.name || "";

  // 玩家选项（用于 SearchableSelect）
  const playerOptions: Option[] = players.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  // 图表数据
  const chartData = historyData.map((item, index) => ({
    name: `第${index + 1}场`,
    date: new Date(item.played_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    rank: item.rank,
    score: item.score,
  }));

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

  const scoreClass = (score: number) =>
    score > 0 ? styles.positive : score < 0 ? styles.negative : "";

  const rankBadgeClass = (rank: number, total: number) => {
    if (rank === 1) return styles.rankGold;
    if (rank === total) return styles.rankRed;
    if (rank === 2) return styles.rankSilver;
    return "";
  };

  if (!mounted || !isAuthenticated()) {
    return null;
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {/* 工具栏：赛季切换 */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <h1 className={styles.pageTitle}>数据看板</h1>
            <p className={styles.pageSubtitle}>天梯榜 · 最近对局 · 玩家走势</p>
          </div>
          <div className={styles.seasonSelector}>
            <span className="material-symbols-outlined">event</span>
            <select
              value={selectedSeasonId}
              onChange={(e) =>
                handleSeasonChange(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className={styles.seasonSelect}
            >
              <option value="all">全部数据</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.is_active ? " (当前)" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSeasonModal(true)}
              className={styles.seasonManageButton}
              type="button"
            >
              <span className="material-symbols-outlined">settings</span>
              赛季管理
            </button>
          </div>
        </div>

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
                      className={`${styles.sortButton} ${
                        sortMode === "total" ? styles.activeSort : ""
                      }`}
                      onClick={() => setSortMode("total")}
                      type="button"
                    >
                      总分
                    </button>
                    <button
                      className={`${styles.sortButton} ${
                        sortMode === "avg" ? styles.activeSort : ""
                      }`}
                      onClick={() => setSortMode("avg")}
                      type="button"
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
                              <span
                                className={`${styles.rankBadge} ${rankBadgeClass(
                                  index + 1,
                                  sortedLeaderboard.length
                                )}`}
                              >
                                {index + 1}
                              </span>
                            </td>
                            <td className={styles.playerCell}>{player.name}</td>
                            <td className={styles.matchCount}>
                              {player.match_count || 0}
                            </td>
                            <td
                              className={`${styles.score} ${scoreClass(
                                player.total_score || 0
                              )}`}
                            >
                              {(player.total_score || 0).toFixed(2)}
                            </td>
                            <td className={styles.avgScore}>
                              {player.match_count >= 10
                                ? (
                                    (player.total_score || 0) /
                                    player.match_count
                                  ).toFixed(2)
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
                            <span className={styles.matchNote}>
                              {match.note}
                            </span>
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
                                  <td>
                                    <span
                                      className={`${styles.rankBadgeSm} ${rankBadgeClass(
                                        result.rank,
                                        4
                                      )}`}
                                    >
                                      {result.rank}
                                    </span>
                                  </td>
                                  <td>{result.player.name}</td>
                                  <td>{getSeatName(result.seat)}</td>
                                  <td className={styles.pointsCell}>
                                    {result.points.toLocaleString()}
                                  </td>
                                  <td
                                    className={`${styles.score} ${scoreClass(
                                      result.score
                                    )}`}
                                  >
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

              <section className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>近10场数据统计</h2>
                  <div className={styles.playerSelector}>
                    <SearchableSelect
                      options={playerOptions}
                      value={selectedPlayerId}
                      onChange={handlePlayerChange}
                      placeholder="请选择玩家"
                    />
                  </div>
                </div>

                <div className={styles.chartContainer}>
                  {selectedPlayerId === "" ? (
                    <div className={styles.chartPlaceholder}>
                      <span className="material-symbols-outlined">
                        show_chart
                      </span>
                      <p>请选择一个玩家查看名次走势</p>
                    </div>
                  ) : chartLoading ? (
                    <div className={styles.chartPlaceholder}>
                      <p>加载中...</p>
                    </div>
                  ) : historyData.length === 0 ? (
                    <div className={styles.chartPlaceholder}>
                      <p>该玩家在当前赛季暂无对局记录</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.chartInfo}>
                        <span className={styles.playerName}>
                          {selectedPlayerName}
                        </span>
                        <span className={styles.chartHint}>
                          近 {historyData.length} 场对局
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border-soft)"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                            axisLine={{ stroke: "var(--border)" }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[1, 4]}
                            ticks={[1, 2, 3, 4]}
                            reversed
                            tick={{ fill: "var(--ink-secondary)", fontSize: 12 }}
                            axisLine={{ stroke: "var(--border)" }}
                            tickLine={false}
                            label={{
                              value: "名次",
                              angle: -90,
                              position: "insideLeft",
                              fill: "var(--ink-secondary)",
                              fontSize: 12,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "12px",
                              boxShadow: "var(--shadow-pop)",
                              fontSize: "0.875rem",
                            }}
                            formatter={(value) => [`第 ${value} 名`, "名次"]}
                            labelFormatter={(label) => `日期: ${label}`}
                          />
                          <ReferenceLine
                            y={2.5}
                            stroke="var(--border-strong)"
                            strokeDasharray="5 5"
                          />
                          <Line
                            type="monotone"
                            dataKey="rank"
                            stroke="var(--green)"
                            strokeWidth={2.5}
                            dot={{
                              fill: "var(--green)",
                              strokeWidth: 0,
                              r: 5,
                            }}
                            activeDot={{
                              r: 7,
                              fill: "var(--green-dark)",
                              strokeWidth: 2,
                              stroke: "var(--gold)",
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* 统计卡片 */}
                      <div className={styles.statsGrid}>
                        <div
                          className={`${styles.statCard} ${styles.statAvg}`}
                        >
                          <span className={styles.statLabel}>平均名次</span>
                          <span className={styles.statValue}>
                            {(
                              historyData.reduce((sum, h) => sum + h.rank, 0) /
                              historyData.length
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`${styles.statCard} ${styles.statTotal}`}
                        >
                          <span className={styles.statLabel}>总得分</span>
                          <span
                            className={`${styles.statValue} ${scoreClass(
                              historyData.reduce((sum, h) => sum + h.score, 0)
                            )}`}
                          >
                            {historyData
                              .reduce((sum, h) => sum + h.score, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`${styles.statCard} ${styles.statFirst}`}
                        >
                          <span className={styles.statLabel}>第一次数</span>
                          <span className={styles.statValue}>
                            {historyData.filter((h) => h.rank === 1).length}
                          </span>
                        </div>
                        <div
                          className={`${styles.statCard} ${styles.statLast}`}
                        >
                          <span className={styles.statLabel}>第四次数</span>
                          <span className={styles.statValue}>
                            {historyData.filter((h) => h.rank === 4).length}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* 赛季管理弹窗 */}
        {showSeasonModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowSeasonModal(false)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>赛季管理</h3>
                <button
                  onClick={() => setShowSeasonModal(false)}
                  className={styles.modalClose}
                  type="button"
                  aria-label="关闭"
                >
                  <span className="material-symbols-outlined">close</span>
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
                    type="button"
                  >
                    <span className="material-symbols-outlined">add</span>
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
                              {new Date(season.start_date).toLocaleDateString(
                                "zh-CN"
                              )}
                              {" - "}
                              {season.end_date
                                ? new Date(season.end_date).toLocaleDateString(
                                    "zh-CN"
                                  )
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
      </div>
    </AppShell>
  );
}
