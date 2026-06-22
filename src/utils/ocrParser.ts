// src/utils/ocrParser.ts

export interface ParsedOCRResult {
  theaterName: string;
  screenName: string | null;
  showTimestamp: string | null; // ISO String format YYYY-MM-DDTHH:mm:ss.sssZ
  seatRaw: string | null;
  seatRow: string | null;
  seatNumber: number | null;
  movieTitleQuery: string | null;
}

export function parseTicketOCR(text: string): ParsedOCRResult {
  if (!text) {
    return {
      theaterName: '未特定の劇場',
      screenName: null,
      showTimestamp: null,
      seatRaw: null,
      seatRow: null,
      seatNumber: null,
      movieTitleQuery: null
    };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  let theaterName = '未特定の劇場';
  let screenName: string | null = null;
  let seatRaw: string | null = null;
  let seatRow: string | null = null;
  let seatNumber: number | null = null;
  let datePart: string | null = null;
  let timePart: string | null = null;

  // 1. Parse Theater Name
  const theaterKeywords = [
    { pattern: /(tohoシネマズ|toho\s+cinemas)/i, name: 'TOHOシネマズ' },
    { pattern: /(イオンシネマ|aeon\s+cinema)/i, name: 'イオンシネマ' },
    { pattern: /(109シネマズ|109\s+cinemas)/i, name: '109シネマズ' },
    { pattern: /(京成ローザ)/, name: '京成ローザ⑩' },
    { pattern: /(ｔ・ジョイ|t・ジョイ|t-joy)/i, name: 'T・ジョイ' },
    { pattern: /(usシネマ|us\s+cinema)/i, name: 'USシネマ' }
  ];

  for (const line of lines) {
    const match = theaterKeywords.find(k => k.pattern.test(line));
    if (match) {
      // Find full theater name on this line or line + next words
      theaterName = match.name;
      // Try to capture location if present, e.g. "TOHOシネマズ新宿"
      const locMatch = line.match(/(tohoシネマズ|toho\s+cinemas|イオンシネマ|109シネマズ|京成ローザ|ｔ・ジョイ|usシネマ)(.+)/i);
      if (locMatch && locMatch[2].trim()) {
        theaterName = match.name + locMatch[2].trim().replace(/[\[\]\(\)]/g, '');
      }
      break;
    }
  }

  // 2. Parse Seat Information
  // Patterns like "J-12", "J列12番", "G列 15番", "F8", "J 12"
  const seatRegexes = [
    /([A-Z])列\s*([0-9]{1,2})番/i,
    /([A-Z])\s*[-−‐－]\s*([0-9]{1,2})/i,
    /\b([A-Z])([0-9]{1,2})\b/i,
    /([A-Z])\s+([0-9]{1,2})/i
  ];

  for (const line of lines) {
    let matched = false;
    for (const regex of seatRegexes) {
      const match = line.match(regex);
      if (match) {
        seatRow = match[1].toUpperCase();
        seatNumber = parseInt(match[2], 10);
        seatRaw = `${seatRow}-${seatNumber}`;
        matched = true;
        break;
      }
    }
    if (matched) break;
  }

  // 3. Parse Show Timestamp (Date and Time)
  // Date: 2026/06/22 or 2026年6月22日 or 2026-06-22
  const dateRegex = /(202\d)[/\-年\s](0?[1-9]|1[0-2])[/\-月\s](0?[1-9]|[12]\d|3[01])日?/;
  // Time: 13:30 or 13:30〜
  const timeRegex = /(0\d|1\d|2[0-3]|\d):([0-5]\d)/;

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      datePart = `${year}-${month}-${day}`;
    }
    const timeMatch = line.match(timeRegex);
    // Avoid matching other numbers like phone numbers or prices
    if (timeMatch && !line.includes('￥') && !line.includes('円') && !line.includes('TEL') && !line.includes('電話')) {
      timePart = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    }
  }

  let showTimestamp: string | null = null;
  if (datePart) {
    const time = timePart || '00:00';
    try {
      const d = new Date(`${datePart}T${time}:00`);
      if (!isNaN(d.getTime())) {
        showTimestamp = d.toISOString();
      }
    } catch (e) {
      // ignore
    }
  }

  // 4. Parse Screen Name
  // e.g. SCREEN 7, スクリーン7, シアター3, シアター 3, IMAX
  const screenRegex = /(screen|スクリーン|theater|シアター|シネマ)\s*([0-9a-zA-Z]+)/i;
  for (const line of lines) {
    const match = line.match(screenRegex);
    if (match) {
      screenName = `${match[1]} ${match[2]}`.trim();
      break;
    }
    if (line.toUpperCase().includes('IMAX')) {
      screenName = 'IMAX';
      break;
    }
    if (line.toUpperCase().includes('4DX')) {
      screenName = '4DX';
      break;
    }
  }

  // 5. Parse Movie Title (heuristics based scoring)
  const excludeKeywords = [
    '合計', '領収', '一般', '大人', '大学生', '高校生', '中学生', '小学生', '小人', 'シニア',
    '割引', 'クレジット', 'ポイント', '会計', '支払', '発券', '購入', '番号', '電話', '予約',
    '入場', '劇場', '公式', 'WEB', 'インターネット', '消費税', '料金', 'チケット', 'STUB', 'ARCHIVE',
    '上映', '座席', 'SCREEN', 'スクリーン', 'THEATER', 'シアター', '枚', '券', '様', 'カウンター',
    'TOHO', 'イオンシネマ', '109シネマズ', '京成ローザ', 'T・ジョイ', 'USシネマ', 'CINEMA', 'CINEMAS'
  ];

  let bestTitleLine = '';
  let highestScore = -999;

  for (const line of lines) {
    let score = 0;

    // Reject line if it contains date pattern, time pattern or seat pattern
    if (dateRegex.test(line) || timeRegex.test(line) || seatRegexes.some(r => r.test(line))) {
      continue;
    }

    // Reject line if it matches price pattern (e.g. ¥2,000 or 1800円)
    if (/[\¥\\]\d+/.test(line) || /\d+\s*円/.test(line)) {
      continue;
    }

    // Penalty for containing transaction/common keywords
    const hasExclude = excludeKeywords.some(keyword => line.toUpperCase().includes(keyword));
    if (hasExclude) {
      score -= 20;
    }

    // Length check
    const len = line.length;
    if (len < 3) {
      score -= 10;
    } else if (len >= 4 && len <= 25) {
      score += 8;
    }

    // Boost if it looks like a movie title with specific marks
    if (/^【.*】/.test(line) || /^（.*）/.test(line)) {
      score += 15;
    }
    if (line.includes('劇場版') || line.includes('映画') || line.includes('版')) {
      score += 5;
    }

    // Boost for containing Japanese characters (Kanji/Kana)
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf]/.test(line)) {
      score += 5;
    }

    if (score > highestScore && score > 0) {
      highestScore = score;
      bestTitleLine = line;
    }
  }

  // Clean title: remove format tags like 【4DX2D】, 【字幕版】, etc.
  let movieTitleQuery: string | null = null;
  if (bestTitleLine) {
    movieTitleQuery = bestTitleLine
      .replace(/【.*?】/g, '')
      .replace(/（.*?）/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/WEB\d*DX/gi, '')
      .replace(/レイトショー/g, '')
      .replace(/2D|3D|4DX|IMAX|MX4D/gi, '')
      .trim();
  }

  return {
    theaterName,
    screenName,
    showTimestamp,
    seatRaw,
    seatRow,
    seatNumber,
    movieTitleQuery
  };
}

// Simulated mock inputs for TOHO, Ion, and 109 Cinemas
export const MOCK_OCR_TEMPLATES = {
  toho: `
ＴＯＨＯシネマズ新宿
TOHO CINEMAS SHINJUKU
領収書 (発券証明)
発券日 2026/06/22 10:15
上映日: 2026/06/22 13:30〜
スクリーン7
J-12 (一般)
シン・エヴァンゲリオン劇場版
料金: ￥2,000
  `,
  aeon: `
イオンシネマ幕張新都心
AEON CINEMA
入場券 (チケット)
上映日時: 2026年6月22日 14:00〜
スクリーン 8
G列 15番
名探偵コナン 100万ドルの五稜星
一般 ¥1,800
  `,
  c109: `
109シネマズ二子玉川
109 CINEMAS
チケット
シアター3 (IMAX)
2026/06/22 18:00
F-8
マッドマックス：フュリオサ
シネマポイントカード会員
  `
};
