import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleService } from "@/features/system/api/role.api";
import {
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Crown,
  GraduationCap,
  HeartHandshake,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getFileUrl } from "@/lib/utils";
import type { UserManagementItem } from "@/features/system/types/user.types";

export default function RolePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("matrix");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Selected user for role change dialog
  const [selectedUser, setSelectedUser] = useState<UserManagementItem | null>(null);
  const [newSystemRole, setNewSystemRole] = useState("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  // 1. Fetch Matrix data from AuthService
  const {
    data: matrixResponse,
    refetch: refetchMatrix,
  } = useQuery({
    queryKey: ["auth-roles-matrix"],
    queryFn: () => roleService.getMatrix(),
  });

  const matrixData = matrixResponse?.Data ?? (matrixResponse as any)?.data;
  const roles = matrixData?.roles ?? matrixData?.Roles ?? [];
  const categories = matrixData?.permissionCategories ?? matrixData?.PermissionCategories ?? [];

  // 2. Fetch Users from AuthService
  const {
    data: usersResponse,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["auth-users-management", searchTerm, roleFilter],
    queryFn: () =>
      roleService.getUsers({
        search: searchTerm,
        systemRole: roleFilter === "ALL" ? undefined : roleFilter,
        pageIndex: 1,
        pageSize: 50,
      }),
  });

  const resData = usersResponse?.Data ?? (usersResponse as any)?.data;
  const userList = resData?.Data ?? resData?.data ?? (Array.isArray(resData) ? resData : []);
  const totalUsers = resData?.TotalRow ?? resData?.totalRow ?? userList.length;

  // Mutation to update system role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      roleService.updateUserSystemRole(userId, role),
    onSuccess: (res) => {
      if (res.Success) {
        toast.success(res.Message || "Cập nhật vai trò người dùng thành công");
        queryClient.invalidateQueries({ queryKey: ["auth-users-management"] });
        queryClient.invalidateQueries({ queryKey: ["auth-roles-matrix"] });
        setIsRoleDialogOpen(false);
        setSelectedUser(null);
      } else {
        toast.error(res.Message || "Cập nhật vai trò thất bại");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Lỗi khi cập nhật vai trò");
    },
  });

  const handleOpenRoleDialog = (user: UserManagementItem) => {
    setSelectedUser(user);
    setNewSystemRole(user.systemRole);
    setIsRoleDialogOpen(true);
  };

  const handleSaveUserRole = () => {
    if (!selectedUser || !newSystemRole) return;
    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: newSystemRole,
    });
  };

  const getRoleIcon = (roleKey: string) => {
    switch (roleKey) {
      case "SYSTEM_OWNER":
        return <Crown className="size-4 text-amber-500 shrink-0" />;
      case "SYSTEM_ADMIN":
        return <ShieldCheck className="size-4 text-blue-500 shrink-0" />;
      case "TENANT_OWNER":
        return <Building2 className="size-4 text-purple-500 shrink-0" />;
      case "TENANT_ADMIN":
        return <Briefcase className="size-4 text-indigo-500 shrink-0" />;
      case "TEACHER":
        return <GraduationCap className="size-4 text-emerald-500 shrink-0" />;
      case "STUDENT":
        return <BookOpen className="size-4 text-sky-500 shrink-0" />;
      case "PARENT":
        return <HeartHandshake className="size-4 text-orange-500 shrink-0" />;
      default:
        return <Users className="size-4 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with rich gradient card */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Crown className="size-5" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Quản trị Phân quyền & Vai trò
              </h2>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                AuthService RBAC Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Quản trị ma trận vai trò, quyền hạn truy cập tài nguyên và phân quyền tài khoản kết nối đồng bộ với CSDL PostgreSQL đa người thuê (Multi-tenant).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl border"
              onClick={() => {
                refetchMatrix();
                refetchUsers();
                toast.success("Đã đồng bộ dữ liệu mới nhất từ AuthService");
              }}
            >
              <RefreshCw className="size-3.5" /> Đồng bộ CSDL
            </Button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted/70 p-1 rounded-xl">
          <TabsTrigger value="matrix" className="gap-2 rounded-lg font-medium text-xs sm:text-sm">
            <ShieldCheck className="size-4 text-amber-500" />
            Ma trận Phân quyền & Vai trò
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-lg font-medium text-xs sm:text-sm">
            <Users className="size-4 text-blue-500" />
            Phân quyền Tài khoản Người dùng ({totalUsers})
          </TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2 rounded-lg font-medium text-xs sm:text-sm">
            <Layers className="size-4 text-indigo-500" />
            Mô hình Kiến trúc RBAC
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ROLE & PERMISSION MATRIX */}
        <TabsContent value="matrix" className="space-y-6 outline-none">
          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((r: any) => (
              <div
                key={r.roleKey}
                className="group relative rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${r.colorClass}`}>
                      {getRoleIcon(r.roleKey)}
                      {r.scope === "SYSTEM" ? "Hệ thống" : "Cơ sở"}
                    </span>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {r.userCount} tài khoản
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                    {r.displayName}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.description}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex flex-wrap gap-1">
                    {r.capabilities.slice(0, 3).map((cap: any) => (
                      <span
                        key={cap}
                        className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted font-medium text-muted-foreground"
                      >
                        {cap}
                      </span>
                    ))}
                    {r.capabilities.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted font-medium text-muted-foreground">
                        +{r.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Table */}
          <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500" />
                  Bảng Ma trận Quyền hạn Phân hệ (Capability Matrix)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Phân định quyền truy cập chi tiết giữa các vai trò trên từng nhóm chức năng
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="min-w-[280px] font-bold">Chức năng & Quyền hạn</TableHead>
                    <TableHead className="min-w-[240px] font-bold">Mô tả tác vụ</TableHead>
                    {roles.map((r: any) => (
                      <TableHead key={r.roleKey} className="text-center font-bold min-w-[110px]">
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[100px] text-xs" title={r.displayName}>
                            {r.roleKey.replace("_", " ")}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat: any) => (
                    <>
                      <TableRow key={cat.categoryKey} className="bg-muted/60 hover:bg-muted/60 font-bold">
                        <TableCell colSpan={roles.length + 2} className="py-2.5 px-4 text-primary text-xs uppercase tracking-wider">
                          📁 {cat.categoryName} — <span className="font-normal text-muted-foreground lowercase">{cat.description}</span>
                        </TableCell>
                      </TableRow>
                      {cat.permissions.map((p: any) => (
                        <TableRow key={p.permissionKey} className="hover:bg-muted/20">
                          <TableCell className="font-semibold text-xs text-foreground">
                            {p.name}
                            <span className="block text-[10px] font-mono text-muted-foreground font-normal">
                              {p.permissionKey}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.description}
                          </TableCell>
                          {roles.map((r: any) => {
                            const isGranted = p.grantedRoles.includes(r.roleKey);
                            return (
                              <TableCell key={r.roleKey} className="text-center">
                                {isGranted ? (
                                  <div className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    <Check className="size-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center justify-center size-6 rounded-full text-muted-foreground/30">
                                    <span className="text-xs font-bold">—</span>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: USER ROLE ASSIGNMENT */}
        <TabsContent value="users" className="space-y-4 outline-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl text-xs sm:text-sm"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs sm:text-sm">
                  <SelectValue placeholder="Lọc vai trò" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">Tất cả vai trò</SelectItem>
                  <SelectItem value="SYSTEM_OWNER">System Owner</SelectItem>
                  <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                  <SelectItem value="REGISTERED_USER">Registered User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User Table */}
          <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-bold">Người dùng & Tài khoản</TableHead>
                  <TableHead className="font-bold">Vai trò Hệ thống</TableHead>
                  <TableHead className="font-bold">Trung tâm tham gia</TableHead>
                  <TableHead className="font-bold">Vai trò Cơ sở</TableHead>
                  <TableHead className="font-bold">Trạng thái</TableHead>
                  <TableHead className="text-right font-bold">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUsersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Đang tải danh sách tài khoản từ AuthService...
                    </TableCell>
                  </TableRow>
                ) : userList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Không tìm thấy tài khoản người dùng phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  userList.map((u: UserManagementItem) => {
                    const initials =
                      u.fullName?.split(" ")
                        .filter(Boolean)
                        .slice(-2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase() || "U";

                    return (
                      <TableRow key={u.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-9 rounded-xl border">
                              <AvatarImage src={getFileUrl(u.avatarUrl || undefined)} />
                              <AvatarFallback className="rounded-xl text-xs font-bold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-bold text-sm text-foreground block truncate">
                                {u.fullName}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {u.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              u.systemRole === "SYSTEM_OWNER"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : u.systemRole === "SYSTEM_ADMIN"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                : "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {getRoleIcon(u.systemRole)}
                            {u.systemRoleName || u.systemRole}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.tenantNames && u.tenantNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.tenantNames.map((tn) => (
                                <Badge key={tn} variant="outline" className="text-xs">
                                  {tn}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Toàn hệ thống (Không giới hạn)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {u.tenantRoles && u.tenantRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.tenantRoles.map((tr) => (
                                <Badge key={tr} variant="secondary" className="text-[10px]">
                                  {tr}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Hoạt động
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg gap-1.5 text-xs font-medium"
                            onClick={() => handleOpenRoleDialog(u)}
                          >
                            <UserCog className="size-3.5" /> Phân quyền
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 3: ARCHITECTURE & GUIDE */}
        <TabsContent value="architecture" className="space-y-4 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Crown className="size-5" />
              </div>
              <h4 className="font-bold text-base text-foreground">Phân quyền 2 Tầng (Multi-tenant)</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hệ thống tách biệt rõ ràng giữa <strong>Vai trò Hệ thống (SystemRole)</strong> áp dụng toàn nền tảng và <strong>Vai trò Cơ sở (TenantRole)</strong> áp dụng riêng biệt cho từng trung tâm tiếng Anh trực thuộc.
              </p>
              <div className="pt-2 border-t text-xs text-foreground font-semibold">
                Schema: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">auth.users & auth.memberships</code>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3">
              <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Zap className="size-5" />
              </div>
              <h4 className="font-bold text-base text-foreground">Tích hợp Single Sign-On E-Learning</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khi người dùng đăng nhập qua <code>AuthService</code>, JWT Token được cấp phát chứa các Claims đặc biệt cho phép cổng E-Learning (LMS) nhận diện tức thì mà không cần đăng nhập lại.
              </p>
              <div className="pt-2 border-t text-xs text-foreground font-semibold">
                Cờ xác thực: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">elearning_bypass_auth = true</code>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-xs space-y-3">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="size-5" />
              </div>
              <h4 className="font-bold text-base text-foreground">Bảo mật Token Versioning</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khi người dùng thay đổi mật khẩu hoặc được quản trị viên cập nhật vai trò, <code>token_version</code> sẽ tự động tăng lên 1, vô hiệu hóa ngay lập tức các phiên đăng nhập cũ trên mọi thiết bị.
              </p>
              <div className="pt-2 border-t text-xs text-foreground font-semibold">
                Bảo vệ: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">Family Refresh Token Rotation</code>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Change System Role */}
      {selectedUser && (
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCog className="size-5 text-primary" />
                Cập nhật vai trò người dùng
              </DialogTitle>
              <DialogDescription>
                Thay đổi vai trò hệ thống cho tài khoản <strong>{selectedUser.fullName}</strong> ({selectedUser.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Chọn vai trò hệ thống:</label>
                <Select value={newSystemRole} onValueChange={setNewSystemRole}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="SYSTEM_OWNER">👑 Chủ sở hữu hệ thống (System Owner - Toàn quyền)</SelectItem>
                    <SelectItem value="SYSTEM_ADMIN">🛡️ Quản trị viên hệ thống (System Admin)</SelectItem>
                    <SelectItem value="REGISTERED_USER">👤 Người dùng thông thường (Registered User)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Lưu ý khi cập nhật:</p>
                <p>• Việc thay đổi vai trò sẽ cập nhật trực tiếp vào CSDL PostgreSQL (schema <code>auth.users</code>).</p>
                <p>• Phiên đăng nhập hiện tại của người dùng sẽ tự động áp dụng vai trò mới trong lần yêu cầu tiếp theo.</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsRoleDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                className="rounded-xl"
                disabled={updateRoleMutation.isPending}
                onClick={handleSaveUserRole}
              >
                {updateRoleMutation.isPending ? "Đang lưu..." : "Xác nhận cập nhật"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
