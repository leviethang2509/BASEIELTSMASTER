import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { useListPage } from "@/hooks/useListPage";
import type { GetPermissionByUser } from "@/features/system/types/role.types";
import { useDanToc } from "@/features/danhmuc/hooks/useDanToc";
import { getColumns } from "./columns";
import PopupDetail from "./PopupDetail";

const DanTocPage = () => {
  const outlet = useOutletContext<{ permission: GetPermissionByUser | null }>();
  const permission = outlet?.permission;
  const {
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
    isLoading,
    isFetching,
  } = useDanToc();

  const columns = useMemo(
    () => getColumns(showPopupDetail, deleteList, permission),
    [showPopupDetail, deleteList, permission],
  );

  const listPage = useListPage({
    data,
    rowSelection,
    pageRequest,
    setPageRequest,
    deleteList,
    setRowSelection,
  });

  const canAdd = permission?.IsAdded ?? false;
  const canDelete = permission?.IsDeleted ?? false;

  return (
    <ListPageLayout
      columns={columns}
      data={data.Data}
      totalRow={data.TotalRow}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
      pageRequest={pageRequest}
      setPageRequest={setPageRequest}
      onRefresh={getList}
      isLoading={isFetching || isLoading}
      searchTerm={listPage.searchTerm}
      onSearchTermChange={listPage.setSearchTerm}
      onResetFilters={listPage.handleResetFilters}
      onAddClick={canAdd ? () => showPopupDetail("", false) : undefined}
      onDeleteClick={canDelete ? () => listPage.setShowDeleteConfirm(true) : undefined}
      deleteDisabled={Object.keys(rowSelection).length === 0}
      showDeleteConfirm={listPage.showDeleteConfirm}
      onDeleteConfirmChange={listPage.setShowDeleteConfirm}
      onDeleteConfirm={listPage.handleDelete}
      deleteItemCount={Object.keys(rowSelection).length}
      isDeleteLoading={isLoading}
      tableContainerClassName="h-[calc(100vh-310px)] overflow-auto w-full relative"
      compactToolbar
    >
      {isOpen && (
        <PopupDetail
          key={selectedItem?.Id || "new"}
          data={selectedItem}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          saveChange={saveChange}
        />
      )}
    </ListPageLayout>
  );
};

export default DanTocPage;
