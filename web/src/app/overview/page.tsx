"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/AppShell";
import { getUsername, isAuthenticated } from "@/lib/auth";
import styles from "./page.module.css";

interface Player {
  id: number;
  name: string;
}

interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface MatchHistory {
  match_id: number;
  played_at: string;
  rank: number;
  score: number;
  points: number;
  seat: string;
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

const apiHeaders = { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET ?? "" };

const seatNames: Record<string, string> = {
  E: "东",
  S: "南",
  W: "西",
  N: "北",
};

export default function OverviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | "">("");
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | "all">("all");
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const seasonsRef = useRef<Season[]>([]);

  const getSeasonTimeRange = useCallback(
    (seasonId: number | "all", seasonList = seasonsRef.current) => {
      if (seasonId === "all") return { start: undefined, end: undefined };
      const season = seasonList.find((item) => item.id === seasonId);
      return {
        start: season?.start_date,
        end: season?.end_date || undefined,
      };
    },
    []
  );

  const loadOverview = useCallback(
    async (
      playerId: number,
      seasonId: number | "all",
      seasonList = seasonsRef.current
    ) => {
      const { start, end } = getSeasonTimeRange(seasonId, seasonList);
      const historyParams = new URLSearchParams();
      historyParams.set("player_id", String(playerId));
      historyParams.set("limit", "200");
      if (start) historyParams.set("start", start);
      if (end) historyParams.set("end", end);

      const matchParams = new URLSearchParams();
      matchParams.set("limit", "5");
      matchParams.set("player_id", String(playerId));
      if (start) matchParams.set("start", start);
      if (end) matchParams.set("end", end);

      const [historyRes, matchesRes] = await Promise.all([
        fetch(`/api/stats/player-history?${historyParams}`, { headers: apiHeaders }),
        fetch(`/api/matches?${matchParams}`, { headers: apiHeaders }),
      ]);

      const historyData = historyRes.ok ? await historyRes.json() : { data: [] };
      const matchesData = matchesRes.ok ? await matchesRes.json() : { data: [] };
      const matchesWithResults = await Promise.all(
        (matchesData.data || []).map(async (match: Match) => {
          const resultsRes = await fetch(`/api/matches/${match.id}/results`, {
            headers: apiHeaders,
          });
          const resultsData = resultsRes.ok ? await resultsRes.json() : { data: [] };
          return { ...match, results: resultsData.data || [] };
        })
      );

      setHistory(historyData.data || []);
      setRecentMatches(matchesWithResults);
    },
    [getSeasonTimeRange]
  );

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const init = async () => {
      try {
        const [playersRes, seasonsRes] = await Promise.all([
          fetch("/api/players", { headers: apiHeaders }),
          fetch("/api/seasons", { headers: apiHeaders }),
        ]);

        const playersData = playersRes.ok ? await playersRes.json() : { data: [] };
        const seasonsData = seasonsRes.ok ? await seasonsRes.json() : { data: [] };
        const loadedPlayers: Player[] = playersData.data || [];
        const loadedSeasons: Season[] = seasonsData.data || [];
        const activeSeason = loadedSeasons.find((season) => season.is_active);
        const username = getUsername()?.trim().toLowerCase();
        const matchedPlayer = username
          ? loadedPlayers.find((player) => player.name.trim().toLowerCase() === username)
          : undefined;
        const defaultPlayerId = matchedPlayer?.id ?? loadedPlayers[0]?.id;
        const selectedDefaultPlayerId = defaultPlayerId ?? "";
        const defaultSeasonId = activeSeason?.id ?? "all";

        setPlayers(loadedPlayers);
        setSeasons(loadedSeasons);
        seasonsRef.current = loadedSeasons;
        setSelectedPlayerId(selectedDefaultPlayerId);
        setSelectedSeasonId(defaultSeasonId);

        if (defaultPlayerId !== undefined) {
          await loadOverview(defaultPlayerId, defaultSeasonId, loadedSeasons);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadOverview, router]);

  const handlePlayerChange = async (playerId: number | "") => {
    setSelectedPlayerId(playerId);
    if (playerId === "") {
      setHistory([]);
      setRecentMatches([]);
      return;
    }
    setLoading(true);
    try {
      await loadOverview(playerId, selectedSeasonId);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = async (seasonId: number | "all") => {
    setSelectedSeasonId(seasonId);
    if (selectedPlayerId === "") return;
    setLoading(true);
    try {
      await loadOverview(selectedPlayerId, seasonId);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = history.length;
    const winCount = history.filter((item) => item.rank === 1).length;
    const fourthCount = history.filter((item) => item.rank === 4).length;
    const rankSum = history.reduce((sum, item) => sum + item.rank, 0);
    const scoreSum = history.reduce((sum, item) => sum + Number(item.score || 0), 0);

    return {
      total,
      winRate: total ? (winCount / total) * 100 : 0,
      avgRank: total ? rankSum / total : 0,
      fourthRate: total ? (fourthCount / total) * 100 : 0,
      scoreSum,
    };
  }, [history]);

  const lastTenHistory = useMemo(() => history.slice(0, 10), [history]);
  const chartData = useMemo(
    () =>
      lastTenHistory.map((item, index) => ({
        name: `第${index + 1}场`,
        date: new Date(item.played_at).toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric",
        }),
        rank: item.rank,
        score: item.score,
      })),
    [lastTenHistory]
  );

  const lastTenStats = useMemo(() => {
    const total = lastTenHistory.length;
    const rankSum = lastTenHistory.reduce((sum, item) => sum + item.rank, 0);
    const scoreSum = lastTenHistory.reduce((sum, item) => sum + item.score, 0);

    return {
      total,
      avgRank: total ? rankSum / total : 0,
      scoreSum,
      firstCount: lastTenHistory.filter((item) => item.rank === 1).length,
      fourthCount: lastTenHistory.filter((item) => item.rank === 4).length,
    };
  }, [lastTenHistory]);

  const selectedPlayerName =
    players.find((player) => player.id === selectedPlayerId)?.name || "未选择选手";
  const latestMatch = recentMatches[0];
  const latestPlayerResult = latestMatch?.results?.find(
    (result) => result.player.id === selectedPlayerId
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const scoreClass = (score: number) =>
    score > 0 ? styles.positive : score < 0 ? styles.negative : "";

  if (!mounted || !isAuthenticated()) return null;

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <div>
            <p className={styles.eyebrow}>Overview</p>
            <h1 className={styles.pageTitle}>个人总览</h1>
            <p className={styles.pageSubtitle}>按选手查看胜率、平均顺位、四位率和最近对局</p>
          </div>
          <div className={styles.filters}>
            <label className={styles.filterControl}>
              <span className="material-symbols-outlined">person_search</span>
              <select
                value={selectedPlayerId}
                onChange={(event) =>
                  handlePlayerChange(event.target.value === "" ? "" : Number(event.target.value))
                }
              >
                <option value="">选择选手</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterControl}>
              <span className="material-symbols-outlined">event</span>
              <select
                value={selectedSeasonId}
                onChange={(event) =>
                  handleSeasonChange(event.target.value === "all" ? "all" : Number(event.target.value))
                }
              >
                <option value="all">全部数据</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}{season.is_active ? " (当前)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className={styles.emptyState}>加载中...</div>
        ) : selectedPlayerId === "" ? (
          <div className={styles.emptyState}>请选择一个选手查看总览</div>
        ) : (
          <div className={styles.dashboardGrid}>
            <div className={styles.leftColumn}>
              <section>
                <h2 className={styles.sectionTitle}>总览</h2>
                <div className={styles.statsGrid}>
                  <div className={`${styles.statCard} ${styles.greenBar}`}>
                    <span className={styles.statLabel}>胜率</span>
                    <div className={styles.statValueRow}>
                      <span className={styles.statValue}>{stats.winRate.toFixed(1)}</span>
                      <span className={styles.statUnit}>%</span>
                    </div>
                    <span className={styles.statHint}>{stats.total} 场对局</span>
                  </div>
                  <div className={`${styles.statCard} ${styles.goldBar}`}>
                    <span className={styles.statLabel}>平均顺位</span>
                    <div className={styles.statValueRow}>
                      <span className={styles.statValue}>
                        {stats.total ? stats.avgRank.toFixed(2) : "-"}
                      </span>
                    </div>
                    <span className={styles.statHint}>越低越好</span>
                  </div>
                  <div className={`${styles.statCard} ${styles.redBar}`}>
                    <span className={styles.statLabel}>四位率</span>
                    <div className={styles.statValueRow}>
                      <span className={styles.statValue}>{stats.fourthRate.toFixed(1)}</span>
                      <span className={styles.statUnit}>%</span>
                    </div>
                    <span className={styles.statHint}>末位占比</span>
                  </div>
                </div>
              </section>

              <section className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>近10场数据统计</h2>
                    <p className={styles.sectionHint}>随上方选手和赛季筛选同步更新</p>
                  </div>
                  <span className={styles.playerPill}>{selectedPlayerName}</span>
                </div>

                <div className={styles.chartContainer}>
                  {lastTenHistory.length === 0 ? (
                    <div className={styles.chartPlaceholder}>
                      <span className="material-symbols-outlined">show_chart</span>
                      <p>该玩家在当前赛季暂无对局记录</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.chartInfo}>
                        <span className={styles.playerName}>{selectedPlayerName}</span>
                        <span className={styles.chartHint}>近 {lastTenStats.total} 场对局</span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
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
                          <ReferenceLine y={2.5} stroke="var(--border-strong)" strokeDasharray="5 5" />
                          <Line
                            type="monotone"
                            dataKey="rank"
                            stroke="var(--green)"
                            strokeWidth={2.5}
                            dot={{ fill: "var(--green)", strokeWidth: 0, r: 5 }}
                            activeDot={{
                              r: 7,
                              fill: "var(--green-dark)",
                              strokeWidth: 2,
                              stroke: "var(--gold)",
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      <div className={styles.lastTenStatsGrid}>
                        <div className={`${styles.lastTenStatCard} ${styles.statAvg}`}>
                          <span className={styles.statLabel}>平均名次</span>
                          <span className={styles.lastTenStatValue}>{lastTenStats.avgRank.toFixed(2)}</span>
                        </div>
                        <div className={`${styles.lastTenStatCard} ${styles.statTotal}`}>
                          <span className={styles.statLabel}>总得分</span>
                          <span className={`${styles.lastTenStatValue} ${scoreClass(lastTenStats.scoreSum)}`}>
                            {lastTenStats.scoreSum.toFixed(2)}
                          </span>
                        </div>
                        <div className={`${styles.lastTenStatCard} ${styles.statFirst}`}>
                          <span className={styles.statLabel}>第一次数</span>
                          <span className={styles.lastTenStatValue}>{lastTenStats.firstCount}</span>
                        </div>
                        <div className={`${styles.lastTenStatCard} ${styles.statLast}`}>
                          <span className={styles.statLabel}>第四次数</span>
                          <span className={styles.lastTenStatValue}>{lastTenStats.fourthCount}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className={styles.recentSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>最近对局</h2>
                  <span className={styles.playerPill}>{selectedPlayerName}</span>
                </div>
                <div className={styles.tableCard}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>牌桌</th>
                        <th>顺位</th>
                        <th>得分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMatches.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyCell}>暂无对局</td>
                        </tr>
                      ) : (
                        recentMatches.map((match) => {
                          const result = match.results?.find(
                            (item) => item.player.id === selectedPlayerId
                          );
                          return (
                            <tr key={match.id}>
                              <td>{formatDate(match.played_at)}</td>
                              <td>{match.table_no || match.note || "-"}</td>
                              <td>
                                <span className={`${styles.rankBadge} ${result?.rank === 1 ? styles.rankGold : result?.rank === 4 ? styles.rankRed : ""}`}>
                                  {result?.rank ?? "-"}
                                </span>
                              </td>
                              <td className={`${styles.scoreCell} ${scoreClass(result?.score || 0)}`}>
                                {result ? result.score.toFixed(2) : "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className={styles.latestCard}>
              <div className={styles.latestGlow} />
              <div className={styles.latestHeader}>
                <div>
                  <div className={styles.liveLabel}>
                    <span />
                    最近一场
                  </div>
                  <h2>{selectedPlayerName}</h2>
                  <p>{latestMatch ? formatDate(latestMatch.played_at) : "暂无对局"}</p>
                </div>
                {latestPlayerResult && (
                  <span className={`${styles.latestScore} ${scoreClass(latestPlayerResult.score)}`}>
                    {latestPlayerResult.score.toFixed(2)}
                  </span>
                )}
              </div>

              <div className={styles.latestPlayers}>
                {latestMatch?.results
                  ?.slice()
                  .sort((a, b) => a.rank - b.rank)
                  .map((result) => (
                    <div
                      key={result.id}
                      className={`${styles.latestPlayer} ${result.player.id === selectedPlayerId ? styles.currentPlayer : ""}`}
                    >
                      <div className={styles.seatBadge}>{seatNames[result.seat] || result.seat}</div>
                      <div>
                        <p>{result.player.name}</p>
                        <span>{result.rank} 位 · {result.points.toLocaleString()} 点</span>
                      </div>
                      <strong className={scoreClass(result.score)}>{result.score.toFixed(2)}</strong>
                    </div>
                  )) || <div className={styles.emptyLatest}>暂无最近对局记录</div>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}
