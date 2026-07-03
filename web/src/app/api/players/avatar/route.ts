import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const API_SECRET = process.env.API_SECRET;
const STORAGE_BUCKET = 'player-avatars';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const PLAYER_FIELDS = 'id, name, avatar_url';

// GET /api/players/avatar — not implemented
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// POST /api/players/avatar — upload player avatar
// multipart/form-data fields: player_id, file
export async function POST(request: NextRequest) {
  try {
    // 1. API key validation (same pattern as proxy.ts)
    const key = request.headers.get('x-api-key');
    if (!API_SECRET || key !== API_SECRET) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Parse multipart form
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: '请求必须为 multipart/form-data' },
        { status: 400 }
      );
    }

    const playerIdRaw = formData.get('player_id');
    const file = formData.get('file');

    if (!playerIdRaw || typeof playerIdRaw !== 'string') {
      return NextResponse.json({ error: '缺少有效的 player_id' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '缺少文件字段' }, { status: 400 });
    }

    const playerId = parseInt(playerIdRaw);

    if (Number.isNaN(playerId)) {
      return NextResponse.json({ error: '无效的 player_id' }, { status: 400 });
    }

    // 3. Validate player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id')
      .eq('id', playerId)
      .maybeSingle();

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }
    if (!player) {
      return NextResponse.json({ error: '选手不存在' }, { status: 404 });
    }

    // 4. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `文件类型不支持，仅允许: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小超过 2MB 限制' },
        { status: 400 }
      );
    }

    // 6. Upload to Supabase Storage using service-role client
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${playerId}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: '文件上传失败: ' + uploadError.message },
        { status: 500 }
      );
    }

    // 7. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const avatarUrl = urlData?.publicUrl;

    // 8. Update player record
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('players')
      .update({ avatar_url: avatarUrl })
      .eq('id', playerId)
      .select(PLAYER_FIELDS)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: '更新选手头像 URL 失败: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
