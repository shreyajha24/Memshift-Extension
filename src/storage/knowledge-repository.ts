import { KnowledgeCapture } from '../types/capture';

const CONCEPT_INDEX_KEY = 'memshift_kg_concept_index_v1';
const TOPIC_INDEX_KEY = 'memshift_kg_topic_index_v1';
const RELATIONSHIP_KEY = 'memshift_kg_relationships_v1';
const MEMORY_INDEX_KEY = 'memshift_kg_memory_index_v1';

export interface SavedRelationship { id: string; sourceId: string; targetId: string; type: string; score: number; createdAt: string }

export class KnowledgeRepository {
  // concept -> Set<memoryId>
  public static async addMemoryToConcept(conceptId: string, memoryId: string): Promise<void> {
    const map = (await chrome.storage.local.get(CONCEPT_INDEX_KEY))[CONCEPT_INDEX_KEY] || {};
    const set = new Set<string>(map[conceptId] || []);
    set.add(memoryId);
    map[conceptId] = [...set];
    await chrome.storage.local.set({ [CONCEPT_INDEX_KEY]: map });
  }

  public static async addMemoryToTopic(topicId: string, memoryId: string): Promise<void> {
    const map = (await chrome.storage.local.get(TOPIC_INDEX_KEY))[TOPIC_INDEX_KEY] || {};
    const set = new Set<string>(map[topicId] || []);
    set.add(memoryId);
    map[topicId] = [...set];
    await chrome.storage.local.set({ [TOPIC_INDEX_KEY]: map });
  }

  public static async getCandidateMemoryIds(memory: KnowledgeCapture): Promise<string[]> {
    const result = new Set<string>();
    const conceptIndex = (await chrome.storage.local.get(CONCEPT_INDEX_KEY))[CONCEPT_INDEX_KEY] || {};
    const topicIndex = (await chrome.storage.local.get(TOPIC_INDEX_KEY))[TOPIC_INDEX_KEY] || {};

    const concepts: string[] = memory.intelligence.concepts || [];
    const topics: string[] = memory.intelligence.topicCandidates || [];

    for (const c of concepts) {
      const arr: string[] = conceptIndex[c] || [];
      for (const id of arr) result.add(id);
    }
    for (const t of topics) {
      const arr: string[] = topicIndex[t] || [];
      for (const id of arr) result.add(id);
    }

    // Remove the memory itself if present
    result.delete(memory.id);
    return Array.from(result);
  }

  public static async saveRelationship(rel: SavedRelationship): Promise<void> {
    const res: SavedRelationship[] = (await chrome.storage.local.get(RELATIONSHIP_KEY))[RELATIONSHIP_KEY] || [];
    // dedupe by id
    const exists = res.find((r) => r.id === rel.id || (r.sourceId === rel.sourceId && r.targetId === rel.targetId));
    if (exists) return;
    res.push(rel);
    await chrome.storage.local.set({ [RELATIONSHIP_KEY]: res });
  }

  public static async getRelationships(): Promise<SavedRelationship[]> {
    return (await chrome.storage.local.get(RELATIONSHIP_KEY))[RELATIONSHIP_KEY] || [];
  }

  public static async indexMemory(memory: KnowledgeCapture): Promise<void> {
    // index concepts and topics using knowledge fields on memory.intelligence
    const concepts: string[] = memory.intelligence.concepts || [];
    const topics: string[] = memory.intelligence.topicCandidates || [];

    for (const c of concepts) await this.addMemoryToConcept(c, memory.id);
    for (const t of topics) await this.addMemoryToTopic(t, memory.id);

    // memory index (for retrieval by id)
    const memIndex = (await chrome.storage.local.get(MEMORY_INDEX_KEY))[MEMORY_INDEX_KEY] || {};
    memIndex[memory.id] = { id: memory.id, title: memory.source.title, capturedAt: memory.metadata.capturedAt };
    await chrome.storage.local.set({ [MEMORY_INDEX_KEY]: memIndex });
  }

  public static async getMemoryById(id: string): Promise<KnowledgeCapture | undefined> {
    const memories = await chrome.storage.local.get('memshift_local_captures_v1');
    const list: KnowledgeCapture[] = memories['memshift_local_captures_v1'] || [];
    return list.find((m) => m.id === id);
  }
}
