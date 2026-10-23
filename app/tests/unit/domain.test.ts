import { describe, it, expect } from 'vitest';
import {
  normalizeCategory,
  isValidStatusTransition,
  SUPPORTED_CATEGORIES,
} from '../../src/types/domain';
import { createMemoryRepositories } from '../../src/repositories/memory/repositories';

describe('Domain Model & Business Rules', () => {
  describe('Category Normalization', () => {
    it('accepts exact supported categories', () => {
      for (const cat of SUPPORTED_CATEGORIES) {
        expect(normalizeCategory(cat)).toBe(cat);
      }
    });

    it('normalizes space-separated internet connectivity', () => {
      expect(normalizeCategory('internet connectivity')).toBe('internet_connectivity');
      expect(normalizeCategory('Internet Connectivity')).toBe('internet_connectivity');
      expect(normalizeCategory('INTERNET CONNECTIVITY')).toBe('internet_connectivity');
    });

    it('rejects unsupported categories', () => {
      expect(normalizeCategory('food')).toBeNull();
      expect(normalizeCategory('wifi')).toBeNull();
      expect(normalizeCategory('')).toBeNull();
      expect(normalizeCategory(null)).toBeNull();
      expect(normalizeCategory(123)).toBeNull();
    });
  });

  describe('Ticket Status State Machine', () => {
    it('permits valid transitions from submitted', () => {
      expect(isValidStatusTransition('submitted', 'acknowledged')).toBe(true);
      expect(isValidStatusTransition('submitted', 'assigned')).toBe(true);
      expect(isValidStatusTransition('submitted', 'in_progress')).toBe(true);
    });

    it('rejects invalid direct transitions from submitted', () => {
      expect(isValidStatusTransition('submitted', 'resolved')).toBe(false);
      expect(isValidStatusTransition('submitted', 'blocked')).toBe(false);
      expect(isValidStatusTransition('submitted', 'reopened')).toBe(false);
      expect(isValidStatusTransition('submitted', 'submitted')).toBe(false);
    });

    it('permits valid transitions from in_progress', () => {
      expect(isValidStatusTransition('in_progress', 'resolved')).toBe(true);
      expect(isValidStatusTransition('in_progress', 'blocked')).toBe(true);
    });

    it('rejects invalid backwards transitions from in_progress', () => {
      expect(isValidStatusTransition('in_progress', 'submitted')).toBe(false);
      expect(isValidStatusTransition('in_progress', 'acknowledged')).toBe(false);
    });

    it('controls reopening from resolved state', () => {
      expect(isValidStatusTransition('resolved', 'reopened')).toBe(true);
      expect(isValidStatusTransition('resolved', 'in_progress')).toBe(false);
      expect(isValidStatusTransition('resolved', 'submitted')).toBe(false);
    });
  });

  describe('Ticket Number Sequence Allocation', () => {
    it('generates sequential collision-free ticket numbers', async () => {
      const repos = createMemoryRepositories();
      const n1 = await repos.tickets.getNextTicketNumber();
      const n2 = await repos.tickets.getNextTicketNumber();
      const n3 = await repos.tickets.getNextTicketNumber();

      expect(n1).toBe('CC-1001');
      expect(n2).toBe('CC-1002');
      expect(n3).toBe('CC-1003');
    });
  });
});
