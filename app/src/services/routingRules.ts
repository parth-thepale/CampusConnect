import { Category } from '../types/domain';
import { DepartmentRoutingSuggestion } from '../types/ai';

export interface CampusRoutingRule {
  ruleId: string;
  category: Category;
  suggestedDepartment: string;
  rationale: string;
  ruleProvenance: string;
  isDemoRule: boolean;
  active: boolean;
}

/**
 * Illustrative Demo Routing Table for Hackathon Single-Campus Deployment.
 *
 * NOTE: The official campus department routing guide has not yet been provided
 * by institution authorities. All entries below are explicitly marked as
 * illustrative demonstration rules (DEMO_ROUTING_RULES_V1) and must be replaced
 * once official policies are supplied.
 */
export const DEFAULT_DEMO_ROUTING_RULES: readonly CampusRoutingRule[] = [
  {
    ruleId: 'demo-rule-plumbing-001',
    category: 'plumbing',
    suggestedDepartment: 'Campus Facilities / Plumbing & Water Infrastructure',
    rationale: 'Handles complaints involving leaks, drainage, washroom fixtures, and water supplies.',
    ruleProvenance: 'DEMO_ROUTING_RULES_V1 (Illustrative only - pending official campus policy)',
    isDemoRule: true,
    active: true,
  },
  {
    ruleId: 'demo-rule-electricity-002',
    category: 'electricity',
    suggestedDepartment: 'Electrical & Power Maintenance Operations',
    rationale: 'Handles power failures, flickering lights, hazardous wiring, and outlet repairs.',
    ruleProvenance: 'DEMO_ROUTING_RULES_V1 (Illustrative only - pending official campus policy)',
    isDemoRule: true,
    active: true,
  },
  {
    ruleId: 'demo-rule-cleanliness-003',
    category: 'cleanliness',
    suggestedDepartment: 'Campus Sanitation & Housekeeping Services',
    rationale: 'Handles waste collection, spill cleanup, sanitation requests, and hygiene upkeep.',
    ruleProvenance: 'DEMO_ROUTING_RULES_V1 (Illustrative only - pending official campus policy)',
    isDemoRule: true,
    active: true,
  },
  {
    ruleId: 'demo-rule-network-004',
    category: 'internet_connectivity',
    suggestedDepartment: 'Campus IT Network & Communications Operations',
    rationale: 'Handles Wi-Fi coverage issues, access point failures, and wired network outages.',
    ruleProvenance: 'DEMO_ROUTING_RULES_V1 (Illustrative only - pending official campus policy)',
    isDemoRule: true,
    active: true,
  },
] as const;

/**
 * Resolves a department routing suggestion deterministically based on verified category.
 * Model output alone NEVER creates official department assignments.
 */
export function resolveDepartmentRouting(
  category?: Category,
  customRules?: CampusRoutingRule[]
): DepartmentRoutingSuggestion | undefined {
  if (!category) {
    return undefined;
  }

  const rules = customRules || DEFAULT_DEMO_ROUTING_RULES;
  const matched = rules.find((r) => r.active && r.category === category);

  if (!matched) {
    return undefined;
  }

  return {
    department: matched.suggestedDepartment,
    reason: matched.rationale,
    ruleProvenance: matched.ruleProvenance,
    isDemoRule: matched.isDemoRule,
  };
}
