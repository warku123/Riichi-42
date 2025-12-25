import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/players - 获取所有选手列表
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true });

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

// POST /api/players - 创建新选手
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: '选手名称不能为空' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('players')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      // 如果是唯一约束冲突
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '该选手名称已存在' },
          { status: 409 }
        );
      }
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

// DELETE /api/players - 删除选手及关联对局，body: { id: number }
// 步骤：
// 1) 找到该选手参与的 match_ids
// 2) 删除这些 match_results
// 3) 删除这些 matches
// 4) 删除 player
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;
    const playerId = typeof id === 'string' ? parseInt(id) : id;

    if (!playerId || Number.isNaN(playerId)) {
      return NextResponse.json(
        { error: '无效的选手ID' },
        { status: 400 }
      );
    }

    // 1) 找到该选手参与的对局ID
    const { data: matchIdsData, error: matchIdsError } = await supabase
      .from('match_results')
      .select('match_id')
      .eq('player_id', playerId);

    if (matchIdsError) {
      return NextResponse.json(
        { error: matchIdsError.message },
        { status: 500 }
      );
    }

    const matchIds = Array.from(new Set((matchIdsData || []).map((m) => m.match_id)));

    // 2) 删除相关 match_results
    if (matchIds.length > 0) {
      const { error: delResultsError } = await supabase
        .from('match_results')
        .delete()
        .in('match_id', matchIds);

      if (delResultsError) {
        return NextResponse.json(
          { error: delResultsError.message },
          { status: 500 }
        );
      }

      // 3) 删除相关 matches
      const { error: delMatchesError } = await supabase
        .from('matches')
        .delete()
        .in('id', matchIds);

      if (delMatchesError) {
        return NextResponse.json(
          { error: delMatchesError.message },
          { status: 500 }
        );
      }
    }

    // 4) 删除 player
    const { error: delPlayerError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (delPlayerError) {
      return NextResponse.json(
        { error: delPlayerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// PATCH /api/players - 修改选手名称，要求 body: { id: number, name: string }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;
    const playerId = typeof id === 'string' ? parseInt(id) : id;

    if (!playerId || Number.isNaN(playerId)) {
      return NextResponse.json({ error: '无效的选手ID' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: '选手名称不能为空' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('players')
      .update({ name: name.trim() })
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '该选手名称已存在' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

