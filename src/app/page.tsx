// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTickets, saveTicket, isSupabaseConfigured, MovieTicket } from '../utils/db';
import { Plus, Camera, PieChart, Film, Database } from 'lucide-react';

const INITIAL_MOCK_TICKETS = [
  {
    user_id: '00000000-0000-0000-0000-000000000000',
    theater_name: '京成ローザ⑩',
    screen_name: 'イースト④',
    show_timestamp: '2026-04-13T14:50:00.000Z',
    movie_title: '名探偵コナン 100万ドルの五稜星',
    poster_path: 'https://image.tmdb.org/t/p/w500/kSMM1c1F4245g396e94T6t6g6M8.jpg',
    seat_raw: 'E-10',
    seat_row: 'E',
    seat_number: 10,
    raw_ocr_text: '8001260413023900100443444'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000000',
    theater_name: 'TOHOシネマズ新宿',
    screen_name: 'SCREEN 7',
    show_timestamp: '2026-06-22T13:30:00.000Z',
    movie_title: 'シン・エヴァンゲリオン劇場版',
    poster_path: 'https://image.tmdb.org/t/p/w500/wz7nS5ZlYkZzSux2p6q9F2e61yG.jpg',
    seat_raw: 'J-12',
    seat_row: 'J',
    seat_number: 12,
    raw_ocr_text: 'ＴＯＨＯシネマズ新宿\nスクリーン7\nJ-12\n一般'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000000',
    theater_name: '109シネマズ二子玉川',
    screen_name: 'シアター3 (IMAX)',
    show_timestamp: '2026-06-20T18:00:00.000Z',
    movie_title: 'マッドマックス：フュリオサ',
    poster_path: 'https://image.tmdb.org/t/p/w500/h8g6Qd7z44mUu5Wn4M4q3X4J4X4.jpg',
    seat_raw: 'F-8',
    seat_row: 'F',
    seat_number: 8,
    raw_ocr_text: '109シネマズ二子玉川\nシアター3\nF-8\nIMAX'
  }
];

