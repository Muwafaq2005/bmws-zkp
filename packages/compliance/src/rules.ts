import type { RuleSet } from "./types.js";

export const DEMO_RULE_SET: RuleSet = {
  rule_set_id: "BWMS-DEMO-V1",
  version: 1,
  rules: {
    flow_rate: {
      min: 800,
    },
    uv_intensity: {
      min: 40,
    },
    temperature: {
      min: 20,
      max: 30,
    },
    salinity: {
      min: 25,
      max: 35,
    },
    turbidity: {
      max: 5,
    },
  },
};