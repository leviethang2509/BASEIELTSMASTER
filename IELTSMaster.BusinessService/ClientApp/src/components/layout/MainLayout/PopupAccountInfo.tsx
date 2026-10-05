import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Crown,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserPen,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFileUrl } from "@/lib/utils";
import type { User } from "@/features/system/types/user.types";

interface PopupAccountInfoProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenEditProfile?: () => void;
  onOpenChangePassword?: () => void;
}

export default function PopupAccountInfo({
  user,
  isOpen,
  onOpenChange,
  onOpenEditProfile,
  onOpenChangePassword,
}: PopupAccountInfoProps) {
  const { roleBadge, activeTenant, availableTenants, switchTenant } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);

  const initials =
    user.Fullname?.split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "IM";

  const handleSwitchCenter = async (tenantId: string) => {
    try {
      setSwitching(tenantId);
      await switchTenant(tenantId);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl border shadow-2xl bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Thông tin tài khoản</DialogTitle>
          <DialogDescription>Chi tiết thông tin cá nhân và vai trò hệ thống</DialogDescription>
        </DialogHeader>
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-primary/90 via-primary to-indigo-700 p-6 text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-white/30 shadow-lg rounded-2xl">
              <AvatarImage src={getFileUrl(user.Avatar)} alt={user.Fullname} />
              <AvatarFallback className="text-xl font-bold bg-white text-primary rounded-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-bold tracking-tight truncate">
                  {user.Fullname}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs ${
                    roleBadge.key === "SYSTEM_OWNER"
                      ? "bg-amber-400 text-amber-950 font-bold"
                      : "bg-white/20 text-white backdrop-blur"
                  }`}
                >
                  {roleBadge.key === "SYSTEM_OWNER" ? (
                    <Crown className="size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  {roleBadge.label}
                </span>
              </div>
              <p className="text-sm text-primary-foreground/80 mt-1 flex items-center justify-center sm:justify-start gap-1">
                <Mail className="size-3.5 inline" /> {user.Email}
              </p>
              {activeTenant && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 text-xs backdrop-blur">
                  <Building2 className="size-3.5 text-amber-300" />
                  <span>Cơ sở hoạt động:</span>
                  <span className="font-semibold text-white">{activeTenant.Name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="p-6 pt-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/70 p-1 rounded-xl">
              <TabsTrigger value="overview" className="rounded-lg font-medium text-xs sm:text-sm">
                Thông tin cá nhân
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-lg font-medium text-xs sm:text-sm">
                Vai trò & Trung tâm
              </TabsTrigger>
              <TabsTrigger value="elearning" className="rounded-lg font-medium text-xs sm:text-sm">
                Tích hợp E-Learning
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4 outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Họ và tên</span>
                  <span className="font-semibold text-foreground">{user.Fullname || "Chưa cập nhật"}</span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Tên đăng nhập</span>
                  <span className="font-semibold text-foreground">{user.Username}</span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Địa chỉ Email</span>
                  <span className="font-semibold text-foreground">{user.Email}</span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Số điện thoại</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {user.Phone || "Chưa thiết lập"}
                  </span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Ngày sinh</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {user.DateOfBirth || "Chưa thiết lập"}
                  </span>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Trạng thái tài khoản</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" /> Hoạt động bình thường
                  </span>
                </div>
                <div className="sm:col-span-2 p-3 rounded-xl border bg-muted/30">
                  <span className="text-xs text-muted-foreground block font-medium">Địa chỉ cư trú</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                    <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                    {user.Address || "Hệ thống trung tâm đào tạo tiếng Anh IELTS Master"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                {onOpenEditProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenEditProfile();
                    }}
                  >
                    <UserPen className="size-4" /> Cập nhật hồ sơ
                  </Button>
                )}
                {onOpenChangePassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenChangePassword();
                    }}
                  >
                    <KeyRound className="size-4" /> Đổi mật khẩu
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: ROLES & CENTERS */}
            <TabsContent value="roles" className="space-y-4 outline-none">
              <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-500/5 via-transparent to-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="size-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vai trò nền tảng cao nhất (System Role)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      {roleBadge.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {roleBadge.description}
                    </p>
                  </div>
                  <Badge variant="outline" className={`px-3 py-1 font-semibold text-xs border ${roleBadge.colorClass}`}>
                    {roleBadge.key}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Building2 className="size-4" /> Danh sách trung tâm & vai trò cơ sở ({availableTenants.length})
                </h4>
                {availableTenants.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                    <p>Tài khoản có quyền quản trị toàn hệ thống (Toàn bộ các trung tâm và cơ sở trực thuộc).</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableTenants.map((t) => {
                      const isActive = activeTenant?.Id === t.Tenant.Id;
                      return (
                        <div
                          key={t.MembershipId}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isActive
                              ? "bg-primary/5 border-primary/40 shadow-xs"
                              : "bg-card hover:bg-muted/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{t.Tenant.Name}</span>
                              {isActive && (
                                <Badge className="bg-primary text-primary-foreground text-[10px] h-4.5 px-1.5">
                                  Đang chọn
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {t.Roles.map((r) => (
                                <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {r}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {!isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={switching === t.Tenant.Id}
                              onClick={() => handleSwitchCenter(t.Tenant.Id)}
                              className="text-xs h-8 rounded-lg shrink-0"
                            >
                              {switching === t.Tenant.Id ? "Đang chuyển..." : "Chọn trung tâm"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: ELEARNING */}
            <TabsContent value="elearning" className="space-y-4 outline-none">
              <div className="p-4 rounded-xl border bg-gradient-to-br from-indigo-500/10 via-transparent to-sky-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                      <GraduationCap className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Cổng Học Trực Tuyến E-Learning</h4>
                      <p className="text-xs text-muted-foreground">Tích hợp Single Sign-On IELTS Master</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
                    Đã kết nối
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-2.5 rounded-lg bg-background/80 border">
                    <span className="text-muted-foreground block font-medium">Vai trò trên E-Learning</span>
                    <span className="font-semibold text-sm text-foreground mt-0.5 block">
                      {user.Elearning?.ElearningRole || (roleBadge.key === "SYSTEM_OWNER" ? "Admin" : "Learner")}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80 border">
                    <span className="text-muted-foreground block font-medium">Bỏ qua phân quyền RBAC</span>
                    <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                      <Zap className="size-3.5 fill-indigo-500 text-indigo-500" /> Kích hoạt
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3 italic">
                  * Hệ thống E-Learning chia sẻ chung CSDL PostgreSQL (auth & elearning schema). Tài khoản của bạn được cấp quyền truy cập đầy đủ bài học, thi thử và quản trị.
                </p>

                <div className="mt-4 pt-3 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => window.open("http://localhost:3100", "_blank")}
                  >
                    Mở Cổng E-Learning <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
