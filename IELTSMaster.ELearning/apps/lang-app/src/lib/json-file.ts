/** Tải dữ liệu xuống thành file `.json` (tên đã bỏ ký tự không hợp lệ). */
export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'exam'}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Mở hộp chọn file và đọc nội dung chữ; `null` khi người dùng không chọn. */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) resolve(null);
      else void file.text().then(resolve, () => resolve(null));
    };
    input.click();
  });
}
