import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/stats/totals - 获取所有选手的总分统计
// 支持可选参数: start, end (ISO 时间字符串)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // 如果没有时间过滤参数，使用视图查询（全部数据）
    if (!start && !end) {
      const { data, error } = await supabase
        .from('player_totals')
        .select('*')
        .order('total_score', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }

    // 有时间过滤参数，使用直接查询
    // 先获取所有玩家
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name');

    if (playersError) {
      return NextResponse.json(
        { error: playersError.message },
        { status: 500 }
      );
    }

    // 构建带时间过滤的 match_results 查询
    let matchQuery = supabase
      .from('matches')
      .select('id, played_at');

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
      // 没有符合条件的比赛，返回所有玩家但分数为0
      const data = players?.map(p => ({
        player_id: p.id,
        name: p.name,  // 统一使用 name 字段，与视图保持一致
        total_score: 0,
        avg_score: 0,
        match_count: 0
      })) || [];

      return NextResponse.json({ data });
    }

    const matchIds = matches.map(m => m.id);

    // 查询这些比赛的结果
    const { data: results, error: resultsError } = await supabase
      .from('match_results')
      .select('player_id, score')
      .in('match_id', matchIds);

    if (resultsError) {
      return NextResponse.json(
        { error: resultsError.message },
        { status: 500 }
      );
    }

    // 聚合计算每个玩家的总分、均分、场次
    const playerStats: Record<number, { total: number; count: number }> = {};

    results?.forEach(r => {
      if (!playerStats[r.player_id]) {
        playerStats[r.player_id] = { total: 0, count: 0 };
      }
      playerStats[r.player_id].total += Number(r.score) || 0;
      playerStats[r.player_id].count += 1;
    });

    // 组装返回数据
    const data = players?.map(p => {
      const stats = playerStats[p.id] || { total: 0, count: 0 };
      return {
        player_id: p.id,
        name: p.name,  // 统一使用 name 字段，与视图保持一致
        total_score: Math.round(stats.total * 100) / 100,
        avg_score: stats.count > 0 
          ? Math.round((stats.total / stats.count) * 100) / 100 
          : 0,
        match_count: stats.count
      };
    }) || [];

    // 按总分降序排列
    data.sort((a, b) => b.total_score - a.total_score);

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

