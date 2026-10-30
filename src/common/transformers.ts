// common/transformers.ts
export const decimalTransformer = {
  to: (v?: number) => v,
  from: (v?: string) => (v == null ? v : parseFloat(v)),
};
