// src/app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { parseQRCode, validateTicket, ParsedTicket, ValidationResult } from '../utils/ticketParser';

interface TMDBMovie {
  id: number;
  title: string;
  releaseDate: string;
  posterUrl: string | null;
  overview: string;
}

export default function Home() {
  const [rawInput, setRawInput] = useState('');
  const [targetTheater, setTargetTheater] = useState('8001');
  const [parsedData, setParsedData] = useState<ParsedTicket | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // TMDb検索用のステート
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setParsedData(null);
    setValidation(null);
    setSearchResults([]);
    setSelectedMovie(null);

    try {
      // 1. チケットデータのパース & バリデーション
      const result = parseQRCode(rawInput);
      setParsedData(result);
      const validResult = validateTicket(result, targetTheater);
      setValidation(validResult);

      // 2. USシネマなど、最初からタイトルの一部が取れている場合は自動検索をかける
      if (result.movieTitleShort) {
        setSearchQuery(result.movieTitleShort);
        searchMovie(result.movieTitleShort);
      } else {
        setSearchQuery(''); // ローザやT・ジョイは空にしてユーザー入力を待つ
      }
    } catch (err: any) {
      setError(err.message || '解析中にエラーが発生しました。');
    }
  };

  // TMDb APIを叩く関数
  const searchMovie = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.movies) {
        setSearchResults(data.movies);
        // 1件しかヒットしなかった、または自動検索の場合は1件目を仮選択
        if (data.movies.length > 0) {
          setSelectedMovie(data.movies[0]);
        }
      }
    } catch (err) {
      console.error('映画の検索に失敗しました', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 family-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="border-b border-amber-500/30 pb-4 text-center">
          <h1 className="text-3xl font-bold tracking-wider text-amber-500">Cinema Stub Archive</h1>
          <p className="text-sm text-slate-400 mt-1">MVP ポスター連動ダッシュボード</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 左カラム：入力フォーム */}
          <div className="space-y-4">
            <form onSubmit={handleScan} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 border-l-4 border-amber-500 pl-2">1. チケットスキャン</h2>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">検証する劇場（入場口）の設定</label>
                <select 
                  value={targetTheater} 
                  onChange={(e) => setTargetTheater(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="8001">京成ローザ (8001)</option>
                  <option value="5362">T・ジョイ蘇我 (5362)</option>
                  <option value="0008">USシネマ (0008)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">QRコード生データ（文字列）</label>
                <input
                  type="text"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="例: 8001260530047300100485335"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-amber-100 font-mono focus:outline-none focus:border-amber-500 text-sm"
                  required
                />
              </div>

              <button type="submit" className="w-full bg-amber-500 text-slate-950 font-bold py-3 rounded-lg hover:bg-amber-400 transition-all">
                データを解析
              </button>
            </form>

            {error && (
              <div className="bg-red-950/50 border border-red-800/50 p-4 rounded-xl text-red-200 text-sm">⚠️ {error}</div>
            )}

            {/* パース成功後に表示される映画検索窓 */}
            {parsedData && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                <h2 className="text-lg font-bold text-slate-200 border-l-4 border-amber-500 pl-2">2. 作品データの紐付け</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="映画のタイトルを入力（例: 鬼滅）"
                    className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
                  />
                  <button 
                    onClick={() => searchMovie(searchQuery)}
                    className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700"
                  >
                    検索
                  </button>
                </div>

                {/* 検索結果リスト */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {searchResults.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => setSelectedMovie(movie)}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex justify-between items-center ${selectedMovie?.id === movie.id ? 'bg-amber-500/10 border-amber-500 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-200">{movie.title}</div>
                          <div className="text-slate-500 mt-0.5">公開日: {movie.releaseDate || '不明'}</div>
                        </div>
                        <span className="text-xs text-amber-500">選択</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右カラム：エモいデジタルチケットのプレビュー */}
          <div className="flex flex-col justify-start">
            {parsedData ? (
              <div className="space-y-4 sticky top-8">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">LIVE TICKET PREVIEW</div>
                
                {/* 縦型の擬似デジタル半券 */}
                <div className="w-full max-w-sm mx-auto bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative aspect-[2/3] flex flex-col justify-between">
                  
                  {/* 背景のうっすらポスター画像ぼかし */}
                  {selectedMovie?.posterUrl && (
                    <div 
                      className="absolute inset-0 opacity-20 bg-cover bg-center blur-md scale-110"
                      style={{ backgroundImage: `url(${selectedMovie.posterUrl})` }}
                    />
                  )}

                  {/* 上部：映画ポスターエリア */}
                  <div className="relative flex-grow bg-slate-900/40 flex items-center justify-center overflow-hidden p-6">
                    {selectedMovie?.posterUrl ? (
                      <img 
                        src={selectedMovie.posterUrl} 
                        alt="Movie Poster" 
                        className="h-full object-contain rounded-xl shadow-xl border border-slate-700/30 relative z-10"
                      />
                    ) : (
                      <div className="text-slate-600 text-xs text-center border-2 border-dashed border-slate-800 p-8 rounded-xl">
                        右側で作品を選択すると<br />ポスターがここにファイリングされます
                      </div>
                    )}
                  </div>

                  {/* チケットの「ミシン目」の境界線 */}
                  <div className="relative h-px bg-dashed bg-gradient-to-r from-transparent via-slate-700 to-transparent my-0 z-20 flex justify-between items-center">
                    <div className="w-4 h-4 bg-slate-950 rounded-full -ml-2 border-r border-slate-800" />
                    <div className="w-4 h-4 bg-slate-950 rounded-full -mr-2 border-l border-slate-800" />
                  </div>

                  {/* 下部：上映データエリア（もぎり後の半券部分） */}
                  <div className="p-6 bg-slate-900/80 backdrop-blur-md relative z-10 space-y-4">
                    <div>
                      <span className="text-[10px] text-amber-500 font-bold tracking-widest block uppercase">THEATER</span>
                      <h3 className="text-lg font-bold text-slate-100 truncate">{parsedData.theaterName}</h3>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-bold tracking-widest block uppercase">MOVIE TITLE</span>
                      <h4 className="text-sm font-bold text-amber-200 truncate">{selectedMovie ? selectedMovie.title : '未特定の作品'}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest block uppercase">DATE / TIME</span>
                        <span className="font-mono text-xs font-semibold text-slate-300">
                          {parsedData.showTimestamp ? new Date(parsedData.showTimestamp).toLocaleDateString('ja-JP', {month: '2-digit', day: '2-digit'}) : '当日照会'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold tracking-widest block uppercase">SEAT</span>
                        <span className="font-mono text-xs font-semibold text-slate-300">{parsedData.reserveId.split('-')[1] || '自由席'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* バリデーション状態の簡易インジケータ */}
                <div className={`p-3 rounded-xl text-center text-xs border ${validation?.isValid ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-400' : 'bg-rose-950/20 border-rose-800/30 text-rose-400'}`}>
                  {validation?.reason}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 text-sm">
                左側からチケットデータを読み込ませてください
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}