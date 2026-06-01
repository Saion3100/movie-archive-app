// src/app/api/search/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('query');

    if (!rawQuery) {
      return NextResponse.json({ error: '検索キーワードが必要です。' }, { status: 400 });
    }

    // クレンジング：ノイズになる文字列を除去
    let cleanQuery = rawQuery
      .replace(/【.*?】/g, '')
      .replace(/WEB\d*DX/gi, '')
      .replace(/レイトショー/g, '')
      .trim();

    if (!cleanQuery) {
      cleanQuery = rawQuery;
    }

    const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'トークンが未設定です。' }, { status: 500 });
    }

    // 【アジャイル改善】URLSearchParamsを使って、日本語を100%安全な形式に自動エンコードする
    const baseUrl = 'https://api.themoviedb.org/3/search/movie';
    const queryParams = new URLSearchParams({
      query: cleanQuery,
      include_adult: 'false',
      language: 'ja-JP',
      page: '1'
    });

    const tmdbUrl = `${baseUrl}?${queryParams.toString()}`;

    // サーバーログで組み立てられたURLを確認
    console.log('--- TMDb通信実行 ---');
    console.log('リクエストURL:', tmdbUrl);

    const response = await fetch(tmdbUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token.trim()}`
      }
    });

    // TMDb側から200番以外が返ってきた場合、中身をログに出して500を回避する
    if (!response.ok) {
      const errorText = await response.text();
      console.error('TMDbエラー応答詳細:', errorText);
      // 空の配列を返して画面がクラッシュするのを防ぐ（ユーザー体験優先）
      return NextResponse.json({ movies: [] });
    }

    const data = await response.json();

    // 検索結果が空だった場合の安全処理
    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ movies: [] });
    }

    const movies = data.results.slice(0, 3).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      releaseDate: movie.release_date || '不明',
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview || ''
    }));

    return NextResponse.json({ movies });

  } catch (error: any) {
    // キャッチされないエラーが起きてもサーバーログに残し、フロントにエラーを伝える
    console.error('API内部クラッシュ:', error);
    return NextResponse.json({ error: error.message, movies: [] }, { status: 500 });
  }
}