// PhishRadar API Client
// Interfaces directly with Spring Boot backend: POST /api/detect, POST /api/users/*

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

export class ApiError extends Error {
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
  } catch {
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

// ========== Backend Health Check ==========

export async function checkBackendStatus(): Promise<{ online: boolean; message?: string }> {
  try {
    // Probe backend users/1 or users/login with HEAD/GET
    const res = await fetch(`${API_BASE}/users/1`, { method: 'GET' });
    if (res.status === 200 || res.status === 404 || res.status === 401) {
      return { online: true };
    }
    return { online: false, message: `Status code ${res.status}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    return { online: false, message: errorMsg };
  }
}

// ========== Detection (POST /api/detect) ==========

export async function scanUrl(
  url: string,
  userid: number = 1,
  domFeatures?: Record<string, unknown>
): Promise<DetectionResponse> {
  const payload: Record<string, unknown> = { url, userid };
  if (domFeatures) {
    payload.domFeatures = domFeatures;
  }

  const result = await request<DetectionResponse>('/detect', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  // Save actual scan record from backend response to history registry
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
      riskscore: item.risckscore ?? item.riskscore ?? 0,
      actiontaken: item.actiontaken,
      url: item.url,
      domain: item.domain,
      modelVersion: item.modelVersion,
      findings: item.findings,
      explanations: item.explanations,
      suggestions: item.suggestions,
      domainIntelligence: item.domainIntelligence,
    };

    // Keep most recent first, max 200 items
    list.unshift(newRecord);
    if (list.length > 200) list.pop();

    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
}

export type DateRangeFilter = '24h' | '7d' | '30d' | 'all';

export function filterItemsByDateRange(
  items: DetectionHistoryItem[],
  dateRange: DateRangeFilter = '7d'
): DetectionHistoryItem[] {
  if (dateRange === 'all') return items;

  const now = Date.now();
  const rangesInMs: Record<DateRangeFilter, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  };

  const cutoff = now - rangesInMs[dateRange];

  return items.filter((item) => {
    if (!item.detectedat) return true;
    const ts = new Date(item.detectedat).getTime();
    return !isNaN(ts) && ts >= cutoff;
  });
}

export async function getDetectionHistory(
  userid?: number,
  dateRange: DateRangeFilter = 'all'
): Promise<DetectionHistoryItem[]> {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    let list: DetectionHistoryItem[] = JSON.parse(raw);
    if (userid) {
      list = list.filter((item) => !item.userid || item.userid === userid || item.userid === 1);
    }
    if (dateRange !== 'all') {
      list = filterItemsByDateRange(list, dateRange);
    }
    return list;
  } catch {
    return [];
  }
}

export async function getDetectionStats(
  userid?: number,
  dateRange: DateRangeFilter = '7d'
): Promise<DetectionStats> {
  const allItems = await getDetectionHistory(userid, 'all');
  const currentItems = filterItemsByDateRange(allItems, dateRange);

  const totalScans = currentItems.length;
  const suspicious = currentItems.filter((i) => i.fresult === 'SUSPICIOUS').length;
  const review = currentItems.filter((i) => i.fresult === 'REVIEW').length;
  const safe = currentItems.filter((i) => i.fresult === 'SAFE').length;
  const warnings = currentItems.filter((i) => i.actiontaken === 'WARNING').length;

  // Calculate dynamic trend compared to the preceding period
  let trendPercentage: number | undefined;
  let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';

  if (dateRange !== 'all') {
    const rangesInMs: Record<DateRangeFilter, number> = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': 0,
    };
    const periodLength = rangesInMs[dateRange];
    const now = Date.now();
    const periodStart = now - periodLength;
    const previousPeriodStart = now - periodLength * 2;

    const previousItems = allItems.filter((item) => {
      if (!item.detectedat) return false;
      const ts = new Date(item.detectedat).getTime();
      return !isNaN(ts) && ts >= previousPeriodStart && ts < periodStart;
    });

    const prevCount = previousItems.length;
    if (prevCount > 0) {
      const change = Math.round(((totalScans - prevCount) / prevCount) * 100);
      trendPercentage = Math.abs(change);
      trendDirection = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    } else if (totalScans > 0) {
      trendPercentage = 100;
      trendDirection = 'up';
    }
  }

  return {
    totalScans,
    suspicious,
    review,
    safe,
    warnings,
    trendPercentage,
    trendDirection,
  };
}

export function clearDetectionHistory(): void {
  try {
    localStorage.removeItem(LOCAL_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ========== Real Data Export Helpers ==========

export function exportDetectionsToCsv(items: DetectionHistoryItem[]): string {
  const headers = ['ID', 'User ID', 'Domain', 'URL', 'Final Verdict', 'Risk Score', 'ML Result', 'Regex Result', 'Action Taken', 'Timestamp'];
  const rows = items.map((i) => [
    i.did,
    i.userid,
    `"${(i.domain || '').replace(/"/g, '""')}"`,
    `"${(i.url || '').replace(/"/g, '""')}"`,
    i.fresult,
    i.riskscore,
    i.mlresult,
    i.rresult,
    i.actiontaken,
    `"${i.detectedat || ''}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportDetectionsToJson(items: DetectionHistoryItem[]): string {
  return JSON.stringify(items, null, 2);
}

// ========== User Authentication & Profile (MySQL DB) ==========

export async function login(data: LoginRequest): Promise<UserResponse> {
  const user = await request<UserResponse>('/users/login', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
    }),
  });
  return user;
}

export async function register(data: RegisterRequest): Promise<UserResponse> {
  const user = await request<UserResponse>('/users/register', {
    method: 'POST',
    body: JSON.stringify({
      uname: data.uname.trim(),
      email: data.email.trim(),
      password: data.password,
    }),
  });
  return user;
}

export async function getUser(userid: number): Promise<UserResponse> {
  return request<UserResponse>(`/users/${userid}`);
}
