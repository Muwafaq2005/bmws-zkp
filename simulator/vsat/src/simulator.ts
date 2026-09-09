export interface VSATLinkConfig {
  bandwidthKbps: number; // Transmission channel speed in Kilobits per second (e.g. 512)
  roundTripLatencyMs: number; // Round-trip propagation delay in milliseconds (e.g. 600)
  packetLossPercent: number; // Simulated packet loss percentage (0 - 100, e.g. 2.5)
  maxSegmentSizeBytes?: number; // TCP MSS max payload per frame (default: 1380 bytes)
  headerOverheadBytesPerPacket?: number; // IP/TCP header overhead per packet (default: 40 bytes)
}

export interface TransmissionMetrics {
  label: string;
  rawPayloadBytes: number;
  wirePayloadBytes: number;
  packetsSent: number;
  retransmissions: number;
  propagationLatencyMs: number;
  transferTimeMs: number;
  totalLatencyMs: number;
  effectiveThroughputKbps: number;
}

export interface ComparisonResult {
  config: VSATLinkConfig;
  rawTelemetryMetrics: TransmissionMetrics;
  verificationPackageMetrics: TransmissionMetrics;
  byteReductionRatio: number; // e.g. 0.85 means verification package is 85% smaller
  byteSavingsPercent: number; // e.g. 85.4%
  latencySavingsMs: number;
  speedupFactor: number; // e.g. 6.8x faster transmission
}

const DEFAULT_MSS = 1380;
const DEFAULT_HEADER_OVERHEAD = 40;

/**
 * Simulates transmission of a payload across a constrained VSAT link with latency & loss.
 */
export function simulateVSATTransmission(
  label: string,
  payload: string | Buffer | object,
  config: VSATLinkConfig,
  randomSeed?: number,
): TransmissionMetrics {
  const payloadString =
    typeof payload === "string"
      ? payload
      : Buffer.isBuffer(payload)
      ? payload.toString("utf8")
      : JSON.stringify(payload);

  const rawPayloadBytes = Buffer.byteLength(payloadString, "utf8");
  const mss = config.maxSegmentSizeBytes ?? DEFAULT_MSS;
  const headerBytes = config.headerOverheadBytesPerPacket ?? DEFAULT_HEADER_OVERHEAD;

  const basePackets = Math.ceil(rawPayloadBytes / mss);
  
  // Deterministic or pseudo-random packet loss simulation
  let retransmissions = 0;
  const lossRate = Math.max(0, Math.min(100, config.packetLossPercent)) / 100;

  for (let i = 0; i < basePackets; i++) {
    // Model TCP RTO retransmissions under loss
    let attempts = 0;
    let prob = randomSeed !== undefined ? (Math.sin(randomSeed + i) + 1) / 2 : Math.random();
    while (prob < lossRate && attempts < 5) {
      retransmissions++;
      attempts++;
      prob = Math.random();
    }
  }

  const totalPackets = basePackets + retransmissions;
  const wirePayloadBytes = rawPayloadBytes + totalPackets * headerBytes;

  // Transmission time = (wire bytes * 8 bits/byte) / (bandwidthKbps * 1000 bits/sec) * 1000 ms/sec
  const transferTimeMs = Math.round((wirePayloadBytes * 8) / (config.bandwidthKbps * 1000) * 1000);
  
  // Retransmission penalty: each lost packet incurs RTT + TCP backoff penalty
  const retransmissionPenaltyMs = retransmissions * (config.roundTripLatencyMs * 1.5);
  const totalLatencyMs = Math.round(config.roundTripLatencyMs + transferTimeMs + retransmissionPenaltyMs);

  const effectiveThroughputKbps =
    totalLatencyMs > 0 ? Number(((rawPayloadBytes * 8) / totalLatencyMs).toFixed(2)) : 0;

  return {
    label,
    rawPayloadBytes,
    wirePayloadBytes,
    packetsSent: totalPackets,
    retransmissions,
    propagationLatencyMs: config.roundTripLatencyMs,
    transferTimeMs,
    totalLatencyMs,
    effectiveThroughputKbps,
  };
}

/**
 * Compares raw telemetry transmission vs zero-knowledge verification package transmission.
 */
export function compareVSATTransmission(
  rawTelemetry: object[],
  verificationPackage: object,
  config: VSATLinkConfig,
): ComparisonResult {
  const rawMetrics = simulateVSATTransmission("Raw Telemetry Window (64 Records)", rawTelemetry, config, 42);
  const zkMetrics = simulateVSATTransmission("ZK Verification Package", verificationPackage, config, 42);

  const byteReductionRatio =
    rawMetrics.rawPayloadBytes > 0
      ? Number(((rawMetrics.rawPayloadBytes - zkMetrics.rawPayloadBytes) / rawMetrics.rawPayloadBytes).toFixed(4))
      : 0;

  const byteSavingsPercent = Number((byteReductionRatio * 100).toFixed(2));
  const latencySavingsMs = rawMetrics.totalLatencyMs - zkMetrics.totalLatencyMs;
  const speedupFactor =
    zkMetrics.totalLatencyMs > 0 ? Number((rawMetrics.totalLatencyMs / zkMetrics.totalLatencyMs).toFixed(2)) : 1;

  return {
    config,
    rawTelemetryMetrics: rawMetrics,
    verificationPackageMetrics: zkMetrics,
    byteReductionRatio,
    byteSavingsPercent,
    latencySavingsMs,
    speedupFactor,
  };
}
