import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'PDFファイルをアップロードしてください' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create directories if they don't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    const outputBaseDir = join(process.cwd(), 'output');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(outputBaseDir)) {
      await mkdir(outputBaseDir, { recursive: true });
    }

    // Save uploaded PDF
    const timestamp = Date.now();
    const uploadPath = join(uploadsDir, `${timestamp}.pdf`);
    await writeFile(uploadPath, buffer);

    // Create output directory for this conversion
    const outputDir = join(outputBaseDir, `${timestamp}`);
    await mkdir(outputDir, { recursive: true });

    const baseName = file.name.replace('.pdf', '');

    try {
      // Convert PDF to PNG using pdftoppm
      await execAsync(`pdftoppm -png "${uploadPath}" "${join(outputDir, baseName)}"`);

      // Get converted files
      const files = await readdir(outputDir);
      const pngFiles = files
        .filter(f => f.endsWith('.png'))
        .sort()
        .map(f => ({
          name: f,
          url: `/api/download/${timestamp}/${f}`,
        }));

      if (pngFiles.length === 0) {
        throw new Error('PNG変換に失敗しました');
      }

      // Clean up uploaded PDF
      await unlink(uploadPath);

      return NextResponse.json({
        success: true,
        message: `${pngFiles.length}ページを変換しました`,
        files: pngFiles,
      });
    } catch (error) {
      // Clean up on error
      if (existsSync(uploadPath)) {
        await unlink(uploadPath);
      }
      throw new Error(
        `PDF変換に失敗しました。poppler-utilsがインストールされているか確認してください: ${(error as Error).message}`
      );
    }
  } catch (error) {
    console.error('変換エラー:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
