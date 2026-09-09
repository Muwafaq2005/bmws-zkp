declare module "circomlibjs" {
  export interface PoseidonField {
    toObject(value: unknown): bigint;
  }

  export interface Poseidon {
    (inputs: string[]): unknown;
    F: PoseidonField;
  }

  export function buildPoseidon(): Promise<Poseidon>;
}