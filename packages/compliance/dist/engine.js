export function evaluateCompliance(window, ruleSet) {
    const violations = [];
    for (const record of window.records) {
        checkRange(record.sequence, "flow_rate", record.flow_rate, ruleSet.rules.flow_rate, violations);
        checkRange(record.sequence, "uv_intensity", record.uv_intensity, ruleSet.rules.uv_intensity, violations);
        checkRange(record.sequence, "temperature", record.temperature, ruleSet.rules.temperature, violations);
        checkRange(record.sequence, "salinity", record.salinity, ruleSet.rules.salinity, violations);
        checkRange(record.sequence, "turbidity", record.turbidity, ruleSet.rules.turbidity, violations);
    }
    return {
        compliant: violations.length === 0,
        rule_set_id: ruleSet.rule_set_id,
        violations,
    };
}
function checkRange(sequence, parameter, value, range, violations) {
    if (range.min !== undefined && value < range.min) {
        violations.push({
            sequence,
            parameter,
            value,
            reason: `${parameter} is below minimum ${range.min}`,
        });
    }
    if (range.max !== undefined && value > range.max) {
        violations.push({
            sequence,
            parameter,
            value,
            reason: `${parameter} is above maximum ${range.max}`,
        });
    }
}
