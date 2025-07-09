import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Enhanced summarization function with better error handling
const summarizeText = (text: string | null | undefined): string => {
  // Handle null, undefined, and empty string cases
  if (!text || typeof text !== 'string') return '';
  
  // Trim whitespace
  const trimmedText = text.trim();
  if (!trimmedText) return '';
  
  // Split by sentence endings, handling multiple punctuation marks
  const sentences = trimmedText
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
  
  // If no sentences found, return empty string
  if (sentences.length === 0) return '';
  
  // Take first two sentences and reconstruct with proper punctuation
  const selectedSentences = sentences.slice(0, 2);
  
  // Handle the case where original text ends with punctuation
  const hasEndingPunctuation = /[.!?]$/.test(trimmedText);
  const result = selectedSentences.join('. ');
  
  // Add appropriate ending punctuation
  if (selectedSentences.length > 0 && !result.endsWith('.')) {
    return result + '.';
  }
  
  return result;
};

// Test utilities and helpers
class TestDataGenerator {
  static readonly BASIC_SENTENCES = [
    'This is the first sentence.',
    'This is the second sentence.',
    'This is the third sentence.',
    'This is the fourth sentence.'
  ];

  static readonly EDGE_CASES = {
    empty: '',
    whitespace: '   ',
    singleWord: 'word',
    singleSentence: 'This is a single sentence.',
    noEndingPunctuation: 'No ending punctuation here',
    multipleSpaces: 'First   sentence.    Second   sentence.',
    specialChars: 'First sentence! Second sentence? Third sentence.',
    longSentence: 'This is a very long sentence that contains multiple clauses and should still be treated as a single sentence even though it has many words.',
    unicodeText: 'This is a sentence with émojis 🎉. This is another sentence with spéciål characters.',
    numbersAndSymbols: 'Item 1: First point. Item 2: Second point. Item 3: Third point.',
    mixedPunctuation: 'Question one? Answer one! Statement two.',
    htmlContent: '<p>This is HTML content.</p> <div>This is more content.</div>',
    jsonLike: '{"message": "First sentence.", "description": "Second sentence."}',
    codeSnippet: 'function test() { return true; } // This is a comment.',
    urls: 'Visit https://example.com for more info. Check out https://test.com too.'
  };

  static createTestText(sentences: string[]): string {
    return sentences.join(' ');
  }

  static createRepeatedText(sentence: string, count: number): string {
    return Array(count).fill(sentence).join(' ');
  }
}

// Test result validator
class TestValidator {
  static validateSummaryStructure(result: string): boolean {
    return typeof result === 'string';
  }

  static validateSentenceCount(result: string, maxExpected: number): boolean {
    if (!result) return true;
    const sentences = result.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.length <= maxExpected;
  }

  static validateNotEmpty(result: string, shouldBeEmpty: boolean = false): boolean {
    return shouldBeEmpty ? result.length === 0 : result.length > 0;
  }
}

