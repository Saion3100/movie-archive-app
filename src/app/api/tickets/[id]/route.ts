// src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { getTicketById, deleteTicket } from '../../../../utils/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = await getTicketById(id);
    if (!ticket) {
      return NextResponse.json({ error: 'チケットが見つかりません。' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error('Failed to fetch ticket:', error);
    return NextResponse.json({ error: error.message || 'チケットの取得に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTicket(id);
    return NextResponse.json({ success: true, message: 'チケットを削除しました。' });
  } catch (error: any) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json({ error: error.message || 'チケットの削除に失敗しました。' }, { status: 500 });
  }
}
