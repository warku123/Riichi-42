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

