import { useState } from "react";
import { type ColumnDef, type Row } from "@tanstack/react-table";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DanToc } from "@/features/danhmuc/types/dantoc.types";
import type { GetPermissionByUser } from "@/features/system/types/role.types";

export const getColumns = (
  showPopupDetail: (id: string, isEdit: boolean) => void,
  deleteList: (ids: string[]) => void,
  permission?: GetPermissionByUser | null,
): ColumnDef<DanToc>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Chọn tất cả"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Chọn dòng"
      />
    ),
  },
  {
    accessorKey: "TenGoi",
    header: "Tên dân tộc",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.TenGoi}</span>
    ),
  },
  {
    accessorKey: "ThuTuUuTien",
    header: "Thứ tự",
    cell: ({ row }) => row.original.ThuTuUuTien ?? "-",
  },
  {
    accessorKey: "GhiChu",
    header: "Ghi chú",
    cell: ({ row }) => (
      <span className="line-clamp-2 text-muted-foreground">
        {row.original.GhiChu || "-"}
      </span>
    ),
  },
  {
    accessorKey: "MoTa",
    header: "Mô tả",
    cell: ({ row }) => (
      <span className="line-clamp-2 text-muted-foreground">
        {row.original.MoTa || "-"}
      </span>
    ),
  },
  {
    accessorKey: "IsActived",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.IsActived ? (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium"
        >
          Hoạt động
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-muted text-muted-foreground border-border font-medium"
        >
          Không hoạt động
        </Badge>
      ),
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
        permission={permission}
      />
    ),
  },
];

const ActionCell = ({
  row,
  showPopupDetail,
  deleteList,
  permission,
}: {
  row: Row<DanToc>;
  showPopupDetail: (id: string, isEdit: boolean) => void;
  deleteList: (ids: string[]) => void;
  permission?: GetPermissionByUser | null;
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canUpdate = permission?.IsUpdated ?? false;
  const canDelete = permission?.IsDeleted ?? false;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Mở menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Chức năng</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!canUpdate}
            onClick={() => showPopupDetail(row.original.Id, true)}
            className="gap-2 cursor-pointer"
          >
            <Edit className="h-4 w-4 text-primary" />
            <span>Cập nhật</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canDelete}
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Xóa</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa dân tộc</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa dân tộc{" "}
              <strong>{row.original.TenGoi}</strong> không?
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
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
