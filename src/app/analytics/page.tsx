// src/app/analytics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTickets, MovieTicket } from '../../utils/db';
import { ArrowLeft, Sparkles, PieChart, Users, Award, Percent } from 'lucide-react';

export default function AnalyticsPage() {
  const [tickets, setTickets] = useState<MovieTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      try {
        const data = await getTickets();
        setTickets(data);
      } catch (e) {
        console.error('Failed to load tickets for analytics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-mono">Analyzing seats...</span>
        </div>
      </div>
    );
  }

  // Filter tickets that have seat row and number information
  const validTickets = tickets.filter(
    (t) => t.seat_row && t.seat_number !== null && t.seat_number !== undefined
  );

  // Compute statistics
  const totalWithSeats = validTickets.length;
  
  let rowFront = 0; // A-E
  let rowMiddle = 0; // F-J
  let rowBack = 0; // K+

  let numLeft = 0; // 1-6
  let numCenter = 0; // 7-15
  let numRight = 0; // 16+

  // Grid coordinates mapping (3x3): rows: [front, mid, back], cols: [left, center, right]
  // 0: front/left, 1: front/center, 2: front/right
  // 3: mid/left, 4: mid/center, 5: mid/right
  // 6: back/left, 7: back/center, 8: back/right
  const gridCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0];

  validTickets.forEach((t) => {
    const row = t.seat_row!.toUpperCase();
    const num = t.seat_number!;

    let rIdx = 1; // Default middle
    if (row >= 'A' && row <= 'E') {
      rowFront++;
      rIdx = 0;
    } else if (row >= 'F' && row <= 'J') {
      rowMiddle++;
      rIdx = 1;
    } else {
      rowBack++;
      rIdx = 2;
    }

    let cIdx = 1; // Default center
    if (num <= 6) {
      numLeft++;
      cIdx = 0;
    } else if (num >= 7 && num <= 15) {
      numCenter++;
      cIdx = 1;
    } else {
      numRight++;
      cIdx = 2;
    }

    const gridIdx = rIdx * 3 + cIdx;
    gridCounts[gridIdx]++;
  });

  const getPercent = (count: number) => {
    if (totalWithSeats === 0) return 0;
    return Math.round((count / totalWithSeats) * 100);
  };

  // Find favorite zone
  let maxCount = 0;
  let favGridIdx = 4; // Default middle-center
  gridCounts.forEach((count, idx) => {
    if (count > maxCount) {
      maxCount = count;
      favGridIdx = idx;
    }
  });

  // Describe zones
  const gridNames = [
    '前方・左エリア', '前方・中央エリア', '前方・右エリア',
    '中央・左エリア', '中央・中央エリア', '中央・右エリア',
    '後方・左エリア', '後方・中央エリア', '後方・右エリア'
  ];

  const gridRecommendSeats = [
    'C列 5番', 'C列 10番', 'C列 18番',
    'H列 5番', 'H列 12番', 'H列 18番',
    'K列 5番', 'L列 12番', 'K列 18番'
  ];

  const hasData = totalWithSeats > 0;
  const favoriteZoneName = hasData ? gridNames[favGridIdx] : '中央・中央エリア';
  const recommendedSeat = hasData ? gridRecommendSeats[favGridIdx] : 'J列 12番';

  // Dynamic recommendation commentary
  let recommendationText = '';
  if (!hasData) {
    recommendationText = 'まだ十分な座席データがありません。チケットをスキャンして座席情報を登録すると、あなたの映画鑑賞の偏愛傾向に基づいたおすすめの座席番号がここにレコメンドされます！';
  } else {
    let rowText = '中央（F〜J列）';
    if (favGridIdx < 3) rowText = '前方（A〜E列）';
    else if (favGridIdx >= 6) rowText = '後方（K列以降）';

    let colText = '中央';
    if (favGridIdx % 3 === 0) colText = '左端';
    else if (favGridIdx % 3 === 2) colText = '右端';

    recommendationText = `過去の鑑賞履歴から、あなたは『劇場内の${rowText}・${colText}エリア（${favoriteZoneName}）』を好む強い偏愛傾向があります！このエリアはスクリーンへの視覚的アプローチが非常によく、鑑賞時の姿勢が安定する映画ファンに人気の座席です。次に劇場に行くなら、${recommendedSeat}が最もおすすめです。`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link href="/" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <h1 className="text-xl font-bold text-slate-200">座席お好み分析</h1>
          <div className="w-9" />
        </header>

        {/* Total Summary */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-bold block">登録チケット総数</span>
            <span className="text-2xl font-extrabold text-slate-100 font-mono mt-1 block">{tickets.length}</span>
          </div>
          <div className="text-center p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-bold block">分析対象座席数</span>
            <span className="text-2xl font-extrabold text-amber-500 font-mono mt-1 block">{totalWithSeats}</span>
          </div>
        </div>

        {/* 3x3 Heatmap Grid */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <PieChart className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">座席エリア分布</h2>
            </div>
            {hasData && (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">
                ヒートマップ
              </span>
            )}
          </div>

          {/* SCREEN LABEL */}
          <div className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center py-1.5 rounded-xl">
            SCREEN / SCREEN VIEW
          </div>

          {/* 3x3 Seating Matrix */}
          <div className="grid grid-cols-3 gap-2.5 aspect-square">
            {gridCounts.map((count, index) => {
              const pct = getPercent(count);
              const isFav = hasData && index === favGridIdx;

              return (
                <div
                  key={index}
                  className={`rounded-2xl border flex flex-col items-center justify-center p-2 transition-all relative overflow-hidden ${
                    isFav
                      ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-lg shadow-amber-500/5'
                      : pct > 0
                      ? 'bg-slate-900 border-slate-700 text-slate-300'
                      : 'bg-slate-950/60 border-slate-900 text-slate-600'
                  }`}
                >
                  {isFav && (
                    <span className="absolute top-1.5 left-1.5 text-[8px] bg-amber-500 text-slate-950 px-1 py-0.2 rounded font-extrabold tracking-wide scale-90">
                      FAV
                    </span>
                  )}
                  <span className="text-lg font-mono font-extrabold">
                    {pct}%
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 mt-1 scale-90 shrink-0 text-center line-clamp-1">
                    {index < 3 ? '前方' : index < 6 ? '中央' : '後方'}-{index % 3 === 0 ? '左' : index % 3 === 1 ? '中' : '右'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Seating Recommendation Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Award className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider">パーソナライズ・レコメンド</h2>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 border border-slate-800 p-4 rounded-2xl relative">
              <Sparkles className="w-4 h-4 text-amber-500/50 absolute top-3 right-3 animate-pulse" />
              {recommendationText}
            </div>

            {hasData && (
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">次回おすすめの指定席:</span>
                </div>
                <span className="text-sm font-extrabold text-amber-200 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                  {recommendedSeat}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
