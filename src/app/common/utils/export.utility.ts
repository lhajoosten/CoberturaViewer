import { Injectable } from '@angular/core';
import { CoverageData, CoverageInsight, ClassRisk } from '../models/coverage.model';
import { Recommendation } from '../../components/coverage/coverage-insights/recommendations-view/recommendations-view.component';

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    exportInsightsToMarkdown(
        coverageData: CoverageData,
        insights: CoverageInsight[],
        recommendations: Recommendation[],
        highRiskClasses: ClassRisk[],
        thresholds: any
    ): void {
        // Create markdown content
        const content = this.generateMarkdownReport(
            coverageData,
            insights,
            recommendations,
            highRiskClasses,
            thresholds
        );

        // Create download link
        this.downloadAsFile(content, 'coverage-insights.md', 'text/markdown');
    }

    private generateMarkdownReport(
        coverageData: CoverageData,
        insights: CoverageInsight[],
        recommendations: Recommendation[],
        highRiskClasses: ClassRisk[],
        thresholds: any
    ): string {
        // Generate markdown report content
        return `# Coverage Analysis Report
      
      ## Summary
      - **Overall Coverage**: ${coverageData.summary.lineCoverage.toFixed(1)}%
      - **Branch Coverage**: ${coverageData.summary.branchCoverage.toFixed(1)}%
      - **Generated**: ${new Date().toLocaleString()}
      
      ## Key Insights
      ${insights.map(insight => `- **${insight.title}**: ${insight.description}`).join('\n')}
      
      ## Recommendations
      ${recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
    `;
    }

    private downloadAsFile(content: string, filename: string, contentType: string): void {
        const blob = new Blob([content], { type: `${contentType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}