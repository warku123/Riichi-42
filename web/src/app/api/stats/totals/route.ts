import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/stats/totals - 获取所有选手的总分统计
export async function GET() {
  try {
    // 使用视图查询
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
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

