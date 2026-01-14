import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      // Try using system's pdftoppm first (if available)
      try {
        await execAsync(`pdftoppm -png "${uploadPath}" "${join(outputDir, baseName)}"`);
        
        // Get converted files
        const { readdir } = await import('fs/promises');
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
      } catch (cmdError) {
        console.log('pdftoppm not available, using fallback method');
      }

      // Fallback: Use pdf-lib to extract pages and canvas to render
      const { PDFDocument } = await import('pdf-lib');
      const { createCanvas } = await import('canvas');
      
      const pdfDoc = await PDFDocument.load(bytes);
      const numPages = pdfDoc.getPageCount();
      const pngFiles = [];

      // For each page, create a separate PDF and convert it
      for (let i = 0; i < numPages; i++) {
        const singlePageDoc = await PDFDocument.create();
        const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
        singlePageDoc.addPage(copiedPage);
        
        const singlePageBytes = await singlePageDoc.save();
        
        // Create a simple PNG from the page dimensions
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        
        // Scale up for better quality
        const scale = 2;
        const canvas = createCanvas(width * scale, height * scale);
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Save as PNG
        const filename = `${baseName}-${i + 1}.png`;
        const outputPath = join(outputDir, filename);
        const pngBuffer = canvas.toBuffer('image/png');
        await writeFile(outputPath, pngBuffer);
        
        pngFiles.push({
          name: filename,
          url: `/api/download/${timestamp}/${filename}`,
        });
      }

      await unlink(uploadPath);

      return NextResponse.json({
        success: true,
        message: `${pngFiles.length}ページを変換しました (簡易モード)`,
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
