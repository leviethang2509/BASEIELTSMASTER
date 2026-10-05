import Link from 'next/link';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import {
  manualHeadingId,
  parseManualInline,
  type ManualBlock,
  type ManualCalloutTone,
  type ManualRole,
} from '@lang/shared';
import { Badge } from '@/components/ui';
import { vi } from '@/i18n/vi';
import { manualPageHref } from '@/lib/user-manual';

const ROLE_LABELS: Record<ManualRole, string> = {
  ...vi.systemRoles,
  ...vi.tenantRoles,
};

export function manualRoleLabel(role: ManualRole): string {
  return ROLE_LABELS[role];
}

/** Chuỗi có `**đậm**`, `` `mã` `` và liên kết `[chữ](page:id#heading)`. */
export function ManualInline({ text }: { text: string }) {
  return (
    <>
      {parseManualInline(text).map((part, index) => {
        switch (part.kind) {
          case 'strong':
            return (
              <strong
                key={index}
                className="font-semibold text-[var(--heading)]"
              >
                {part.text}
              </strong>
            );
          case 'code':
            return (
              <code
                key={index}
                className="rounded-md bg-[var(--sidebar)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--heading)]"
              >
                {part.text}
              </code>
            );
          case 'link':
            return (
              <Link
                key={index}
                href={manualPageHref(part.pageId, part.anchor)}
                className="font-medium text-[var(--accent)] underline decoration-[var(--accent-soft)] underline-offset-2 hover:decoration-[var(--accent)]"
              >
                {part.text}
              </Link>
            );
          default:
            return <span key={index}>{part.text}</span>;
        }
      })}
    </>
  );
}

const CALLOUT_STYLE: Record<
  ManualCalloutTone,
  { className: string; icon: typeof Info }
> = {
  info: {
    className:
      'border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info-text)]',
    icon: Info,
  },
  tip: {
    className:
      'border-[var(--ok-border)] bg-[var(--ok-soft)] text-[var(--ok-text)]',
    icon: Lightbulb,
  },
  warning: {
    className:
      'border-[var(--warn-border)] bg-[var(--warn-soft)] text-[var(--warn-text)]',
    icon: AlertTriangle,
  },
};

function Block({ block }: { block: ManualBlock }) {
  switch (block.type) {
    case 'heading': {
      const id = manualHeadingId(block.text);
      return block.level === 2 ? (
        <h2
          id={id}
          className="mt-9 scroll-mt-24 border-b border-[var(--border)] pb-2 text-[21px] font-bold text-[var(--heading)] first:mt-0"
        >
          <ManualInline text={block.text} />
        </h2>
      ) : (
        <h3
          id={id}
          className="mt-6 scroll-mt-24 text-[16.5px] font-semibold text-[var(--heading)]"
        >
          <ManualInline text={block.text} />
        </h3>
      );
    }
    case 'paragraph':
      return (
        <p className="mt-3 leading-[1.75]">
          <ManualInline text={block.text} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag
          className={`mt-3 space-y-1.5 pl-6 leading-[1.7] ${
            block.ordered ? 'list-decimal' : 'list-disc'
          } marker:text-[var(--muted)]`}
        >
          {block.items.map((item, index) => (
            <li key={index}>
              <ManualInline text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'steps':
      return (
        <ol className="mt-4 space-y-3">
          {block.items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[13px] font-bold text-[var(--accent)]">
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5 leading-[1.7]">
                <div className="font-semibold text-[var(--heading)]">
                  <ManualInline text={item.title} />
                </div>
                {item.text && (
                  <div>
                    <ManualInline text={item.text} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead className="bg-[var(--sidebar)]">
              <tr>
                {block.columns.map((column, index) => (
                  <th
                    key={index}
                    className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[var(--body)]"
                  >
                    <ManualInline text={column} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-t border-[var(--border)] align-top"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-3.5 py-2.5 leading-[1.6] ${
                        cellIndex === 0
                          ? 'min-w-[140px] text-[var(--heading)]'
                          : 'min-w-[120px]'
                      }`}
                    >
                      <ManualInline text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout': {
      const style = CALLOUT_STYLE[block.tone];
      const Icon = style.icon;
      return (
        <div
          role="note"
          className={`mt-4 flex gap-3 rounded-xl border px-4 py-3 ${style.className}`}
        >
          <Icon size={18} className="mt-0.5 shrink-0" />
          <div className="min-w-0 leading-[1.7]">
            <div className="font-semibold">
              {block.title ?? vi.userManual.callout[block.tone]}
            </div>
            <div className="text-[var(--fg)]">
              <ManualInline text={block.text} />
            </div>
          </div>
        </div>
      );
    }
    case 'roles':
      return (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--muted)]">
          <span className="mr-1">{vi.userManual.appliesTo}</span>
          {block.roles.map((role) => (
            <Badge key={role} tone="accent">
              {manualRoleLabel(role)}
            </Badge>
          ))}
        </div>
      );
    case 'code':
      return (
        // Viền: ở theme tối khối mã chỉ tối hơn nền trang một bậc, không có
        // viền thì không thấy đâu là mép khối.
        <pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--code-bg)] px-4 py-3 font-mono text-[13px] leading-[1.6] text-[var(--code-fg)]">
          {block.text}
        </pre>
      );
  }
}

export function ManualBlocks({ blocks }: { blocks: readonly ManualBlock[] }) {
  return (
    <div className="text-[15px] text-[var(--fg)]">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
