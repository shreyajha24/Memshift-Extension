import { KnowledgeCapture } from '../types/capture';
import { STORAGE_KEYS } from '../shared/constants';
import { ext, hasExtensionApi } from '../shared/browser-api';

const CONCEPT_INDEX_KEY = 'memshift_kg_concept_index_v1';
const TOPIC_INDEX_KEY = 'memshift_kg_topic_index_v1';
const RELATIONSHIP_KEY = 'memshift_kg_relationships_v1';
const MEMORY_INDEX_KEY = 'memshift_kg_memory_index_v1';

export interface SavedRelationship { id: string; sourceId: string; targetId: string; type: string; score: number; createdAt: string }

const memoryFallback: Record<string, unknown> = {
  [CONCEPT_INDEX_KEY]: {},
  [TOPIC_INDEX_KEY]: {},
  [RELATIONSHIP_KEY]: [],
  [MEMORY_INDEX_KEY]: {},
  [STORAGE_KEYS.LOCAL_CAPTURES]: [],
};

async function storageGet(key: string): Promise<Record<string, unknown>> {
  if (hasExtensionApi() && ext.storage?.local) {
    return ext.storage.local.get(key) as Promise<Record<string, unknown>>;
  }
  return { [key]: memoryFallback[key] };
}

async function storageSet(values: Record<string, unknown>): Promise<void> {
  if (hasExtensionApi() && ext.storage?.local) {
    await ext.storage.local.set(values);
    return;
  }
  Object.assign(memoryFallback, values);
}

export class KnowledgeRepository {
  // concept -> Set<memoryId>
  public static async addMemoryToConcept(conceptId: string, memoryId: string): Promise<void> {
    const map = ((await storageGet(CONCEPT_INDEX_KEY))[CONCEPT_INDEX_KEY] || {}) as Record<string, string[]>;
    const set = new Set<string>(map[conceptId] || []);
    set.add(memoryId);
    map[conceptId] = [...set];
    await storageSet({ [CONCEPT_INDEX_KEY]: map });
  }

  public static async addMemoryToTopic(topicId: string, memoryId: string): Promise<void> {
    const map = ((await storageGet(TOPIC_INDEX_KEY))[TOPIC_INDEX_KEY] || {}) as Record<string, string[]>;
    const set = new Set<string>(map[topicId] || []);
    set.add(memoryId);
    map[topicId] = [...set];
    await storageSet({ [TOPIC_INDEX_KEY]: map });
  }

  public static async getCandidateMemoryIds(memory: KnowledgeCapture): Promise<string[]> {
    const result = new Set<string>();
    const conceptIndex = ((await storageGet(CONCEPT_INDEX_KEY))[CONCEPT_INDEX_KEY] || {}) as Record<string, string[]>;
    const topicIndex = ((await storageGet(TOPIC_INDEX_KEY))[TOPIC_INDEX_KEY] || {}) as Record<string, string[]>;

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

    result.delete(memory.id);
    return Array.from(result);
  }

  public static async saveRelationship(rel: SavedRelationship): Promise<void> {
    const res: SavedRelationship[] = ((await storageGet(RELATIONSHIP_KEY))[RELATIONSHIP_KEY] || []) as SavedRelationship[];
    const exists = res.find((r) => r.id === rel.id || (r.sourceId === rel.sourceId && r.targetId === rel.targetId));
    if (exists) return;
    res.push(rel);
    await storageSet({ [RELATIONSHIP_KEY]: res });
  }

  public static async getRelationships(): Promise<SavedRelationship[]> {
    return ((await storageGet(RELATIONSHIP_KEY))[RELATIONSHIP_KEY] || []) as SavedRelationship[];
  }

  public static async indexMemory(memory: KnowledgeCapture): Promise<void> {
    const concepts: string[] = memory.intelligence.concepts || [];
    const topics: string[] = memory.intelligence.topicCandidates || [];

    for (const c of concepts) await this.addMemoryToConcept(c, memory.id);
    for (const t of topics) await this.addMemoryToTopic(t, memory.id);

    const memIndex = ((await storageGet(MEMORY_INDEX_KEY))[MEMORY_INDEX_KEY] || {}) as Record<string, unknown>;
    memIndex[memory.id] = { id: memory.id, title: memory.source.title, capturedAt: memory.metadata.capturedAt };
    await storageSet({ [MEMORY_INDEX_KEY]: memIndex });
  }

  public static async getMemoryById(id: string): Promise<KnowledgeCapture | undefined> {
    const memories = await storageGet(STORAGE_KEYS.LOCAL_CAPTURES);
    const list: KnowledgeCapture[] = (memories[STORAGE_KEYS.LOCAL_CAPTURES] || []) as KnowledgeCapture[];
    return list.find((m) => m.id === id);
  }
}
