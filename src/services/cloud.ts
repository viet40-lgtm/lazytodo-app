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

function hasLiveTasks(state: AppState | null): boolean {
  return !!state && state.tasks.some((t) => !t.deleted);
}

export async function pushRemoteState(userId: string, state: AppState): Promise<boolean> {
  if (!supabase) return false;

  // Safety net: never let an empty local state overwrite a populated cloud row.
  // Genuine "deleted everything" still works because soft-deleted tasks remain
  // as `deleted: true` entries (so the local state is not considered empty).
  if (!hasLiveTasks(state)) {
    const remote = await pullRemoteState(userId);
    if (hasLiveTasks(remote)) return false;
  }

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

export function subscribeToRemoteState(
  userId: string,
  onUpdate: (state: AppState) => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`public:${TABLE}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).state) {
          onUpdate(normalizeState((payload.new as any).state));
        }
      }
    )
    .subscribe();

  return channel;
}
