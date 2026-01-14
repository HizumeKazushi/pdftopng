# PDF to PNG Converter

PDFファイルをアップロードして高品質なPNG画像に変換するモダンなWebアプリケーションです。

## 特徴

- 🚀 **Next.js + TypeScript** - モダンなフルスタックフレームワーク
- 🎨 **クリーンなUI** - Tailwind CSSによる美しいデザイン
- 📦 **一括ダウンロード** - すべての画像をZIPファイルで一括ダウンロード
- 🖱️ **ドラッグ&ドロップ** - 直感的なファイルアップロード
- ⚡ **高速変換** - poppler-utilsによる高品質な変換

## 必要な環境

- Node.js (v18以上)
- poppler-utils (PDFの変換に必要)

## インストール

### 1. poppler-utilsのインストール

**macOS:**
```bash
brew install poppler
```

**Ubuntu/Debian:**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
[poppler for Windows](http://blog.alivate.com.au/poppler-windows/)からダウンロードしてインストール

### 2. 依存関係のインストール

```bash
npm install
```

## 使い方

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスします。

### 本番ビルド

```bash
npm run build
npm start
```

## 機能

- ✅ PDFファイルのドラッグ&ドロップアップロード
- ✅ 全ページを個別のPNG画像に変換
- ✅ 各画像を個別にダウンロード
- ✅ すべての画像をZIPで一括ダウンロード
- ✅ レスポンシブデザイン
- ✅ モダンでクリーンなUI

## 技術スタック

- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Conversion**: poppler-utils (pdftoppm)
- **File Archive**: archiver
- **File Upload**: multer

## ディレクトリ構造

```
pdftopng/
├── app/
│   ├── api/
│   │   ├── upload/          # PDF変換API
│   │   └── download/        # ダウンロードAPI
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # メインページ
│   └── globals.css          # グローバルスタイル
├── uploads/                 # アップロードされたPDF（一時）
├── output/                  # 変換されたPNG画像
└── public/                  # 静的ファイル
```

## ライセンス

MIT
