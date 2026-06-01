// ticketParser.ts

/**
 * 1. 共通型定義 (共通インターフェース)
 */
export type TheaterBrand = 'KEISEI' | 'TJOY' | 'USCINEMA' | 'UNKNOWN';

export interface ParsedTicket {
  brand: TheaterBrand;
  theaterCode: string;
  theaterName: string;
  reserveId: string;
  showTimestamp: Date | null;
  movieTitleShort: string | null;
  ticketType: string | null;
  raw: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  requiresDbCheck: boolean; // T・ジョイなどの日付なしチケット用
}

/**
 * メインの解析・ルーティング関数
 * @param raw QRコードの生文字列
 * @returns 解析後の共通構造データ
 */
export function parseQRCode(raw: string): ParsedTicket {
  if (!raw || typeof raw !== 'string') {
    throw new Error('入力データが不正です（空文字、または文字列以外）。');
  }

  const trimmedRaw = raw.trim();

  // 1. USシネマの判定 (システム共通コード "0002" で始まり、29桁以上)
  if (trimmedRaw.startsWith('0002') && trimmedRaw.length >= 29) {
    return parseUSCinema(trimmedRaw);
  }

  // 2. 京成ローザの判定 (25桁固定長)
  if (trimmedRaw.length === 25 && /^\d+$/.test(trimmedRaw)) {
    return parseKeiseiRosa(trimmedRaw);
  }

  // 3. T・ジョイの判定 (15桁固定長)
  if (trimmedRaw.length === 15 && /^\d+$/.test(trimmedRaw)) {
    return parseTJoy(trimmedRaw);
  }

  // いずれにも該当しない場合
  return {
    brand: 'UNKNOWN',
    theaterCode: '0000',
    theaterName: '未対応の劇場',
    reserveId: 'UNKNOWN',
    showTimestamp: null,
    movieTitleShort: null,
    ticketType: null,
    raw: trimmedRaw,
  };
}

/**
 * 京成ローザのパースロジック (25桁)
 */
function parseKeiseiRosa(raw: string): ParsedTicket {
  const theaterCode = raw.substring(0, 4);
  const yearShort = raw.substring(4, 6);
  const monthDay = raw.substring(6, 10);
  const scheduleId = raw.substring(10, 18);
  const serialNo = raw.substring(18, 25);

  // 日時の組み立て
  const year = 2000 + parseInt(yearShort, 10);
  const month = parseInt(monthDay.substring(0, 2), 10) - 1; // JSの月は0始まり
  const day = parseInt(monthDay.substring(2, 4), 10);
  
  // スケジュールID以降を予約シリアルとして統合
  const reserveId = `${scheduleId}-${serialNo}`;

  let showTimestamp: Date | null = new Date(year, month, day, 0, 0, 0);
  if (isNaN(showTimestamp.getTime())) {
    showTimestamp = null;
  }

  return {
    brand: 'KEISEI',
    theaterCode,
    theaterName: '京成ローザ⑩',
    reserveId,
    showTimestamp,
    movieTitleShort: null,
    ticketType: null,
    raw,
  };
}

/**
 * T・ジョイのパースロジック (15桁)
 */
function parseTJoy(raw: string): ParsedTicket {
  const theaterCode = raw.substring(0, 4);
  const reserveId = raw.substring(4, 15);

  return {
    brand: 'TJOY',
    theaterCode,
    theaterName: 'T・ジョイ',
    reserveId,
    showTimestamp: null, // T・ジョイは日付情報を含まない
    movieTitleShort: null,
    ticketType: null,
    raw,
  };
}

/**
 * USシネマのパースロジック (29桁固定 + 可変テキスト)
 */
function parseUSCinema(raw: string): ParsedTicket {
  const theaterCode = raw.substring(4, 8);
  const reserveId = raw.substring(8, 14);
  const yearStr = raw.substring(14, 18);
  const monthDayStr = raw.substring(18, 22);
  const timeStr = raw.substring(22, 26);
  // 26-29桁は座席コード (今回はreserveIdの補足、または別途保持も可)

  // 日時の組み立て
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthDayStr.substring(0, 2), 10) - 1;
  const day = parseInt(monthDayStr.substring(2, 4), 10);
  const hour = parseInt(timeStr.substring(0, 2), 10);
  const minute = parseInt(timeStr.substring(2, 4), 10);

  let showTimestamp: Date | null = new Date(year, month, day, hour, minute, 0);
  if (isNaN(showTimestamp.getTime())) {
    showTimestamp = null;
  }

  // 30桁目以降のテキスト解析
  const textPart = raw.substring(29).trim();
  const tokens = textPart.split(/\s+/); // 連続するスペースにも対応

  let movieTitleShort: string | null = null;
  let ticketType: string | null = null;

  if (tokens.length >= 2) {
    movieTitleShort = tokens[0]; // 例: "劇場版"
    ticketType = tokens[1];       // 例: "鬼" 
    // ※仕様書の「スペース区切り」に基づきますが、実際のタイトルがスペースで分断されている場合は、
    // 必要に応じて tokens.slice(0, -2).join(" ") などの調整が将来的に可能です。
  } else if (tokens.length === 1) {
    movieTitleShort = tokens[0];
  }

  return {
    brand: 'USCINEMA',
    theaterCode,
    theaterName: 'USシネマ',
    reserveId,
    showTimestamp,
    movieTitleShort,
    ticketType,
    raw,
  };
}

