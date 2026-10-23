import { describe, it, expect } from 'vitest';
import {
  resolveDepartmentRouting,
  DEFAULT_DEMO_ROUTING_RULES,
  CampusRoutingRule,
} from '../../src/services/routingRules';
import { Category } from '../../src/types/domain';

describe('Configurable Department Routing Rules', () => {
  it('maps all supported categories to demo suggestions with explicit demo provenance', () => {
    const categories: Category[] = [
      'plumbing',
      'electricity',
      'cleanliness',
      'internet_connectivity',
    ];

    for (const cat of categories) {
      const suggestion = resolveDepartmentRouting(cat);
      expect(suggestion).toBeDefined();
      expect(suggestion!.department).toBeDefined();
      expect(suggestion!.reason).toBeDefined();
      expect(suggestion!.isDemoRule).toBe(true);
      expect(suggestion!.ruleProvenance).toContain('DEMO_ROUTING_RULES_V1');
      expect(suggestion!.ruleProvenance).toContain('Illustrative only');
    }
  });

  it('returns undefined for unknown or undefined categories without inventing official departments', () => {
    expect(resolveDepartmentRouting(undefined)).toBeUndefined();
    expect(resolveDepartmentRouting('unknown_cat' as any)).toBeUndefined();
  });

  it('proves that changing configuration changes routing suggestions without modifying application code', () => {
    const customConfig: CampusRoutingRule[] = [
      {
        ruleId: 'official-water-01',
        category: 'plumbing',
        suggestedDepartment: 'Campus Engineering & Water Works Division',
        rationale: 'Official building maintenance guide rule #4',
        ruleProvenance: 'OFFICIAL_CAMPUS_ROUTING_GUIDE_2026',
        isDemoRule: false,
        active: true,
      },
    ];

    const defaultSuggestion = resolveDepartmentRouting('plumbing');
    expect(defaultSuggestion!.department).toBe(
      'Campus Facilities / Plumbing & Water Infrastructure'
    );
    expect(defaultSuggestion!.isDemoRule).toBe(true);

    const customSuggestion = resolveDepartmentRouting('plumbing', customConfig);
    expect(customSuggestion!.department).toBe(
      'Campus Engineering & Water Works Division'
    );
    expect(customSuggestion!.isDemoRule).toBe(false);
    expect(customSuggestion!.ruleProvenance).toBe('OFFICIAL_CAMPUS_ROUTING_GUIDE_2026');
  });

  it('ignores inactive rules', () => {
    const customConfig: CampusRoutingRule[] = [
      {
        ruleId: 'inactive-rule-01',
        category: 'plumbing',
        suggestedDepartment: 'Defunct Department',
        rationale: 'No longer in service',
        ruleProvenance: 'OLD_GUIDE',
        isDemoRule: false,
        active: false,
      },
    ];

    expect(resolveDepartmentRouting('plumbing', customConfig)).toBeUndefined();
  });
});
