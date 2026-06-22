// src/app/scan/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Upload, ArrowLeft, Sparkles, AlertCircle, FileText } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const processImageFile = (file: File) => {
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const response = await fetch('/api/tickets/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64String }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'スキャンに失敗しました。');
        }

        // Save draft to session storage
        sessionStorage.setItem('draft_ticket', JSON.stringify({
          ...data.parsed,
          rawOcrText: data.rawText
        }));

        // Redirect to edit page
        router.push('/edit');
      } catch (err: any) {
        console.error(err);
        setError(err.message || '画像の読み込みまたは解析に失敗しました。');
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('ファイルの読み込みに失敗しました。');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const triggerMockScan = async (templateId: 'toho' | 'aeon' | 'c109') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mockTemplate: templateId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'シミュレーションに失敗しました。');
      }

      // Save draft to session storage
      sessionStorage.setItem('draft_ticket', JSON.stringify({
        ...data.parsed,
        rawOcrText: data.rawText
      }));

      // Redirect to edit page
      router.push('/edit');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'モックの解析に失敗しました。');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link href="/" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <h1 className="text-xl font-bold text-slate-200">チケットスキャン</h1>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Loading overlay */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-amber-200">チケットを解析中...</h3>
              <p className="text-xs text-slate-400 animate-pulse">
                Cloud Vision APIで文字をパースし、<br />
                上映データと座席を自動抽出しています
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6">
            
            {/* Error display */}
            {error && (
              <div className="bg-red-950/40 border border-red-800/40 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">{error}</div>
              </div>
            )}

            {/* Drag Drop or Upload Zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-900/40 hover:bg-slate-900/70 p-10 rounded-3xl flex flex-col items-center text-center cursor-pointer transition-all space-y-4 group"
            >
              <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:scale-105 transition-all">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">チケットを撮影・アップロード</h3>
                <p className="text-xs text-slate-500">
                  感熱紙のレシートチケットを撮影するか、画像ファイルを選択してください
                </p>
              </div>
              <button className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                ファイルを選択
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
              />
            </div>

            {/* Mock Simulator Panel */}
            <div className="bg-slate-900/50 border border-slate-800/70 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">OCR デモ用シミュレータ</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                実機でのカメラ撮影やAPIキーの設定がなくても、大手映画館のレシートチケットをシミュレートしてOCRパース処理・TMDb連携を体験できます。
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => triggerMockScan('toho')}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-left hover:bg-slate-900/40 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                    <div>
                      <div className="font-bold text-slate-300">TOHOシネマズ形式</div>
                      <div className="text-[10px] text-slate-500">エヴァンゲリオン / スクリーン7 / J-12</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 px-2 py-1 rounded text-slate-400 font-bold transition-all">シミュレート</span>
                </button>

                <button
                  onClick={() => triggerMockScan('aeon')}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-left hover:bg-slate-900/40 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                    <div>
                      <div className="font-bold text-slate-300">イオンシネマ形式</div>
                      <div className="text-[10px] text-slate-500">名探偵コナン / スクリーン8 / G-15</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 px-2 py-1 rounded text-slate-400 font-bold transition-all">シミュレート</span>
                </button>

                <button
                  onClick={() => triggerMockScan('c109')}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-left hover:bg-slate-900/40 transition-all text-xs group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                    <div>
                      <div className="font-bold text-slate-300">109シネマズ形式</div>
                      <div className="text-[10px] text-slate-500">マッドマックス / シアター3 / F-8</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 group-hover:bg-amber-500 group-hover:text-slate-950 px-2 py-1 rounded text-slate-400 font-bold transition-all">シミュレート</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
