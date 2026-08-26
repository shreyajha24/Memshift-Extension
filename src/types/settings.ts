export interface YouTubeSettings {
  transcriptEnabled: boolean;
  metadataEnabled: boolean;
}

export interface WebSettings {
  fullTextEnabled: boolean;
  metadataEnabled: boolean;
}

export interface PrivacySettings {
  backendSyncEnabled: boolean;
  anonymizeUrlParams: boolean;
}

export interface MemShiftSettings {
  enabled: boolean; // Master Toggle
  captureMode: 'automatic';
  priorityKeywords: string[];
  youtube: YouTubeSettings;
  web: WebSettings;
  privacy: PrivacySettings;
}

export const DEFAULT_SETTINGS: MemShiftSettings = {
  enabled: true,
  captureMode: 'automatic',
  priorityKeywords: [
    'System Design',
    'Spring Boot',
    'PostgreSQL',
    'Redis',
    'TypeScript',
    'Architecture',
    'Security',
    'Machine Learning',
  ],
  youtube: {
    transcriptEnabled: true,
    metadataEnabled: true,
  },
  web: {
    fullTextEnabled: true,
    metadataEnabled: true,
  },
  privacy: {
    backendSyncEnabled: true,
    anonymizeUrlParams: true,
  },
};
