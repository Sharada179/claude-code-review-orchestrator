import { describe, it, expect, beforeEach } from 'vitest';
import { CodeReviewOrchestrator, OrchestratorOptions } from '../src/orchestrator.js';
import { ReviewReportSchema } from '../src/types/report-types.js';

/**
 * Tests for CodeReviewOrchestrator
 *
 * These tests verify the orchestrator's ability to coordinate code reviews
 * and generate properly validated reports
 */

describe('CodeReviewOrchestrator', () => {
  let orchestrator: CodeReviewOrchestrator;

  beforeEach(() => {
    orchestrator = new CodeReviewOrchestrator();
  });

  describe('Configuration', () => {
    it('should initialize with default options', () => {
      const orch = new CodeReviewOrchestrator();
      expect(orch).toBeDefined();
    });

    it('should accept custom agent timeout configuration', () => {
      const customOptions: OrchestratorOptions = {
        agentTimeoutMs: 60000,
        maxConcurrentAgents: 2
      };
      const orch = new CodeReviewOrchestrator(customOptions);
      expect(orch).toBeDefined();
    });
  });

  describe('reviewPullRequest', () => {
    it('should return a ReviewReport object', async () => {
      const report = await orchestrator.reviewPullRequest('anthropic', 'test-repo', 1);
      expect(report).toBeDefined();
      expect(report.pullRequest).toBeDefined();
      expect(report.fileReviews).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.metadata).toBeDefined();
    });

    it('should include correct PR information', async () => {
      const owner = 'anthropic';
      const repo = 'test-repo';
      const prNumber = 42;

      const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

      expect(report.pullRequest.owner).toBe(owner);
      expect(report.pullRequest.repo).toBe(repo);
      expect(report.pullRequest.number).toBe(prNumber);
    });

    it('should include file reviews with all three perspectives', async () => {
      const report = await orchestrator.reviewPullRequest('org', 'repo', 1);

      expect(report.fileReviews).toHaveLength(1);
      const fileReview = report.fileReviews[0];

      // Should have all three analysis types
      expect(fileReview.codeQuality).toBeDefined();
      expect(fileReview.codeQuality.issues).toBeDefined();
      expect(fileReview.codeQuality.overallScore).toBeDefined();

      expect(fileReview.testCoverage).toBeDefined();
      expect(fileReview.testCoverage.untestedPaths).toBeDefined();
      expect(fileReview.testCoverage.coverageEstimate).toBeDefined();

      expect(fileReview.refactorings).toBeDefined();
      expect(fileReview.refactorings.suggestions).toBeDefined();
    });

    it('should include summary statistics', async () => {
      const report = await orchestrator.reviewPullRequest('org', 'repo', 1);

      expect(report.summary.totalFiles).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);
      expect(report.summary.criticalIssues).toBeGreaterThanOrEqual(0);
      expect(report.summary.highPriorityTests).toBeGreaterThanOrEqual(0);
      expect(report.summary.refactoringOpportunities).toBeGreaterThanOrEqual(0);
    });

    it('should include analysis metadata', async () => {
      const report = await orchestrator.reviewPullRequest('org', 'repo', 1);

      expect(report.metadata).toBeDefined();
      expect(report.metadata.analyzedAt).toBeDefined();
      expect(report.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(report.metadata.agentVersions).toBeDefined();
      expect(report.metadata.agentVersions['code-quality-analyzer']).toBeDefined();
      expect(report.metadata.agentVersions['test-coverage-analyzer']).toBeDefined();
      expect(report.metadata.agentVersions['refactoring-suggester']).toBeDefined();
    });

    it('should validate output with Zod schema', async () => {
      const report = await orchestrator.reviewPullRequest('org', 'repo', 1);

      const validationResult = ReviewReportSchema.safeParse(report);
      expect(validationResult.success).toBe(true);

      if (!validationResult.success) {
        console.error('Validation errors:', validationResult.error);
      }
    });

    it('should handle various PR numbers', async () => {
      const testCases = [1, 42, 999, 10000];

      for (const prNum of testCases) {
        const report = await orchestrator.reviewPullRequest('org', 'repo', prNum);
        expect(report.pullRequest.number).toBe(prNum);
      }
    });

    it('should handle various repository names', async () => {
      const repos = ['test-repo', 'my-app', 'claude-code-example'];

      for (const repo of repos) {
        const report = await orchestrator.reviewPullRequest('org', repo, 1);
        expect(report.pullRequest.repo).toBe(repo);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid PR numbers gracefully', async () => {
      // The orchestrator should not throw on invalid inputs at the method level
      // (validation happens in main.ts)
      const report = await orchestrator.reviewPullRequest('org', 'repo', 0);
      expect(report).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should produce consistent report structure across multiple calls', async () => {
      const report1 = await orchestrator.reviewPullRequest('org', 'repo', 1);
      const report2 = await orchestrator.reviewPullRequest('org', 'repo', 2);

      // Both reports should have the same structure
      expect(Object.keys(report1)).toEqual(Object.keys(report2));
      expect(Object.keys(report1.summary)).toEqual(Object.keys(report2.summary));
      expect(Object.keys(report1.metadata)).toEqual(Object.keys(report2.metadata));
    });

    // These tests require actual API keys and should be skipped in CI
    it.skip('should review a real small PR', async () => {
      // TODO: Test with a real public PR
      // NOTE: Only run manually with valid API keys
      // const report = await orchestrator.reviewPullRequest(
      //   'anthropic',
      //   'anthropic-sdk-python',
      //   1
      // );
      // expect(report.pullRequest.owner).toBe('anthropic');
    });
  });
});
