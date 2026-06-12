import type { AppState } from '../types';
import { supabase } from './supabase';
import { normalizeState } from './storage';

const TABLE = 'app_state';

export async function pullRemoteState(userId: string): Promise<AppState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data?.state) return null;
  return normalizeState(data.state);
}

export async function pushRemoteState(userId: string, state: AppState): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}
