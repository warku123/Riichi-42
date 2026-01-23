import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/stats/player-history - 获取玩家的比赛历史（名次走势）
// 参数: player_id (必须), limit (可选，默认10), start (可选), end (可选)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('player_id');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!playerId) {
      return NextResponse.json(
        { error: '缺少必要参数: player_id' },
        { status: 400 }
      );
    }

    // 先获取符合时间条件的比赛 ID
    let matchQuery = supabase
      .from('matches')
      .select('id, played_at')
      .order('played_at', { ascending: false });

    if (start) {
      matchQuery = matchQuery.gte('played_at', start);
    }
    if (end) {
      matchQuery = matchQuery.lte('played_at', end);
    }

    const { data: matches, error: matchesError } = await matchQuery;

    if (matchesError) {
      return NextResponse.json(
        { error: matchesError.message },
        { status: 500 }
      );
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const matchIds = matches.map(m => m.id);
    const matchMap = new Map(matches.map(m => [m.id, m.played_at]));

    // 查询该玩家在这些比赛中的结果
    const { data: results, error } = await supabase
      .from('match_results')
      .select('id, match_id, rank, score, points, seat')
      .eq('player_id', playerId)
      .in('match_id', matchIds);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 格式化数据，按时间排序后取最近 N 场，然后正序排列（最早的在前面，方便绘图）
    const history = results
      ?.map(r => ({
        match_id: r.match_id,
        played_at: matchMap.get(r.match_id) as string,
        rank: r.rank,
        score: r.score,
        points: r.points,
        seat: r.seat
      }))
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
      .slice(0, limit)
      .reverse() || [];

    return NextResponse.json({ data: history });
  } catch (err) {
    console.error('获取玩家历史失败:', err);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
