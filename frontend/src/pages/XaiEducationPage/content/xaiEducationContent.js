export const xaiSections = [
  {
    id: 'overview',
    animation: 'pipeline',
    formula: null,
  },
  {
    id: 'preprocessing',
    animation: 'spectrogram',
    formula: 'x(t) \\rightarrow S(f,t)',
  },
  {
    id: 'windows',
    animation: 'slidingWindow',
    formula: 'p_i^{(c)} = f_c(x_{w_i})',
  },
  {
    id: 'timeline',
    animation: 'deconvolution',
    formula:
      '\\hat{z}_t^{(c)} = \\frac{\\sum_i A_{i,t} p_i^{(c)}}{\\sum_i A_{i,t} + \\lambda}',
  },
  {
    id: 'occlusion',
    animation: 'occlusion',
    formula: 'I_t^{(c)} = p^{(c)}(x) - p^{(c)}(x_{\\setminus t})',
  },
  {
    id: 'limits',
    animation: 'limits',
    formula: null,
  },
];
