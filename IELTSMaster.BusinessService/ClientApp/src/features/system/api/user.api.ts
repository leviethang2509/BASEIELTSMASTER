import api, { type ApiResponse } from "@/lib/api";
import type {
  ChangePasswordRequest,
  EditProfileRequest,
  User,
} from "@/features/system/types/user.types";
import type {
  GetListPagingRequest,
  ModelCombobox,
} from "@/types/base/base.types";
import { API_ENDPOINTS } from "@/config/constants";
import type { GetListPagingResponse } from "@/types/base/base.types";

export const userService = {
  getList: async (
    request: GetListPagingRequest
  ): Promise<ApiResponse<GetListPagingResponse<User>>> => {
    return api.post<GetListPagingResponse<User>>(
      API_ENDPOINTS.System.User.GET_LIST,
      request
    );
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    return api.get<User>(`${API_ENDPOINTS.System.User.GET_BY_ID}/${id}`);
  },

  insert: async (user: User): Promise<ApiResponse<User>> => {
    return api.post<User>(API_ENDPOINTS.System.User.INSERT, user);
  },

  update: async (user: User): Promise<ApiResponse<User>> => {
    return api.put<User>(`${API_ENDPOINTS.System.User.UPDATE}/${user.Id}`, user);
  },

  deleteList: async (ids: string[]): Promise<ApiResponse<User[]>> => {
    return api.delete<User[]>(API_ENDPOINTS.System.User.DELETE_LIST, {
      data: { ids },
    });
  },

  lockUser: async (id: string): Promise<ApiResponse<any>> => {
    return api.post(`${API_ENDPOINTS.System.User.INSERT}/${id}/lock`);
  },

  unlockUser: async (id: string): Promise<ApiResponse<any>> => {
    return api.post(`${API_ENDPOINTS.System.User.INSERT}/${id}/unlock`);
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    return api.get<User>(API_ENDPOINTS.System.User.GET_CURRENT_USER);
  },

  getAllCombobox: async (): Promise<ApiResponse<ModelCombobox[]>> => {
    return api.get<ModelCombobox[]>(API_ENDPOINTS.System.User.GET_ALL_COMBOBOX);
  },

  editProfile: async (user: EditProfileRequest): Promise<ApiResponse<User>> => {
    return api.put<User>(API_ENDPOINTS.System.User.EDIT_PROFILE, user);
  },

  changePassword: async (
    user: ChangePasswordRequest
  ): Promise<ApiResponse<User>> => {
    return api.put<User>(API_ENDPOINTS.System.User.CHANGE_PASSWORD, user);
  },
};
