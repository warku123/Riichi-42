import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/matches/[id] - 获取单场对局
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id);
    if (Number.isNaN(matchId)) {
      return NextResponse.json({ error: '无效的对局ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/matches/[id] - 更新对局信息（note, table_no, played_at）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id);
    if (Number.isNaN(matchId)) {
      return NextResponse.json({ error: '无效的对局ID' }, { status: 400 });
    }

    const body = await request.json();
    const { note, table_no, played_at } = body;

    const updateData: Record<string, unknown> = {
      note: note ?? null,
      table_no: table_no ?? null,
    };
    if (played_at) {
      updateData.played_at = played_at;
    }

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/matches/[id] - 删除对局（级联删除 match_results）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = parseInt(id);
    if (Number.isNaN(matchId)) {
      return NextResponse.json({ error: '无效的对局ID' }, { status: 400 });
    }

    // 先删 match_results（虽然有 ON DELETE CASCADE，但保证兼容）
    const { error: delResultsError } = await supabase
      .from('match_results')
      .delete()
      .eq('match_id', matchId);

    if (delResultsError) {
      return NextResponse.json({ error: delResultsError.message }, { status: 500 });
    }

    const { error: delMatchError } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (delMatchError) {
      return NextResponse.json({ error: delMatchError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