/**
 * 3. 1次バリデーション関数
 * @param ticket パース済みのチケットデータ
 * @param currentTheaterCode アプリ（または入場口）が想定している現在の劇場コード
 * @returns バリデーション結果
 */
export function validateTicket(ticket: ParsedTicket, currentTheaterCode: string): ValidationResult {
  // 不明なブランドの拒否
  if (ticket.brand === 'UNKNOWN') {
    return { isValid: false, reason: '未対応の劇場、または不正な形式のコードです。', requiresDbCheck: false };
  }

  // 劇場コードの一致チェック
  if (ticket.theaterCode !== currentTheaterCode) {
    return { 
      isValid: false, 
      reason: `劇場コードが一致しません。(チケット: ${ticket.theaterCode} / 現在: ${currentTheaterCode})`, 
      requiresDbCheck: false 
    };
  }

  // 今日の日付を取得 (判定用に時刻を00:00:00にリセット)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // T・ジョイの特殊処理 (日付がないため、DB照会を要求する)
  if (ticket.brand === 'TJOY') {
    return {
      isValid: true, // 劇場コードは合っているので仮パス
      reason: '劇場コード確認完了。日付が含まれないため、Supabase(DB)での使用済みチェックが必要です。',
      requiresDbCheck: true
    };
  }

  // 京成ローザ・USシネマの日付判定
  if (ticket.showTimestamp) {
    const ticketDate = new Date(ticket.showTimestamp.getTime());
    ticketDate.setHours(0, 0, 0, 0);

    if (ticketDate.getTime() !== today.getTime()) {
      const dateString = `${ticketDate.getFullYear()}/${ticketDate.getMonth() + 1}/${ticketDate.getDate()}`;
      return {
        isValid: false,
        reason: `上映日が本日ではありません。上映日: ${dateString}`,
        requiresDbCheck: false
      };
    }
  } else {
    return { isValid: false, reason: 'チケットの上映日時を解析できませんでした。', requiresDbCheck: false };
  }

  return {
    isValid: true,
    reason: 'チケットは有効です。入場可能です。',
    requiresDbCheck: false
  };
}

/**
 * 4. テストケース (動作確認用コード)
 */
function runTests() {
  console.log('=== 映画チケットパース＆バリデーション テスト開始 ===\n');

  // 本日判定用のモックとして、テスト実行時の一時的な日付調整ログを出力
  const now = new Date();
  console.log(`[システム判定基準日]: ${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}\n`);

  // 1. 京成ローザのテスト
  const sampleKeisei = "8001260530047300100485335";
  console.log('--- Test 1: 京成ローザ ---');
  const parsedKeisei = parseQRCode(sampleKeisei);
  console.log('パース結果:', parsedKeisei);
  const validKeisei = validateTicket(parsedKeisei, '8001'); // 劇場コード"8001"で検証
  console.log('バリデーション:', validKeisei, '\n');

  // 2. T・ジョイのテスト
  const sampleTJoy = "536251452789746";
  console.log('--- Test 2: T・ジョイ ---');
  const parsedTJoy = parseQRCode(sampleTJoy);
  console.log('パース結果:', parsedTJoy);
  const validTJoy = validateTicket(parsedTJoy, '5362'); // 劇場コード"5362"で検証
  console.log('バリデーション:', validTJoy, '\n');

  // 3. USシネマのテスト
  const sampleUS = "00020008758349202508312020155【4DX2D】劇場版 鬼 WEB4DXレイトショー 01";
  console.log('--- Test 3: USシネマ ---');
  const parsedUS = parseQRCode(sampleUS);
  console.log('パース結果:', parsedUS);
  const validUS = validateTicket(parsedUS, '0008'); // 劇場コード"0008"で検証
  console.log('バリデーション:', validUS, '\n');
}

// 実行（Node.js環境やフロントでテストを実行したい場合はコメントアウトを解除してください）
// runTests();