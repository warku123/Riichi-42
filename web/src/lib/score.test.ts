import assert from "assert";
import { computeScores } from "./score";

type Seat = "E" | "S" | "W" | "N";

function toResult(points: number[], seats: Seat[] = ["E", "S", "W", "N"]) {
  return seats.map((s, idx) => ({
    seat: s,
    points: points[idx],
    player_id: idx + 1,
  }));
}

// 测试：两人并列第一 -> 平均(+20, -20)=0
{
  const res = computeScores(toResult([40000, 40000, 15000, 5000]));
  const ranks = res.map((r) => r.rank);
  const scores = res.map((r) => r.score);
  assert.deepStrictEqual(ranks.slice(0, 2), [1, 1]);
  assert.strictEqual(scores[0], 40000 / 1000 + 0);
  assert.strictEqual(scores[1], 40000 / 1000 + 0);
}

// 测试：两人并列第二 -> 平均(-20, -40) = -30
{
  const res = computeScores(toResult([50000, 25000, 25000, 0]));
  const ranks = res.map((r) => r.rank);
  const scores = res.map((r) => r.score);
  assert.strictEqual(ranks[0], 1);
  assert.deepStrictEqual(ranks.slice(1, 3), [2, 2]);
  assert.strictEqual(scores[1], 25000 / 1000 - 30);
  assert.strictEqual(scores[2], 25000 / 1000 - 30);
}

// 测试：全体同分 -> 平均(+20,-20,-40,-60) = -25
{
  const res = computeScores(toResult([25000, 25000, 25000, 25000]));
  const ranks = res.map((r) => r.rank);
  const scores = res.map((r) => r.score);
  assert.deepStrictEqual(ranks, [1, 1, 1, 1]);
  scores.forEach((s) => assert.strictEqual(s, 25 - 25)); // 25 -25 = 0? Wait compute? 25000/1000=25, avg -25 => 0
}

// 测试：正常无并列
{
  const res = computeScores(toResult([40000, 30000, 20000, 10000]));
  const ranks = res.map((r) => r.rank);
  const scores = res.map((r) => r.score);
  assert.deepStrictEqual(ranks, [1, 2, 3, 4]);
  assert.strictEqual(scores[0], 40 + 20);
  assert.strictEqual(scores[1], 30 - 20);
  assert.strictEqual(scores[2], 20 - 40);
  assert.strictEqual(scores[3], 10 - 60);
}

// 测试：123名同分
{
  const res = computeScores(toResult([30000, 30000, 30000, 10000]));
  const ranks = res.map((r) => r.rank);
  const scores = res.map((r) => r.score);
  assert.deepStrictEqual(ranks, [1, 1, 1, 4]);
  assert.strictEqual(scores[0], 30 - 40/ 3);
  assert.strictEqual(scores[1], 30 - 40/ 3);
  assert.strictEqual(scores[2], 30 - 40/ 3);
  assert.strictEqual(scores[3], 10 - 60);
}

console.log("score tests passed");

