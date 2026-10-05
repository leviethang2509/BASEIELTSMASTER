import type { BaseRequest } from "@/types/base/base.types";

export interface DanToc extends BaseRequest {
  Id: string;
  TenGoi: string;
  GhiChu?: string | null;
  MoTa?: string | null;
  ThuTuUuTien?: number | null;
}

export interface PostDanTocRequest extends DanToc {}
