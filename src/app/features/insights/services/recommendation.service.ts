import { Injectable } from '@angular/core';
import { CoverageData, CoverageInsight } from '../../../core/models/coverage.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {

  constructor() { }

  /**
   * Generate specific test recommendations based on coverage data
   */
  generateRecommendations(coverageData: CoverageData): CoverageInsight[] {
    if (!coverageData) return [];

    const recommendations: CoverageInsight[] = [];

    // Generate testing strategy recommendations
    if (coverageData.summary.lineCoverage < 60) {
      recommendations.push({
        type: 'info',
        title: 'Establish Coverage Baseline',
        description: 'Focus on creating a baseline of tests covering critical paths and core functionality.',
        icon: 'fa-map',
        details: 'Start with unit tests for core business logic and integration tests for critical workflows. Aim for at least 60% overall coverage as your first milestone.'
      });
    } else if (coverageData.summary.lineCoverage < 80) {
      recommendations.push({
        type: 'info',
        title: 'Target High-Risk Areas',
        description: 'Identify and prioritize testing for high-risk areas of your codebase.',
        icon: 'fa-bullseye',
        details: 'Expand test coverage to include more edge cases and error conditions. Focus on complex methods and classes with many conditional branches.'
      });
    } else {
      recommendations.push({
        type: 'info',
        title: 'Refine Test Quality',
        description: 'With good coverage in place, focus on test quality and maintenance.',
        icon: 'fa-gem',
        details: 'Review existing tests for effectiveness, remove redundant tests, and add specialized tests for edge cases. Consider adding property-based tests and mutation testing.'
      });
    }

    // Add specific test types based on coverage gaps
    const hasLowBranchCoverage = coverageData.summary.branchCoverage &&
      coverageData.summary.branchCoverage < coverageData.summary.lineCoverage - 10;

    if (hasLowBranchCoverage) {
      recommendations.push({
        type: 'info',
        title: 'Add Conditional Logic Tests',
        description: 'Improve branch coverage by adding tests for conditional paths.',
        icon: 'fa-code-branch',
        details: 'Identify methods with complex conditional logic and ensure tests exist for each branch. Use boundary value analysis to identify edge cases around conditionals.'
      });
    }

    // Check for untested packages
    const untestedPackages = coverageData.packages.filter(pkg => pkg.lineCoverage < 30);
    if (untestedPackages.length > 0) {
      const pkgNames = untestedPackages.map(pkg => `"${pkg.name}"`).join(', ');

      recommendations.push({
        type: 'warning',
        title: 'Create Tests for Untested Packages',
        description: `${untestedPackages.length} packages have very low coverage: ${pkgNames}`,
        icon: 'fa-box-open',
        details: 'Start with basic smoke tests for these packages, then implement more comprehensive test suites focusing on the most critical functionality first.'
      });
    }

    // Suggest test automation improvements
    recommendations.push({
      type: 'info',
      title: 'Integrate Coverage in CI/CD',
      description: 'Set up automated coverage tracking in your CI/CD pipeline.',
      icon: 'fa-robot',
      details: 'Configure your build system to generate and track coverage reports for each commit. Set coverage thresholds that must be maintained, and prevent merges that would decrease coverage significantly.'
    });

    // Add testing practices based on project size
    const projectSize = coverageData.packages.reduce((sum, pkg) =>
      sum + pkg.classes.reduce((classSum, cls) => classSum + cls.linesValid, 0), 0);

    if (projectSize > 10000) {
      recommendations.push({
        type: 'info',
        title: 'Implement Test Categorization',
        description: 'For large projects, categorize tests for efficient execution.',
        icon: 'fa-tags',
        details: 'Separate tests into fast unit tests, component tests, and slower integration tests. Configure your test runner to execute fast tests frequently during development and complete test suites before commits.'
      });
    }

    return recommendations;
  }
}