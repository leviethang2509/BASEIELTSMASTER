/** Chữ viết tắt cho avatar: 2 chữ cái đầu của họ tên. */
export function initials(name?: string): string {
  if (!name) return 'LS';
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
