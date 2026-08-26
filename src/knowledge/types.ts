export type ConceptId = string;
export type TopicId = string;

export interface ConceptDef {
  id: ConceptId;
  name: string;
  aliases: string[];
  parentIds: TopicId[]; // parent topics or concepts
  domain?: string;
}

export interface TopicDef {
  id: TopicId;
  name: string;
  aliases?: string[];
  parentId?: TopicId;
}

export interface ClassificationResult {
  concepts: { id: ConceptId; name: string; score: number }[];
  topics: { id: TopicId; name: string; score: number }[];
  parentTopics: string[];
}
