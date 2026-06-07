export const xaiSections = [
  {
    id: 'overview',
    animation: 'pipeline',
    formula: null,
  },
  {
    id: 'preprocessing',
    animation: 'spectrogram',
    formula: String.raw`x(t) \rightarrow S(f,t)`,
  },
  {
    id: 'windows',
    animation: 'slidingWindow',
    formula: String.raw`\begin{aligned} w_i &= [s_i, s_i + L] \\ p_i^{(c)} &= f_c(x_{w_i}) \end{aligned}`,
  },
  {
    id: 'timeline',
    animation: 'deconvolution',
    formula: String.raw`\begin{aligned} A_{i,t} &= \begin{cases}1, & t \in w_i \\ 0, & t \notin w_i\end{cases} \\ \hat{z}_t^{(c)} &= \frac{\sum_i A_{i,t}p_i^{(c)}}{\sum_i A_{i,t}+\lambda} \\ \hat{\mathbf{z}}^{(c)} &= \arg\min_{\mathbf{z}\ge 0}\left\|\mathbf{A}\mathbf{z}-\mathbf{p}^{(c)}\right\|_2^2 + \lambda\left\|\mathbf{D}\mathbf{z}\right\|_2^2 \end{aligned}`,
  },
  {
    id: 'occlusion',
    animation: 'occlusion',
    formula: String.raw`I_t^{(c)} = p^{(c)}(x) - p^{(c)}(x_{\setminus [t,t+\Delta]})`,
  },
  {
    id: 'limits',
    animation: 'limits',
    formula: null,
  },
];