describe('summarizeText - Enhanced Test Suite', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Capture console output for debugging
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  describe('Basic Functionality', () => {
    it('should return an empty string for null input', () => {
      const result = summarizeText(null as any);
      expect(result).toBe('');
      expect(TestValidator.validateSummaryStructure(result)).toBe(true);
    });

    it('should return an empty string for undefined input', () => {
      const result = summarizeText(undefined as any);
      expect(result).toBe('');
      expect(TestValidator.validateSummaryStructure(result)).toBe(true);
    });

    it('should return an empty string for empty string input', () => {
      const result = summarizeText('');
      expect(result).toBe('');
      expect(TestValidator.validateNotEmpty(result, true)).toBe(true);
    });

    it('should return an empty string for whitespace-only input', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.whitespace);
      expect(result).toBe('');
      expect(TestValidator.validateNotEmpty(result, true)).toBe(true);
    });

    it('should handle non-string input gracefully', () => {
      const inputs = [123, true, [], {}, Symbol('test')];
      inputs.forEach(input => {
        const result = summarizeText(input as any);
        expect(result).toBe('');
        expect(TestValidator.validateSummaryStructure(result)).toBe(true);
      });
    });
  });

  describe('Single Sentence Handling', () => {
    it('should handle single sentence with ending punctuation', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.singleSentence);
      expect(result).toBe('This is a single sentence.');
      expect(TestValidator.validateSentenceCount(result, 1)).toBe(true);
    });

    it('should handle single sentence without ending punctuation', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.noEndingPunctuation);
      expect(result).toBe('No ending punctuation here.');
      expect(TestValidator.validateSentenceCount(result, 1)).toBe(true);
    });

    it('should handle single word input', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.singleWord);
      expect(result).toBe('word.');
      expect(TestValidator.validateNotEmpty(result)).toBe(true);
    });

    it('should handle very long single sentence', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.longSentence);
      expect(result).toContain('This is a very long sentence');
      expect(TestValidator.validateSentenceCount(result, 1)).toBe(true);
    });
  });

  describe('Multiple Sentences Handling', () => {
    it('should summarize text with exactly two sentences', () => {
      const text = TestDataGenerator.createTestText(
        TestDataGenerator.BASIC_SENTENCES.slice(0, 2)
      );
      const result = summarizeText(text);
      expect(result).toBe('This is the first sentence. This is the second sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should summarize text with more than two sentences', () => {
      const text = TestDataGenerator.createTestText(TestDataGenerator.BASIC_SENTENCES);
      const result = summarizeText(text);
      expect(result).toBe('This is the first sentence. This is the second sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
      expect(result).not.toContain('third sentence');
    });

    it('should handle mixed punctuation correctly', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.mixedPunctuation);
      expect(result).toBe('Question one. Answer one.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle exclamation and question marks', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.specialChars);
      expect(result).toBe('First sentence. Second sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });
  });

  describe('Edge Cases and Special Characters', () => {
    it('should handle text with extra spaces', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.multipleSpaces);
      expect(result).toBe('First   sentence. Second   sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle Unicode characters', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.unicodeText);
      expect(result).toContain('émojis 🎉');
      expect(result).toContain('spéciål characters');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle numbers and symbols', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.numbersAndSymbols);
      expect(result).toBe('Item 1: First point. Item 2: Second point.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle HTML-like content', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.htmlContent);
      expect(result).toContain('<p>This is HTML content.</p>');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle JSON-like content', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.jsonLike);
      expect(result).toContain('First sentence');
      expect(result).toContain('Second sentence');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle URLs in text', () => {
      const result = summarizeText(TestDataGenerator.EDGE_CASES.urls);
      expect(result).toContain('https://example.com');
      expect(result).toContain('https://test.com');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle very large input efficiently', () => {
      const largeText = TestDataGenerator.createRepeatedText(
        'This is a repeated sentence.',
        1000
      );
      
      const startTime = performance.now();
      const result = summarizeText(largeText);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle multiple consecutive punctuation marks', () => {
      const text = 'First sentence!!! Second sentence??? Third sentence...';
      const result = summarizeText(text);
      expect(result).toBe('First sentence. Second sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });

    it('should handle empty sentences between punctuation', () => {
      const text = 'First sentence.. Second sentence.. Third sentence..';
      const result = summarizeText(text);
      expect(result).toBe('First sentence. Second sentence.');
      expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
    });
  });

  describe('Regression Tests', () => {
    it('should maintain consistent behavior across multiple calls', () => {
      const text = TestDataGenerator.createTestText(TestDataGenerator.BASIC_SENTENCES);
      const results = Array(10).fill(null).map(() => summarizeText(text));
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toBe(results[0]);
      });
    });

    it('should handle boundary conditions', () => {
      const boundaryTests = [
        { input: '.', expected: '' },
        { input: '..', expected: '' },
        { input: 'a.', expected: 'a.' },
        { input: 'a.b.', expected: 'a.b.' },
        { input: 'a. b.', expected: 'a. b.' }
      ];

      boundaryTests.forEach(({ input, expected }) => {
        const result = summarizeText(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Type Safety and Error Handling', () => {
    it('should handle various falsy values', () => {
      const falsyValues = [null, undefined, '', 0, false, NaN];
      falsyValues.forEach(value => {
        const result = summarizeText(value as any);
        expect(result).toBe('');
        expect(TestValidator.validateSummaryStructure(result)).toBe(true);
      });
    });

    it('should never throw errors for any string input', () => {
      const potentiallyProblematicInputs = [
        String.fromCharCode(0), // null character
        '\n\r\t', // newlines and tabs
        Array(10000).fill('a').join(''), // very long string
        '\\n\\r\\t', // escaped characters
        String.raw`\n\r\t` // raw string
      ];

      potentiallyProblematicInputs.forEach(input => {
        expect(() => summarizeText(input)).not.toThrow();
        const result = summarizeText(input);
        expect(TestValidator.validateSummaryStructure(result)).toBe(true);
      });
    });
  });

  describe('Output Validation', () => {
    it('should always return a string', () => {
      const testCases = [
        '',
        'Single sentence.',
        'First. Second. Third.',
        TestDataGenerator.EDGE_CASES.unicodeText,
        TestDataGenerator.EDGE_CASES.longSentence
      ];

      testCases.forEach(testCase => {
        const result = summarizeText(testCase);
        expect(typeof result).toBe('string');
        expect(TestValidator.validateSummaryStructure(result)).toBe(true);
      });
    });

    it('should never return more than two sentences', () => {
      const multiSentenceTests = [
        'One. Two. Three. Four. Five.',
        'A! B? C. D! E? F.',
        TestDataGenerator.createRepeatedText('Sentence.', 50)
      ];

      multiSentenceTests.forEach(test => {
        const result = summarizeText(test);
        expect(TestValidator.validateSentenceCount(result, 2)).toBe(true);
      });
    });

    it('should handle result length appropriately', () => {
      const text = TestDataGenerator.createTestText(TestDataGenerator.BASIC_SENTENCES);
      const result = summarizeText(text);
      
      // Result should be shorter than or equal to input for multi-sentence text
      expect(result.length).toBeLessThanOrEqual(text.length);
      expect(TestValidator.validateNotEmpty(result)).toBe(true);
    });
  });
});