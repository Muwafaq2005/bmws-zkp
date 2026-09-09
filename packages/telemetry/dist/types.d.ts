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
