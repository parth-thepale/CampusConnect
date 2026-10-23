/**
 * Gemini AI Integration Type Contracts - Phase 2 Preparation
 *
 * NOTE: Phase 1 implements backend persistence, validation, state transitions,
 * and security boundaries. AI extraction, clarification, and duplicate analysis
 * will be implemented in Phase 2 using these typed contracts.
 *
 * AI suggestions are advisory only and must never bypass deterministic validation,
 * change roles, or directly update tickets.
 */

import { Category, TicketStatus } from './domain';

export interface LocationExtraction {
  building?: string;
  floor?: string;
  room?: string;
  specificArea?: string;
  rawMentioned?: string;
}

export interface MissingInfoIndicator {
  field: 'location' | 'category' | 'details' | 'specific_problem';
  reason: string;
}

export interface ClarificationQuestion {
  questionText: string;
  targetField: string;
}

export interface DepartmentRoutingSuggestion {
  department: string;
  reason: string;
  ruleProvenance: string; // e.g. "demo_rules_v1" or "official_campus_guide_v1"
  isDemoRule: boolean;
}

export interface DuplicateCandidate {
  ticketId: string;
  ticketNumber: string;
  category: Category;
  location: string;
  status: TicketStatus;
  similarityScore: number; // 0.0 - 1.0
  matchReason: string;
  createdAt: string;
}

export interface AiDraftAnalysisResult {
  title: string;
  summary: string;
  extractedLocation?: LocationExtraction;
  suggestedCategory?: Category;
  missingFields: MissingInfoIndicator[];
  clarifyingQuestion?: ClarificationQuestion;
  routingSuggestion?: DepartmentRoutingSuggestion;
  confidence: number; // 0.0 - 1.0
}

/**
 * Interface definition for the future Phase 2 Gemini AI service.
 * Labelled explicitly as unimplemented in Phase 1.
 */
export interface IAiService {
  analyzeComplaintDraft(
    text: string,
    photoUrl?: string
  ): Promise<AiDraftAnalysisResult>;

  findDuplicateCandidates(
    newReportText: string,
    category: Category,
    location: string,
    recentCandidates: Array<{
      ticketId: string;
      ticketNumber: string;
      description: string;
      location: string;
      category: Category;
      status: TicketStatus;
      createdAt: string;
    }>
  ): Promise<DuplicateCandidate[]>;
}
