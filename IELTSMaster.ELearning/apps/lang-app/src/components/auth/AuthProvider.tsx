'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  TenantStatus,
  type AuthResponse,
  type AuthUser,
  type MeContexts,
  type MeTenantContext,
} from '@lang/shared';
import type { WorkspaceOption } from '@/components/dashboard/WorkspaceSwitcher';
import { vi } from '@/i18n/vi';
import {
  api,
  onAuthFailure,
  refreshAccessToken,
  setAccessToken,
} from '@/lib/api';
import { isSystemManager, tenantEntryPath } from '@/lib/auth-redirect';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Membership active của user (`GET /me/contexts`), mọi trạng thái tenant. */
  tenantContexts: MeTenantContext[];
  /** Đã tải `tenantContexts` cho user hiện tại (luôn `false` khi còn phải đổi mật khẩu). */
  contextsReady: boolean;
  /** Tải lại ngữ cảnh, vd. sau khi đăng ký tenant hay tự đổi role của mình. */
  reloadContexts: () => Promise<void>;
  /**
   * Không gian cho switcher: hệ thống (Owner/Admin) và các tenant đang hoạt
   * động (dashboard hoặc trang trung tâm tuỳ role).
   */
  contexts: WorkspaceOption[];
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  switchTenant: (tenantSlug: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Nhận phiên mới (vd. sau đổi mật khẩu có access token mới). */
  applySession: (session: AuthResponse) => void;
  /** Cập nhật user sau khi sửa hồ sơ. */
  setUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

/** Ngữ cảnh gắn với user đã tải, để đổi user không dùng nhầm dữ liệu cũ. */
interface ContextsState {
  userId: string | null;
  tenants: MeTenantContext[];
}

const anonymous: AuthState = { status: 'anonymous', user: null };
const noTenants: MeTenantContext[] = [];

export function AuthProvider({
  hasSession,
  children,
}: {
  /** Server thấy cookie refresh; không có thì khỏi gọi /auth/refresh. */
  hasSession: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AuthState>(
    hasSession ? { status: 'loading', user: null } : anonymous,
  );
  const [contextsState, setContextsState] = useState<ContextsState>({
    userId: null,
    tenants: noTenants,
  });

  const applySession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setState({ status: 'authenticated', user: session.user });
  }, []);

  // Tải trang: đổi refresh cookie lấy access token + user.
  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    void refreshAccessToken().then((session) => {
      if (cancelled) return;
      if (session) setState({ status: 'authenticated', user: session.user });
      else setState(anonymous);
    });
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  useEffect(() => onAuthFailure(() => setState(anonymous)), []);

  // Còn phải đổi mật khẩu thì API từ chối, chờ đổi xong mới tải.
  const userId = state.user?.id ?? null;
  const mustChangePassword = state.user?.mustChangePassword ?? false;
  useEffect(() => {
    if (!userId || mustChangePassword) return;
    let cancelled = false;
    api.get<MeContexts>('/me/contexts').then(
      (data) => {
        if (!cancelled) setContextsState({ userId, tenants: data.tenants });
      },
      () => {
        // Lỗi thì coi như chưa có tenant để trang đích không chờ mãi.
        if (!cancelled) setContextsState({ userId, tenants: noTenants });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, mustChangePassword]);

  const reloadContexts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.get<MeContexts>('/me/contexts');
      setContextsState({ userId, tenants: data.tenants });
    } catch {
      // Giữ danh sách cũ.
    }
  }, [userId]);

  const contextsReady =
    userId !== null && !mustChangePassword && contextsState.userId === userId;
  const tenantContexts = contextsReady ? contextsState.tenants : noTenants;

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await api.post<AuthResponse>('/auth/register', input);
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const switchTenant = useCallback(
    async (tenantSlug: string) => {
      const session = await api.post<AuthResponse>('/auth/switch-tenant', {
        tenantSlug,
      });
      applySession(session);
      return session.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Lỗi mạng vẫn đăng xuất phía client.
    }
    setAccessToken(null);
    // Tải lại hẳn để xoá mọi dữ liệu đang giữ trong bộ nhớ.
    window.location.assign('/login');
  }, []);

  const setUser = useCallback((user: AuthUser) => {
    setState({ status: 'authenticated', user });
  }, []);

  const contexts = useMemo<WorkspaceOption[]>(() => {
    if (!state.user) return [];
    const options: WorkspaceOption[] = isSystemManager(state.user)
      ? [{ key: 'system', label: vi.shell.systemWorkspace, href: '/admin' }]
      : [];
    for (const { tenant, roles } of tenantContexts) {
      if (tenant.status !== TenantStatus.ACTIVE) continue;
      options.push({
        key: `tenant:${tenant.slug}`,
        label: tenant.name,
        description: roles.map((role) => vi.tenantRoles[role]).join(', '),
        href: tenantEntryPath(tenant.slug, roles),
        activate: async () => {
          await switchTenant(tenant.slug);
        },
      });
    }
    return options;
  }, [state.user, tenantContexts, switchTenant]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      tenantContexts,
      contextsReady,
      reloadContexts,
      contexts,
      login,
      register,
      switchTenant,
      logout,
      applySession,
      setUser,
    }),
    [
      state,
      tenantContexts,
      contextsReady,
      reloadContexts,
      contexts,
      login,
      register,
      switchTenant,
      logout,
      applySession,
      setUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải nằm trong AuthProvider');
  return value;
}
