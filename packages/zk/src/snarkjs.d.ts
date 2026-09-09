declare module "snarkjs" {
  export const groth16: {
    verify(
      vk: object,
      publicInputs: (string | bigint)[],
      proof: object,
    ): Promise<boolean>;
    fullProve(
      input: object,
      wasmFile: string,
      zkeyFile: string,
    ): Promise<{ proof: object; publicSignals: string[] }>;
  };
}
