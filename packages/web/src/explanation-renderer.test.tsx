import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ExplanationRenderer,
  tokenizeMathContent,
} from './explanation-renderer';

describe('ExplanationRenderer', () => {
  it('renders KaTeX formulas without treating raw HTML as executable markup', () => {
    const { container } = render(
      <ExplanationRenderer
        content={'Force follows $F=ma$.\n\n<script>alert("x")</script>'}
      />,
    );

    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('<script>alert("x")</script>')).toBeInTheDocument();
  });

  it('renders list content and display math blocks', () => {
    const { container } = render(
      <ExplanationRenderer
        content={'- First idea\n- Second idea\n\n$$a^2 + b^2 = c^2$$'}
      />,
    );

    expect(screen.getByText('First idea')).toBeInTheDocument();
    expect(screen.getByText('Second idea')).toBeInTheDocument();
    expect(container.querySelector('.katex-display')).not.toBeNull();
  });
});

describe('tokenizeMathContent', () => {
  it('preserves plain text when math delimiters are incomplete', () => {
    expect(tokenizeMathContent('Price is $5 today')).toEqual([
      {
        kind: 'text',
        value: 'Price is $5 today',
      },
    ]);
  });
});
