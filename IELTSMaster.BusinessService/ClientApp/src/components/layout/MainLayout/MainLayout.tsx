import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  ChevronDown,
  Crown,
  KeyRound,
  LogOut,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPen,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import type { GetPermissionByUser } from "@/features/system/types/role.types";
import { useAuth } from "@/hooks/useAuth";
import { getFileUrl } from "@/lib/utils";
import PopupAccountInfo from "./PopupAccountInfo";
import PopupEditProfile from "./PopupEditProfile";
import PopupChangePassword from "./PopupChangePassword";
import { userService } from "@/features/system/api/user.api";
import { toast } from "sonner";
import type {
  ChangePasswordRequest,
  EditProfileRequest,
  User as UserType,
} from "@/features/system/types/user.types";

interface MainLayoutProps {
  permission?: GetPermissionByUser | null;
}

export default function MainLayout({ permission }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname.replace("/", "");
  const { user, systemGroup, menu, roleBadge, activeTenant, logout, refreshProfile } = useAuth();

  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  let breadcrumbGroup: string | undefined = "";
  let breadcrumbPage = "";

  const activeItem = menu?.find(
    (item) => item.Controller?.toLowerCase() === pathname.toLowerCase(),
  );
  if (activeItem) {
    breadcrumbGroup = systemGroup?.find(
      (group) => group.Id === activeItem.SystemGroupId,
    )?.Name;
    breadcrumbPage = activeItem.Name;
  } else if (pathname === "role") {
    breadcrumbGroup = "Hệ thống & Phân quyền";
    breadcrumbPage = "Ma trận Phân quyền & Vai trò";
  } else if (pathname === "user" || pathname === "") {
    breadcrumbGroup = "Hệ thống";
    breadcrumbPage = "Quản lý Người dùng";
  } else if (pathname === "dantoc") {
    breadcrumbGroup = "Danh mục";
    breadcrumbPage = "Dân tộc";
  }

  const initials =
    user?.Fullname?.split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "IM";

  const handleSaveProfile = async (updatedUser: UserType) => {
    try {
      const response = await userService.editProfile({
        Fullname: updatedUser.Fullname,
        Email: updatedUser.Email,
        Avatar: updatedUser.Avatar,
        FolderUpload: updatedUser.FolderUpload,
      } as EditProfileRequest);

      if (response.Success) {
        toast.success("Cập nhật hồ sơ thành công");
        await refreshProfile();
        setIsEditProfileOpen(false);
        return;
      }
      toast.error(response.Message || "Cập nhật hồ sơ thất bại");
    } catch (_error) {
      toast.error("Đã xảy ra lỗi khi cập nhật hồ sơ");
    }
  };

  const handleChangePassword = async (request: ChangePasswordRequest) => {
    try {
      const response = await userService.changePassword(request);
      if (response.Success) {
        toast.success("Đổi mật khẩu thành công");
        setIsChangePasswordOpen(false);
        return;
      }
      toast.error(response.Message || "Đổi mật khẩu thất bại");
    } catch (_error) {
      toast.error("Đã xảy ra lỗi khi đổi mật khẩu");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh flex flex-col overflow-hidden bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-white/95 dark:bg-card/95 backdrop-blur px-3 md:px-4 z-10 shadow-xs">
          {/* Left: Sidebar trigger & Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2">
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
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {breadcrumbPage || "Tổng quan vận hành"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right: Active Role, Center Badge, and User Nav */}
          {user && (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Active Tenant / Center Badge */}
              {activeTenant && (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border text-xs text-muted-foreground font-medium">
                  <Building2 className="size-3.5 text-primary" />
                  <span className="truncate max-w-[140px] text-foreground font-semibold">
                    {activeTenant.Name}
                  </span>
                </div>
              )}

              {/* Prominent Role Badge */}
              <div
                onClick={() => setIsAccountInfoOpen(true)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all hover:scale-105 shadow-2xs ${roleBadge.colorClass}`}
                title="Nhấn để xem chi tiết vai trò và quyền hạn của tài khoản"
              >
                {roleBadge.key === "SYSTEM_OWNER" ? (
                  <Crown className="size-3.5 text-amber-500 fill-amber-500/20" />
                ) : (
                  <ShieldCheck className="size-3.5 text-blue-500" />
                )}
                <span className="truncate max-w-[150px] sm:max-w-none">
                  {roleBadge.label}
                </span>
              </div>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 rounded-full pl-2 pr-1.5 gap-2 hover:bg-muted/80 data-[state=open]:bg-muted"
                  >
                    <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                      <AvatarImage src={getFileUrl(user.Avatar)} alt={user.Fullname} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block font-medium text-xs truncate max-w-[100px]">
                      {user.Fullname}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 rounded-xl p-1.5" align="end">
                  <DropdownMenuLabel className="font-normal p-2">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground truncate">
                        {user.Fullname}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.Email}
                      </p>
                      <div className="pt-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleBadge.colorClass}`}>
                          {roleBadge.label}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      onClick={() => setIsAccountInfoOpen(true)}
                      className="cursor-pointer gap-2 py-2 text-xs font-medium"
                    >
                      <UserCheck className="size-4 text-primary" />
                      Thông tin tài khoản & Vai trò
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/role")}
                      className="cursor-pointer gap-2 py-2 text-xs font-medium"
                    >
                      <Shield className="size-4 text-amber-500" />
                      Quản lý Phân quyền & Vai trò
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsEditProfileOpen(true)}
                      className="cursor-pointer gap-2 py-2 text-xs font-medium"
                    >
                      <UserPen className="size-4" />
                      Cập nhật hồ sơ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsChangePasswordOpen(true)}
                      className="cursor-pointer gap-2 py-2 text-xs font-medium"
                    >
                      <KeyRound className="size-4" />
                      Đổi mật khẩu
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="cursor-pointer gap-2 py-2 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="size-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </header>

        {/* Content Body */}
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0 overflow-auto">
          <Outlet context={{ permission }} />
        </div>
      </SidebarInset>

      {/* Account Info Modal */}
      {user && isAccountInfoOpen && (
        <PopupAccountInfo
          user={user}
          isOpen={isAccountInfoOpen}
          onOpenChange={setIsAccountInfoOpen}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />
      )}

      {/* Edit Profile Modal */}
      {user && isEditProfileOpen && (
        <PopupEditProfile
          user={{ ...user, IsEdit: true }}
          isOpen={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          saveChange={handleSaveProfile}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <PopupChangePassword
          isOpen={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
          saveChange={handleChangePassword}
        />
      )}
    </SidebarProvider>
  );
}
