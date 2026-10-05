/**
 * Chép văn bản vào clipboard. `navigator.clipboard` chỉ có trong secure context
 * (HTTPS hoặc localhost) — VPS hiện chạy HTTP nên cần đường lùi `execCommand`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Người dùng từ chối quyền hoặc context không an toàn: thử cách cũ.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
