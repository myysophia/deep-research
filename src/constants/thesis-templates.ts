/**
 * Thesis Templates for Academic Writing
 * Provides predefined structures for different types of academic papers
 */

export interface ThesisSection {
  title: string;
  description?: string;
  required: boolean;
  order: number;
}

export interface ThesisTemplate {
  id: string;
  name: string;
  description: string;
  sections: ThesisSection[];
  promptTemplate: string;
}

export const THESIS_TEMPLATES: Record<string, ThesisTemplate> = {
  standard: {
    id: "standard",
    name: "Standard Academic Paper",
    description: "Comprehensive academic paper structure suitable for most disciplines",
    sections: [
      { title: "Abstract", description: "Brief summary of the entire paper", required: true, order: 1 },
      { title: "Keywords", description: "Key terms for indexing", required: true, order: 2 },
      { title: "Introduction", description: "Background, problem statement, and objectives", required: true, order: 3 },
      { title: "Literature Review", description: "Review of relevant previous work", required: true, order: 4 },
      { title: "Methodology", description: "Research methods and procedures", required: true, order: 5 },
      { title: "Results", description: "Findings and data analysis", required: true, order: 6 },
      { title: "Discussion", description: "Interpretation and implications", required: true, order: 7 },
      { title: "Conclusion", description: "Summary and future work", required: true, order: 8 },
      { title: "References", description: "Cited works", required: true, order: 9 },
      { title: "Appendices", description: "Supplementary materials", required: false, order: 10 },
    ],
    promptTemplate: `Write a comprehensive academic paper on "{{topic}}" following the standard academic structure.

Requirements:
1. Abstract (150-250 words): Summarize the background, methods, key findings, and conclusions
2. Keywords: 5-7 relevant keywords
3. Introduction: Establish context, state the research problem, and outline objectives
4. Literature Review: Synthesize relevant scholarly work and identify research gaps
5. Methodology: Describe research design, data collection, and analysis methods
6. Results: Present findings with appropriate visualizations and statistics
7. Discussion: Interpret results, address limitations, and connect to existing literature
8. Conclusion: Summarize key contributions and suggest future research directions
9. References: Include all cited sources in proper citation format
10. Appendices: Include supplementary materials if applicable

Maintain academic tone, use formal language, and ensure proper citations throughout.`,
  },

  empirical: {
    id: "empirical",
    name: "Empirical Research Paper",
    description: "Structure for papers based on original data collection and analysis",
    sections: [
      { title: "Abstract", description: "Summary of research question, methods, and findings", required: true, order: 1 },
      { title: "Introduction", description: "Research problem and hypotheses", required: true, order: 2 },
      { title: "Literature Review", description: "Theoretical background and hypotheses development", required: true, order: 3 },
      { title: "Methods", description: "Participants, materials, and procedures", required: true, order: 4 },
      { title: "Results", description: "Statistical analysis and findings", required: true, order: 5 },
      { title: "Discussion", description: "Interpretation and implications", required: true, order: 6 },
      { title: "Limitations", description: "Study constraints and future directions", required: true, order: 7 },
      { title: "References", description: "Cited works", required: true, order: 8 },
    ],
    promptTemplate: `Write an empirical research paper on "{{topic}}" based on original research.

Requirements:
1. Abstract: State research question, methodology, key findings, and implications
2. Introduction: Present research problem, theoretical framework, and specific hypotheses
3. Literature Review: Establish theoretical foundation and develop testable hypotheses
4. Methods: Detail participants, materials, procedure, and statistical analysis plan
5. Results: Report descriptive statistics, test results, and effect sizes with appropriate tables/figures
6. Discussion: Interpret findings in light of hypotheses, explain theoretical and practical implications
7. Limitations: Address methodological constraints and suggest future research
8. References: Include all cited sources

Focus on hypothesis testing, statistical rigor, and clear presentation of empirical evidence.`,
  },

  review: {
    id: "review",
    name: "Literature Review",
    description: "Systematic review and synthesis of existing research",
    sections: [
      { title: "Abstract", description: "Summary of review scope and key findings", required: true, order: 1 },
      { title: "Introduction", description: "Scope and significance of the review", required: true, order: 2 },
      { title: "Search Strategy", description: "Databases and search terms used", required: true, order: 3 },
      { title: "Inclusion Criteria", description: "Study selection criteria", required: true, order: 4 },
      { title: "Thematic Analysis", description: "Synthesis by key themes", required: true, order: 5 },
      { title: "Key Findings", description: "Main trends and consensus", required: true, order: 6 },
      { title: "Research Gaps", description: "Areas needing further study", required: true, order: 7 },
      { title: "Future Directions", description: "Recommended research avenues", required: true, order: 8 },
      { title: "Conclusion", description: "Summary and implications", required: true, order: 9 },
      { title: "References", description: "All reviewed works", required: true, order: 10 },
    ],
    promptTemplate: `Write a comprehensive literature review on "{{topic}}".

Requirements:
1. Abstract: Summarize the review's purpose, scope, and main conclusions
2. Introduction: Define the topic, state the review's purpose, and outline its significance
3. Search Strategy: Describe databases searched, time period, and search terms
4. Inclusion Criteria: Explain how studies were selected and evaluated
5. Thematic Analysis: Organize literature by key themes, concepts, or methodologies
6. Key Findings: Synthesize main trends, debates, and consensus in the field
7. Research Gaps: Identify what has not been adequately studied
8. Future Directions: Suggest promising areas for future research
9. Conclusion: Summarize the current state of knowledge and its implications
10. References: Include all cited sources

Aim for critical analysis rather than mere summary. Compare and contrast different approaches, identify methodological issues, and assess the quality of evidence.`,
  },

  case: {
    id: "case",
    name: "Case Study",
    description: "In-depth analysis of a specific case, organization, or phenomenon",
    sections: [
      { title: "Abstract", description: "Case overview and key insights", required: true, order: 1 },
      { title: "Introduction", description: "Case selection and significance", required: true, order: 2 },
      { title: "Case Background", description: "Context and history", required: true, order: 3 },
      { title: "Problem Statement", description: "Central issue or challenge", required: true, order: 4 },
      { title: "Analytical Framework", description: "Theoretical lens or approach", required: true, order: 5 },
      { title: "Case Analysis", description: "Detailed examination using the framework", required: true, order: 6 },
      { title: "Findings", description: "Key insights discovered", required: true, order: 7 },
      { title: "Discussion", description: "Broader implications", required: true, order: 8 },
      { title: "Recommendations", description: "Actionable suggestions", required: true, order: 9 },
      { title: "Conclusion", description: "Summary and lessons learned", required: true, order: 10 },
      { title: "References", description: "Cited works", required: true, order: 11 },
    ],
    promptTemplate: `Write a detailed case study on "{{topic}}".

Requirements:
1. Abstract: Summarize the case, methodology, and key takeaways
2. Introduction: Explain why this case is important and what will be examined
3. Case Background: Provide necessary context, history, and contextual factors
4. Problem Statement: Clearly articulate the central issue, challenge, or question
5. Analytical Framework: Describe the theoretical perspective or analytical approach used
6. Case Analysis: Apply the framework systematically with rich detail and evidence
7. Findings: Present key insights, patterns, or discoveries from the analysis
8. Discussion: Connect findings to broader theories, practices, or implications
9. Recommendations: Provide specific, actionable suggestions based on the analysis
10. Conclusion: Reflect on lessons learned and the case's broader significance
11. References: Include all cited sources

Balance descriptive detail with analytical depth. Use specific examples and evidence to support insights.`,
  },
};

