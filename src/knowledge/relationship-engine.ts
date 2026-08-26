import { KnowledgeCapture } from '../types/capture';
import { KnowledgeRepository } from '../storage/knowledge-repository';

// Simple relationship scoring for MVP.
export class RelationshipEngine {
  // thresholds
  public static STRONG = 70;
  public static WEAK = 50;

  public static async discoverRelationships(memory: KnowledgeCapture): Promise<void> {
    // Candidate retrieval: memories sharing concepts or topics
    const candidates = await KnowledgeRepository.getCandidateMemoryIds(memory);

    for (const candidateId of candidates) {
      if (candidateId === memory.id) continue;
      const candidate = await KnowledgeRepository.getMemoryById(candidateId);
      if (!candidate) continue;

      const score = RelationshipEngine.calculateScore(memory, candidate);
      if (score >= this.WEAK) {
        const type = score >= this.STRONG ? 'RELATED_TO' : 'RELATED_TO';
        await KnowledgeRepository.saveRelationship({
          id: `${memory.id}::${candidateId}`,
          sourceId: memory.id,
          targetId: candidateId,
          type,
          score,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  private static calculateScore(a: KnowledgeCapture, b: KnowledgeCapture): number {
    // Overlap of concepts and topics -> primary signal
    const aConcepts = new Set(a.intelligence.concepts || []);
    const bConcepts = new Set(b.intelligence.concepts || []);
    const commonConcepts = [...aConcepts].filter((c) => bConcepts.has(c)).length;
    const unionConcepts = new Set([...aConcepts, ...bConcepts]).size || 1;
    const conceptScore = Math.round((commonConcepts / unionConcepts) * 60);

    const aTopics = new Set(a.intelligence.topicCandidates || []);
    const bTopics = new Set(b.intelligence.topicCandidates || []);
    const commonTopics = [...aTopics].filter((t) => bTopics.has(t)).length;
    const unionTopics = new Set([...aTopics, ...bTopics]).size || 1;
    const topicScore = Math.round((commonTopics / unionTopics) * 30);

    // Temporal proximity small bonus
    const tA = new Date(a.metadata.capturedAt).getTime();
    const tB = new Date(b.metadata.capturedAt).getTime();
    const days = Math.abs(tA - tB) / 86_400_000;
    const timeBonus = days <= 1 ? 10 : days <= 7 ? 5 : 0;

    // Priority overlap
    const priorityOverlap = a.intelligence.priorityScore > 50 && b.intelligence.priorityScore > 50 ? 5 : 0;

    const total = Math.min(100, conceptScore + topicScore + timeBonus + priorityOverlap);
    return total;
  }
}
