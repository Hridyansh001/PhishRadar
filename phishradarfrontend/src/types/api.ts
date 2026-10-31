// PhishRadar API Types
// Matches the actual backend response shapes exactly

export interface DetectionResponse {
  url: string;
  domain: string;
  regexresult: 'PASS' | 'SUSPICIOUS';
  mlresult: string; // 'PHISHING' | 'LEGITIMATE'
  mlProbability: number;
  regexRiskScore: number;
  finalresult: 'SAFE' | 'REVIEW' | 'SUSPICIOUS';
  risckscore: number; // NOTE: typo matches backend field name
  actiontaken: 'ALLOWED' | 'REVIEW' | 'WARNING';
  risklevel: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  findings: string[];
  explanations?: string[];
  suggestions?: string[];
  officialAlternative?: string;
  modelVersion?: string;
  domainIntelligence?: {
    ageInDays?: number | string;
    hasMxRecord?: boolean | string;
    isSslValid?: boolean | string;
    isNewlyRegistered?: boolean;
  };
}

export interface DetectionError {
  error: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  uname: string;
  email: string;
  password: string;
}

export interface UserResponse {
  userid: number;
  uname: string;
  email: string;
  ustatus: string;
  message?: string;
  createdat?: string;
}

export interface DetectionHistoryItem {
  did: number;
  userid: number;
  wid: number;
  detectedat: string | null;
  rresult: string;
  mlresult: string;
  fresult: string;
  riskscore: number;
  actiontaken: string;
  url?: string;
  domain?: string;
}

export interface DetectionStats {
  totalScans: number;
  suspicious: number;
  review: number;
  safe: number;
  warnings: number;
}
