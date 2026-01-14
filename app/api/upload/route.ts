import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Dynamic import for PDF.js to avoid build issues
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
      // Dynamically import PDF.js and Canvas
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const { createCanvas } = await import('canvas');
      
      // Set worker source to empty to disable worker in Node.js
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
      }

      // Load PDF
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableAutoFetch: true,
        disableStream: true,
      });
      
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;

      const pngFiles = [];

      // Convert each page to PNG
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
          canvasContext: context as any,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

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
