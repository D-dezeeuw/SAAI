declare module '@strudel/codemirror' {
  import { ViewPlugin, Extension } from '@codemirror/view';
  import type { EditorView } from '@codemirror/view';

  export const sliderPlugin: ViewPlugin<any>;
  export const sliderValues: Record<string, number>;

  // Widget plugin for block widgets (pianoroll, scope, etc.)
  export const widgetPlugin: Extension[];

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

  // Update block widgets (non-slider widgets like pianoroll, scope)
  export function updateWidgets(
    view: EditorView,
    widgets: Array<{
      type: string;
      from: number;
      to: number;
      [key: string]: any;
    }>
  ): void;

  // Register a new widget type
  export function registerWidget(type: string, fn?: Function): void;

  // Set a widget DOM element by id
  export function setWidget(id: string, el: HTMLElement): void;

  export function slider(
    value: number,
    min?: number,
    max?: number,
    step?: number
  ): any;
}
