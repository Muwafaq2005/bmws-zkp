import type { TelemetryWindow } from "./types.js";
export interface GeneratorOptions {
    operationId?: string;
    windowId?: string;
    sensorId?: string;
    startTime?: Date;
}
export declare function generateTelemetryWindow(options?: GeneratorOptions): TelemetryWindow;
