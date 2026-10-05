import type { BaseRequest } from "@/types/base/base.types";

export interface TenantSummary {
  Id: string;
  Slug: string;
  Name: string;
  LogoUrl?: string;
  Status: string;
}

export interface MeTenantContext {
  MembershipId: string;
  Roles: string[];
  JoinedAt: string;
  Tenant: TenantSummary;
}

export interface ElearningContext {
  CanAccess: boolean;
  CanBypassAuthorization: boolean;
  ElearningRole: string;
  Reason: string;
}

export interface User extends BaseRequest {
  Id: string;
  Username: string;
  Fullname: string;
  FullName?: string;
  RoleId: string;
  RoleName?: string;
  Role?: string;
  SystemRole?: string;
  SystemRoleName?: string;
  Email: string;
  Avatar?: string;
  Password?: string;
  Phone?: string;
  Address?: string;
  DateOfBirth?: string;
  Status?: string;
  TenantNames?: string[];
  TenantRoles?: string[];
  ActiveTenant?: TenantSummary | null;
  AvailableTenants?: MeTenantContext[];
  Elearning?: ElearningContext;
}

export interface UserManagementItem {
  id: string;
  email: string;
  fullName: string;
  systemRole: string;
  systemRoleName: string;
  status: string;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  tenantNames: string[];
  tenantRoles: string[];
}

export interface UserGetList extends User {
  Role: string;
}

export interface EditProfileRequest extends BaseRequest {
  Fullname: string;
  Email: string;
  Avatar?: string;
}

export interface ChangePasswordRequest {
  OldPassword: string;
  NewPassword: string;
  ConfirmNewPassword: string;
}
