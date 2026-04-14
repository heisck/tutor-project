'use client';

import katex from 'katex';
import type { ReactNode } from 'react';

interface ExplanationRendererProps {
  content: string;
}

type ContentBlock =
  | {
      kind: 'list';
      items: string[];
    }
  | {
      kind: 'paragraph';
      text: string;
    };

type MathToken =
  | {
      kind: 'display-math';
      value: string;
    }
  | {
      kind: 'inline-math';
      value: string;
    }
  | {
      kind: 'text';
      value: string;
    };

export function ExplanationRenderer({
  content,
}: ExplanationRendererProps) {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="space-y-4 text-base leading-7 text-slate-800">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.kind === 'list') {
          return (
            <ul className="space-y-2 pl-5" key={key}>
              {block.items.map((item, itemIndex) => (
                <li className="list-disc marker:text-amber-700" key={`${key}-${itemIndex}`}>
                  {renderInlineSegments(item, `${key}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p className="whitespace-pre-wrap" key={key}>
            {renderInlineSegments(block.text, key)}
          </p>
        );
      })}
    </div>
  );
}

function splitIntoBlocks(content: string): ContentBlock[] {
  return content
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim().length > 0)
    .map((block) => {
      const lines = block.split('\n');
      const isList = lines.every((line) => line.trim().startsWith('- '));

      if (isList) {
        return {
          items: lines.map((line) => line.trim().slice(2).trim()),
          kind: 'list' as const,
        };
      }

      return {
        kind: 'paragraph' as const,
        text: block.trim(),
      };
    });
}

function renderInlineSegments(content: string, keyPrefix: string): ReactNode[] {
  return tokenizeMathContent(content).map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.kind === 'text') {
      return <span key={key}>{token.value.replace(/\\\$/g, '$')}</span>;
    }

    const renderedHtml = katex.renderToString(token.value, {
      displayMode: token.kind === 'display-math',
      output: 'htmlAndMathml',
      strict: 'warn',
      throwOnError: false,
      trust: false,
    });

    return (
      <span
        className={token.kind === 'display-math' ? 'block overflow-x-auto py-2' : 'inline-block max-w-full align-middle'}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
        key={key}
      />
    );
  });
}

export function tokenizeMathContent(content: string): MathToken[] {
  const tokens: MathToken[] = [];
  let cursor = 0;
  let textBuffer = '';

  while (cursor < content.length) {
    const previousCharacter = cursor > 0 ? content[cursor - 1] : '';

    if (previousCharacter !== '\\' && content.startsWith('$$', cursor)) {
      const blockToken = readMathToken(content, cursor, '$$', 'display-math');

      if (blockToken !== null) {
        flushTextBuffer(tokens, textBuffer);
        textBuffer = '';
        tokens.push(blockToken.token);
        cursor = blockToken.nextCursor;
        continue;
      }
    }

    if (previousCharacter !== '\\' && content[cursor] === '$') {
      const inlineToken = readMathToken(content, cursor, '$', 'inline-math');

      if (inlineToken !== null) {
        flushTextBuffer(tokens, textBuffer);
        textBuffer = '';
        tokens.push(inlineToken.token);
        cursor = inlineToken.nextCursor;
        continue;
      }
    }

    textBuffer += content[cursor];
    cursor += 1;
  }

  flushTextBuffer(tokens, textBuffer);
  return tokens;
}

function flushTextBuffer(tokens: MathToken[], textBuffer: string): void {
  if (textBuffer.length === 0) {
    return;
  }

  tokens.push({
    kind: 'text',
    value: textBuffer,
  });
}

function readMathToken(
  content: string,
  startIndex: number,
  delimiter: '$' | '$$',
  kind: MathToken['kind'],
): {
  nextCursor: number;
  token: MathToken;
} | null {
  const contentStart = startIndex + delimiter.length;
  let cursor = contentStart;

  while (cursor < content.length) {
    const nextIndex = content.indexOf(delimiter, cursor);

    if (nextIndex === -1) {
      return null;
    }

    if (content[nextIndex - 1] !== '\\') {
      return {
        nextCursor: nextIndex + delimiter.length,
        token: {
          kind,
          value: content.slice(contentStart, nextIndex).trim(),
        },
      };
    }

    cursor = nextIndex + delimiter.length;
  }

  return null;
}
