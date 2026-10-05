/**
 * Lưu blob thành file tải về. Dùng thẻ `<a download>` (chạy cả trên HTTP như
 * VPS hiện tại, không cần API `showSaveFilePicker`).
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Thu hồi sau khi trình duyệt đã bắt đầu tải.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
