/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AppRole } from '../types/database';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

export type UserProfile = {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

export type StudentProfileSummary = {
  user_id: string;
  education_system_id: string;
  school_level_id: string;
  class_id: string;
  series_id: string | null;
};

type AccountSnapshot = {
  userId: string;
  profile: UserProfile | null;
  roles: AppRole[];
  studentProfile: StudentProfileSummary | null;
  error: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: Session['user'] | null;
  profile: UserProfile | null;
  /** Primary role for display only. Guards must use roles/hasRole because accounts may hold several roles. */
  role: AppRole | null;
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  studentProfile: StudentProfileSummary | null;
  loading: boolean;
  accountLoading: boolean;
  accountError: string | null;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const rolePriority: AppRole[] = ['admin', 'teacher', 'parent', 'student'];
const EMPTY_ROLES: AppRole[] = [];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => hasSupabaseConfig);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot | null>(null);
  const userId = session?.user.id ?? null;
  const snapshotIsCurrent = Boolean(userId && accountSnapshot?.userId === userId);
  const profile = snapshotIsCurrent ? accountSnapshot?.profile ?? null : null;
  const roles = snapshotIsCurrent ? accountSnapshot?.roles ?? EMPTY_ROLES : EMPTY_ROLES;
  const role = rolePriority.find((candidate) => roles.includes(candidate)) ?? null;
  const studentProfile = snapshotIsCurrent ? accountSnapshot?.studentProfile ?? null : null;
  const accountLoading = Boolean(userId && !snapshotIsCurrent);
  const accountError = sessionError ?? (snapshotIsCurrent ? accountSnapshot?.error ?? null : null);
  const hasRole = useCallback((candidate: AppRole) => roles.includes(candidate), [roles]);

  const loadAccount = useCallback(async (requestedUserId: string) => {
    const client = supabase;
    if (!client) return;
    try {
      const [profileResult, roleResult, studentResult] = await Promise.all([
        client.from('profiles').select('first_name,last_name,avatar_url').eq('user_id', requestedUserId).maybeSingle(),
        client.from('user_roles').select('role').eq('user_id', requestedUserId),
        client.from('student_profiles').select('user_id,education_system_id,school_level_id,class_id,series_id').eq('user_id', requestedUserId).maybeSingle(),
      ]);
      const hasError = Boolean(profileResult.error || roleResult.error || studentResult.error);
      setAccountSnapshot({
        userId: requestedUserId,
        profile: profileResult.data,
        roles: (roleResult.data ?? []).map((row) => row.role),
        studentProfile: studentResult.data,
        error: hasError ? 'Le profil EduFlow n’est pas encore disponible. Vérifie que les migrations nécessaires sont appliquées dans Supabase.' : null,
      });
    } catch {
      setAccountSnapshot({
        userId: requestedUserId,
        profile: null,
        roles: [],
        studentProfile: null,
        error: 'Le profil EduFlow ne peut pas être chargé pour le moment. Vérifie la connexion et réessaie.',
      });
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    if (userId) await loadAccount(userId);
  }, [userId, loadAccount]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let accountTimer: number | undefined;

    const scheduleAccountLoad = (requestedUserId: string) => {
      if (accountTimer !== undefined) window.clearTimeout(accountTimer);
      accountTimer = window.setTimeout(() => {
        if (active) void loadAccount(requestedUserId);
      }, 0);
    };

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSessionError(error ? 'La session ne peut pas être vérifiée pour le moment.' : null);
      setSession(data.session);
      setLoading(false);
      if (data.session) scheduleAccountLoad(data.session.user.id);
    }).catch(() => {
      if (!active) return;
      setSessionError('La session ne peut pas être vérifiée pour le moment.');
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSessionError(null);
      setSession(nextSession);
      setLoading(false);
      if (nextSession) scheduleAccountLoad(nextSession.user.id);
    });

    return () => {
      active = false;
      if (accountTimer !== undefined) window.clearTimeout(accountTimer);
      data.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, profile, role, roles, hasRole, studentProfile, loading, accountLoading, accountError, refreshAccount }),
    [session, profile, role, roles, hasRole, studentProfile, loading, accountLoading, accountError, refreshAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
