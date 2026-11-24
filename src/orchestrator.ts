import {
  ReviewReport,
  ReviewReportSchema
} from './types/report-types.js';
import { logger } from './utils/logger.js';
import { withTimeout, ErrorCodes, ReviewError } from './utils/error-handler.js';
import {
  CodeQualityResult,
  CodeQualityResultSchema,
  TestCoverageResult,
  TestCoverageResultSchema,
  RefactoringSuggestion,
  RefactoringSuggestionSchema
} from './types/analysis-results.js';
import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester,
  AgentDefinition
} from './agents/index.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  agentTimeoutMs?: number;
  maxConcurrentAgents?: number;
  model?: string;
}

interface FileReviewAnalysis {
  file: string;
  codeQuality: CodeQualityResult;
  testCoverage: TestCoverageResult;
  refactorings: RefactoringSuggestion;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private agentTimeoutMs: number;
  private maxConcurrentAgents: number;
  private model: string;

  constructor(options: OrchestratorOptions = {}) {
    this.agentTimeoutMs = options.agentTimeoutMs || 120000; // 2 minutes
    this.maxConcurrentAgents = options.maxConcurrentAgents || 3;
    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-opus-4-5-20251101';
  }

  /**
   * Review a pull request using parallel subagent analysis
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const startTime = Date.now();

    try {
      logger.info(`Starting code review for ${owner}/${repo}#${prNumber}`);

      // Fetch PR files from GitHub
      const files = await this.fetchPRFiles(owner, repo, prNumber);
      logger.info(`Fetched ${files.length} files from PR #${prNumber}`);

      if (files.length === 0) {
        throw new ReviewError(
          `No files found in PR #${prNumber}`,
          ErrorCodes.INVALID_CONFIG
        );
      }

      // Analyze files in parallel batches
      const fileReviews = await this.analyzeFilesInParallel(files, owner, repo, prNumber);

      const duration = Date.now() - startTime;

      // Aggregate results
      const report = this.aggregateResults(
        owner,
        repo,
        prNumber,
        fileReviews,
        duration
      );

      // Validate against schema
      const validationResult = ReviewReportSchema.safeParse(report);
      if (!validationResult.success) {
        throw new ReviewError(
          `Report validation failed: ${JSON.stringify(validationResult.error.errors)}`,
          ErrorCodes.VALIDATION_FAILED,
          { errors: validationResult.error.errors }
        );
      }

      logger.info(`Code review completed in ${duration}ms for ${owner}/${repo}#${prNumber}`);
      return report;
    } catch (error) {
      logger.error(`Code review failed for ${owner}/${repo}#${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Fetch files from a GitHub PR
   * In production, would use GitHub MCP server
   */
  private async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<Array<{ path: string; content: string }>> {
    // TODO: Implement GitHub MCP integration to fetch actual PR files
    // For now, return example files for testing
    logger.debug(`Would fetch files from ${owner}/${repo}#${prNumber}`);

    return [
      {
        path: 'src/example.ts',
        content: `export function greet(name: string): string {
  return "Hello, " + name;
}`
      }
    ];
  }

