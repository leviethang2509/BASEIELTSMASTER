import { API_ENDPOINTS } from "@/config/constants";
import api, { type ApiResponse } from "@/lib/api";
import type {
  GetListPagingRequest,
  GetListPagingResponse,
  ModelCombobox,
} from "@/types/base/base.types";
import type { DanToc, PostDanTocRequest } from "@/features/danhmuc/types/dantoc.types";

export const danTocService = {
  getList: async (
    request: GetListPagingRequest
  ): Promise<ApiResponse<GetListPagingResponse<DanToc>>> => {
    return api.post<GetListPagingResponse<DanToc>>(
      API_ENDPOINTS.DanhMuc.DanToc.GET_LIST,
      request
    );
  },

  getById: async (id: string): Promise<ApiResponse<DanToc>> => {
    return api.post<DanToc>(API_ENDPOINTS.DanhMuc.DanToc.GET_BY_ID, { Id: id });
  },

  getByPost: async (id?: string): Promise<ApiResponse<PostDanTocRequest>> => {
    return api.post<PostDanTocRequest>(API_ENDPOINTS.DanhMuc.DanToc.GET_BY_POST, {
      Id: id || "00000000-0000-0000-0000-000000000000",
    });
  },

  insert: async (data: PostDanTocRequest): Promise<ApiResponse<DanToc>> => {
    return api.post<DanToc>(API_ENDPOINTS.DanhMuc.DanToc.INSERT, data);
  },

  update: async (data: PostDanTocRequest): Promise<ApiResponse<DanToc>> => {
    return api.post<DanToc>(API_ENDPOINTS.DanhMuc.DanToc.UPDATE, data);
  },

  delete: async (id: string): Promise<ApiResponse<string>> => {
    return api.post<string>(API_ENDPOINTS.DanhMuc.DanToc.DELETE, { Id: id });
  },

  deleteList: async (ids: string[]): Promise<ApiResponse<string>> => {
    return api.post<string>(API_ENDPOINTS.DanhMuc.DanToc.DELETE_LIST, { Ids: ids });
  },

  getAllCombobox: async (): Promise<ApiResponse<ModelCombobox[]>> => {
    return api.post<ModelCombobox[]>(
      API_ENDPOINTS.DanhMuc.DanToc.GET_ALL_COMBOBOX,
      {}
    );
  },
};
