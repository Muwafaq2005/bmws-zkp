export interface NumericRange {
  min?: number;
  max?: number;
}

export interface ComplianceRules {
  flow_rate: NumericRange;
  uv_intensity: NumericRange;
  temperature: NumericRange;
  salinity: NumericRange;
  turbidity: NumericRange;
}

export interface RuleSet {
  rule_set_id: string;
  version: number;
  rules: ComplianceRules;
}

export interface ComplianceViolation {
  sequence: number;
  parameter: keyof ComplianceRules;
  value: number;
  reason: string;
}

export interface ComplianceResult {
  compliant: boolean;
  rule_set_id: string;
  violations: ComplianceViolation[];
}