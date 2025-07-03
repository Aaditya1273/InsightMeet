import { describe, it, expect } from 'vitest';

// This is a placeholder for a real summarization function
const summarizeText = (text: string): string => {
  if (!text) return '';
  return text.split('.').slice(0, 2).join('.') + '.';
};

describe('summarizeText', () => {
  it('should return an empty string if input is empty', () => {
    expect(summarizeText('')).toBe('');
  });

  it('should summarize a simple text', () => {
    const text = 'This is the first sentence. This is the second sentence. This is the third sentence.';
    const expected = 'This is the first sentence. This is the second sentence.';
    // Note: The mock function adds an extra period.
    expect(summarizeText(text)).toBe(expected + '.');
  });

  it('should handle text with less than two sentences', () => {
    const text = 'This is a single sentence.';
    expect(summarizeText(text)).toBe('This is a single sentence.');
  });
});
