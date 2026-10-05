import api, { type ApiResponse } from "@/lib/api";
import type {
  GetPermissionByUser,
  Permission,
  PermissionCategory,
  PermissionRequest,
  Role,
  RolePermissionMatrixResponse,
  SystemRoleInfo,
} from "@/features/system/types/role.types";
import type { GetListPagingRequest, ModelCombobox } from "@/types/base/base.types";
import { API_ENDPOINTS } from "@/config/constants";
import type { GetListPagingResponse } from "@/types/base/base.types";
import type { UserManagementItem } from "@/features/system/types/user.types";

export const roleService = {
  // 1. AuthService RBAC Matrix & Role Endpoints
  getRoles: async (): Promise<ApiResponse<SystemRoleInfo[]>> => {
    return api.get<SystemRoleInfo[]>(API_ENDPOINTS.System.Role.GET_LIST);
  },

  getMatrix: async (): Promise<ApiResponse<RolePermissionMatrixResponse>> => {
    return api.get<RolePermissionMatrixResponse>(API_ENDPOINTS.System.Role.GET_MATRIX);
  },

  getPermissions: async (): Promise<ApiResponse<PermissionCategory[]>> => {
    return api.get<PermissionCategory[]>(API_ENDPOINTS.System.Role.GET_PERMISSIONS);
  },

  getUsers: async (params?: {
    search?: string;
    systemRole?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<GetListPagingResponse<UserManagementItem>>> => {
    // POST with JSON body to match [HttpPost("get-list")] on AuthService
    return api.post<GetListPagingResponse<UserManagementItem>>(
      API_ENDPOINTS.System.User.GET_LIST,
      {
        TextSearch: params?.search ?? "",
        SystemRole: params?.systemRole,
        PageIndex: params?.pageIndex ?? 1,
        PageSize: params?.pageSize ?? 20,
      }
    );
  },

  updateUserSystemRole: async (
    userId: string,
    systemRole: string
  ): Promise<ApiResponse<string>> => {
    return api.put<string>(
      `${API_ENDPOINTS.System.User.UPDATE_SYSTEM_ROLE}/${userId}/system-role`,
      { systemRole }
    );
  },

  assignTenantRole: async (
    userId: string,
    tenantId: string,
    role: string
  ): Promise<ApiResponse<string>> => {
    return api.post<string>(
      `${API_ENDPOINTS.System.User.ASSIGN_ROLE}/${userId}/assign-role`,
      { tenantId, role }
    );
  },

  // 2. Legacy / Compatibility Methods
  getList: async (
    request: GetListPagingRequest
  ): Promise<ApiResponse<GetListPagingResponse<Role>>> => {
    return api.get<GetListPagingResponse<Role>>(
      API_ENDPOINTS.System.Role.GET_LIST,
      { params: request }
    );
  },

  getById: async (id: string): Promise<ApiResponse<Role>> => {
    return api.get<Role>(API_ENDPOINTS.System.Role.GET_BY_ID, {
      params: { id },
    });
  },

  insert: async (data: Role): Promise<ApiResponse<Role>> => {
    return api.post<Role>(API_ENDPOINTS.System.Role.INSERT, data);
  },

  update: async (data: Role): Promise<ApiResponse<Role>> => {
    return api.put<Role>(API_ENDPOINTS.System.Role.UPDATE, data);
  },

  deleteList: async (ids: string[]): Promise<ApiResponse<Role[]>> => {
    return api.delete<Role[]>(API_ENDPOINTS.System.Role.DELETE_LIST, {
      data: { ids },
    });
  },

  getAllCombobox: async (): Promise<ApiResponse<ModelCombobox[]>> => {
    const res = await api.get<any[]>(API_ENDPOINTS.System.Role.GET_ALL_COMBOBOX);
    if (res?.Success && Array.isArray(res.Data)) {
      const items: ModelCombobox[] = res.Data.map((r: any) => ({
        Value: r.roleKey || r.RoleKey || r.id || r.Id,
        Text: r.displayName || r.DisplayName || r.name || r.Name,
      }));
      return { ...res, Data: items };
    }
    return { ...res, Data: [] };
  },

  getPermissionsByRole: async (id: string): Promise<ApiResponse<Permission[]>> => {
    return api.get<Permission[]>(API_ENDPOINTS.System.Role.GET_PERMISSIONS_BY_ROLE, {
      params: { id },
    });
  },

  updatePermission: async (data: PermissionRequest[]): Promise<ApiResponse<boolean>> => {
    return api.put<boolean>(API_ENDPOINTS.System.Role.UPDATE_PERMISSIONS, {
      permissions: data,
    });
  },

  getPermissionsByUser: async (id: string): Promise<ApiResponse<GetPermissionByUser[]>> => {
    return api.get<GetPermissionByUser[]>(
      API_ENDPOINTS.System.Role.GET_PERMISSIONS_BY_USER,
      { params: { id } }
    );
  },
};
