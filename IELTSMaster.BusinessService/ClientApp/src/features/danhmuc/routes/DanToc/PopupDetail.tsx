import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PostDanTocRequest } from "@/features/danhmuc/types/dantoc.types";

const formSchema = z.object({
  tenGoi: z.string().trim().min(1, "Vui lòng nhập tên dân tộc"),
  thuTuUuTien: z.number().int().nullable().optional(),
  ghiChu: z.string().optional(),
  moTa: z.string().optional(),
});

interface PopupDetailProps {
  data: PostDanTocRequest | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  saveChange: (data: PostDanTocRequest, isAddMore: boolean) => Promise<void>;
}

const PopupDetail = ({
  data,
  isOpen,
  onOpenChange,
  saveChange,
}: PopupDetailProps) => {
  const [id, setId] = useState(data?.Id || uuidv4());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenGoi: data?.TenGoi || "",
      thuTuUuTien: data?.ThuTuUuTien ?? null,
      ghiChu: data?.GhiChu || "",
      moTa: data?.MoTa || "",
    },
  });

  useEffect(() => {
    setId(data?.Id || uuidv4());
    form.reset({
      tenGoi: data?.TenGoi || "",
      thuTuUuTien: data?.ThuTuUuTien ?? null,
      ghiChu: data?.GhiChu || "",
      moTa: data?.MoTa || "",
    });
  }, [data, form]);

  const onSubmit = (values: z.infer<typeof formSchema>, isAddMore: boolean) => {
    saveChange(
      {
        Id: id,
        TenGoi: values.tenGoi,
        ThuTuUuTien: values.thuTuUuTien ?? null,
        GhiChu: values.ghiChu || null,
        MoTa: values.moTa || null,
        IsActived: data?.IsActived ?? true,
        IsEdit: data?.IsEdit ?? false,
      },
      isAddMore,
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((values) => onSubmit(values, false))}
          >
            <DialogHeader>
              <DialogTitle>
                {data?.IsEdit ? "Cập nhật dân tộc" : "Thêm mới dân tộc"}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Nhập thông tin dân tộc và lưu thay đổi.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tenGoi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên dân tộc</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thuTuUuTien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thứ tự ưu tiên</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ghiChu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="moTa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Hủy</Button>
              </DialogClose>
              <Button type="submit">Lưu</Button>
              {!data?.IsEdit && (
                <Button
                  type="button"
                  onClick={form.handleSubmit((values) => onSubmit(values, true))}
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
