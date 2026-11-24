/**
 * Subagent definitions for the Code Review Orchestrator
 *
 * These agents are specialized analyzers that work in parallel to review pull requests
 */

import {
  CODE_QUALITY_ANALYZER_PROMPT,
  TEST_COVERAGE_ANALYZER_PROMPT,
  REFACTORING_SUGGESTER_PROMPT
} from '../prompts/index.js';

import {
  CodeQualityResultJSONSchema,
  TestCoverageResultJSONSchema,
  RefactoringSuggestionJSONSchema
} from '../types/analysis-results.js';

export interface AgentDefinition {
  name: string;
  description: string;
  model: string;
  prompt: string;
  outputSchema?: Record<string, unknown>;
}

/**
 * Code Quality Analyzer Agent
 * Identifies security vulnerabilities, performance issues, and maintainability problems
 */
export const codeQualityAnalyzer: AgentDefinition = {
  name: 'code-quality-analyzer',
  description: 'Analyzes code for security vulnerabilities, performance issues, and maintainability concerns',
  model: 'claude-opus-4-5-20251101',
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
  outputSchema: CodeQualityResultJSONSchema
};

/**
 * Test Coverage Analyzer Agent
 * Identifies untested code paths and coverage gaps using extended thinking
 */
export const testCoverageAnalyzer: AgentDefinition = {
  name: 'test-coverage-analyzer',
  description: 'Analyzes test coverage and identifies untested code paths and gaps',
  model: 'claude-opus-4-5-20251101',
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
  outputSchema: TestCoverageResultJSONSchema
};

/**
 * Refactoring Suggester Agent
 * Suggests code modernization and design pattern improvements
 */
export const refactoringSuggester: AgentDefinition = {
  name: 'refactoring-suggester',
  description: 'Suggests code modernization, design improvements, and refactoring opportunities',
  model: 'claude-opus-4-5-20251101',
  prompt: REFACTORING_SUGGESTER_PROMPT,
  outputSchema: RefactoringSuggestionJSONSchema
};

/**
 * Collection of all subagents
 */
export const allAgents = [
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester
];
