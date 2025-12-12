import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { computeScores, SeatKey } from '@/lib/score';

// GET /api/matches/[id]/results - 获取某场对局的成绩
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id);
    if (isNaN(matchId)) {
      return NextResponse.json(
        { error: '无效的对局ID' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('match_results')
      .select(`
        *,
        player:players(id, name)
      `)
      .eq('match_id', matchId)
      .order('rank', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// POST /api/matches/[id]/results - 创建或更新对局成绩（4条记录）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id);
    if (isNaN(matchId)) {
      return NextResponse.json(
        { error: '无效的对局ID' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { results } = body; // results 应该是包含4条记录的数组

    if (!Array.isArray(results) || results.length !== 4) {
      return NextResponse.json(
        { error: '必须提供4条成绩记录' },
        { status: 400 }
      );
    }

    // 验证点数总和
    const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);
    if (totalPoints !== 100000) {
      return NextResponse.json(
        { error: `点数总和必须为100000，当前为${totalPoints}` },
        { status: 400 }
      );
    }

    // 验证每个记录的必要字段
    for (const r of results) {
      if (!r.player_id || !r.seat || !r.points) {
        return NextResponse.json(
          { error: '每条记录必须包含 player_id, seat, points' },
          { status: 400 }
        );
      }
      if (!['E', 'S', 'W', 'N'].includes(r.seat)) {
        return NextResponse.json(
          { error: 'seat 必须是 E, S, W, N 之一' },
          { status: 400 }
        );
      }
    }

    // 计算名次与分数（同分共享加减分）
    const computedBySeat = computeScores(
      results.map((r: any) => ({
        seat: r.seat as SeatKey,
        points: Number(r.points),
        player_id: typeof r.player_id === 'string' ? parseInt(r.player_id) : r.player_id,
      }))
    );

    // 先删除该对局的旧记录（如果存在）
    const { error: deleteError } = await supabase
      .from('match_results')
      .delete()
      .eq('match_id', matchId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // 插入新记录
    const records = computedBySeat.map(r => ({
      match_id: matchId,
      player_id: typeof r.player_id === 'string' ? parseInt(r.player_id) : r.player_id,
      seat: r.seat as SeatKey,
      points: r.points,
      rank: r.rank,
      score: r.score,
    }));

    const { data, error } = await supabase
      .from('match_results')
      .insert(records)
      .select(`
        *,
        player:players(id, name)
      `);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

