import { useState, useCallback, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditLogService } from "@/features/system/api/auditlog.api";
import type {
    AuditLog,
    AuditLogGetListRequest,
} from "@/types/auditlog.types";
import { toast } from "sonner";

const DEFAULT_REQUEST: AuditLogGetListRequest = {
    PageIndex: 1,
    PageSize: 10,
    TextSearch: undefined,
    FromDate: undefined,
    ToDate: undefined,
    Action: undefined,
    EntityName: undefined,
    IsSuccess: undefined,
};

export const useAuditLog = () => {
    const [pageRequest, setPageRequest] =
        useState<AuditLogGetListRequest>({ ...DEFAULT_REQUEST });
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const {
        data: listResponse,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ["auditLogs", pageRequest],
        queryFn: () => auditLogService.getList(pageRequest),
        placeholderData: keepPreviousData,
    });

    // Dynamic filter options from DB
    const { data: entityNamesResponse } = useQuery({
        queryKey: ["auditLogEntityNames"],
        queryFn: () => auditLogService.getEntityNames(),
        staleTime: 5 * 60 * 1000,
    });

    const { data: actionsResponse } = useQuery({
        queryKey: ["auditLogActions"],
        queryFn: () => auditLogService.getActions(),
        staleTime: 5 * 60 * 1000,
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

    const normalizedList: any[] = (rawList || []).map((l: any) => ({
        ...l,
        Id: l.Id ?? l.id ?? "",
        UserId: l.UserId ?? l.userId ?? "",
        EntityName: l.EntityName ?? l.entityName ?? "",
        Action: l.Action ?? l.action ?? "",
        Timestamp: l.Timestamp ?? l.timestamp ?? "",
        IsSuccess: l.IsSuccess ?? l.isSuccess ?? true,
        IpAddress: l.IpAddress ?? l.ipAddress ?? "",
        ErrorMessage: l.ErrorMessage ?? l.errorMessage ?? "",
    }));

    const data = {
        Data: normalizedList,
        TotalRow: totalRow,
        PageIndex: pageIndex,
        PageSize: pageSize,
    };

    const entityNames = entityNamesResponse?.Data ?? (entityNamesResponse as any)?.data ?? [];
    const actions = actionsResponse?.Data ?? (actionsResponse as any)?.data ?? [];

    const getList = useCallback(() => refetch(), [refetch]);
    const showDetail = useCallback((log: AuditLog) => setSelectedLog(log), []);
    const closeDetail = useCallback(() => setSelectedLog(null), []);

    return {
        data,
        entityNames,
        actions,
        pageRequest,
        setPageRequest,
        selectedLog,
        getList,
        showDetail,
        closeDetail,
        isFetching,
    };
};
