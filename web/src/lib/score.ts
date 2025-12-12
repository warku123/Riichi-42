export type SeatKey = 'E' | 'S' | 'W' | 'N';

export interface InputResult {
  seat: SeatKey;
  points: number;
  player_id: number | string;
}

export interface ScoredResult extends InputResult {
  rank: number;
  score: number;
}

const baseModifiers: Record<number, number> = {
  1: 20,
  2: -20,
  3: -40,
  4: -60,
};

// 计算名次与得分：按点数降序，同分共享加减分（取占用名次区间平均值）
export function computeScores(results: InputResult[]): ScoredResult[] {
  if (!results.length) return [];

  // 点数降序
  const computed = [...results]
    .sort((a, b) => b.points - a.points)
    .map((r, idx) => ({
      ...r,
      rank: idx + 1,
      score: 0,
    }));

  // 同分处理：占用名次区间平均加减分
  let i = 0;
  while (i < computed.length) {
    const start = i;
    const pts = computed[i].points;
    while (i + 1 < computed.length && computed[i + 1].points === pts) {
      i += 1;
    }
    const end = i; // inclusive
    const tieCount = end - start + 1;
    const rank = start + 1; // standard competition rank start

    let sumMod = 0;
    for (let r = rank; r < rank + tieCount; r++) {
      sumMod += baseModifiers[r] ?? baseModifiers[4];
    }
    const avgMod = sumMod / tieCount;

    for (let j = start; j <= end; j++) {
      computed[j].rank = rank;
      computed[j].score = computed[j].points / 1000 + avgMod;
    }
    i += 1;
  }

  // 保持座位顺序输出
  const order: SeatKey[] = ['E', 'S', 'W', 'N'];
  return order
    .map((seat) => computed.find((r) => r.seat === seat))
    .filter(Boolean) as ScoredResult[];
}

