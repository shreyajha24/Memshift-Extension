export class TopicDetector {
  private static readonly TAXONOMY_MAP: Record<string, string[]> = {
    'Backend': ['api', 'rest', 'graphql', 'grpc', 'microservices', 'server', 'node', 'spring', 'django', 'fastapi', 'go', 'rust', 'java'],
    'Databases': ['sql', 'postgres', 'postgresql', 'mysql', 'redis', 'mongodb', 'cassandra', 'dynamodb', 'index', 'query', 'orm', 'prisma'],
    'System Design': ['caching', 'load balancer', 'concurrency', 'sharding', 'replication', 'scalability', 'distributed', 'queue', 'kafka', 'rabbitmq'],
    'Security': ['oauth', 'jwt', 'auth', 'authentication', 'authorization', 'encryption', 'tls', 'csrf', 'xss', 'pkce'],
    'AI & Machine Learning': ['ai', 'llm', 'rag', 'embedding', 'vector', 'model', 'neural', 'transformer', 'deep learning', 'machine learning', 'gpt', 'gemini'],
    'DevOps & Cloud': ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'terraform', 'ci/cd', 'deployment', 'serverless', 'linux'],
    'Frontend': ['react', 'nextjs', 'typescript', 'javascript', 'vue', 'tailwind', 'css', 'dom', 'browser', 'ui', 'ux'],
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

    const combinedText = `${title} ${content.slice(0, 5000)}`.toLowerCase();

    // 2. Map against known domain taxonomy
    for (const [category, keywords] of Object.entries(this.TAXONOMY_MAP)) {
      for (const kw of keywords) {
        if (combinedText.includes(kw)) {
          topicSet.add(category);
          break;
        }
      }
    }

    // 3. Fallback topic if none detected
    if (topicSet.size === 0) {
      if (subtopicSet.size > 0) {
        topicSet.add(Array.from(subtopicSet)[0]);
      } else {
        topicSet.add('General Knowledge');
      }
    }

    return {
      topics: Array.from(topicSet).slice(0, 5),
      subtopics: Array.from(subtopicSet).slice(0, 8),
    };
  }
}
