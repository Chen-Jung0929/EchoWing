const fs = require('fs');
const path = require('path');

const xaiEducationZh = {
  navLabel: '運作原理與 XAI',
  eyebrow: 'EchoWing 教學頁',
  title: 'EchoWing 如何理解聲音？',
  subtitle: '從聲音上傳、模型辨識，到時間定位與可解釋 AI 的完整流程。',
  sectionNavLabel: '運作原理頁面章節',
  flowLabel: 'EchoWing 聲音分析流程',
  takeawayLabel: '如何解讀：',
  backToHome: '回首頁',
  flowSteps: [
    { icon: '🎙️', label: '聲音輸入' },
    { icon: '〰️', label: '前處理' },
    { icon: '🪟', label: '分窗辨識' },
    { icon: '📊', label: '物種分數' },
    { icon: '⏱️', label: '時間定位' },
    { icon: '🔥', label: 'XAI 熱圖' },
  ],
  sections: [
    {
      id: 'overview',
      navLabel: '總覽',
      kicker: 'Overview',
      title: '一段鳥鳴聲進入 EchoWing 後，會經過五個步驟',
      paragraphs: [
        'EchoWing 並不是直接「聽懂」整段聲音，而是把音訊轉換成模型可以分析的訊號，再分段送入鳥音辨識模型。',
        '模型會對每個時間窗輸出候選物種與信心分數。接著，EchoWing 會把多個時間窗的分數整理成時間軸，估計聲音事件可能出現的時間範圍。',
        '最後，XAI 模組會遮蔽音訊中的不同時間區段，觀察模型信心如何改變，藉此顯示模型判斷時最依賴哪些聲音片段。',
      ],
      animation: 'pipeline',
      takeaway: 'EchoWing 的輸出是模型推論與演算法估計，不等於人工標註的絕對真相。',
    },
    {
      id: 'preprocessing',
      navLabel: '聲音前處理',
      kicker: 'Audio preprocessing',
      title: '聲音會先被標準化成模型能處理的格式',
      paragraphs: [
        '使用者上傳或錄製的音訊可能有不同格式、取樣率、聲道數與音量。EchoWing 會先將音訊解碼，轉換成單聲道訊號，並重新取樣到模型需要的取樣率。',
        '接著，模型會將時間域的聲波轉換成類似頻譜圖的聲學特徵，使鳥鳴中的頻率變化、短促叫聲與連續鳴唱更容易被辨識。',
      ],
      formula: 'x(t) \\rightarrow S(f,t)',
      formulaCaption: '原始聲波 x(t) 會被轉換成時間-頻率表示 S(f,t)。',
      animation: 'spectrogram',
      takeaway: '模型通常不是直接讀取人類看到的波形，而是分析轉換後的聲學特徵。',
    },
    {
      id: 'windows',
      navLabel: '分窗辨識',
      kicker: 'Sliding-window prediction',
      title: '模型不是一次分析整段音訊，而是分成固定長度的時間窗',
      paragraphs: [
        '鳥音模型通常在固定長度的音訊片段上訓練。EchoWing 因此會把一段聲音切成多個時間窗，分別送入模型。',
        '每個時間窗都會得到一組物種分數，代表模型認為該時間窗中可能包含哪些鳥類聲音。',
      ],
      formula: 'p_i^{(c)} = f_c(x_{w_i})',
      formulaCaption: '模型 f 對第 i 個時間窗 x_{w_i} 輸出物種 c 的分數 p_i^{(c)}。',
      animation: 'slidingWindow',
      takeaway: '單一模型分數通常對應一整個時間窗，而不是單一瞬間。',
    },
    {
      id: 'timeline',
      navLabel: '時間定位',
      kicker: 'Timeline localization',
      title: '從 window-level 分數估計更細的事件時間軸',
      paragraphs: [
        '如果一段鳥叫真的出現在某個時間點，所有覆蓋到該時間點的時間窗，其物種分數都可能上升。',
        'EchoWing 會把各時間窗的分數投影回細時間軸，並依覆蓋次數正規化，估計哪些時間點最可能貢獻了模型的高分判斷。',
      ],
      formula: '\\hat{z}_t^{(c)} = \\frac{\\sum_i A_{i,t} p_i^{(c)}}{\\sum_i A_{i,t} + \\lambda}',
      formulaCaption: '覆蓋時間 t 的高分時間窗越多，估計活動值 \\hat{z}_t^{(c)} 越高。',
      animation: 'deconvolution',
      takeaway: '這是根據 window 分數估計出的 activity curve，不是人工逐秒標註。',
    },
    {
      id: 'occlusion',
      navLabel: 'XAI 熱圖',
      kicker: 'Occlusion-based XAI',
      title: '遮住一小段聲音，觀察模型信心如何改變',
      paragraphs: [
        'EchoWing 的 XAI 會把音訊中的某一小段暫時遮住或降低，重新送入模型。',
        '如果遮住這段聲音後，某個物種的信心分數明顯下降，代表模型原本很依賴這段聲音來做判斷。',
      ],
      formula: 'I_t^{(c)} = p^{(c)}(x) - p^{(c)}(x_{\\setminus t})',
      formulaCaption: '遮蔽後分數下降越多，代表該時間片段對模型判斷越重要。',
      animation: 'occlusion',
      takeaway: 'XAI 顯示模型依賴哪些聲音片段，不保證那就是鳥叫的唯一真實位置。',
    },
    {
      id: 'limits',
      navLabel: '限制',
      kicker: 'Limitations',
      title: '如何正確解讀 EchoWing 的結果？',
      paragraphs: [
        '信心分數不是生態學上的出現機率。',
        'XAI heatmap 顯示模型依賴的聲音片段，不是人工標註的真實鳥叫位置。',
        '如果同時有多種鳥、昆蟲、人聲或背景噪音，模型可能受到干擾。',
        'EchoWing 適合作為教育、探索與輔助辨識工具；正式調查仍應搭配人工確認與田野紀錄。',
      ],
      animation: 'limits',
      takeaway: 'AI 結果應被視為輔助線索，而不是取代觀察者判斷。',
    },
  ],
};

