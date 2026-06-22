// src/utils/db.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MovieTicket {
  id: string;
  user_id: string;
  theater_name: string;
  screen_name: string | null;
  show_timestamp: string; // ISO date string
  movie_title: string;
  poster_path: string | null;
  seat_raw: string | null;
  seat_row: string | null;
  seat_number: number | null;
  rating: number; // 0 to 5
  memo: string | null;
  raw_ocr_text: string | null;
  created_at?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}

// Server-side in-memory mock store to share tickets between requests if Supabase is missing
const globalRef = global as any;
if (!globalRef.mockTickets) {
  globalRef.mockTickets = [] as MovieTicket[];
}

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

// Helper to determine if we are in browser
const isBrowser = typeof window !== 'undefined';

// Constants for local storage
const LOCAL_STORAGE_KEY = 'cinema_stub_archive_tickets';
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function getTickets(): Promise<MovieTicket[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('movie_tickets')
        .select('*')
        .order('show_timestamp', { ascending: false });

      if (error) {
        throw error;
      }
      if (data) return data as MovieTicket[];
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local database:', e);
    }
  }

  // Fallback to local storage or in-memory
  if (isBrowser) {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MovieTicket[];
        return parsed.sort((a, b) => new Date(b.show_timestamp).getTime() - new Date(a.show_timestamp).getTime());
      } catch (e) {
        console.error('Failed to parse local storage tickets:', e);
      }
    }
    return [];
  } else {
    return (globalRef.mockTickets as MovieTicket[]).sort(
      (a, b) => new Date(b.show_timestamp).getTime() - new Date(a.show_timestamp).getTime()
    );
  }
}

export async function getTicketById(id: string): Promise<MovieTicket | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('movie_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }
      if (data) return data as MovieTicket;
    } catch (e) {
      console.warn(`Supabase getById failed for ${id}, falling back to local database:`, e);
    }
  }

  // Fallback
  const tickets = await getTickets();
  return tickets.find(t => t.id === id) || null;
}

export async function saveTicket(ticketInput: Omit<MovieTicket, 'id' | 'created_at'>): Promise<MovieTicket> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const newTicket: MovieTicket = {
    ...ticketInput,
    id: newId,
    user_id: ticketInput.user_id || GUEST_USER_ID,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('movie_tickets')
        .insert([ticketInput])
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (data) return data as MovieTicket;
    } catch (e) {
      console.warn('Supabase save failed, falling back to local database:', e);
    }
  }

  // Fallback to local storage or in-memory
  if (isBrowser) {
    const tickets = await getTickets();
    tickets.push(newTicket);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
  } else {
    globalRef.mockTickets.push(newTicket);
  }

  return newTicket;
}

export async function deleteTicket(id: string): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('movie_tickets')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
      return;
    } catch (e) {
      console.warn(`Supabase delete failed for ${id}, falling back to local database:`, e);
    }
  }

  // Fallback
  if (isBrowser) {
    const tickets = await getTickets();
    const filtered = tickets.filter(t => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } else {
    globalRef.mockTickets = globalRef.mockTickets.filter((t: MovieTicket) => t.id !== id);
  }
}
