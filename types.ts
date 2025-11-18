
export type Role = 'user' | 'model';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ChatMessage {
  role: Role;
  parts: ChatPart[];
  groundingSources?: GroundingSource[];
}
