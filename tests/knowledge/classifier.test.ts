import { describe, it, expect } from 'vitest';
import { LocalRuleClassifier } from '../../src/knowledge/classifier';

describe('LocalRuleClassifier', () => {
  it('detects spring boot concept from title and maps to Backend', () => {
    const title = 'Spring Boot Tutorial - REST APIs in Java';
    const excerpt = 'Learn spring boot and build REST api services';
    const body = 'This tutorial covers Spring Boot starters, Spring MVC, and REST controllers.';
    const metadata = '';
    const res = LocalRuleClassifier.classify(title, excerpt, body, metadata, []);
    const conceptIds = res.concepts.map((c) => c.id);
    expect(conceptIds).toContain('spring-boot');
    const topicNames = res.topics.map((t) => t.name.toLowerCase());
    expect(topicNames).toContain('backend');
  });

  it('detects caching and redis and maps to System Design / Backend', () => {
    const title = 'Caching strategies for backend systems';
    const excerpt = 'cache invalidation and redis patterns';
    const body = 'Using redis and memcached to reduce latency and improve performance.';
    const res = LocalRuleClassifier.classify(title, excerpt, body, '', []);
    const conceptIds = res.concepts.map((c) => c.id);
    expect(conceptIds).toContain('caching');
    expect(conceptIds).toContain('redis');
    const topicNames = res.parentTopics.map((n) => n.toLowerCase());
    expect(topicNames).toContain('backend');
    expect(topicNames).toContain('system design');
  });
});
