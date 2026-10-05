import { API_ENDPOINTS } from "@/config/constants";
import api, { type ApiResponse } from "@/lib/api";
import type { ModelCombobox } from "@/types/base/base.types";
import type { GetAllCaLamViecRequest } from "@/features/danhmuc/types/calamviec.types";

export const caLamViecService = {
  getAllCombobox: async (
    request: GetAllCaLamViecRequest = {}
  ): Promise<ApiResponse<ModelCombobox[]>> => {
    return api.post<ModelCombobox[]>(
      API_ENDPOINTS.DanhMuc.CaLamViec.GET_ALL_COMBOBOX,
      request
    );
  },
};
