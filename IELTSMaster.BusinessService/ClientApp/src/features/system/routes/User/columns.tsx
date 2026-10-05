import { type ColumnDef, type Row } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { User } from "@/features/system/types/user.types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getRoleBadgeInfo } from "@/lib/role-utils";
import { userService } from "@/features/system/api/user.api";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";

export const getColumns = (
  showPopupDetail: (id: string, isEdit: boolean) => void,
  deleteList: (ids: string[]) => void,
  onRefresh?: () => void,
): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "Username",
    header: "Tài khoản (Email)",
    cell: ({ row }) => {
      const email = row.original.Email || row.original.Username || (row.original as any).email || (row.original as any).userName || "";
      const phone = row.original.Phone || (row.original as any).phone;
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{email}</span>
          {phone && (
            <span className="text-xs text-muted-foreground">{phone}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "Fullname",
    header: "Họ và tên",
    cell: ({ row }) => {
      const name = row.original.Fullname || row.original.FullName || (row.original as any).fullName || (row.original as any).fullname || "Chưa đặt tên";
      const initial = name.charAt(0).toUpperCase();
      const avatar = row.original.Avatar || (row.original as any).avatar || (row.original as any).avatarUrl;
      const avatarSrc = avatar ? getFileUrl(avatar) : undefined;
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-border/60">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={name} />}
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "Role",
    header: "Vai trò hệ thống",
    cell: ({ row }) => {
      const roleKey = row.original.SystemRole || row.original.RoleId || (row.original as any).systemRole || (row.original as any).roleId || "REGISTERED_USER";
      const badge = getRoleBadgeInfo(roleKey);
      return (
        <Badge
          variant="outline"
          className={`font-medium gap-1 px-2 py-0.5 ${badge.colorClass}`}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </Badge>
      );
    },
  },
  {
    id: "Tenants",
    header: "Cơ sở trực thuộc",
    cell: ({ row }) => {
      const anyOriginal = row.original as any;
      const tenants: string[] = anyOriginal.tenantNames || anyOriginal.TenantNames || [];
      if (!tenants || tenants.length === 0) {
        return <span className="text-xs text-muted-foreground italic">Chưa phân cơ sở</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {tenants.map((t, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs font-normal">
              {t}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "IsActived",
    header: "Trạng thái",
    cell: ({ row }) => {
      const isActived = row.original.IsActived ?? (row.original as any).isActived ?? ((row.original as any).status === "active");
      return isActived ? (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
          ● Hoạt động
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium">
          ● Đã khóa
        </Badge>
      );
    },
  },
  {
    id: "actions",
    meta: {
      className: "text-center",
    },
    cell: ({ row }) => (
      <ActionCell
        row={row}
        showPopupDetail={showPopupDetail}
        deleteList={deleteList}
        onRefresh={onRefresh}
      />
    ),
  },
];

const ActionCell = ({
  row,
  showPopupDetail,
  deleteList,
  onRefresh,
}: {
  row: Row<User>;
  showPopupDetail: (id: string, isEdit: boolean) => void;
  deleteList: (ids: string[]) => void;
  onRefresh?: () => void;
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isActived = row.original.IsActived ?? (row.original.Status === "active");

  const handleToggleLock = async () => {
    try {
      if (isActived) {
        await userService.lockUser(row.original.Id);
        toast.success(`Đã khóa tài khoản ${row.original.Email || row.original.Username}`);
      } else {
        await userService.unlockUser(row.original.Id);
        toast.success(`Đã mở khóa tài khoản ${row.original.Email || row.original.Username}`);
      }
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Thao tác không thành công");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Chức năng</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => showPopupDetail(row.original.Id, true)}
            className="gap-2 cursor-pointer"
          >
            <Edit className="h-4 w-4 text-primary" />
            <span>Cập nhật thông tin</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleToggleLock}
            className="gap-2 cursor-pointer"
          >
            {isActived ? (
              <>
                <Lock className="h-4 w-4 text-amber-500" />
                <span>Khóa tài khoản</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-emerald-500" />
                <span>Mở khóa tài khoản</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Xóa tài khoản</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tài khoản <strong>{row.original.Email || row.original.Username}</strong> không?
              Tài khoản này sẽ bị đánh dấu xóa và vô hiệu hóa quyền truy cập hệ thống.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                deleteList([row.original.Id]);
                setShowDeleteConfirm(false);
              }}
            >
              Xóa tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
