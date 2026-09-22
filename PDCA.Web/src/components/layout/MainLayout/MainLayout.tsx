import { AppSidebar } from "@/components/layout/MainLayout/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import type { GetPermissionByUser } from "@/features/system/types/role.types";
import { useAuth } from "@/hooks/useAuth";

interface MainLayoutProps {
  permission?: GetPermissionByUser | null;
}

export default function MainLayout({ permission }: MainLayoutProps) {
  const location = useLocation();
  const pathname = location.pathname.replace("/", "");
  const { systemGroup, menu } = useAuth();

  let breadcrumbGroup: string | undefined = "";
  let breadcrumbPage = "";

  const activeItem = menu?.find((item) => item.Controller === pathname);
  if (activeItem) {
    breadcrumbGroup = systemGroup?.find(
      (group) => group.Id === activeItem.SystemGroupId,
    )?.Name;
    breadcrumbPage = activeItem.Name;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh flex flex-col overflow-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-white/90 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbGroup && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        {breadcrumbGroup}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {breadcrumbPage || "Tổng quan vận hành"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="hidden min-w-0 px-4 text-right sm:block">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              IELTS Master
            </p>
            <p className="truncate text-sm font-medium">
              Quản lý Đào tạo & Vận hành
            </p>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0 overflow-auto">
          <Outlet context={{ permission }} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
