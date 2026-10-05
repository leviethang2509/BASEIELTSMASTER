import {
  type FC,
  type ReactNode,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import {
  saveTokens,
  getAccessToken,
  clearTokens,
  getRefreshToken,
} from "@/lib/cookies";
import { authService } from "@/features/system/api/auth.api";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import type { MeTenantContext, TenantSummary, User } from "@/features/system/types/user.types";
import type {
  AuthContextType,
  LoginResponse,
  RoleBadgeInfo,
} from "@/features/system/types/auth.types";
import { toast } from "sonner";
import api, { type ApiResponse } from "@/lib/api";
import type { SystemGroup } from "@/features/system/types/systemGroup.types";
import type { GetPermissionByUser } from "@/features/system/types/role.types";
import { systemGroupService } from "@/features/system/api/systemGroup.api";
import { menuService } from "@/features/system/api/menu.api";
import { roleService } from "@/features/system/api/role.api";
import { userService } from "@/features/system/api/user.api";
import type { MenuGetListPaging } from "@/features/system/types/menu.types";
import { getRoleBadgeInfo } from "@/lib/role-utils";

import { AuthContext } from "./auth-context-definition";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [systemGroup, setSystemGroup] = useState<SystemGroup[]>([]);
  const [menu, setMenu] = useState<MenuGetListPaging[]>([]);
  const [permissions, setPermissions] = useState<GetPermissionByUser[]>([]);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [activeTenant, setActiveTenant] = useState<TenantSummary | null>(null);
  const [availableTenants, setAvailableTenants] = useState<MeTenantContext[]>([]);

  const roleBadge: RoleBadgeInfo = useMemo(() => {
    return getRoleBadgeInfo(user?.SystemRole || user?.RoleId || roleName);
  }, [user?.SystemRole, user?.RoleId, roleName]);

  const syncRoleName = useCallback((currentUser?: User | null) => {
    if (!currentUser) {
      setRoleName(null);
      return;
    }
    const badge = getRoleBadgeInfo(currentUser.SystemRole || currentUser.RoleId || currentUser.RoleName);
    setRoleName(badge.label);
  }, []);

  const performLogout = async () => {
    setUser(null);
    setSystemGroup([]);
    setMenu([]);
    setPermissions([]);
    setRoleName(null);
    setActiveTenant(null);
    setAvailableTenants([]);
    clearTokens();
    localStorage.removeItem("user");
    localStorage.removeItem("activeTenant");
    localStorage.removeItem("availableTenants");
    localStorage.removeItem("systemGroup");
    localStorage.removeItem("menu");
    localStorage.removeItem("permissions");
  };

  const fetchUserData = useCallback(async (currentUser: User) => {
    let currentSystemGroup: SystemGroup[] = [];
    let currentMenu: MenuGetListPaging[] = [];
    let currentPermissions: GetPermissionByUser[] = [];

    const userId = currentUser.Id || (currentUser as any).id || "";
    const hasController = (items: any[], controller: string) =>
      items?.some((item: any) =>
        String(item.Controller ?? item.controller ?? "").toLowerCase() ===
        controller.toLowerCase()
      );

    // 1. Ensure System Group is available
    const systemGroupJson = localStorage.getItem("systemGroup");
    if (systemGroupJson) {
      try {
        currentSystemGroup = JSON.parse(systemGroupJson);
      } catch (e) { }
    }

    if (!currentSystemGroup || currentSystemGroup.length === 0) {
      try {
        const response: any = await systemGroupService.getAll();
        const ok = response?.Success ?? response?.success;
        if (ok) {
          currentSystemGroup = response.Data ?? response.data ?? [];
          localStorage.setItem("systemGroup", JSON.stringify(currentSystemGroup));
        }
      } catch (e) {
        console.warn("Không thể tải systemGroup:", e);
      }
    }
    setSystemGroup(currentSystemGroup || []);

    // 2. Ensure Menu is available
    const menuJson = localStorage.getItem("menu");
    if (menuJson) {
      try {
        currentMenu = JSON.parse(menuJson);
      } catch (e) { }
    }

    if (!currentMenu || currentMenu.length === 0 || !hasController(currentMenu, "DanToc")) {
      try {
        const response: any = await menuService.getListByUser(userId);
        const ok = response?.Success ?? response?.success;
        if (ok) {
          currentMenu = response.Data ?? response.data ?? [];
          localStorage.setItem("menu", JSON.stringify(currentMenu));
        }
      } catch (e) {
        console.warn("Không thể tải menu:", e);
      }
    }
    setMenu(currentMenu || []);

    // 3. Ensure Permissions are available
    const permissionsJson = localStorage.getItem("permissions");
    if (permissionsJson) {
      try {
        currentPermissions = JSON.parse(permissionsJson);
      } catch (e) { }
    }

    if (!currentPermissions || currentPermissions.length === 0 || !hasController(currentPermissions, "DanToc")) {
      try {
        const response: any = await roleService.getPermissionsByUser(userId);
        const ok = response?.Success ?? response?.success;
        if (ok) {
          currentPermissions = response.Data ?? response.data ?? [];
          localStorage.setItem("permissions", JSON.stringify(currentPermissions));
        }
      } catch (e) {
        console.warn("Không thể tải permissions:", e);
      }
    }
    setPermissions(currentPermissions || []);

    // 4. Sync Role Name from current user profile
    syncRoleName(currentUser);
  }, [syncRoleName]);

  const initAuth = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          const userJson = localStorage.getItem("user");
          let currentUser: User | null = null;
          if (decoded.exp && decoded.exp * 1000 > Date.now()) {
            if (userJson) {
              const userData = JSON.parse(userJson);
              setUser(userData);
              setActiveTenant(userData.ActiveTenant || null);
              setAvailableTenants(userData.AvailableTenants || []);
              syncRoleName(userData);
              currentUser = userData;
            } else {
              const response = await userService.getCurrentUser();
              if (response.Success && response.Data) {
                const u = response.Data;
                const badge = getRoleBadgeInfo(u.SystemRole || u.RoleId);
                u.RoleName = badge.label;
                u.SystemRoleName = badge.label;
                setUser(u);
                localStorage.setItem("user", JSON.stringify(u));
                syncRoleName(u);
                currentUser = u;
              }
            }

            if (currentUser) {
              await fetchUserData(currentUser);
            }
          } else {
            const refreshToken = getRefreshToken();
            if (refreshToken) {
              const response = await authService.refreshToken({
                RefreshToken: refreshToken,
              });
              if (response.Success && response.Data) {
                const accessToken = response.Data?.AccessToken || "";
                const newRefreshToken = response.Data?.RefreshToken || "";
                saveTokens(accessToken, newRefreshToken);

                if (userJson) {
                  const userData = JSON.parse(userJson);
                  setUser(userData);
                  syncRoleName(userData);
                  await fetchUserData(userData);
                } else {
                  const userResponse = await userService.getCurrentUser();
                  if (userResponse.Success && userResponse.Data) {
                    const u = userResponse.Data;
                    const badge = getRoleBadgeInfo(u.SystemRole || u.RoleId);
                    u.RoleName = badge.label;
                    u.SystemRoleName = badge.label;
                    setUser(u);
                    localStorage.setItem("user", JSON.stringify(u));
                    syncRoleName(u);
                    await fetchUserData(u);
                  }
                }
              } else {
                await performLogout();
              }
            } else {
              await performLogout();
            }
          }
        } catch (e) {
          await performLogout();
        }
      } else {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            const response = await authService.refreshToken({
              RefreshToken: refreshToken,
            });
            if (response.Success && response.Data) {
              const accessToken = response.Data.AccessToken || "";
              const newRefreshToken = response.Data.RefreshToken || "";
              saveTokens(accessToken, newRefreshToken);

              const userJson = localStorage.getItem("user");
              if (userJson) {
                const u = JSON.parse(userJson);
                setUser(u);
                syncRoleName(u);
                await fetchUserData(u);
              }
            } else {
              await performLogout();
            }
          } catch (e) {
            await performLogout();
          }
        } else {
          await performLogout();
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
      await performLogout();
    } finally {
      setLoading(false);
    }
  }, [fetchUserData, syncRoleName]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<ApiResponse<LoginResponse>> => {
      try {
        setLoading(true);
        const res: any = await authService.login({
          Username: username,
          Password: password,
          Email: username,
        } as any);

        const isSuccess = res?.Success ?? res?.success ?? false;
        const msg = res?.Message ?? res?.message ?? "";
        const data = res?.Data ?? res?.data;

        if (!isSuccess) {
          return {
            Success: false,
            Message: msg || "Đăng nhập thất bại",
            StatusCode: res?.StatusCode ?? res?.statusCode ?? 400,
          };
        }

        const AccessToken = data?.AccessToken ?? data?.accessToken ?? "";
        const RefreshToken = data?.RefreshToken ?? data?.refreshToken ?? "";

        if (!AccessToken) {
          return {
            Success: false,
            Message: "Phản hồi từ server không chứa AccessToken",
            StatusCode: 500,
          };
        }

        saveTokens(AccessToken, RefreshToken);
        const userObj = data?.User ?? data?.user;
        const Id = data?.Id ?? userObj?.id ?? userObj?.Id;
        const Fullname = data?.Fullname ?? userObj?.fullName ?? userObj?.FullName ?? userObj?.name ?? "";
        const Username = data?.Username ?? userObj?.email ?? userObj?.Email ?? username;
        const systemRole = userObj?.systemRole ?? userObj?.SystemRole ?? data?.SystemRole ?? "REGISTERED_USER";
        const Email = data?.Email ?? userObj?.email ?? userObj?.Email ?? "";
        const badge = getRoleBadgeInfo(systemRole);

        const activeTenantObj = data?.ActiveTenant ?? data?.activeTenant;
        const availableTenantsList = data?.AvailableTenants ?? data?.availableTenants ?? [];
        const elearningObj = data?.Elearning ?? data?.elearning;

        const currentActiveTenant: TenantSummary | null = activeTenantObj ? {
          Id: activeTenantObj.id ?? activeTenantObj.Id,
          Slug: activeTenantObj.slug ?? activeTenantObj.Slug,
          Name: activeTenantObj.name ?? activeTenantObj.Name,
          LogoUrl: activeTenantObj.logoUrl ?? activeTenantObj.LogoUrl,
          Status: activeTenantObj.status ?? activeTenantObj.Status,
        } : null;

        const currentAvailableTenants: MeTenantContext[] = availableTenantsList.map((t: any) => ({
          MembershipId: t.membershipId ?? t.MembershipId,
          Roles: t.roles ?? t.Roles ?? [],
          JoinedAt: t.joinedAt ?? t.JoinedAt,
          Tenant: {
            Id: t.tenant?.id ?? t.tenant?.Id ?? t.Tenant?.Id,
            Slug: t.tenant?.slug ?? t.tenant?.Slug ?? t.Tenant?.Slug,
            Name: t.tenant?.name ?? t.tenant?.Name ?? t.Tenant?.Name,
            LogoUrl: t.tenant?.logoUrl ?? t.tenant?.LogoUrl ?? t.Tenant?.LogoUrl,
            Status: t.tenant?.status ?? t.tenant?.Status ?? t.Tenant?.Status,
          }
        }));

        const userData: User = {
          Id: Id || "",
          Fullname: Fullname || "",
          Username: Username || "",
          RoleId: systemRole || "",
          RoleName: badge.label,
          SystemRole: systemRole,
          SystemRoleName: badge.label,
          Avatar: data?.Avatar ?? userObj?.avatarUrl ?? "",
          Email: Email || "",
          Phone: userObj?.phone || "",
          Address: userObj?.address || "",
          DateOfBirth: userObj?.dateOfBirth || "",
          ActiveTenant: currentActiveTenant,
          AvailableTenants: currentAvailableTenants,
          Elearning: elearningObj ? {
            CanAccess: elearningObj.canAccess ?? elearningObj.CanAccess ?? false,
            CanBypassAuthorization: elearningObj.canBypassAuthorization ?? elearningObj.CanBypassAuthorization ?? false,
            ElearningRole: elearningObj.elearningRole ?? elearningObj.ElearningRole ?? "Learner",
            Reason: elearningObj.reason ?? elearningObj.Reason ?? "",
          } : undefined,
          IsEdit: false,
          IsActived: true,
          FolderUpload: "",
        };

        localStorage.setItem("user", JSON.stringify(userData));
        if (currentActiveTenant) {
          localStorage.setItem("activeTenant", JSON.stringify(currentActiveTenant));
        }
        if (currentAvailableTenants.length > 0) {
          localStorage.setItem("availableTenants", JSON.stringify(currentAvailableTenants));
        }

        setUser(userData);
        setActiveTenant(currentActiveTenant);
        setAvailableTenants(currentAvailableTenants);
        syncRoleName(userData);

        try {
          await fetchUserData(userData);
        } catch (fetchErr) {
          console.warn("Lỗi tải thông tin mở rộng sau khi đăng nhập:", fetchErr);
        }

        return {
          Success: true,
          Message: msg || "Đăng nhập thành công",
          StatusCode: 200,
          Data: {
            ...userData,
            AccessToken,
            RefreshToken,
          },
        };
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.Message ||
          err?.response?.data?.message ||
          (err instanceof Error ? err.message : "Đăng nhập thất bại");
        return {
          Success: false,
          Message: errorMsg,
          StatusCode: err?.response?.status || 400,
        };
      } finally {
        setLoading(false);
      }
    },
    [fetchUserData, syncRoleName]
  );

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res: any = await api.post("/auth/auth/switch-tenant", { TenantId: tenantId });
      const ok = res?.Success ?? res?.success;
      if (ok && res?.data) {
        const data = res.data;
        const AccessToken = data.accessToken || data.AccessToken;
        const RefreshToken = data.refreshToken || data.RefreshToken;
        if (AccessToken) {
          saveTokens(AccessToken, RefreshToken);
        }
        const activeTenantObj = data.activeTenant || data.ActiveTenant;
        if (activeTenantObj) {
          const tenant: TenantSummary = {
            Id: activeTenantObj.id || activeTenantObj.Id,
            Slug: activeTenantObj.slug || activeTenantObj.Slug,
            Name: activeTenantObj.name || activeTenantObj.Name,
            LogoUrl: activeTenantObj.logoUrl || activeTenantObj.LogoUrl,
            Status: activeTenantObj.status || activeTenantObj.Status,
          };
          setActiveTenant(tenant);
          localStorage.setItem("activeTenant", JSON.stringify(tenant));
          if (user) {
            const updatedUser = { ...user, ActiveTenant: tenant };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }
        }
        toast.success("Chuyển ngữ cảnh trung tâm thành công");
        return true;
      }
      toast.error(res?.message || "Không thể chuyển trung tâm");
      return false;
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi chuyển trung tâm");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
      await performLogout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng xuất thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  const getPermission = async (
    pathname: string
  ): Promise<GetPermissionByUser | undefined> => {
    const cleanPath = (pathname || "").replace(/^\/+/, "").toLowerCase();

    // 1. Kiểm tra vai trò tối cao (SYSTEM_OWNER, SYSTEM_ADMIN, ADMIN): Luôn có full quyền
    const roleKey = (user?.SystemRole || user?.RoleId || "").toUpperCase();
    if (roleKey === "SYSTEM_OWNER" || roleKey === "SYSTEM_ADMIN" || roleKey === "ADMIN") {
      return {
        Controller: pathname || "Home",
        IsViewed: true,
        IsAdded: true,
        IsUpdated: true,
        IsDeleted: true,
        IsApproved: true,
        IsAnalyzed: true,
      };
    }

    if (cleanPath === "" || cleanPath === "home") {
      return {
        Controller: "Home",
        IsViewed: true,
        IsAdded: true,
        IsUpdated: true,
        IsDeleted: true,
        IsApproved: true,
        IsAnalyzed: true,
      };
    }

    let currentPermissions = permissions;

    if (!currentPermissions || currentPermissions.length === 0) {
      const permissionsJson = localStorage.getItem("permissions");
      if (permissionsJson) {
        try {
          currentPermissions = JSON.parse(permissionsJson);
          setPermissions(currentPermissions || []);
        } catch (e) { }
      }
    }

    // 2. Tìm trong permissions đã lưu (so sánh không phân biệt hoa thường và hỗ trợ cả camelCase / PascalCase)
    const result = currentPermissions?.find((item: any) => {
      const ctrl = (item.Controller || item.controller || "").toLowerCase();
      return ctrl === cleanPath;
    });

    if (result) {
      const r = result as any;
      return {
        Controller: r.Controller ?? r.controller ?? pathname,
        IsViewed: r.IsViewed ?? r.isViewed ?? true,
        IsAdded: r.IsAdded ?? r.isAdded ?? false,
        IsUpdated: r.IsUpdated ?? r.isUpdated ?? false,
        IsDeleted: r.IsDeleted ?? r.isDeleted ?? false,
        IsApproved: r.IsApproved ?? r.isApproved ?? false,
        IsAnalyzed: r.IsAnalyzed ?? r.isAnalyzed ?? false,
      };
    }

    // 3. Fallback: Tìm trong danh sách Menu của người dùng
    let currentMenu = menu;
    if (!currentMenu || currentMenu.length === 0) {
      const menuJson = localStorage.getItem("menu");
      if (menuJson) {
        try {
          currentMenu = JSON.parse(menuJson);
        } catch (e) { }
      }
    }

    const matchedMenu = currentMenu?.find((m: any) => {
      const ctrl = (m.Controller || m.controller || "").toLowerCase();
      return ctrl === cleanPath;
    });

    if (matchedMenu) {
      const m = matchedMenu as any;
      return {
        Controller: m.Controller ?? m.controller ?? pathname,
        IsViewed: m.CanView ?? m.canView ?? true,
        IsAdded: m.CanAdd ?? m.canAdd ?? false,
        IsUpdated: m.CanUpdate ?? m.canUpdate ?? false,
        IsDeleted: m.CanDelete ?? m.canDelete ?? false,
        IsApproved: m.CanApprove ?? m.canApprove ?? false,
        IsAnalyzed: m.CanAnalyze ?? m.canAnalyze ?? false,
      };
    }

    // 4. Nếu là các trang hệ thống cơ bản mà user đã đăng nhập
    if (["user", "role", "systemgroup", "menu", "auditlog"].includes(cleanPath)) {
      if (roleKey.includes("OWNER") || roleKey.includes("ADMIN")) {
        return {
          Controller: pathname,
          IsViewed: true,
          IsAdded: true,
          IsUpdated: true,
          IsDeleted: true,
          IsApproved: true,
          IsAnalyzed: true,
        };
      }
    }

    return undefined;
  };

  const value: AuthContextType = {
    user,
    systemGroup,
    menu,
    permissions,
    roleName,
    roleBadge,
    activeTenant,
    availableTenants,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    switchTenant,
    getPermission,
    refreshProfile: async () => {
      const response = await userService.getCurrentUser();
      if (response.Success && response.Data) {
        const u = response.Data;
        const badge = getRoleBadgeInfo(u.SystemRole || u.RoleId);
        u.RoleName = badge.label;
        u.SystemRoleName = badge.label;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        syncRoleName(u);
      } else {
        setRoleName(null);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
