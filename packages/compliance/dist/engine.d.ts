import type { TelemetryWindow } from "@bwms/telemetry";
import type { ComplianceResult, RuleSet } from "./types.js";
export declare function evaluateCompliance(window: TelemetryWindow, ruleSet: RuleSet): ComplianceResult;
