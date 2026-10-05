import type { RoleBadgeInfo } from "@/features/system/types/auth.types";

export const ROLE_DEFINITIONS: Record<string, RoleBadgeInfo> = {
  SYSTEM_OWNER: {
    key: "SYSTEM_OWNER",
    label: "Chủ sở hữu hệ thống (System Owner)",
    colorClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: "Crown",
    description: "Quản trị tối cao toàn bộ nền tảng & Multi-tenants",
  },
  SYSTEM_ADMIN: {
    key: "SYSTEM_ADMIN",
    label: "Quản trị viên hệ thống (System Admin)",
    colorClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: "ShieldCheck",
    description: "Quản trị nền tảng, phê duyệt trung tâm & người dùng",
  },
  TENANT_OWNER: {
    key: "TENANT_OWNER",
    label: "Chủ cơ sở (Tenant Owner)",
    colorClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: "Building2",
    description: "Giám đốc / Chủ trung tâm ngoại ngữ",
  },
  TENANT_ADMIN: {
    key: "TENANT_ADMIN",
    label: "Quản lý cơ sở (Tenant Admin)",
    colorClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: "Briefcase",
    description: "Điều phối lớp học, học vụ & ca thi tại trung tâm",
  },
  TEACHER: {
    key: "TEACHER",
    label: "Giảng viên IELTS (Teacher)",
    colorClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: "GraduationCap",
    description: "Giảng viên IELTS, soạn thảo đề thi & chấm bài",
  },
  STUDENT: {
    key: "STUDENT",
    label: "Học viên (Student)",
    colorClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    icon: "BookOpen",
    description: "Học viên IELTS tại cơ sở đào tạo",
  },
  PARENT: {
    key: "PARENT",
    label: "Phụ huynh (Parent)",
    colorClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
    icon: "HeartHandshake",
    description: "Phụ huynh học viên theo dõi tiến độ",
  },
  REGISTERED_USER: {
    key: "REGISTERED_USER",
    label: "Người dùng đã đăng ký",
    colorClass: "bg-muted text-muted-foreground border-border",
    icon: "User",
    description: "Tài khoản người dùng tự do trên nền tảng",
  },
};

export function getRoleBadgeInfo(roleKey?: string | null): RoleBadgeInfo {
  if (!roleKey) {
    return {
      key: "GUEST",
      label: "Khách vãng lai",
      colorClass: "bg-muted text-muted-foreground border-border",
      icon: "User",
      description: "Chưa xác định vai trò",
    };
  }

  const normalized = roleKey.trim().toUpperCase();
  if (ROLE_DEFINITIONS[normalized]) {
    return ROLE_DEFINITIONS[normalized];
  }

  return {
    key: normalized,
    label: roleKey,
    colorClass: "bg-primary/10 text-primary border-primary/20",
    icon: "Shield",
    description: `Vai trò: ${roleKey}`,
  };
}
