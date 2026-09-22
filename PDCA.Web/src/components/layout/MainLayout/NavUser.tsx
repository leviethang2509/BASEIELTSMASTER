"use client";

import { ChevronsUpDown, KeyRound, LogOut, UserPen } from "lucide-react";
import { useState } from "react";
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

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar();
  const { logout, refreshProfile, roleName } = useAuth();
  const displayRoleName = roleName?.trim();
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
              className="h-auto min-h-12 text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-sidebar-border">
                <AvatarImage src={getFileUrl(user.Avatar)} alt={user.Fullname} />
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 gap-0.5 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.Fullname}</span>
                {displayRoleName && (
                  <span className="inline-flex w-fit max-w-full items-center truncate rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[10px] font-medium text-sidebar-primary leading-none">
                    {displayRoleName}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage
                    src={getFileUrl(user.Avatar)}
                    alt={user.Fullname}
                  />
                  <AvatarFallback className="rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 gap-0.5 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">
                    {user.Fullname}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.Email}
                  </span>
                  {displayRoleName && (
                    <span className="mt-0.5 inline-flex w-fit max-w-full items-center truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground leading-none">
                      {displayRoleName}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
                <UserPen />
                Cập nhật hồ sơ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsChangePasswordOpen(true)}>
                <KeyRound />
                Đổi mật khẩu
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {isEditProfileOpen && (
        <PopupEditProfile
          user={{ ...user, IsEdit: true }}
          isOpen={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
          saveChange={handleSaveProfile}
        />
      )}
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
