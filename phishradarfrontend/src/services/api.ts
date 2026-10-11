// PhishRadar API Client
// Interfaces directly with Spring Boot backend: POST /api/detect

import type {
  DetectionResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
  DetectionHistoryItem,
  DetectionStats,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const LOCAL_HISTORY_KEY = 'phishradar_scans';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(
      'Unable to connect to the PhishRadar backend. Make sure Spring Boot is running on port 8080.',
      0
    );
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // Ignore parse errors
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
}

// ========== Detection (POST /api/detect) ==========

export async function scanUrl(
  url: string,
  userid: number = 1
): Promise<DetectionResponse> {
  const result = await request<DetectionResponse>('/detect', {
    method: 'POST',
    body: JSON.stringify({ url, userid }),
  });

  // Save to client history
  saveScanToHistory(result, userid);

  return result;
}

export async function quickScan(url: string, userid: number = 1): Promise<DetectionResponse> {
  return scanUrl(url, userid);
}

// ========== Local Scan Registry & Telemetry ==========

function saveScanToHistory(item: DetectionResponse, userid: number) {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    const list: DetectionHistoryItem[] = raw ? JSON.parse(raw) : [];

    const newRecord: DetectionHistoryItem = {
      did: Date.now(),
      userid: userid,
      wid: list.length + 1,
      detectedat: new Date().toISOString(),
      rresult: item.regexresult,
      mlresult: item.mlresult,
      fresult: item.finalresult,
      riskscore: item.risckscore,
      actiontaken: item.actiontaken,
      url: item.url,
      domain: item.domain,
    };

    // Keep most recent first, max 100 items
    list.unshift(newRecord);
    if (list.length > 100) list.pop();

    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

export async function getDetectionHistory(
  userid: number
): Promise<DetectionHistoryItem[]> {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const list: DetectionHistoryItem[] = JSON.parse(raw);
    return list.filter(item => !userid || item.userid === userid || item.userid === 1);
  } catch {
    return [];
  }
}

export async function getDetectionStats(
  userid: number
): Promise<DetectionStats> {
  const items = await getDetectionHistory(userid);

  const totalScans = items.length;
  const suspicious = items.filter(i => i.fresult === 'SUSPICIOUS').length;
  const review = items.filter(i => i.fresult === 'REVIEW').length;
  const safe = items.filter(i => i.fresult === 'SAFE').length;
  const warnings = items.filter(i => i.actiontaken === 'WARNING').length;

  return {
    totalScans,
    suspicious,
    review,
    safe,
    warnings,
  };
}

// ========== User Profile Session ==========

export async function login(data: LoginRequest): Promise<UserResponse> {
  return {
    userid: 1,
    uname: data.email.split('@')[0] || 'SecurityUser',
    email: data.email,
    ustatus: 'active',
    createdat: new Date().toISOString(),
  };
}

export async function register(data: RegisterRequest): Promise<UserResponse> {
  return {
    userid: 1,
    uname: data.uname || 'SecurityUser',
    email: data.email,
    ustatus: 'active',
    createdat: new Date().toISOString(),
  };
}

export async function getUser(userid: number): Promise<UserResponse> {
  return {
    userid: userid,
    uname: 'SecurityUser',
    email: 'user@phishradar.local',
    ustatus: 'active',
    createdat: new Date().toISOString(),
  };
}

export { ApiError };
