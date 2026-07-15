export type CourtType = 'district' | 'appeal' | 'cassation' | 'magistrate';

export interface SearchRequest {
  courtId: string;
  courtType: CourtType;
  caseNumber?: string;
  plaintiff?: string;
  defendant?: string;
  filingDateFrom?: string;
  filingDateTo?: string;
}

export interface SearchResult {
  caseNumber: string;
  caseUrl: string;
  uid: string;
  judge: string | null;
  result: string | null;
  legalForceDate: string | null;
  filingDate: string | null;
  decisionDate: string | null;
  parties: { role: string; name: string }[];
  courtId: string;
  courtType: CourtType;
  matchScore?: number;
}
