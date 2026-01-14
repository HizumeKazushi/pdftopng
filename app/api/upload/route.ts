import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    const baseName = file.name.replace('.pdf', '').replace(/[^a-zA-Z0-9-_]/g, '_');

    try {
      // Try using system's pdftoppm first (for local development)
      let usedPdftoppm = false;
      try {
        await execAsync(`which pdftoppm`);
        await execAsync(`pdftoppm -png "${uploadPath}" "${join(outputDir, baseName)}"`);
        usedPdftoppm = true;
      } catch {
        console.log('pdftoppm not available, using mupdf');
      }

      if (usedPdftoppm) {
        const files = await readdir(outputDir);
        const pngFiles = files
          .filter(f => f.endsWith('.png'))
          .sort()
          .map(f => ({
            name: f,
            url: `/api/download/${timestamp}/${f}`,
          }));

        if (pngFiles.length > 0) {
          await unlink(uploadPath);
          return NextResponse.json({
            success: true,
            message: `${pngFiles.length}ページを変換しました`,
            files: pngFiles,
          });
        }
      }

      // Fallback: Use mupdf (works in Vercel)
      const mupdf = await import('mupdf');
      
      const doc = mupdf.Document.openDocument(buffer, 'application/pdf');
      const numPages = doc.countPages();
      const pngFiles = [];

      for (let i = 0; i < numPages; i++) {
        const page = doc.loadPage(i);
        const bounds = page.getBounds();
        const width = bounds[2] - bounds[0];
        const height = bounds[3] - bounds[1];
        
        // Scale for better quality (2x)
        const scale = 2;
        const pixmap = page.toPixmap(
          mupdf.Matrix.scale(scale, scale),
          mupdf.ColorSpace.DeviceRGB,
          false,
          true
        );
        
        const pngData = pixmap.asPNG();
        
        const filename = `${baseName}-${i + 1}.png`;
        const outputPath = join(outputDir, filename);
        await writeFile(outputPath, pngData);
        
        pngFiles.push({
          name: filename,
          url: `/api/download/${timestamp}/${filename}`,
        });
      }

      await unlink(uploadPath);

      return NextResponse.json({
        success: true,
        message: `${pngFiles.length}ページを変換しました`,
        files: pngFiles,
      });

    } catch (error) {
      if (existsSync(uploadPath)) {
        await unlink(uploadPath);
      }
      console.error('PDF conversion error:', error);
      throw new Error(
        `PDF変換に失敗しました: ${(error as Error).message}`
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
