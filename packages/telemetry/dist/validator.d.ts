import type { TelemetryWindow } from "./types.js";
export interface ValidationError {
    code: string;
    message: string;
    sequence?: number;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}
export declare function validateTelemetryWindow(window: TelemetryWindow): ValidationResult;
