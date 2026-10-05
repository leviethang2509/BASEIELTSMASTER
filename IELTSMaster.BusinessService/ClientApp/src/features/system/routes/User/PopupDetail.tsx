import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { roleService } from "@/features/system/api/role.api";
import type { ModelCombobox } from "@/types/base/base.types";
import type { User } from "@/features/system/types/user.types";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import UploadAvatar, {
  type UploadAvatarRef,
} from "@/components/ui/upload-avatar";
import { getFileUrl } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const createFormSchema = (isEdit: boolean) =>
  z.object({
    email: z.string().email("Vui lòng nhập đúng định dạng email"),
    password: isEdit
      ? z.string().optional()
      : z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    fullName: z.string().min(1, "Vui lòng nhập họ và tên"),
    phone: z.string().optional(),
    roleId: z.string().min(1, "Vui lòng chọn vai trò hệ thống"),
    isActived: z.boolean(),
  });

const DEFAULT_SYSTEM_ROLES: ModelCombobox[] = [
  { Value: "SYSTEM_OWNER", Text: "Chủ sở hữu hệ thống (System Owner)" },
  { Value: "SYSTEM_ADMIN", Text: "Quản trị viên hệ thống (System Admin)" },
  { Value: "REGISTERED_USER", Text: "Người dùng đã đăng ký (Registered User)" },
];

const PopupDetail = ({
  user,
  isOpen,
  onOpenChange,
  saveChange,
}: {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  saveChange: (user: User, isAddMore: boolean) => void;
}) => {
  const isEdit = Boolean(user?.IsEdit);
  const [id] = useState<string | null>(user?.Id || uuidv4());
  const [roles, setRoles] = useState<ModelCombobox[]>(DEFAULT_SYSTEM_ROLES);
  const [folderUpload] = useState<string>(user?.FolderUpload || uuidv4());

  const avatarRef = useRef<UploadAvatarRef>(null);

  const formSchema = createFormSchema(isEdit);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: user?.Email || user?.Username || "",
      password: "",
      fullName: user?.Fullname || user?.FullName || "",
      phone: user?.Phone || "",
      roleId: user?.SystemRole || user?.RoleId || "REGISTERED_USER",
      isActived: user?.IsActived ?? (user?.Status ? user.Status === "active" : true),
    },
  });

  useEffect(() => {
    form.reset({
      email: user?.Email || user?.Username || "",
      password: "",
      fullName: user?.Fullname || user?.FullName || "",
      phone: user?.Phone || "",
      roleId: user?.SystemRole || user?.RoleId || "REGISTERED_USER",
      isActived: user?.IsActived ?? (user?.Status ? user.Status === "active" : true),
    });
  }, [user, form]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await roleService.getAllCombobox();
        if (res?.Success && res.Data && res.Data.length > 0) {
          setRoles(res.Data);
        }
      } catch (e) {
        // Giữ default roles
      }
    };
    fetchRoles();
  }, []);

  const onSubmit = async (
    values: z.infer<typeof formSchema>,
    isAddMore: boolean
  ) => {
    const avatarUrl = await avatarRef.current?.upload();

    saveChange(
      {
        Id: user?.Id || id || uuidv4(),
        Username: values.email,
        Email: values.email,
        Password: values.password || undefined,
        Fullname: values.fullName,
        FullName: values.fullName,
        Phone: values.phone || undefined,
        RoleId: values.roleId,
        SystemRole: values.roleId,
        IsEdit: isEdit,
        IsActived: values.isActived,
        Status: values.isActived ? "active" : "locked",
        Avatar: avatarUrl === null ? user?.Avatar : avatarUrl,
        FolderUpload: folderUpload,
      },
      isAddMore
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((data) => onSubmit(data, false))}
          >
            <DialogHeader>
              <DialogTitle>
                {isEdit ? "Cập nhật Thông tin Người dùng" : "Thêm mới Người dùng"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex justify-center mb-2">
              <UploadAvatar
                ref={avatarRef}
                defaultImage={getFileUrl(user?.Avatar)}
                folderUpload={folderUpload}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email đăng nhập <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="nguyenvana@gmail.com" 
                        disabled={isEdit} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
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
                    <FormLabel>
                      {isEdit ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu ban đầu"} {!isEdit && <span className="text-destructive">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isEdit ? "•••••••• (Giữ nguyên)" : "Mật khẩu tối thiểu 6 ký tự"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="0912345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò hệ thống <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn vai trò hệ thống" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {roles.map((item) => (
                            <SelectItem
                              key={item.Value}
                              value={item.Value || ""}
                            >
                              {item.Text}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActived"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái tài khoản</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(val === "true")}
                      value={field.value ? "true" : "false"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="true">● Hoạt động (Active)</SelectItem>
                          <SelectItem value="false">● Đã khóa (Locked)</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button variant="outline">Hủy</Button>
              </DialogClose>
              <Button type="submit">Lưu thay đổi</Button>
              {!isEdit && (
                <Button
                  type="button"
                  onClick={form.handleSubmit((data) => onSubmit(data, true))}
                >
                  Lưu và thêm tiếp
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PopupDetail;
