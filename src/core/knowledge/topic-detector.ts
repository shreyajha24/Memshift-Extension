export class TopicDetector {
  private static readonly TAXONOMY_MAP: Record<string, Array<{ term: string; weight?: number }>> = {
    Backend: [
      { term: 'backend', weight: 2 },
      { term: 'rest api', weight: 2 },
      { term: 'graphql', weight: 2 },
      { term: 'grpc', weight: 2 },
      { term: 'microservices', weight: 2 },
      { term: 'spring boot', weight: 2 },
      { term: 'django', weight: 2 },
      { term: 'fastapi', weight: 2 },
    ],
    Databases: [
      { term: 'postgres', weight: 2 },
      { term: 'postgresql', weight: 2 },
      { term: 'mysql', weight: 2 },
      { term: 'redis', weight: 2 },
      { term: 'mongodb', weight: 2 },
      { term: 'cassandra', weight: 2 },
      { term: 'dynamodb', weight: 2 },
      { term: 'database', weight: 1.5 },
      { term: 'sql', weight: 1.5 },
      { term: 'orm', weight: 1 },
      { term: 'prisma', weight: 2 },
    ],
    'System Design': [
      { term: 'system design', weight: 2 },
      { term: 'caching', weight: 2 },
      { term: 'load balancer', weight: 2 },
      { term: 'concurrency', weight: 1.5 },
      { term: 'sharding', weight: 2 },
      { term: 'replication', weight: 1.5 },
      { term: 'scalability', weight: 2 },
      { term: 'distributed system', weight: 2 },
      { term: 'kafka', weight: 2 },
      { term: 'rabbitmq', weight: 2 },
    ],
    Security: [
      { term: 'oauth', weight: 2 },
      { term: 'jwt', weight: 2 },
      { term: 'authentication', weight: 1.5 },
      { term: 'authorization', weight: 1.5 },
      { term: 'encryption', weight: 2 },
      { term: 'tls', weight: 2 },
      { term: 'csrf', weight: 2 },
      { term: 'xss', weight: 2 },
      { term: 'pkce', weight: 2 },
    ],
    'AI & Machine Learning': [
      { term: 'machine learning', weight: 2 },
      { term: 'deep learning', weight: 2 },
      { term: 'neural network', weight: 2 },
      { term: 'transformer model', weight: 2 },
      { term: 'large language model', weight: 2 },
      { term: 'llm', weight: 2 },
      { term: 'rag', weight: 2 },
      { term: 'embedding', weight: 2 },
      { term: 'vector database', weight: 2 },
      { term: 'openai', weight: 2 },
      { term: 'gpt', weight: 2 },
      { term: 'gemini', weight: 2 },
    ],
    'DevOps & Cloud': [
      { term: 'docker', weight: 2 },
      { term: 'kubernetes', weight: 2 },
      { term: 'k8s', weight: 2 },
      { term: 'aws', weight: 2 },
      { term: 'gcp', weight: 2 },
      { term: 'terraform', weight: 2 },
      { term: 'ci cd', weight: 2 },
      { term: 'serverless', weight: 2 },
    ],
    Frontend: [
      { term: 'frontend', weight: 2 },
      { term: 'react', weight: 2 },
      { term: 'nextjs', weight: 2 },
      { term: 'typescript', weight: 2 },
      { term: 'javascript', weight: 1.5 },
      { term: 'vue', weight: 2 },
      { term: 'tailwind', weight: 2 },
    ],
  };

  /**
   * Discovers topic candidates based on matched priority keywords and domain taxonomies.
   */
  public static detect(matchedKeywords: string[], title = '', content = ''): { topics: string[]; subtopics: string[] } {
    const topicSet = new Set<string>();
    const subtopicSet = new Set<string>();

    // 1. Direct matched keywords become primary subtopic/topic candidates
    for (const kw of matchedKeywords) {
      if (kw.length > 2) {
        subtopicSet.add(kw);
      }
    }

    const titleText = normalizeSearchText(title);
    const bodyText = normalizeSearchText(content.slice(0, 5000));
    const combinedText = `${titleText} ${bodyText}`.trim();

    // 2. Map against known domain taxonomy only when there is explicit evidence.
    for (const [category, terms] of Object.entries(this.TAXONOMY_MAP)) {
      let score = 0;
      let matchedTerms = 0;
      let titleMatch = false;

      for (const { term, weight = 1 } of terms) {
        if (!containsTerm(combinedText, term)) continue;
        matchedTerms += 1;
        score += weight;
        if (containsTerm(titleText, term)) titleMatch = true;
      }

      if (score >= 2 && (titleMatch || matchedTerms >= 1)) {
        topicSet.add(category);
      }
    }

    return {
      topics: Array.from(topicSet).slice(0, 5),
      subtopics: Array.from(subtopicSet).slice(0, 8),
    };
  }
}

function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeSearchText(term);
  if (!text || !normalizedTerm) return false;
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'i').test(text);
}
