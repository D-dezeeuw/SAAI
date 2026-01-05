import { EditorView, keymap, Decoration, type DecorationSet } from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands';

// Effect to update highlighted ranges
export const setHighlights = StateEffect.define<{from: number, to: number}[]>();

// StateField to track active highlights
const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHighlights)) {
        if (effect.value.length === 0) {
          return Decoration.none;
        }
        const marks = effect.value
          .filter(({from, to}) => from >= 0 && to <= tr.state.doc.length && from < to)
          .map(({from, to}) =>
            Decoration.mark({ class: 'cm-active-note' }).range(from, to)
          );
        return Decoration.set(marks, true);
      }
    }
    return decorations.map(tr.changes);
  },
  provide: field => EditorView.decorations.from(field)
});

// Custom theme for Strudel - transparent for glass effect
const strudelTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#a5d6ff',
    fontSize: '14px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    fontFamily: "'SF Mono', Monaco, 'Courier New', monospace",
    padding: '1rem',
    minHeight: '180px',
    caretColor: '#4a9eff',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    overflow: 'auto',
    minHeight: '200px',
    maxHeight: '400px',
    backgroundColor: 'transparent',
  },
  '.cm-gutters': {
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    borderRight: '1px solid rgba(51, 51, 51, 0.5)',
    color: '#666',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-active-note': {
    backgroundColor: 'rgba(74, 222, 128, 0.5)',
    borderRadius: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(74, 158, 255, 0.3) !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#4a9eff',
    borderLeftWidth: '2px',
  },
});

export function createEditor(
  parent: HTMLElement,
  initialCode: string = '',
  onChange?: (code: string) => void
): EditorView {
  const extensions = [
    javascript(),
    strudelTheme,
    oneDark,
    highlightField,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
  ];

  // Add change listener if provided
  if (onChange) {
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      })
    );
  }

  const state = EditorState.create({
    doc: initialCode,
    extensions
  });

  return new EditorView({
    state,
    parent
  });
}

export function updateHighlights(view: EditorView, ranges: {from: number, to: number}[]) {
  view.dispatch({ effects: setHighlights.of(ranges) });
}

export function getCode(view: EditorView): string {
  return view.state.doc.toString();
}

export function setCode(view: EditorView, code: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: code }
  });
}

export function clearHighlights(view: EditorView) {
  view.dispatch({ effects: setHighlights.of([]) });
}
