// src/app/api/tickets/scan/route.ts
import { NextResponse } from 'next/server';
import { parseTicketOCR, MOCK_OCR_TEMPLATES } from '../../../../utils/ocrParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, mockTemplate } = body;

    // Support mock template simulation
    if (mockTemplate && mockTemplate in MOCK_OCR_TEMPLATES) {
      const mockText = MOCK_OCR_TEMPLATES[mockTemplate as keyof typeof MOCK_OCR_TEMPLATES];
      const parsed = parseTicketOCR(mockText);
      return NextResponse.json({
        success: true,
        isMock: true,
        rawText: mockText,
        parsed
      });
    }

    if (!image) {
      return NextResponse.json({ error: '画像データ（Base64）が必要です。' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      // Fallback: If no API key, let client know but return mock TOHO parsed data for testing
      console.warn('GOOGLE_CLOUD_VISION_API_KEY is not set. Returning TOHO mock fallback.');
      const mockText = MOCK_OCR_TEMPLATES.toho;
      const parsed = parseTicketOCR(mockText);
      return NextResponse.json({
        success: true,
        isMock: true,
        warning: 'Google Cloud Vision APIキーが未設定のため、デモ用データでシミュレートしました。',
        rawText: mockText,
        parsed
      });
    }

    // Clean base64 string if it contains headers
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const response = await fetch(visionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Data
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION'
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Cloud Vision API Error:', errorText);
      return NextResponse.json({ error: 'OCR処理中に外部エラーが発生しました。' }, { status: 502 });
    }

    const data = await response.json();
    const annotations = data.responses?.[0];

    if (!annotations || !annotations.fullTextAnnotation) {
      return NextResponse.json({ error: '画像から文字を検出できませんでした。' }, { status: 422 });
    }

    const rawText = annotations.fullTextAnnotation.text;
    const parsed = parseTicketOCR(rawText);

    return NextResponse.json({
      success: true,
      isMock: false,
      rawText,
      parsed
    });

  } catch (error: any) {
    console.error('Scan API handler error:', error);
    return NextResponse.json({ error: error.message || 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