const xaiEducationEn = {
  navLabel: 'How It Works / XAI',
  eyebrow: 'EchoWing Education Page',
  title: 'How does EchoWing understand sound?',
  subtitle: 'From audio upload and model prediction to timeline localization and Explainable AI.',
  sectionNavLabel: 'How It Works Sections',
  flowLabel: 'EchoWing Audio Analysis Pipeline',
  takeawayLabel: 'Takeaway:',
  backToHome: 'Back to Home',
  flowSteps: [
    { icon: '🎙️', label: 'Audio Input' },
    { icon: '〰️', label: 'Preprocessing' },
    { icon: '🪟', label: 'Window Prediction' },
    { icon: '📊', label: 'Species Score' },
    { icon: '⏱️', label: 'Timeline Localization' },
    { icon: '🔥', label: 'XAI Heatmap' },
  ],
  sections: [
    {
      id: 'overview',
      navLabel: 'Overview',
      kicker: 'Overview',
      title: 'What happens when a bird call enters EchoWing?',
      paragraphs: [
        'EchoWing does not directly "listen" to the whole audio at once. Instead, it converts the audio into a signal the model can analyze and feeds it in segments.',
        'The model outputs candidate species and confidence scores for each time window. EchoWing then aggregates these overlapping windows into a timeline to estimate when sound events occur.',
        'Finally, the XAI module masks different time segments of the audio to observe how model confidence changes, showing which audio segments the model relied on most.',
      ],
      animation: 'pipeline',
      takeaway: 'EchoWing’s output is a mix of model inference and algorithm estimation, not an absolute ground truth annotated by humans.',
    },
    {
      id: 'preprocessing',
      navLabel: 'Preprocessing',
      kicker: 'Audio preprocessing',
      title: 'Audio is standardized into a format the model can read',
      paragraphs: [
        'Uploaded or recorded audio may have different formats, sample rates, channels, and volumes. EchoWing decodes, converts to mono, and resamples the audio to meet model requirements.',
        'The model then transforms the time-domain acoustic waves into a time-frequency spectrogram-like acoustic feature, making frequency variations, short calls, and continuous songs easier to recognize.',
      ],
      formula: 'x(t) \\rightarrow S(f,t)',
      formulaCaption: 'Raw acoustic wave x(t) is converted to a time-frequency representation S(f,t).',
      animation: 'spectrogram',
      takeaway: 'Models usually do not directly read raw waveforms, but analyze transformed acoustic features.',
    },
    {
      id: 'windows',
      navLabel: 'Window Prediction',
      kicker: 'Sliding-window prediction',
      title: 'The model analyzes fixed-length windows instead of the entire audio',
      paragraphs: [
        'Bird sound models are usually trained on fixed-length audio clips. EchoWing slices a long recording into multiple time windows and feeds them to the model individually.',
        'Each time window receives a set of species scores, representing which bird sounds the model thinks might be present in that specific window.',
      ],
      formula: 'p_i^{(c)} = f_c(x_{w_i})',
      formulaCaption: 'Model f outputs a score p_i^{(c)} for species c on the i-th time window x_{w_i}.',
      animation: 'slidingWindow',
      takeaway: 'A single model score usually corresponds to an entire time window, not a single instant.',
    },
    {
      id: 'timeline',
      navLabel: 'Localization',
      kicker: 'Timeline localization',
      title: 'Estimating a finer timeline from window-level scores',
      paragraphs: [
        'If a bird call truly occurs at a certain time point, all time windows covering that point are likely to have elevated species scores.',
        'EchoWing projects window scores back onto a finer timeline and normalizes by coverage, estimating which time points contributed most to the model’s high scores.',
      ],
      formula: '\\hat{z}_t^{(c)} = \\frac{\\sum_i A_{i,t} p_i^{(c)}}{\\sum_i A_{i,t} + \\lambda}',
      formulaCaption: 'The more high-score windows covering time t, the higher the estimated activity \\hat{z}_t^{(c)}.',
      animation: 'deconvolution',
      takeaway: 'This is an activity curve estimated from window scores, not manual second-by-second annotation.',
    },
    {
      id: 'occlusion',
      navLabel: 'XAI Heatmap',
      kicker: 'Occlusion-based XAI',
      title: 'Masking a small audio segment to observe confidence drop',
      paragraphs: [
        'EchoWing’s XAI temporarily masks or lowers a small segment of the audio and reruns the model.',
        'If the confidence score for a species drops significantly after masking, it means the model heavily relied on that audio segment to make its decision.',
      ],
      formula: 'I_t^{(c)} = p^{(c)}(x) - p^{(c)}(x_{\\setminus t})',
      formulaCaption: 'A larger score drop after masking implies that time segment is more important for the prediction.',
      animation: 'occlusion',
      takeaway: 'XAI shows which audio segments the model relied on, but does not guarantee it is the only true location of the bird call.',
    },
    {
      id: 'limits',
      navLabel: 'Limitations',
      kicker: 'Limitations',
      title: 'How to correctly interpret EchoWing results?',
      paragraphs: [
        'Confidence scores are not ecological occurrence probabilities.',
        'The XAI heatmap shows model reliance, not manually annotated true bird call locations.',
        'The model may be disturbed if multiple birds, insects, human voices, or background noises are present simultaneously.',
        'EchoWing is an educational, exploratory, and assistive tool; formal surveys still require manual verification and field records.',
      ],
      animation: 'limits',
      takeaway: 'AI results should be treated as supportive clues, rather than replacing observer judgment.',
    },
  ],
};

const dir = path.join(process.cwd(), 'src/i18n/locales');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('tmp_'))) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf-8');
  
  if (content.includes('xaiEducation:')) continue; // Already added
  
  let targetObj;
  if (f === 'zh.js' || f === 'lzh.js' || f === 'yue.js') {
    targetObj = xaiEducationZh;
  } else {
    targetObj = xaiEducationEn;
  }
  
  const injectStr = `,\n  xaiEducation: ${JSON.stringify(targetObj, null, 4)}\n`;
  
  // Find the last closing brace
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    // Check if the character before the brace is not a comma
    let insertPos = lastBraceIndex;
    while(content[insertPos - 1] === ' ' || content[insertPos - 1] === '\n' || content[insertPos - 1] === '\r') {
      insertPos--;
    }
    
    if (content[insertPos - 1] === ',') {
      content = content.slice(0, insertPos) + `\n  xaiEducation: ${JSON.stringify(targetObj, null, 4)}` + content.slice(insertPos);
    } else {
      content = content.slice(0, insertPos) + injectStr + content.slice(insertPos);
    }
  }
  
  fs.writeFileSync(p, content);
}
console.log('xaiEducation translations injected.');
