"use client";

import {
  Building2,
  ChevronsUpDown,
  Crown,
  KeyRound,
  LogOut,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPen,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type {
  ChangePasswordRequest,
  EditProfileRequest,
  User,
} from "@/features/system/types/user.types";
import { userService } from "@/features/system/api/user.api";
import { useAuth } from "@/hooks/useAuth";
import { getFileUrl } from "@/lib/utils";
import PopupChangePassword from "./PopupChangePassword";
import PopupEditProfile from "./PopupEditProfile";
import PopupAccountInfo from "./PopupAccountInfo";

export function NavUser({ user }: { user: User }) {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { logout, refreshProfile, roleName, roleBadge, activeTenant } = useAuth();
  const displayRoleName = roleName?.trim() || roleBadge.label;
  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const initials =
    user.Fullname?.split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "IM";

  const handleSaveProfile = async (updatedUser: User) => {
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-auto min-h-14 py-2 text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all rounded-xl"
            >
              <Avatar className="h-9 w-9 rounded-xl border border-sidebar-border shrink-0 shadow-xs">
                <AvatarImage src={getFileUrl(user.Avatar)} alt={user.Fullname} />
                <AvatarFallback className="rounded-xl bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 gap-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-semibold text-foreground">{user.Fullname}</span>
                {displayRoleName && (
                  <span
                    className={`inline-flex w-fit max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold border ${roleBadge.colorClass}`}
                  >
                    {roleBadge.key === "SYSTEM_OWNER" ? (
                      <Crown className="size-3 text-amber-500 shrink-0" />
                    ) : (
                      <ShieldCheck className="size-3 text-blue-500 shrink-0" />
                    )}
                    <span className="truncate">{displayRoleName}</span>
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl p-1.5 shadow-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 p-2.5 text-left text-sm bg-muted/40 rounded-lg">
                <Avatar className="h-10 w-10 rounded-xl shrink-0">
                  <AvatarImage
                    src={getFileUrl(user.Avatar)}
                    alt={user.Fullname}
                  />
                  <AvatarFallback className="rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 gap-0.5 text-left leading-tight min-w-0">
                  <span className="truncate text-sm font-bold text-foreground">
                    {user.Fullname}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.Email}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span
                      className={`inline-flex w-fit max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold border ${roleBadge.colorClass}`}
                    >
                      {roleBadge.key === "SYSTEM_OWNER" ? (
                        <Crown className="size-3 text-amber-500 shrink-0" />
                      ) : (
                        <ShieldCheck className="size-3 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate">{displayRoleName}</span>
                    </span>
                  </div>
                </div>
              </div>
              {activeTenant && (
                <div className="mx-2 mt-1.5 px-2 py-1 rounded-md bg-primary/5 text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary shrink-0" />
                  <span className="truncate font-medium text-foreground">{activeTenant.Name}</span>
                </div>
              )}
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
      </SidebarMenuItem>

      {/* Account Info Modal */}
      {isAccountInfoOpen && (
        <PopupAccountInfo
          user={user}
          isOpen={isAccountInfoOpen}
          onOpenChange={setIsAccountInfoOpen}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
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
    </SidebarMenu>
  );
}
