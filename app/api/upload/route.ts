import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';
import { createCanvas, loadImage } from 'canvas';

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
      // Load PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();
      const numPages = pages.length;

      const pngFiles = [];

      // Use PDF.js for rendering (without worker)
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      
      // Configure to not use worker
      pdfjs.GlobalWorkerOptions.workerSrc = 'data:text/javascript;base64,';

      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableAutoFetch: true,
        disableStream: true,
        disableRange: true,
      });

      const pdfDocument = await loadingTask.promise;

      // Convert each page to PNG
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        await page.render({
          canvasContext: context as any,
          viewport: viewport,
        }).promise;

        // Save as PNG
        const filename = `${baseName}-${pageNum}.png`;
        const outputPath = join(outputDir, filename);
        const pngBuffer = canvas.toBuffer('image/png');
        await writeFile(outputPath, pngBuffer);

        pngFiles.push({
          name: filename,
          url: `/api/download/${timestamp}/${filename}`,
        });
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
