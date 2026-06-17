// src/hooks/useCompletion.ts
import { useEffect, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import { completeCode } from '../lib/tauri';

export function useCompletion(model: string) {
  const providerRef = useRef<Monaco.IDisposable | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // monacoInstance must be the SAME monaco namespace the <Editor> component
  // is using internally — passed in from onMount(editor, monaco), never
  // imported separately. @monaco-editor/react loads monaco via its own
  // loader, so a top-level `import * as monaco from 'monaco-editor'` can
  // resolve to a different module instance with an isolated language
  // registry, silently causing providers registered there to never be
  // queried by the actual rendered editor.
  const registerCompletionProvider = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof Monaco) => {
      if (providerRef.current) {
        providerRef.current.dispose();
      }

      const languageId = editor.getModel()?.getLanguageId() ?? '*';

      providerRef.current = monacoInstance.languages.registerInlineCompletionsProvider(languageId, {
        provideInlineCompletions: async (textModel, position) => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          return new Promise((resolve) => {
            debounceTimerRef.current = setTimeout(async () => {
              try {
                const text = textModel.getValue();
                const offset = textModel.getOffsetAt(position);
                const prefix = text.substring(0, offset);
                const suffix = text.substring(offset);

                const suggestion = await completeCode(model, prefix, suffix);

                if (suggestion && suggestion.length > 0) {
                  resolve({
                    items: [
                      {
                        insertText: suggestion,
                        range: {
                          startLineNumber: position.lineNumber,
                          startColumn: position.column,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column,
                        },
                      },
                    ],
                  });
                } else {
                  resolve({ items: [] });
                }
              } catch (e) {
                console.error('[useCompletion] completion failed:', e);
                resolve({ items: [] });
              }
            }, 600);
          });
        },
        handleItemDidShow: () => {},
        freeInlineCompletions: () => {},
        disposeInlineCompletions: () => {},
      } as Monaco.languages.InlineCompletionsProvider<Monaco.languages.InlineCompletions>);
    },
    [model]
  );

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    registerCompletionProvider,
  };
}