export default function DashboardPage() {
  const [tickets, setTickets] = useState<MovieTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbType, setDbType] = useState<'Supabase' | 'LocalStorage'>('LocalStorage');

  useEffect(() => {
    async function initAndLoad() {
      try {
        const isSupa = isSupabaseConfigured();
        setDbType(isSupa ? 'Supabase' : 'LocalStorage');

        // APIエンドポイント経由でチケット取得（サーバー保存データと同期）
        let loadedTickets: MovieTicket[] = [];
        try {
          const res = await fetch('/api/tickets');
          if (res.ok) {
            const data = await res.json();
            loadedTickets = data.tickets || [];
          }
        } catch {
          // API失敗時はLocalStorageから取得
          loadedTickets = await getTickets();
        }
        
        // If empty, populate initial mock tickets for amazing first experience!
        if (loadedTickets.length === 0) {
          console.log('Populating dashboard with beautiful sample tickets...');
          for (const item of INITIAL_MOCK_TICKETS) {
            await saveTicket(item);
          }
          // 再度API取得
          try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
              const data = await res.json();
              loadedTickets = data.tickets || [];
            }
          } catch {
            loadedTickets = await getTickets();
          }
        }
        
        setTickets(loadedTickets);
      } catch (e) {
        console.error('Failed to load tickets:', e);
      } finally {
        setLoading(false);
      }
    }
    initAndLoad();
  }, []);

  // Compute fast stats
  const totalCount = tickets.length;
  
  // Preferred Seat zone
  const ticketsWithSeats = tickets.filter(t => t.seat_row);
  let favZone = '未特定';
  if (ticketsWithSeats.length > 0) {
    let front = 0, mid = 0, back = 0;
    ticketsWithSeats.forEach(t => {
      const row = t.seat_row!.toUpperCase();
      if (row >= 'A' && row <= 'E') front++;
      else if (row >= 'F' && row <= 'J') mid++;
      else back++;
    });
    
    if (front >= mid && front >= back) favZone = '前方エリア';
    else if (mid >= front && mid >= back) favZone = '中央エリア';
    else favZone = '後方エリア';
  }

  // Favorite Theater
  let favTheater = '未特定';
  if (tickets.length > 0) {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const cleanName = t.theater_name.split(' ')[0]; // Group by brand prefix
      counts[cleanName] = (counts[cleanName] || 0) + 1;
    });
    let max = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > max) {
        max = count;
        favTheater = name;
      }
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 pb-24 relative flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col space-y-6">
        
        {/* Header Title Section */}
        <header className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Movie棚
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-full font-mono">
              <Database className="w-3 h-3 text-amber-500" />
              <span>{dbType}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">一生色褪せない、あなただけのデジタル半券コレクション</p>
        </header>

        {/* Dashboard Statistics Header */}
        <div className="grid grid-cols-3 gap-3">
          
          <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Tickets</span>
            <div className="mt-auto">
              <span className="text-2xl font-extrabold text-slate-100 font-mono">{totalCount}</span>
              <span className="text-[9px] text-slate-500 font-bold ml-1 font-mono">枚</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Fav Theater</span>
            <div className="mt-auto">
              <span className="text-xs font-bold text-amber-400 truncate block">{favTheater}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-3 rounded-2xl flex flex-col justify-between aspect-square">
            <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Fav Zone</span>
            <div className="mt-auto">
              <span className="text-xs font-bold text-slate-300 block">{favZone}</span>
            </div>
          </div>

        </div>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scan"
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 px-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/5 group"
          >
            <Camera className="w-4 h-4 group-hover:scale-105 transition-transform" />
            新規チケットを追加
          </Link>
          <Link
            href="/analytics"
            className="bg-slate-900 border border-slate-800 hover:border-amber-500/20 text-slate-200 hover:text-amber-400 font-bold py-3 px-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <PieChart className="w-4 h-4" />
            お好み座席分析
          </Link>
        </div>

        {/* Movie Shelf Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">My Collection Shelf</h2>
            <span className="text-[10px] text-slate-600 font-mono">上映日降順</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
              <span className="text-[10px] text-slate-500 font-mono">Loading Shelf...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="border-2 border-dashed border-slate-900 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-4">
              <Film className="w-10 h-10 text-slate-700" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-300">映画棚は空っぽです</h3>
                <p className="text-xs text-slate-500">最初のチケットをスキャンして、デジタル半券をコレクションしましょう！</p>
              </div>
              <Link 
                href="/scan" 
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl font-bold transition-colors"
              >
                スキャンを開始する
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {tickets.map((ticket) => {
                const dateObj = new Date(ticket.show_timestamp);
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })
                  : '—';

                return (
                  <Link 
                    href={`/tickets/${ticket.id}`} 
                    key={ticket.id}
                    className="group flex flex-col bg-slate-900/40 border border-slate-900 hover:border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/2"
                  >
                    {/* Poster View */}
                    <div className="aspect-[3/4] relative overflow-hidden bg-slate-950 shrink-0">
                      {ticket.poster_path ? (
                        <img 
                          src={ticket.poster_path} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 p-4 space-y-1">
                          <Film className="w-7 h-7" />
                          <span className="text-[9px] uppercase font-bold text-slate-700">No Image</span>
                        </div>
                      )}
                      
                      {/* Top Overlay Badge for date */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <span className="text-[9px] bg-slate-950/80 backdrop-blur-md text-amber-400 px-1.5 py-0.5 rounded font-bold font-mono shadow-md border border-slate-900">
                          {dateStr}
                        </span>
                      </div>
                    </div>

                    {/* Perforation Line Border */}
                    <div className="relative h-px bg-slate-950 flex justify-between items-center my-0 z-20">
                      <div className="w-2.5 h-2.5 bg-slate-950 rounded-full -ml-1.5 border-r border-slate-900/60" />
                      <div className="w-full border-t border-dashed border-slate-900" />
                      <div className="w-2.5 h-2.5 bg-slate-950 rounded-full -mr-1.5 border-l border-slate-900/60" />
                    </div>

                    {/* Stub Text View */}
                    <div className="p-3 space-y-1 bg-slate-900/20 flex-grow flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-amber-400 transition-colors">
                        {ticket.movie_title}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="truncate max-w-[80px]">{ticket.theater_name.split(' ')[0]}</span>
                        <span className="text-amber-200 font-bold">{ticket.seat_raw || '自由席'}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>



      </div>

      {/* Floating Action Button "+" */}
      <Link
        href="/scan"
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all z-40 hover:rotate-90 duration-300 animate-pulse hover:animate-none"
        style={{ boxShadow: '0 8px 30px rgba(245, 158, 11, 0.3)' }}
      >
        <Plus className="w-7 h-7 stroke-[3]" />
      </Link>
      
    </main>
  );
}