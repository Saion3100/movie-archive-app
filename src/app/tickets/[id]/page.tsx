// src/app/tickets/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTicketById, deleteTicket, MovieTicket } from '../../../utils/db';
import { ArrowLeft, Share2, Trash2, Calendar, MapPin, Film, Star, Check, Award } from 'lucide-react';

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TicketDetailPage({ params }: TicketDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [ticket, setTicket] = useState<MovieTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    async function loadTicket() {
      try {
        const data = await getTicketById(id);
        if (!data) {
          setError('指定されたチケットが見つかりませんでした。');
        } else {
          setTicket(data);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'チケットの読み込み中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    }
    loadTicket();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('このデジタル半券をアーカイブから削除しますか？')) return;
    try {
      await deleteTicket(id);
      router.push('/');
    } catch (err: any) {
      alert(err.message || '削除に失敗しました。');
    }
  };

  const handleShare = async () => {
    if (!ticket) return;
    const shareText = `映画「${ticket.movie_title}」のデジタル半券をアーカイブしました！ 劇場: ${ticket.theater_name} / 座席: ${ticket.seat_raw || '自由席'} ★${ticket.rating.toFixed(1)}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cinema Stub Archive',
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {
        console.warn('Native share failed or cancelled', e);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch (e) {
        console.error('Failed to copy to clipboard', e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-mono">Loading Stub...</span>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-4">
          <div className="text-red-400 text-lg font-bold">⚠️ エラー</div>
          <p className="text-xs text-slate-400">{error || 'チケットデータがありません。'}</p>
          <Link href="/" className="inline-block bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-5 py-2.5 rounded-xl transition-colors">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  // Format Show Date
  const dateObj = new Date(ticket.show_timestamp);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }) + ' ' +
      dateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    : '不明な上映日時';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center relative overflow-x-hidden">
      
      {/* Background Poster Blur */}
      {ticket.poster_path && (
        <div 
          className="absolute -inset-10 opacity-10 bg-cover bg-center blur-2xl pointer-events-none scale-110"
          style={{ backgroundImage: `url(${ticket.poster_path})` }}
        />
      )}

      <div className="w-full max-w-md flex flex-col space-y-6 z-10">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between border-b border-slate-800/40 pb-4">
          <Link href="/" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">DIGITAL STUB</span>
          <button 
            onClick={handleDelete}
            className="p-2 hover:bg-red-950/20 text-slate-400 hover:text-red-400 rounded-full transition-colors"
            title="チケットを削除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </header>

        {/* Action Success Toast */}
        {shared && (
          <div className="bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg animate-bounce justify-center">
            <Check className="w-4 h-4 stroke-[3]" />
            シェア用テキストとURLをクリップボードにコピーしました！
          </div>
        )}

        {/* Elegant Digital Ticket Stub Container */}
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
          
          {/* Top Notch Edge Cutouts & Perforation */}
          {/* Main Visual Poster & Title Section */}
          <div className="p-6 flex flex-col items-center text-center space-y-5">
            
            {/* TMDB Poster Image */}
            <div className="w-44 h-64 bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 shrink-0 relative group">
              {ticket.poster_path ? (
                <img 
                  src={ticket.poster_path} 
                  alt={ticket.movie_title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-950 space-y-2 p-4">
                  <Film className="w-10 h-10" />
                  <span className="text-[10px] uppercase font-bold">No Image</span>
                </div>
              )}
            </div>

            {/* Movie Title */}
            <div className="space-y-1.5 w-full">
              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Certified Archive
              </span>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-wide line-clamp-2 px-2 leading-snug">
                {ticket.movie_title}
              </h2>
            </div>

          </div>

          {/* Ticket Perforation / Stub Cut */}
          <div className="relative h-px my-1 flex justify-between items-center px-4">
            {/* Rounded left and right notches */}
            <div className="w-5 h-5 bg-slate-950 rounded-full -ml-8.5 border-r border-slate-800/80 shrink-0 z-20" />
            <div className="w-full border-t border-dashed border-slate-800" />
            <div className="w-5 h-5 bg-slate-950 rounded-full -mr-8.5 border-l border-slate-800/80 shrink-0 z-20" />
          </div>

          {/* Lower Ticket Stub: Screening Info */}
          <div className="p-6 bg-slate-900/40 backdrop-blur-md space-y-4">
            
            {/* Row 1: Theater Name */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">THEATER</span>
                <span className="text-sm font-bold text-slate-200">{ticket.theater_name}</span>
                {ticket.screen_name && (
                  <span className="text-xs text-slate-400 block mt-0.5">{ticket.screen_name}</span>
                )}
              </div>
            </div>

            {/* Row 2: Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">DATE / TIME</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{formattedDate}</span>
              </div>
            </div>

            {/* Row 3: Seat Info */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">SEAT</span>
                <span className="text-sm font-bold text-amber-200 font-mono">
                  {ticket.seat_raw || '自由席'}
                </span>
              </div>
            </div>

            {/* Row 4: Star Rating */}
            <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const diff = ticket.rating - starIndex;
                  const isFilled = diff >= 0;
                  const isHalf = diff === -0.5;

                  return (
                    <div key={starIndex} className="relative w-4 h-4 select-none pointer-events-none">
                      <Star className="w-4 h-4 text-slate-800 absolute top-0 left-0" />
                      {isFilled && <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute top-0 left-0" />}
                      {isHalf && (
                        <div className="overflow-hidden absolute top-0 left-0 h-full w-1/2">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 max-w-none" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">★{ticket.rating.toFixed(1)}</span>
            </div>

            {/* Row 5: User Memo */}
            {ticket.memo && (
              <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-3 text-xs text-slate-400 italic leading-relaxed">
                "{ticket.memo}"
              </div>
            )}

          </div>
        </div>

        {/* Share Button Action */}
        <button
          onClick={handleShare}
          className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-slate-200 hover:text-amber-500 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs"
        >
          <Share2 className="w-4 h-4" />
          このデジタルチケットをシェアする
        </button>

      </div>
    </main>
  );
}
