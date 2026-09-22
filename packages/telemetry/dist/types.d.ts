export interface TelemetryRecord {
    operation_id: string;
    window_id: string;
    sequence: number;
    timestamp: string;
    sensor_id: string;
    flow_rate: number;
    uv_intensity: number;
    temperature: number;
    salinity: number;
    turbidity: number;
}
export interface TelemetryWindow {
    operation_id: string;
    window_id: string;
    records: TelemetryRecord[];
}
export interface SensorReading {
    timestamp: string;
    flow_rate: number;
    uv_intensity: number;
    temperature: number;
    salinity: number;
    turbidity: number;
}
export type SensorScenario = "NORMAL" | "LOW_UV" | "LOW_FLOW" | "HIGH_TURBIDITY" | "TEMPERATURE_EXCURSION" | "SENSOR_DRIFT" | "OUTLIER" | "MISSING_READING";
export type SimulationState = "IDLE" | "RUNNING" | "COMPLETE" | "SEALED" | "FAILED";
export interface SensorSimulationConfig {
    operationId?: string;
    windowId?: string;
    sensorId?: string;
    startTime?: Date;
    samplingIntervalMs?: number;
    scenario?: SensorScenario;
    seed?: number;
}
