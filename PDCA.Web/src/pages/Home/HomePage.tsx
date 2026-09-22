import {
  Activity,
  BookOpenCheck,
  CalendarClock,
  Menu as MenuIcon,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

const HomePage = () => {
  const { user, systemGroup, menu, permissions } = useAuth();

  const cards = [
    {
      label: "Tài khoản vận hành",
      value: user?.Username || "-",
      icon: Users,
      tone: "bg-red-50 text-red-700",
    },
    {
      label: "Nhóm chức năng",
      value: systemGroup?.length ?? 0,
      icon: MenuIcon,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Menu được cấp",
      value: menu?.length ?? 0,
      icon: Activity,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Quyền truy cập",
      value: permissions?.length ?? 0,
      icon: ShieldCheck,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  const operations = [
    "Tuyển sinh và chăm sóc học viên",
    "Xếp lớp, lịch học và ca học",
    "Theo dõi giáo viên, trợ giảng và lớp IELTS",
    "Quản trị tài khoản, vai trò, menu và nhật ký",
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div className="flex min-w-0 flex-col justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                <BookOpenCheck className="size-3.5" />
                IELTS Master Operations
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Hệ thống Quản lý Đào tạo & Vận hành
                </p>
                <h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Xin chào, {user?.Fullname || user?.Username || "bạn"}
                </h1>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Không gian điều phối trung tâm IELTS Master: quản trị người
                dùng, phân quyền, menu hệ thống và các nhóm chức năng sẵn sàng
                mở rộng cho quy trình đào tạo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {operations.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium"
                >
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="min-w-0">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[linear-gradient(135deg,#14213d,#243b67_48%,#b91c1c)] p-5 text-white shadow-sm">
            <div className="flex h-full min-h-56 flex-col justify-between gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Today Focus
                </p>
                <h2 className="mt-3 text-xl font-semibold">
                  IELTS Master Control Hub
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Một base vận hành sạch để phát triển module khóa học, lớp,
                  học viên, giáo viên, lịch học và báo cáo doanh thu.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-lg font-semibold">4</p>
                  <p className="text-[11px] text-white/70">Trụ cột</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-lg font-semibold">RBAC</p>
                  <p className="text-[11px] text-white/70">Phân quyền</p>
                </div>
                <div className="rounded-md bg-white/10 p-3">
                  <p className="text-lg font-semibold">PG</p>
                  <p className="text-[11px] text-white/70">Database</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted-foreground">
                {label}
              </p>
              <span className={`rounded-md p-2 ${tone}`}>
                <Icon className="size-5" />
              </span>
            </div>
            <p className="mt-4 truncate text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-blue-50 p-2 text-blue-700">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Khung vận hành đào tạo</h2>
              <p className="text-sm text-muted-foreground">
                Sẵn sàng mở rộng module lớp học, lịch học, điểm danh.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Quản trị hệ thống</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Base hiện có đầy đủ tài khoản, vai trò, phân quyền, menu, nhóm hệ
            thống, nhật ký hoạt động, đăng nhập, đăng ký và layout chung cho
            IELTS Master.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