/**
 * Get a thesis template by ID
 */
export function getThesisTemplate(id: string): ThesisTemplate | undefined {
  return THESIS_TEMPLATES[id];
}

/**
 * Get all thesis templates
 */
export function getAllThesisTemplates(): ThesisTemplate[] {
  return Object.values(THESIS_TEMPLATES);
}

/**
 * Format a thesis prompt with the given topic and template
 */
export function formatThesisPrompt(topic: string, templateId: string): string {
  const template = getThesisTemplate(templateId);
  if (!template) {
    return topic;
  }
  return template.promptTemplate.replace("{{topic}}", topic);
}

/**
 * Get citation format by style
 */
export const CITATION_STYLES = {
  apa: {
    name: "APA (7th Edition)",
    format: "author-date",
    example: "Smith, J. (2023). Title of article. Journal Name, 10(2), 123-145.",
  },
  mla: {
    name: "MLA (9th Edition)",
    format: "author-page",
    example: "Smith, John. 'Title of Article.' Journal Name, vol. 10, no. 2, 2023, pp. 123-45.",
  },
  chicago: {
    name: "Chicago (17th Edition)",
    format: "notes-bibliography",
    example: "1. John Smith, 'Title of Article,' Journal Name 10, no. 2 (2023): 123-45.",
  },
  ieee: {
    name: "IEEE",
    format: "numbered",
    example: "[1] J. Smith, 'Title of article,' Journal Name, vol. 10, no. 2, pp. 123-145, 2023.",
  },
  gb7714: {
    name: "GB/T 7714-2015",
    format: "sequential",
    example: "SMITH J. Title of article[J]. Journal Name, 2023, 10(2): 123-145.",
  },
  bibtex: {
    name: "BibTeX",
    format: "markup",
    example: "@article{smith2023,\n  title={Title of article},\n  author={Smith, John},\n  journal={Journal Name},\n  year={2023}\n}",
  },
};
