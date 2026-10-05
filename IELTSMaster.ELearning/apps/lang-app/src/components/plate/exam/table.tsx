'use client';

import { PlateElement, type PlateElementProps } from 'platejs/react';

// Bảng dùng cho các câu ghép cặp (matching). Chỉ cần khung bảng gọn gàng: chèn
// bảng, thêm/xoá dòng-cột; không làm resize cột hay gộp ô ở đợt này.

const cellClass =
  'border border-[var(--border-strong)] px-2.5 py-1.5 align-top text-[14.5px]';

export function TableElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="table"
      className="my-3 w-full table-fixed border-collapse"
    >
      <tbody>{props.children}</tbody>
    </PlateElement>
  );
}

export function TableRowElement(props: PlateElementProps) {
  return <PlateElement {...props} as="tr" />;
}

export function TableCellElement(props: PlateElementProps) {
  return <PlateElement {...props} as="td" className={cellClass} />;
}

export function TableCellHeaderElement(props: PlateElementProps) {
  return (
    <PlateElement
      {...props}
      as="th"
      className={`${cellClass} bg-[var(--sidebar)] text-left font-semibold`}
    />
  );
}
