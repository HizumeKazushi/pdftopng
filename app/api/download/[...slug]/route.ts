import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Use /tmp for Vercel serverless
const getTempDir = () => {
  if (process.env.VERCEL) {
    return '/tmp';
  }
  return process.cwd();
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const [folder, filename] = slug;

    const tempDir = getTempDir();
    const filePath = join(tempDir, 'output', folder, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    return NextResponse.json(
      { error: 'ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}