  /**
   * Analyze files using all three agents in parallel
   */
  private async analyzeFilesInParallel(
    files: Array<{ path: string; content: string }>,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<FileReviewAnalysis[]> {
    const fileReviews: FileReviewAnalysis[] = [];

    // Process files in batches to respect maxConcurrentAgents
    for (let i = 0; i < files.length; i += this.maxConcurrentAgents) {
      const batch = files.slice(i, i + this.maxConcurrentAgents);
      const batchResults = await Promise.all(
        batch.map(file =>
          this.analyzeFile(file.path, file.content, owner, repo, prNumber)
        )
      );
      fileReviews.push(...batchResults);
    }

    return fileReviews;
  }

  /**
   * Analyze a single file with all three agents
   */
  private async analyzeFile(
    filePath: string,
    content: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<FileReviewAnalysis> {
    logger.info(`Analyzing ${filePath}`);

    // Run all three agents in parallel
    const [codeQuality, testCoverage, refactorings] = await Promise.all([
      this.callAgentWithTimeout(
        'code-quality-analyzer',
        async () => {
          const result = await this.runAgent(codeQualityAnalyzer, filePath, content);
          return result as CodeQualityResult;
        }
      ),
      this.callAgentWithTimeout(
        'test-coverage-analyzer',
        async () => {
          const result = await this.runAgent(testCoverageAnalyzer, filePath, content);
          return result as TestCoverageResult;
        }
      ),
      this.callAgentWithTimeout(
        'refactoring-suggester',
        async () => {
          const result = await this.runAgent(refactoringSuggester, filePath, content);
          return result as RefactoringSuggestion;
        }
      )
    ]).catch((error: Error) => {
      logger.error(`Failed to analyze ${filePath}:`, error);
      throw error;
    });

    return {
      file: filePath,
      codeQuality,
      testCoverage,
      refactorings
    };
  }

  /**
   * Run a single agent with structured output
   * TODO: Integrate with Claude Agent SDK for actual agent execution
   * For now, returns example data for demonstration
   */
  private async runAgent(
    agentDef: AgentDefinition,
    filePath: string,
    content: string
  ): Promise<CodeQualityResult | TestCoverageResult | RefactoringSuggestion> {
    logger.debug(
      `Running agent "${agentDef.name}" on ${filePath} (${content.length} chars)`
    );

    // TODO: Replace with actual Agent SDK invocation
    // const agent = new Agent({ ... });
    // const response = await agent.run({ ... });

    // For now, return mock results based on agent type
    if (agentDef.name === 'code-quality-analyzer') {
      const result: CodeQualityResult = {
        file: filePath,
        issues: [],
        overallScore: 85,
        summary: 'Code quality analysis complete'
      };
      return CodeQualityResultSchema.parse(result);
    } else if (agentDef.name === 'test-coverage-analyzer') {
      const result: TestCoverageResult = {
        file: filePath,
        hasTests: true,
        testFiles: [],
        untestedPaths: [],
        coverageEstimate: 75,
        summary: 'Test coverage analysis complete'
      };
      return TestCoverageResultSchema.parse(result);
    } else if (agentDef.name === 'refactoring-suggester') {
      const result: RefactoringSuggestion = {
        file: filePath,
        suggestions: [],
        summary: 'Refactoring suggestions complete'
      };
      return RefactoringSuggestionSchema.parse(result);
    }

    throw new ReviewError(
      `Unknown agent type: ${agentDef.name}`,
      ErrorCodes.VALIDATION_FAILED
    );
  }

  /**
   * Aggregate file reviews into a comprehensive report
   */
  private aggregateResults(
    owner: string,
    repo: string,
    prNumber: number,
    fileReviews: FileReviewAnalysis[],
    duration: number
  ): ReviewReport {
    // Calculate summary statistics
    let totalScore = 0;
    let criticalIssues = 0;
    let highPriorityTests = 0;
    let refactoringOpportunities = 0;
    const recommendations: Array<{
      priority: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      files: string[];
    }> = [];

    // Aggregate metrics from all files
    for (const review of fileReviews) {
      totalScore += review.codeQuality.overallScore;

      // Count critical issues
      criticalIssues += review.codeQuality.issues.filter(
        i => i.severity === 'critical'
      ).length;

      // Count high priority test gaps
      highPriorityTests += review.testCoverage.untestedPaths.filter(
        p => p.priority === 'critical' || p.priority === 'high'
      ).length;

      // Count refactoring opportunities
      refactoringOpportunities += review.refactorings.suggestions.filter(
        s => s.impact === 'high'
      ).length;
    }

    // Create aggregated recommendations
    const criticalCodeIssues = fileReviews
      .flatMap(r => r.codeQuality.issues.filter(i => i.severity === 'critical'))
      .slice(0, 3);

    if (criticalCodeIssues.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        description: `Found ${criticalCodeIssues.length} critical security issues that must be addressed before merge`,
        files: fileReviews
          .filter(r => r.codeQuality.issues.some(i => i.severity === 'critical'))
          .map(r => r.file)
      });
    }

    return {
      pullRequest: {
        owner,
        repo,
        number: prNumber
      },
      fileReviews,
      summary: {
        totalFiles: fileReviews.length,
        overallScore: Math.round(totalScore / fileReviews.length),
        criticalIssues,
        highPriorityTests,
        refactoringOpportunities
      },
      recommendations,
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration,
        agentVersions: {
          'code-quality-analyzer': '1.0.0',
          'test-coverage-analyzer': '1.0.0',
          'refactoring-suggester': '1.0.0'
        }
      }
    };
  }

  /**
   * Helper to timeout agent calls
   */
  private async callAgentWithTimeout<T>(
    agentName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return withTimeout(
      fn,
      this.agentTimeoutMs,
      `Agent ${agentName} timed out after ${this.agentTimeoutMs}ms`
    );
  }
}
