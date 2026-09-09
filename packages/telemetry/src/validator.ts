import type { TelemetryRecord, TelemetryWindow } from "./types.js";

export interface ValidationError {
  code: string;
  message: string;
  sequence?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const EXPECTED_RECORD_COUNT = 64;

export function validateTelemetryWindow(
  window: TelemetryWindow,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (window.records.length !== EXPECTED_RECORD_COUNT) {
    errors.push({
      code: "INVALID_RECORD_COUNT",
      message: `Expected ${EXPECTED_RECORD_COUNT} records, received ${window.records.length}.`,
    });
  }

  if (window.records.length === 0) {
    return {
      valid: false,
      errors,
    };
  }

  const seenSequences = new Set<number>();

  for (let i = 0; i < window.records.length; i += 1) {
    const record = window.records[i]!;

    validateIdentity(record, window, errors);
    validateSequence(record, i, seenSequences, errors);
    validateTimestamp(window.records, i, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateIdentity(
  record: TelemetryRecord,
  window: TelemetryWindow,
  errors: ValidationError[],
): void {
  if (record.operation_id !== window.operation_id) {
    errors.push({
      code: "OPERATION_ID_MISMATCH",
      message: `Record ${record.sequence} has an operation ID different from the window.`,
      sequence: record.sequence,
    });
  }

  if (record.window_id !== window.window_id) {
    errors.push({
      code: "WINDOW_ID_MISMATCH",
      message: `Record ${record.sequence} has a window ID different from the window.`,
      sequence: record.sequence,
    });
  }
}

function validateSequence(
  record: TelemetryRecord,
  index: number,
  seenSequences: Set<number>,
  errors: ValidationError[],
): void {
  if (seenSequences.has(record.sequence)) {
    errors.push({
      code: "DUPLICATE_SEQUENCE",
      message: `Sequence ${record.sequence} occurs more than once.`,
      sequence: record.sequence,
    });
  }

  seenSequences.add(record.sequence);

  const expectedSequence = index + 1;

  if (record.sequence !== expectedSequence) {
    errors.push({
      code: "INVALID_SEQUENCE",
      message: `Expected sequence ${expectedSequence}, received ${record.sequence}.`,
      sequence: record.sequence,
    });
  }
}

function validateTimestamp(
  records: TelemetryRecord[],
  index: number,
  errors: ValidationError[],
): void {
  if (index === 0) {
    return;
  }

  const previous = records[index - 1]!;
  const current = records[index]!;

  const previousTimestamp = Date.parse(previous.timestamp);
  const currentTimestamp = Date.parse(current.timestamp);

  if (Number.isNaN(currentTimestamp)) {
    errors.push({
      code: "INVALID_TIMESTAMP",
      message: `Record ${current.sequence} has an invalid timestamp.`,
      sequence: current.sequence,
    });
    return;
  }

  if (Number.isNaN(previousTimestamp)) {
    return;
  }

  if (currentTimestamp <= previousTimestamp) {
    errors.push({
      code: "NON_MONOTONIC_TIMESTAMP",
      message: `Timestamp for sequence ${current.sequence} is not later than the previous record.`,
      sequence: current.sequence,
    });
  }
}