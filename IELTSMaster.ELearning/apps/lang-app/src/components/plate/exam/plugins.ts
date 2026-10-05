import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HighlightPlugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react';
import {
  FontBackgroundColorPlugin,
  FontColorPlugin,
  FontSizePlugin,
  TextAlignPlugin,
} from '@platejs/basic-styles/react';
import { CodeBlockPlugin, CodeLinePlugin } from '@platejs/code-block/react';
import { IndentPlugin } from '@platejs/indent/react';
import { LinkPlugin } from '@platejs/link/react';
import { AudioPlugin, ImagePlugin, VideoPlugin } from '@platejs/media/react';
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';
import { BlankPlugin } from './blank';
import { IndicatorPlugin } from './indicator';
import { ExamListPlugin } from './list-render';
import { AudioElement, ImageElement, VideoElement } from './media';
import { PairPlugin } from './pair';
import { CalloutPlugin, RubyPlugin, TogglePlugin } from './rich-blocks';
import {
  TableCellElement,
  TableCellHeaderElement,
  TableElement,
  TableRowElement,
} from './table';

const ALIGN_TARGETS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'callout',
  'toggle',
];

// Alignment ghi vào node prop `align` để bản giả lập đọc lại được.
const AlignPlugin = TextAlignPlugin.configure({
  inject: {
    nodeProps: {
      nodeKey: 'align',
      defaultNodeValue: 'start',
      styleKey: 'textAlign',
      validNodeValues: ['start', 'left', 'center', 'right', 'end', 'justify'],
    },
    targetPlugins: ALIGN_TARGETS,
  },
});

const ExamIndentPlugin = IndentPlugin.configure({
  inject: { targetPlugins: ALIGN_TARGETS },
});

// Màu chữ / màu nền người soạn chọn: ghi ra biến CSS + class thay vì đặt thẳng
// `color`/`background-color`, để `globals.css` đổi được cách hiển thị ở theme
// tối (bảng màu của toolbar "nướng" cho nền sáng – xem `.ls-leaf-*`).
const leafColorStyle =
  (name: string) =>
  ({ value }: { value?: unknown }) =>
    // Kiểu của Plate là `CSSStyleDeclaration`, nhưng chỗ nhận thật là `style`
    // của React – nơi duy nhất đặt được biến CSS.
    ({ [name]: String(value ?? '') }) as unknown as CSSStyleDeclaration;

const ExamFontColorPlugin = FontColorPlugin.configure({
  inject: {
    nodeProps: {
      transformClassName: () => 'ls-leaf-fg',
      transformStyle: leafColorStyle('--leaf-fg'),
    },
  },
});

const ExamFontBackgroundColorPlugin = FontBackgroundColorPlugin.configure({
  inject: {
    nodeProps: {
      transformClassName: () => 'ls-leaf-bg',
      transformStyle: leafColorStyle('--leaf-bg'),
    },
  },
});

/** Plugin của trình soạn đề (bộ của lightc-general + callout, gập/mở, furigana). */
export const EXAM_EDITOR_PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  HighlightPlugin,
  SuperscriptPlugin,
  SubscriptPlugin,
  ExamFontColorPlugin,
  ExamFontBackgroundColorPlugin,
  FontSizePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  CodeBlockPlugin,
  CodeLinePlugin,
  AlignPlugin,
  ExamIndentPlugin,
  LinkPlugin,
  ExamListPlugin,
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
  ImagePlugin.withComponent(ImageElement),
  AudioPlugin.withComponent(AudioElement),
  VideoPlugin.withComponent(VideoElement),
  CalloutPlugin,
  TogglePlugin,
  RubyPlugin,
  BlankPlugin,
  PairPlugin,
  IndicatorPlugin,
];
