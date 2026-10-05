import type { MenuGetListPaging } from "./menu.types";
import type { GetPermissionByUser } from "./role.types";
import type { SystemGroup } from "./systemGroup.types";
import type { MeTenantContext, TenantSummary, User } from "./user.types";
import { type ApiResponse } from "@/lib/api";

export interface LoginRequest {
  Username: string;
  Password: string;
}

export interface RegisterRequest {
  Username: string;
  Fullname: string;
  Email: string;
  Password: string;
  ConfirmPassword: string;
}

export interface LoginResponse extends User {
  AccessToken: string;
  RefreshToken: string;
}

export interface RefreshTokenRequest {
  RefreshToken: string;
}

export interface RefreshTokenResponse {
  AccessToken: string;
  RefreshToken: string;
}

export interface RoleBadgeInfo {
  key: string;
  label: string;
  colorClass: string;
  icon: string;
  description: string;
}

export interface AuthContextType {
  user: User | null;
  systemGroup: SystemGroup[] | null;
  menu: MenuGetListPaging[] | null;
  permissions: GetPermissionByUser[] | null;
  roleName: string | null;
  roleBadge: RoleBadgeInfo;
  activeTenant: TenantSummary | null;
  availableTenants: MeTenantContext[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<ApiResponse<LoginResponse>>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  getPermission: (pathname: string) => Promise<GetPermissionByUser | undefined>;
  refreshProfile: () => Promise<void>;
}
