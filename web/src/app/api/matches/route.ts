import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/matches - 获取对局列表，可选 start/end 过滤
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const start = searchParams.get('start'); // ISO string
    const end = searchParams.get('end');     // ISO string

    let query = supabase
      .from('matches')
      .select('*')
      .order('played_at', { ascending: false });

    if (start) {
      query = query.gte('played_at', start);
    }
    if (end) {
      query = query.lte('played_at', end);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

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

// POST /api/matches - 创建新对局
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { note, table_no } = body;

    const { data, error } = await supabase
      .from('matches')
      .insert({
        note: note || null,
        table_no: table_no || null,
      })
      .select()
      .single();

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

