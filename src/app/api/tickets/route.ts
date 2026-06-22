// src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { getTickets, saveTicket } from '../../../utils/db';

export async function GET() {
  try {
    const tickets = await getTickets();
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    console.error('Failed to get tickets:', error);
    return NextResponse.json({ error: error.message || 'チケットの取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const created = await saveTicket(body);
    return NextResponse.json({ success: true, ticket: created });
  } catch (error: any) {
    console.error('Failed to create ticket:', error);
    return NextResponse.json({ error: error.message || 'チケットの保存に失敗しました。' }, { status: 500 });
  }
}
