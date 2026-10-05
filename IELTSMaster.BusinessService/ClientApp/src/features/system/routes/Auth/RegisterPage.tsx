import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ClipboardCheck, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { authService } from "@/features/system/api/auth.api";

const formSchema = z
  .object({
    username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
    fullname: z.string().min(1, "Vui lòng nhập họ và tên"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

const RegisterPage = () => {
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      fullname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await authService.register({
      Username: values.username,
      Fullname: values.fullname,
      Email: values.email,
      Password: values.password,
      ConfirmPassword: values.confirmPassword,
    });

    if (!result.Success) {
      toast.error(result.Message || "Đăng ký thất bại");
      return;
    }

    toast.success("Đăng ký thành công. Vui lòng đăng nhập.");
    navigate("/login");
  };

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#14213d,#243b67_52%,#b91c1c)] text-white lg:block">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#fff_0_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <BrandMark />
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-200">
              IELTS Master Enrollment
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight">
              Tạo tài khoản cho đội ngũ vận hành đào tạo.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/75">
              Tài khoản mới được gắn vai trò mặc định để bắt đầu sử dụng hệ
              thống và có thể phân quyền chi tiết sau khi kích hoạt.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg bg-white/10 p-4">
              <UsersRound className="size-6 text-amber-200" />
              <p className="mt-4 font-semibold">Nhân sự trung tâm</p>
              <p className="mt-1 text-xs text-white/65">
                Tư vấn viên, giáo vụ, quản lý lớp và quản trị viên.
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <ClipboardCheck className="size-6 text-amber-200" />
              <p className="mt-4 font-semibold">Phân quyền rõ ràng</p>
              <p className="mt-1 text-xs text-white/65">
                Kiểm soát menu, thao tác và nhật ký hoạt động.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col px-6 py-6 md:px-10">
        <Link to="/login" className="w-fit lg:hidden">
          <BrandMark />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
            <Form {...form}>
              <form
                className="flex flex-col gap-5"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    IELTS Master
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Đăng ký tài khoản
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Tạo tài khoản sử dụng hệ thống vận hành đào tạo.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="fullname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên</FormLabel>
                      <FormControl>
                        <Input className="h-10 bg-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên đăng nhập</FormLabel>
                        <FormControl>
                          <Input className="h-10 bg-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input className="h-10 bg-white" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input className="h-10 bg-white" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xác nhận</FormLabel>
                        <FormControl>
                          <Input className="h-10 bg-white" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="h-10 w-full">
                  Đăng ký
                </Button>
              </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link to="/login" className="font-semibold text-primary">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
