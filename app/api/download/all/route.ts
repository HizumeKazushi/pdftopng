import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import archiver from 'archiver';

// Use /tmp for Vercel serverless
const getTempDir = () => {
  if (process.env.VERCEL) {
    return '/tmp';
  }
  return process.cwd();
};

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'ファイルリストが無効です' },
        { status: 400 }
      );
    }

    const tempDir = getTempDir();
    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    // Add files to archive
    for (const file of files) {
      const urlParts = file.url.split('/');
      const folder = urlParts[urlParts.length - 2];
      const filename = urlParts[urlParts.length - 1];
      const filePath = join(tempDir, 'output', folder, filename);

      if (existsSync(filePath)) {
        const fileBuffer = await readFile(filePath);
        archive.append(fileBuffer, { name: filename });
      }
    }

    archive.finalize();

    // Convert archive stream to Response
    const chunks: Buffer[] = [];
    
    for await (const chunk of archive as unknown as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="converted-images.zip"',
      },
    });
  } catch (error) {
    console.error('一括ダウンロードエラー:', error);
    return NextResponse.json(
      { error: '一括ダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}
