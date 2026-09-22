import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpenCheck, CalendarDays, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const result = await login(values.username, values.password);
      if (!result.Success) {
        toast.error(result.Message || "Đăng nhập thất bại");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[0.95fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 md:px-10">
        <Link to="/login" className="w-fit">
          <BrandMark />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
            <Form {...form}>
              <form
                className="flex flex-col gap-6"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    IELTS Master
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Đăng nhập hệ thống
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Quản lý đào tạo, lịch học, học viên và vận hành trung tâm.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên đăng nhập</FormLabel>
                      <FormControl>
                        <Input
                          className="h-10 bg-white"
                          placeholder="Nhập tên đăng nhập"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-3">
                        <FormLabel>Mật khẩu</FormLabel>
                        <a
                          href="#"
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Quên mật khẩu?
                        </a>
                      </div>
                      <FormControl>
                        <Input
                          className="h-10 bg-white"
                          type="password"
                          placeholder="Nhập mật khẩu"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="h-10 w-full">
                  Đăng nhập
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Chưa có tài khoản?{" "}
                  <Link to="/register" className="font-semibold text-primary">
                    Đăng ký
                  </Link>
                </p>
              </form>
            </Form>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} IELTS Master Training Operations.
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#14213d,#243b67_48%,#b91c1c)] text-white lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">
              Training Command Center
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight">
              Điều phối đào tạo IELTS từ tuyển sinh đến lớp học.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Một nền quản trị gọn, hiện đại và dễ mở rộng cho trung tâm IELTS:
              tài khoản, phân quyền, menu, lịch vận hành và dữ liệu hệ thống.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { label: "Học viên", icon: Users },
              { label: "Lịch học", icon: CalendarDays },
              { label: "Chương trình", icon: GraduationCap },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-white/10 p-4">
                <Icon className="size-6 text-amber-200" />
                <p className="mt-4 text-lg font-semibold">{label}</p>
                <p className="mt-1 text-xs text-white/65">
                  Sẵn sàng kết nối module vận hành.
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm text-white/70">
            <BookOpenCheck className="size-5 text-amber-200" />
            IELTS Master · Hệ thống Quản lý Đào tạo & Vận hành
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
