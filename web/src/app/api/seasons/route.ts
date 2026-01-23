import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET /api/seasons - 获取所有赛季列表
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: false });

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

// POST /api/seasons - 创建新赛季
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, start_date } = body;

    if (!name || !start_date) {
      return NextResponse.json(
        { error: '缺少必要字段: name, start_date' },
        { status: 400 }
      );
    }

    // 1. 结束当前活跃赛季（设置 end_date 并取消 is_active）
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .single();

    if (activeSeason) {
      const { error: updateError } = await supabase
        .from('seasons')
        .update({ 
          end_date: start_date,
          is_active: false 
        })
        .eq('id', activeSeason.id);

      if (updateError) {
        return NextResponse.json(
          { error: '结束上一赛季失败: ' + updateError.message },
          { status: 500 }
        );
      }
    }

    // 2. 创建新赛季
    const { data, error } = await supabase
      .from('seasons')
      .insert([{ 
        name, 
        start_date,
        is_active: true 
      }])
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

// PUT /api/seasons - 更新赛季信息
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, start_date, end_date, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { error: '缺少必要字段: id' },
        { status: 400 }
      );
    }

    // 如果要设置为活跃，先取消其他活跃赛季
    if (is_active === true) {
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', id);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('seasons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

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

// DELETE /api/seasons - 删除赛季
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少必要参数: id' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
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
