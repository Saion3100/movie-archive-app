// src/app/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Film, MapPin, Calendar, CreditCard, Check } from 'lucide-react';

interface TMDBMovie {
  id: number;
  title: string;
  releaseDate: string;
  posterUrl: string | null;
  overview: string;
}

export default function EditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [movieQuery, setMovieQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [theaterName, setTheaterName] = useState('');
  const [screenName, setScreenName] = useState('');
  const [showTimestamp, setShowTimestamp] = useState(''); // YYYY-MM-DDTHH:mm
  const [seatRow, setSeatRow] = useState('');
  const [seatNumber, setSeatNumber] = useState('');

  const [rawOcrText, setRawOcrText] = useState('');

  // Initial load from session storage
  useEffect(() => {
    const draftStr = sessionStorage.getItem('draft_ticket');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        
        if (draft.movieTitleQuery) {
          setMovieQuery(draft.movieTitleQuery);
          setManualTitle(draft.movieTitleQuery);
          // Auto search
          searchTMDB(draft.movieTitleQuery);
        }

        if (draft.theaterName) setTheaterName(draft.theaterName);
        if (draft.screenName) setScreenName(draft.screenName);
        if (draft.seatRow) setSeatRow(draft.seatRow);
        if (draft.seatNumber) setSeatNumber(draft.seatNumber.toString());
        if (draft.rawOcrText) setRawOcrText(draft.rawOcrText);

        if (draft.showTimestamp) {
          // Convert ISO String to YYYY-MM-DDTHH:mm for input datetime-local
          const date = new Date(draft.showTimestamp);
          if (!isNaN(date.getTime())) {
            const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
            const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
            setShowTimestamp(localISOTime);
          }
        } else {
          // Default to today
          const now = new Date();
          const tzOffset = now.getTimezoneOffset() * 60000;
          const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
          setShowTimestamp(localISOTime);
        }
      } catch (e) {
        console.error('Failed to parse draft ticket:', e);
      }
    } else {
      // No draft ticket: set default date to now
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setShowTimestamp(localISOTime);
    }
  }, []);

  const searchTMDB = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('映画の検索に失敗しました。');
      const data = await res.json();
      if (data.movies) {
        setSearchResults(data.movies);
        if (data.movies.length > 0) {
          setSelectedMovie(data.movies[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'TMDb検索中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Compute seatRaw
    const row = seatRow.trim().toUpperCase();
    const num = seatNumber.trim();
    const seatRawCombined = row && num ? `${row}-${num}` : row || num || null;

    const payload = {
      user_id: '00000000-0000-0000-0000-000000000000',
      theater_name: theaterName.trim() || '未特定の劇場',
      screen_name: screenName.trim() || null,
      show_timestamp: showTimestamp ? new Date(showTimestamp).toISOString() : new Date().toISOString(),
      movie_title: selectedMovie ? selectedMovie.title : manualTitle.trim() || '未特定の作品',
      poster_path: selectedMovie ? selectedMovie.posterUrl : null,
      seat_raw: seatRawCombined,
      seat_row: row || null,
      seat_number: num ? parseInt(num, 10) : null,
      raw_ocr_text: rawOcrText || null
    };

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '保存に失敗しました。');
      }

      // Clear draft
      sessionStorage.removeItem('draft_ticket');
      
      // Redirect to detail page
      router.push(`/tickets/${data.ticket.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'チケットの保存に失敗しました。');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link href="/scan" className="p-2 hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <h1 className="text-xl font-bold text-slate-200">データ補完・確認</h1>
          <div className="w-9" />
        </header>

        {error && (
          <div className="bg-red-950/40 border border-red-800/40 p-4 rounded-xl text-xs text-red-200">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 pb-16">
          
          {/* Section 1: Movie Link */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <Film className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">1. 映画タイトルの紐付け</h2>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={movieQuery}
                  onChange={(e) => setMovieQuery(e.target.value)}
                  placeholder="タイトルで再検索..."
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => searchTMDB(movieQuery)}
                  disabled={loading}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs px-4 rounded-2xl font-semibold transition-colors shrink-0"
                >
                  検索
                </button>
              </div>

              {/* Suggestions results */}
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-500 animate-pulse">TMDbから映画情報を検索中...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">TMDb の検索結果:</div>
                  {searchResults.map((movie) => (
                    <button
                      type="button"
                      key={movie.id}
                      onClick={() => {
                        setSelectedMovie(movie);
                        setManualTitle(movie.title);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl border transition-all flex gap-3 items-center ${
                        selectedMovie?.id === movie.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt="" className="w-9 h-12 object-cover rounded-md bg-slate-900 border border-slate-800 shrink-0" />
                      ) : (
                        <div className="w-9 h-12 bg-slate-900 border border-slate-800 rounded-md flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-slate-700" />
                        </div>
                      )}
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-xs text-slate-200 truncate">{movie.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">公開日: {movie.releaseDate || '不明'}</div>
                      </div>
                      {selectedMovie?.id === movie.id && (
                        <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-slate-950 shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">
                  検索結果がありません。手動でタイトルを入力して登録できます。
                </div>
              )}

              {/* Manual Title Override (if no TMDB match is preferred) */}
              {!selectedMovie && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">手動登録タイトル</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="映画のタイトルを入力してください"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Show Details */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <MapPin className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">2. 上映情報の補完</h2>
            </div>

            <div className="space-y-3">
              {/* Theater */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">劇場名</label>
                <div className="relative">
                  <input
                    type="text"
                    value={theaterName}
                    onChange={(e) => setTheaterName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="劇場名を入力 (例: TOHOシネマズ新宿)"
                    required
                  />
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Screen */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">スクリーン名 (オプション)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={screenName}
                    onChange={(e) => setScreenName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    placeholder="例: SCREEN 7, シアター3"
                  />
                  <Film className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">上映日時</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={showTimestamp}
                    onChange={(e) => setShowTimestamp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 color-scheme-dark"
                    required
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Seat Info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <CreditCard className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">3. 座席指定</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">列 (アルファベット)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={seatRow}
                  onChange={(e) => setSeatRow(e.target.value.replace(/[^A-Za-z]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-center text-sm font-bold text-slate-200 uppercase focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="J"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">番 (数字)</label>
                <input
                  type="text"
                  maxLength={3}
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-center text-sm font-bold text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  placeholder="12"
                />
              </div>
            </div>
          </div>



          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                アーカイブを生成する
              </>
            )}
          </button>

        </form>

      </div>
    </main>
  );
}
