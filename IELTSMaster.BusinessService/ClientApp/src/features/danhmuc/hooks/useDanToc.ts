import { useCallback, useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { RowSelectionState } from "@tanstack/react-table";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { danTocService } from "@/features/danhmuc/api/dantoc.api";
import type {
  DanToc,
  PostDanTocRequest,
} from "@/features/danhmuc/types/dantoc.types";
import type { GetListPagingRequest } from "@/types/base/base.types";

const normalizeDanToc = (item: any): DanToc => ({
  ...item,
  Id: item.Id ?? item.id ?? "",
  TenGoi: item.TenGoi ?? item.tenGoi ?? "",
  GhiChu: item.GhiChu ?? item.ghiChu ?? null,
  MoTa: item.MoTa ?? item.moTa ?? null,
  ThuTuUuTien: item.ThuTuUuTien ?? item.thuTuUuTien ?? null,
  IsActived: item.IsActived ?? item.isActived ?? true,
  IsEdit: item.IsEdit ?? item.isEdit ?? false,
});

export const useDanToc = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PostDanTocRequest | null>(null);
  const [pageRequest, setPageRequest] = useState<GetListPagingRequest>({
    PageIndex: 1,
    PageSize: 10,
    TextSearch: "",
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const queryClient = useQueryClient();

  const {
    data: listResponse,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["dantoc", pageRequest],
    queryFn: () => danTocService.getList(pageRequest),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (listResponse && !listResponse.Success) {
      toast.error(listResponse.Message || "Không thể tải danh sách dân tộc");
    }
  }, [listResponse]);

  const resData = (listResponse?.Data ?? (listResponse as any)?.data) as any;
  const rawList = resData?.Data ?? resData?.data ?? [];
  const data = {
    Data: (rawList || []).map(normalizeDanToc),
    TotalRow: resData?.TotalRow ?? resData?.totalRow ?? rawList?.length ?? 0,
    PageIndex: resData?.PageIndex ?? resData?.pageIndex ?? pageRequest.PageIndex,
    PageSize: resData?.PageSize ?? resData?.pageSize ?? pageRequest.PageSize,
  };

  const saveMutation = useMutation({
    mutationFn: (item: PostDanTocRequest) =>
      item.IsEdit ? danTocService.update(item) : danTocService.insert(item),
    onSuccess: (response, variables) => {
      if (response.Success) {
        toast.success(
          variables.IsEdit ? "Cập nhật dân tộc thành công" : "Thêm dân tộc thành công",
        );
        queryClient.invalidateQueries({ queryKey: ["dantoc"] });
        return;
      }
      toast.error(response.Message || "Không thể lưu dân tộc");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lỗi khi lưu dân tộc");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => danTocService.deleteList(ids),
    onSuccess: (response) => {
      if (response.Success) {
        toast.success("Xóa dân tộc thành công");
        queryClient.invalidateQueries({ queryKey: ["dantoc"] });
        setRowSelection({});
        return;
      }
      toast.error(response.Message || "Không thể xóa dân tộc");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lỗi khi xóa dân tộc");
    },
  });

  const getList = useCallback(() => {
    refetch();
  }, [refetch]);

  const showPopupDetail = useCallback(async (id: string, isEdit: boolean) => {
    if (isEdit) {
      try {
        const response = await danTocService.getByPost(id);
        if (response.Success && response.Data) {
          setSelectedItem({ ...normalizeDanToc(response.Data), IsEdit: true });
          setIsOpen(true);
          return;
        }
        toast.error(response.Message || "Không tìm thấy dân tộc");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Lỗi lấy dữ liệu dân tộc");
      }
      return;
    }

    setSelectedItem({
      Id: id || uuidv4(),
      TenGoi: "",
      GhiChu: "",
      MoTa: "",
      ThuTuUuTien: null,
      IsActived: true,
      IsEdit: false,
    });
    setIsOpen(true);
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setSelectedItem(null);
  }, []);

  const saveChange = async (item: PostDanTocRequest, isAddMore: boolean) => {
    try {
      const result = await saveMutation.mutateAsync(item);
      if (!result.Success) return;

      if (isAddMore) {
        setSelectedItem({
          Id: uuidv4(),
          TenGoi: "",
          GhiChu: "",
          MoTa: "",
          ThuTuUuTien: null,
          IsActived: true,
          IsEdit: false,
        });
        return;
      }

      setIsOpen(false);
      setSelectedItem(null);
    } catch {
      return;
    }
  };

  const deleteList = async (ids: string[]) => {
    try {
      await deleteMutation.mutateAsync(ids);
    } catch {
      return;
    }
  };

  return {
    data,
    selectedItem,
    isOpen,
    pageRequest,
    rowSelection,
    setPageRequest,
    setRowSelection,
    getList,
    showPopupDetail,
    onOpenChange,
    saveChange,
    deleteList,
    isLoading: saveMutation.isPending || deleteMutation.isPending,
    isFetching,
  };
};
