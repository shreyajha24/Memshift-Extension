import { ConceptDef, TopicDef } from './types';

// Minimal extensible taxonomy for MVP. Add more concepts/aliases as needed.
export const TOPICS: TopicDef[] = [
  { id: 'software-engineering', name: 'Software Engineering' },
  { id: 'backend', name: 'Backend', parentId: 'software-engineering' },
  { id: 'system-design', name: 'System Design', parentId: 'software-engineering' },
  { id: 'performance', name: 'Performance', parentId: 'system-design' },
  { id: 'databases', name: 'Databases', parentId: 'backend' },
  { id: 'frontend', name: 'Frontend', parentId: 'software-engineering' },
  { id: 'devops-cloud', name: 'DevOps & Cloud', parentId: 'software-engineering' },
  { id: 'ai-ml', name: 'AI & Machine Learning', parentId: 'software-engineering' },
  { id: 'security', name: 'Security', parentId: 'software-engineering' },
];

export const CONCEPTS: ConceptDef[] = [
  {
    id: 'spring-boot',
    name: 'Spring Boot',
    aliases: ['spring boot', 'springboot', 'spring framework', 'spring mvc', 'spring web'],
    parentIds: ['backend'],
    domain: 'java',
  },
  {
    id: 'java',
    name: 'Java',
    aliases: ['java'],
    parentIds: ['backend'],
    domain: 'language',
  },
  {
    id: 'rest-api',
    name: 'REST API',
    aliases: ['rest api', 'rest', 'restful'],
    parentIds: ['backend'],
  },
  {
    id: 'caching',
    name: 'Caching',
    aliases: ['cache', 'caching', 'cache invalidation', 'cache hit', 'cache miss', 'redis', 'memcached'],
    parentIds: ['performance', 'system-design', 'backend'],
  },
  {
    id: 'redis',
    name: 'Redis',
    aliases: ['redis'],
    parentIds: ['databases', 'backend'],
  },
  {
    id: 'react',
    name: 'React',
    aliases: ['react', 'reactjs'],
    parentIds: ['frontend'],
  },
  {
    id: 'docker',
    name: 'Docker',
    aliases: ['docker', 'container'],
    parentIds: ['devops-cloud'],
  },
  {
    id: 'jwt',
    name: 'JWT',
    aliases: ['jwt', 'json web token'],
    parentIds: ['security', 'backend'],
  },
  {
    id: 'rag',
    name: 'RAG',
    aliases: ['rag', 'retrieval augmented generation'],
    parentIds: ['ai-ml'],
  },
];
