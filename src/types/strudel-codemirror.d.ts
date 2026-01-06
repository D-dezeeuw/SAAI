declare module '@strudel/codemirror' {
  import { ViewPlugin } from '@codemirror/view';
  import type { EditorView } from '@codemirror/view';

  export const sliderPlugin: ViewPlugin<any>;
  export const sliderValues: Record<string, number>;

  export function sliderWithID(
    id: string,
    value: number,
    min?: number,
    max?: number,
    step?: number
  ): any;

  export function updateSliderWidgets(
    view: EditorView,
    widgets: Array<{
      type: string;
      from: number;
      to: number;
      value?: number;
      min?: number;
      max?: number;
      step?: number;
    }>
  ): void;

  export function slider(
    value: number,
    min?: number,
    max?: number,
    step?: number
  ): any;
}
