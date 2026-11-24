import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';
import { logger } from './utils/logger.js';
import { ReviewError, ErrorCodes } from './utils/error-handler.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  try {
    // Validate command line arguments
    if (!owner || !repo || !prStr) {
      throw new ReviewError(
        'Missing required arguments. Usage: npm start <owner> <repo> <pr-number>',
        ErrorCodes.INVALID_CONFIG
      );
    }

    const prNumber = parseInt(prStr, 10);
    if (isNaN(prNumber) || prNumber <= 0) {
      throw new ReviewError(
        `Invalid PR number: "${prStr}". Must be a positive integer.`,
        ErrorCodes.INVALID_CONFIG
      );
    }

    // Validate authentication (choose ONE method)
    const hasAnthropicAuth = !!process.env.ANTHROPIC_API_KEY;
    const hasBedrockAuth =
      !!process.env.AWS_ACCESS_KEY_ID &&
      !!process.env.AWS_SECRET_ACCESS_KEY;

    if (!hasAnthropicAuth && !hasBedrockAuth) {
      throw new ReviewError(
        `Missing API credentials. Please configure ONE authentication method:
  - Anthropic API: Set ANTHROPIC_API_KEY environment variable
  - AWS Bedrock: Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY`,
        ErrorCodes.MISSING_API_KEY
      );
    }

    if (hasBedrockAuth) {
      if (!process.env.AWS_REGION) {
        throw new ReviewError(
          'AWS Bedrock authentication requires AWS_REGION environment variable',
          ErrorCodes.INVALID_CONFIG
        );
      }
      logger.info('🔐 Using AWS Bedrock authentication');
    } else {
      logger.info('🔐 Using Anthropic API authentication');
    }

    // Validate ANTHROPIC_MODEL environment variable
    const model = process.env.ANTHROPIC_MODEL;
    if (!model) {
      throw new ReviewError(
        `Missing ANTHROPIC_MODEL environment variable. Required for both authentication methods:
  - AWS Bedrock: us.anthropic.claude-sonnet-4-5-20250929-v1:0
  - Anthropic API: claude-sonnet-4-5-20250929`,
        ErrorCodes.INVALID_CONFIG
      );
    }
    logger.info(`Using model: ${model}`);

    // Create orchestrator instance
    const orchestrator = new CodeReviewOrchestrator({
      agentTimeoutMs: 120000,
      maxConcurrentAgents: 3
    });

    // Call reviewPullRequest
    logger.info(`Starting review for ${owner}/${repo}#${prNumber}`);
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // Generate formatted reports
    const reportGenerator = new ReportGenerator();

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate and save Markdown report
    const markdownReport = reportGenerator.generateMarkdownReport(report);
    const mdPath = path.join(reportsDir, `review-${owner}-${repo}-${prNumber}.md`);
    fs.writeFileSync(mdPath, markdownReport);
    logger.info(`✅ Markdown report saved to ${mdPath}`);

    // Generate and save HTML report
    const htmlReport = reportGenerator.generateHTMLReport(report);
    const htmlPath = path.join(reportsDir, `review-${owner}-${repo}-${prNumber}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    logger.info(`✅ HTML report saved to ${htmlPath}`);

    // Generate and save JSON report
    const jsonPath = path.join(reportsDir, `review-${owner}-${repo}-${prNumber}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    logger.info(`✅ JSON report saved to ${jsonPath}`);

    logger.info('✅ Code review completed successfully');
  } catch (error) {
    if (error instanceof ReviewError) {
      logger.error(`[${error.code}] ${error.message}`);
    } else if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    } else {
      logger.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

main();
