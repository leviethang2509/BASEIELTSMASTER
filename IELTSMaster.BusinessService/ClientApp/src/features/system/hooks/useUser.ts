import { useState, useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { userService } from "@/features/system/api/user.api";
import type { User } from "@/features/system/types/user.types";
import type { GetListPagingRequest } from "@/types/base/base.types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import type { RowSelectionState } from "@tanstack/react-table";

export const useUser = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pageRequest, setPageRequest] = useState<GetListPagingRequest>({
    PageIndex: 1,
    PageSize: 10,
    TextSearch: "",
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 1. Fetch List
  const {
    data: listResponse,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["users", pageRequest],
    queryFn: () => userService.getList(pageRequest),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (listResponse && !listResponse.Success) {
      toast.error(listResponse.Message);
    }
  }, [listResponse]);

  const resData = (listResponse?.Data ?? (listResponse as any)?.data) as any;
  const rawList = resData?.Data ?? resData?.data ?? (Array.isArray(resData) ? resData : []);
  const totalRow = resData?.TotalRow ?? resData?.totalRow ?? (Array.isArray(rawList) ? rawList.length : 0);
  const pageIndex = resData?.PageIndex ?? resData?.pageIndex ?? pageRequest.PageIndex;
  const pageSize = resData?.PageSize ?? resData?.pageSize ?? pageRequest.PageSize;

  const normalizedList: User[] = (rawList || []).map((u: any) => ({
    ...u,
    Id: u.Id ?? u.id ?? "",
    Username: u.Username ?? u.username ?? u.Email ?? u.email ?? "",
    Email: u.Email ?? u.email ?? u.Username ?? u.username ?? "",
    Fullname: u.Fullname ?? u.fullName ?? u.fullname ?? u.Name ?? u.name ?? "",
    SystemRole: u.SystemRole ?? u.systemRole ?? u.RoleId ?? u.roleId ?? "REGISTERED_USER",
    RoleName: u.RoleName ?? u.roleName ?? u.SystemRoleName ?? u.systemRoleName ?? "",
    Phone: u.Phone ?? u.phone ?? "",
    Avatar: u.Avatar ?? u.avatar ?? u.AvatarUrl ?? u.avatarUrl ?? "",
    Status: u.Status ?? u.status ?? (u.IsActived ? "active" : "inactive"),
    IsActived: u.IsActived ?? u.isActived ?? (u.Status === "active"),
  }));

  const data = {
    Data: normalizedList,
    TotalRow: totalRow,
    PageIndex: pageIndex,
    PageSize: pageSize,
  };

  // 2. Mutations
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (user: User) => {
      return user.IsEdit ? userService.update(user) : userService.insert(user);
    },
    onSuccess: (response, variables) => {
      const ok = response?.Success ?? (response as any)?.success;
      if (ok) {
        toast.success(
          variables.IsEdit ? "Cập nhật thành công" : "Thêm mới thành công"
        );
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        toast.error(response?.Message ?? (response as any)?.message ?? "Lưu dữ liệu không thành công");
      }
    },
    onError: (error: any) => {
      const serverMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : "Lỗi khi lưu dữ liệu");
      toast.error(serverMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => userService.deleteList(ids),
    onSuccess: (response) => {
      const ok = response?.Success ?? (response as any)?.success;
      if (ok) {
        toast.success("Xóa dữ liệu thành công");
        queryClient.invalidateQueries({ queryKey: ["users"] });
        setRowSelection({});
      } else {
        toast.error(response?.Message ?? (response as any)?.message ?? "Xóa dữ liệu thất bại");
      }
    },
    onError: (error: any) => {
      const serverMessage =
        error?.response?.data?.Message ||
        error?.response?.data?.message ||
        (error instanceof Error ? error.message : "Lỗi khi xóa dữ liệu");
      toast.error(serverMessage);
    },
  });

  // 3. Handlers
  const getList = useCallback(() => {
    refetch();
  }, [refetch]);

  const showPopupDetail = useCallback(async (id: string, isEdit: boolean) => {
    if (isEdit) {
      try {
        const response: any = await userService.getById(id);
        const ok = response?.Success ?? response?.success;
        if (ok) {
          const u = response.Data ?? response.data;
          setUser({
            ...u,
            Id: u?.Id ?? u?.id ?? id,
            Username: u?.Username ?? u?.username ?? u?.Email ?? u?.email ?? "",
            Email: u?.Email ?? u?.email ?? "",
            Fullname: u?.Fullname ?? u?.fullName ?? u?.fullname ?? "",
            FullName: u?.FullName ?? u?.fullName ?? u?.Fullname ?? "",
            Phone: u?.Phone ?? u?.phone ?? "",
            RoleId: u?.SystemRole ?? u?.systemRole ?? u?.RoleId ?? u?.roleId ?? "",
            SystemRole: u?.SystemRole ?? u?.systemRole ?? u?.RoleId ?? u?.roleId ?? "",
            Status: u?.Status ?? u?.status ?? "active",
            IsActived: u?.IsActived ?? u?.isActived ?? (u?.Status === "active"),
            IsEdit: true,
          });
          setIsOpen(true);
        } else {
          toast.error(response?.Message ?? response?.message ?? "Không thể lấy thông tin người dùng");
        }
      } catch (err: any) {
        const msg = err?.response?.data?.Message ?? err?.response?.data?.message ?? err?.message ?? "Lỗi khi tải thông tin người dùng";
        toast.error(msg);
      }
    } else {
      setUser({
        Id: id,
        Username: "",
        Fullname: "",
        Email: "",
        RoleId: "",
        IsEdit: false,
        IsActived: true,
      });
      setIsOpen(true);
    }
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setUser(null);
  }, []);

  const saveChange = async (saveUser: User, isAddMore: boolean) => {
    const result = await saveMutation.mutateAsync(saveUser);
    if (result.Success) {
      if (isAddMore) {
        setUser({
          Id: uuidv4(),
          Username: "",
          Fullname: "",
          Email: "",
          Password: "",
          RoleId: "",
          IsEdit: false,
          IsActived: true,
        });
      } else {
        setIsOpen(false);
        setUser(null);
      }
    }
  };

  const deleteList = async (ids: string[]) => {
    await deleteMutation.mutateAsync(ids);
  };

  return {
    data,
    user,
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
