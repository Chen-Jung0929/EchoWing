import os
import re

new_keys = {
  "loaderPreprocessing": {
    "zh": "正在預處理與切割音訊", "en": "Preprocessing and chunking audio",
    "nan": "當咧預處理佮切割音訊", "hak": "當在預處理同切割音訊",
    "ja": "音声の事前処理とチャンク化を行っています", "ko": "오디오 전처리 및 청크 분할 중",
    "th": "กำลังประมวลผลล่วงหน้าและแบ่งช่วงเสียง", "ms": "Sedang memproses dan memotong audio",
    "id": "Sedang memproses dan memotong audio", "hi": "ऑडियो को प्रोसेस और चंक किया जा रहा है",
    "vi": "Đang tiền xử lý và cắt âm thanh", "fil": "Pino-proseso at pinuputol ang audio",
    "fr": "Prétraitement et découpage de l'audio", "es": "Preprocesando y dividiendo el audio",
    "pt": "Pré-processando e dividindo o áudio", "it": "Pre-elaborazione e frammentazione dell'audio",
    "nl": "Audio voorbewerken en opsplitsen", "de": "Audio wird vorverarbeitet und aufgeteilt",
    "yue": "處理緊同埋切割緊音訊", "lzh": "方理音訊而割之"
  },
  "loaderPreprocessingHint": {
    "zh": "正在利用 Web Audio API 在前端進行強制單聲道、32kHz 降採樣與 5 秒切割。", "en": "Forcing Mono, downsampling to 32kHz, and chunking into 5-second segments via Web Audio API on the frontend.",
    "nan": "當咧利用 Web Audio API 佇前端進行強制單聲道、32kHz 降採樣佮 5 秒切割。", "hak": "當在利用 Web Audio API 在前端進行強制單聲道、32kHz 降採樣同 5 秒切割。",
    "ja": "Web Audio APIを使用して、フロントエンドでモノラル化、32kHzへのダウンサンプリング、5秒間のチャンク化を行っています。", "ko": "프론트엔드에서 Web Audio API를 사용하여 모노 변환, 32kHz 다운샘플링 및 5초 세그먼트 분할을 수행 중입니다.",
    "th": "บังคับเป็นโมโน ลดความถี่การสุ่มตัวอย่างเป็น 32kHz และแบ่งเป็นช่วง 5 วินาทีผ่าน Web Audio API บนฟรอนต์เอนด์", "ms": "Memaksa Mono, menurunkan sampel ke 32kHz, dan memotong kepada segmen 5 saat melalui Web Audio API pada bahagian hadapan.",
    "id": "Memaksa Mono, menurunkan sampel menjadi 32kHz, dan memotong menjadi segmen 5 detik melalui Web Audio API di frontend.", "hi": "फ़्रंटएंड पर Web Audio API के माध्यम से मोनो, 32kHz डाउनसैंपलिंग और 5-सेकंड चंकिंग की जा रही है।",
    "vi": "Đang ép kiểu Mono, giảm lấy mẫu xuống 32kHz và cắt thành các phân đoạn 5 giây qua Web Audio API trên giao diện.", "fil": "Pinipilit na Mono, binababa ang sampling sa 32kHz, at hinahati sa 5-segundong bahagi gamit ang Web Audio API sa frontend.",
    "fr": "Forçage du mode Mono, sous-échantillonnage à 32 kHz et découpage en segments de 5 secondes via l'API Web Audio sur l'interface.", "es": "Forzando Mono, reduciendo la frecuencia a 32kHz y dividiendo en segmentos de 5 segundos mediante Web Audio API en el frontend.",
    "pt": "Forçando Mono, reduzindo para 32kHz e dividindo em segmentos de 5 segundos via Web Audio API no frontend.", "it": "Forzatura del formato Mono, sottocampionamento a 32kHz e suddivisione in segmenti di 5 secondi tramite Web Audio API nel frontend.",
    "nl": "Mono forceren, downsamplen naar 32kHz en opsplitsen in segmenten van 5 seconden via Web Audio API op de frontend.", "de": "Erzwingt Mono, Downsampling auf 32kHz und Aufteilung in 5-Sekunden-Segmente über Web Audio API im Frontend.",
    "yue": "用緊 Web Audio API 喺前端強制轉單聲道、32kHz 降採樣同 5 秒切割。", "lzh": "方以 Web Audio API 於前端強為單聲道、降採樣至 32kHz 且割為五秒之段。"
  },
  "spectrogramEventLabels": {
    "zh": "物種事件時間標籤", "en": "Species event time labels", "nan": "物種事件時間標籤", "hak": "物種事件時間標籤",
    "ja": "種族イベントの時間ラベル", "ko": "종 이벤트 시간 레이블", "th": "ป้ายกำกับเวลาเหตุการณ์ชนิดพันธุ์",
    "ms": "Label masa acara spesies", "id": "Label waktu peristiwa spesies", "hi": "प्रजाति घटना समय लेबल",
    "vi": "Nhãn thời gian sự kiện loài", "fil": "Mga label ng oras ng kaganapan ng species",
    "fr": "Étiquettes de temps d'événement d'espèce", "es": "Etiquetas de tiempo de eventos de especies",
    "pt": "Rótulos de tempo de eventos de espécies", "it": "Etichette temporali eventi specie",
    "nl": "Tijdslabels voor soortgebeurtenissen", "de": "Arten-Ereignis-Zeitmarken",
    "yue": "物種事件時間標籤", "lzh": "物種事件之時標"
  },
  "xaiGenerating": {
    "zh": "XAI生成中...", "en": "Generating XAI...", "nan": "XAI生成中...", "hak": "XAI生成中...",
    "ja": "XAIを生成中...", "ko": "XAI 생성 중...", "th": "กำลังสร้าง XAI...",
    "ms": "Menjana XAI...", "id": "Menghasilkan XAI...", "hi": "XAI जनरेट हो रहा है...",
    "vi": "Đang tạo XAI...", "fil": "Binubuo ang XAI...",
    "fr": "Génération de XAI...", "es": "Generando XAI...",
    "pt": "Gerando XAI...", "it": "Generazione XAI...",
    "nl": "XAI genereren...", "de": "Generiere XAI...",
    "yue": "XAI生成緊...", "lzh": "方生 XAI..."
  },
  "xaiGeneratingHint": {
    "zh": "可解釋性熱圖計算中，完成後可儲存、分享或列印報告", "en": "Computing interpretability heatmap... You can save, share, or print the report when finished.",
    "nan": "可解釋性熱圖計算中，完成後可儲存、分享或列印報告", "hak": "可解釋性熱圖計算中，完成後可儲存、分享或列印報告",
    "ja": "解釈可能性ヒートマップを計算中... 完了後にレポートを保存、共有、または印刷できます。", "ko": "해석 가능성 히트맵을 계산 중입니다... 완료 후 보고서를 저장, 공유 또는 인쇄할 수 있습니다.",
    "th": "กำลังคำนวณแผนผังความร้อนที่ตีความได้... คุณสามารถบันทึก แชร์ หรือพิมพ์รายงานเมื่อเสร็จสิ้น", "ms": "Menghitung peta haba kebolehtafsiran... Anda boleh menyimpan, berkongsi, atau mencetak laporan setelah selesai.",
    "id": "Menghitung heatmap interpretabilitas... Anda dapat menyimpan, membagikan, atau mencetak laporan setelah selesai.", "hi": "इंटरप्रिटेबिलिटी हीटमैप की गणना की जा रही है... समाप्त होने पर आप रिपोर्ट को सहेज सकते हैं, साझा कर सकते हैं या प्रिंट कर सकते हैं।",
    "vi": "Đang tính toán bản đồ nhiệt khả năng giải thích... Bạn có thể lưu, chia sẻ hoặc in báo cáo sau khi hoàn tất.", "fil": "Kinakalkula ang interpretability heatmap... Maaari mong i-save, ibahagi, o i-print ang ulat kapag tapos na.",
    "fr": "Calcul de la carte thermique d'interprétabilité... Vous pouvez enregistrer, partager ou imprimer le rapport une fois terminé.", "es": "Calculando el mapa de calor de interpretabilidad... Puede guardar, compartir o imprimir el informe cuando termine.",
    "pt": "Calculando mapa de calor de interpretabilidade... Você pode salvar, compartilhar ou imprimir o relatório quando terminar.", "it": "Calcolo della mappa di calore di interpretabilità... Puoi salvare, condividere o stampare il rapporto al termine.",
    "nl": "Berekenen van interpretatiemap... U kunt het rapport opslaan, delen of afdrukken wanneer het voltooid is.", "de": "Berechnung der Interpretierbarkeits-Heatmap... Sie können den Bericht nach Abschluss speichern, teilen oder drucken.",
    "yue": "可解釋性熱圖計算緊，搞掂之後可以儲存、分享或者印報告。", "lzh": "方計可釋性熱圖，畢則可存、分或印之。"
  },
  "spectrogramNoData": {
    "zh": "尚無頻譜資料", "en": "No spectrogram data", "nan": "猶無頻譜資料", "hak": "還無頻譜資料",
    "ja": "スペクトログラムデータがありません", "ko": "스펙트로그램 데이터 없음", "th": "ไม่มีข้อมูลสเปกโตรแกรม",
    "ms": "Tiada data spektrogram", "id": "Tidak ada data spektrogram", "hi": "कोई स्पेक्ट्रोग्राम डेटा नहीं",
    "vi": "Không có dữ liệu phổ đồ", "fil": "Walang spectrogram data",
    "fr": "Aucune donnée de spectrogramme", "es": "Sin datos de espectrograma",
    "pt": "Sem dados de espectrograma", "it": "Nessun dato spettrogramma",
    "nl": "Geen spectrogramgegevens", "de": "Keine Spektrogrammdaten",
    "yue": "未有頻譜資料", "lzh": "未有頻譜之料"
  },
  "spectrogramTitle": {
    "zh": "音訊頻譜圖", "en": "Spectrogram", "nan": "音訊頻譜圖", "hak": "音訊頻譜圖",
    "ja": "スペクトログラム", "ko": "스펙트로그램", "th": "สเปกโตรแกรม",
    "ms": "Spektrogram", "id": "Spektrogram", "hi": "स्पेक्ट्रोग्राम",
    "vi": "Phổ đồ", "fil": "Spectrogram",
    "fr": "Spectrogramme", "es": "Espectrograma",
    "pt": "Espectrograma", "it": "Spettrogramma",
    "nl": "Spectrogram", "de": "Spektrogramm",
    "yue": "音訊頻譜圖", "lzh": "音訊頻譜之圖"
  },
  "spectrogramDescription": {
    "zh": "橫軸為時間、縱軸為 Mel 頻率；頻譜下方半透明區塊內白色尖峰為 XAI 時間重要性（越高越關鍵）", "en": "X-axis is time, Y-axis is Mel frequency; white peaks in the translucent area below indicate XAI temporal importance (higher is more critical).",
    "nan": "橫軸為時間、縱軸為 Mel 頻率；頻譜下方半透明區塊內白色尖峰為 XAI 時間重要性（越高越關鍵）", "hak": "橫軸為時間、縱軸為 Mel 頻率；頻譜下方半透明區塊內白色尖峰為 XAI 時間重要性（越高越關鍵）",
    "ja": "横軸は時間、縦軸はMel周波数です。下の半透明領域内の白いピークはXAIの時間の重要性を示します（高いほど重要）。", "ko": "X축은 시간, Y축은 Mel 주파수입니다. 아래 반투명 영역의 흰색 피크는 XAI의 시간적 중요성을 나타냅니다(높을수록 중요).",
    "th": "แกน X คือเวลา แกน Y คือความถี่ Mel; ยอดแหลมสีขาวในบริเวณโปร่งแสงด้านล่างบ่งชี้ถึงความสำคัญทางเวลาของ XAI (ยิ่งสูงยิ่งสำคัญ)", "ms": "Paksi-X ialah masa, paksi-Y ialah kekerapan Mel; puncak putih di kawasan separuh lutsinar di bawah menunjukkan kepentingan masa XAI (lebih tinggi lebih kritikal).",
    "id": "Sumbu-X adalah waktu, sumbu-Y adalah frekuensi Mel; puncak putih di area tembus pandang di bawah menunjukkan pentingnya waktu XAI (semakin tinggi semakin kritis).", "hi": "X-अक्ष समय है, Y-अक्ष Mel आवृत्ति है; नीचे पारदर्शी क्षेत्र में सफेद चोटियां XAI लौकिक महत्व को इंगित करती हैं (अधिक महत्वपूर्ण है)।",
    "vi": "Trục X là thời gian, trục Y là tần số Mel; các đỉnh màu trắng trong vùng trong suốt bên dưới chỉ ra tầm quan trọng về thời gian của XAI (càng cao càng quan trọng).", "fil": "X-axis ay oras, Y-axis ay Mel frequency; ang mga puting taluktok sa translucent na bahagi sa ibaba ay nagpapakita ng XAI temporal importance (mas mataas ay mas kritikal).",
    "fr": "L'axe des X est le temps, l'axe des Y est la fréquence Mel ; les pics blancs dans la zone translucide ci-dessous indiquent l'importance temporelle XAI (plus c'est haut, plus c'est critique).", "es": "El eje X es el tiempo, el eje Y es la frecuencia Mel; los picos blancos en el área translúcida debajo indican la importancia temporal de XAI (cuanto más alto, más crítico).",
    "pt": "O eixo X é o tempo, o eixo Y é a frequência Mel; os picos brancos na área translúcida abaixo indicam a importância temporal do XAI (quanto mais alto, mais crítico).", "it": "L'asse X è il tempo, l'asse Y è la frequenza Mel; i picchi bianchi nell'area traslucida sottostante indicano l'importanza temporale XAI (più alto è, più è critico).",
    "nl": "De X-as is tijd, de Y-as is Mel-frequentie; witte pieken in het doorzichtige gebied eronder geven XAI tijdsbelang aan (hoger is kritieker).", "de": "Die X-Achse ist die Zeit, die Y-Achse die Mel-Frequenz; weiße Spitzen im durchscheinenden Bereich unten zeigen die XAI-Zeitbedeutung an (höher ist kritischer).",
    "yue": "橫軸係時間，縱軸係 Mel 頻率；頻譜下面半透明區塊入面嘅白色尖峰係 XAI 時間重要性（越高越關鍵）", "lzh": "橫軸為時，縱軸為 Mel 頻率；頻譜下半明之區有白峰，示 XAI 之時重（愈高愈要）"
  },
  "spectrogramClickToEnlarge": {
    "zh": "點擊頻譜圖可放大檢視", "en": "Click the spectrogram to enlarge", "nan": "點擊頻譜圖可放大檢視", "hak": "點擊頻譜圖可放大檢視",
    "ja": "スペクトログラムをクリックして拡大", "ko": "스펙트로그램을 클릭하여 확대", "th": "คลิกที่สเปกโตรแกรมเพื่อขยาย",
    "ms": "Klik spektrogram untuk membesarkan", "id": "Klik spektrogram untuk memperbesar", "hi": "बड़ा करने के लिए स्पेक्ट्रोग्राम पर क्लिक करें",
    "vi": "Nhấp vào phổ đồ để phóng to", "fil": "I-click ang spectrogram para palakihin",
    "fr": "Cliquez sur le spectrogramme pour l'agrandir", "es": "Haga clic en el espectrograma para ampliar",
    "pt": "Clique no espectrograma para ampliar", "it": "Clicca sullo spettrogramma per ingrandire",
    "nl": "Klik op het spectrogram om te vergroten", "de": "Klicken Sie auf das Spektrogramm, um es zu vergrößern",
    "yue": "點擊頻譜圖可以放大睇", "lzh": "按頻譜圖可廓而視之"
  },
  "spectrogramOverviewSummary": {
    "zh": "總覽 · {segmentCount} 段 · {durationSec}s · {time_frames}×{freq_bins}", "en": "Overview · {segmentCount} segments · {durationSec}s · {time_frames}×{freq_bins}",
    "nan": "總覽 · {segmentCount} 段 · {durationSec}s · {time_frames}×{freq_bins}", "hak": "總覽 · {segmentCount} 段 · {durationSec}s · {time_frames}×{freq_bins}",
    "ja": "概要 · {segmentCount} セグメント · {durationSec}s · {time_frames}×{freq_bins}", "ko": "개요 · {segmentCount} 세그먼트 · {durationSec}s · {time_frames}×{freq_bins}",
    "th": "ภาพรวม · {segmentCount} ส่วน · {durationSec}s · {time_frames}×{freq_bins}", "ms": "Gambaran keseluruhan · {segmentCount} segmen · {durationSec}s · {time_frames}×{freq_bins}",
    "id": "Ikhtisar · {segmentCount} segmen · {durationSec}s · {time_frames}×{freq_bins}", "hi": "अवलोकन · {segmentCount} खंड · {durationSec}s · {time_frames}×{freq_bins}",
    "vi": "Tổng quan · {segmentCount} đoạn · {durationSec}s · {time_frames}×{freq_bins}", "fil": "Pangkalahatang-ideya · {segmentCount} segments · {durationSec}s · {time_frames}×{freq_bins}",
    "fr": "Aperçu · {segmentCount} segments · {durationSec}s · {time_frames}×{freq_bins}", "es": "Resumen · {segmentCount} segmentos · {durationSec}s · {time_frames}×{freq_bins}",
    "pt": "Visão geral · {segmentCount} segmentos · {durationSec}s · {time_frames}×{freq_bins}", "it": "Panoramica · {segmentCount} segmenti · {durationSec}s · {time_frames}×{freq_bins}",
    "nl": "Overzicht · {segmentCount} segmenten · {durationSec}s · {time_frames}×{freq_bins}", "de": "Übersicht · {segmentCount} Segmente · {durationSec}s · {time_frames}×{freq_bins}",
    "yue": "總覽 · {segmentCount} 段 · {durationSec}s · {time_frames}×{freq_bins}", "lzh": "總覽 · {segmentCount} 段 · {durationSec}s · {time_frames}×{freq_bins}"
  },
  "spectrogramChunkSummary": {
    "zh": "分析窗 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "en": "Window {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "nan": "分析窗 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "hak": "分析窗 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "ja": "分析ウィンドウ {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "ko": "분석 창 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "th": "หน้าต่างวิเคราะห์ {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "ms": "Tetingkap analisis {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "id": "Jendela analisis {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "hi": "विश्लेषण विंडो {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "vi": "Cửa sổ phân tích {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "fil": "Analysis window {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "fr": "Fenêtre d'analyse {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "es": "Ventana de análisis {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "pt": "Janela de análise {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "it": "Finestra di analisi {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "nl": "Analysevenster {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "de": "Analysefenster {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}",
    "yue": "分析窗 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}", "lzh": "分析窗 {chunkIndex} · {durationSec}s · {time_frames}×{freq_bins}"
  },
  "spectrogramEnlarge": {
    "zh": "放大檢視頻譜圖", "en": "Enlarge spectrogram", "nan": "放大檢視頻譜圖", "hak": "放大檢視頻譜圖",
    "ja": "スペクトログラムを拡大", "ko": "스펙트로그램 확대", "th": "ขยายสเปกโตรแกรม",
    "ms": "Besarkan spektrogram", "id": "Perbesar spektrogram", "hi": "स्पेक्ट्रोग्राम बड़ा करें",
    "vi": "Phóng to phổ đồ", "fil": "Palakihin ang spectrogram",
    "fr": "Agrandir le spectrogramme", "es": "Ampliar espectrograma",
    "pt": "Ampliar espectrograma", "it": "Ingrandisci spettrogramma",
    "nl": "Spectrogram vergroten", "de": "Spektrogramm vergrößern",
    "yue": "放大睇頻譜圖", "lzh": "廓而視頻譜之圖"
  },
  "xaiRedHeatmapHint": {
    "zh": "越深的紅色代表 AI 模型在辨識時的關注度越高", "en": "Deeper red indicates higher attention from the AI model during recognition.",
    "nan": "越深的紅色代表 AI 模型在辨識時的關注度越高", "hak": "越深的紅色代表 AI 模型在辨識時的關注度越高",
    "ja": "赤が濃いほど、認識時のAIモデルの注目度が高いことを示します。", "ko": "빨간색이 진할수록 인식 중 AI 모델의 관심도가 높음을 나타냅니다.",
    "th": "สีแดงที่เข้มกว่าบ่งบอกถึงความสนใจที่สูงขึ้นจากโมเดล AI ในระหว่างการจดจำ", "ms": "Merah yang lebih pekat menunjukkan perhatian yang lebih tinggi dari model AI semasa pengecaman.",
    "id": "Merah yang lebih pekat menunjukkan perhatian yang lebih tinggi dari model AI selama pengenalan.", "hi": "गहरा लाल रंग पहचान के दौरान AI मॉडल के अधिक ध्यान को दर्शाता है।",
    "vi": "Màu đỏ đậm hơn cho thấy mức độ chú ý cao hơn từ mô hình AI trong quá trình nhận dạng.", "fil": "Ang mas malalim na pula ay nagpapahiwatig ng mas mataas na atensyon mula sa AI model habang kinikilala.",
    "fr": "Un rouge plus foncé indique une plus grande attention du modèle d'IA lors de la reconnaissance.", "es": "El rojo más intenso indica una mayor atención del modelo de IA durante el reconocimiento.",
    "pt": "O vermelho mais intenso indica maior atenção do modelo de IA durante o reconhecimento.", "it": "Un rosso più intenso indica una maggiore attenzione del modello AI durante il riconoscimento.",
    "nl": "Dieper rood geeft een hogere aandacht van het AI-model tijdens herkenning aan.", "de": "Tieferes Rot zeigt eine höhere Aufmerksamkeit des KI-Modells während der Erkennung an.",
    "yue": "越深嘅紅色代表 AI 模型喺辨識嗰陣嘅關注度越高", "lzh": "愈深之紅，表 AI 於辨時愈為著意。"
  },
  "visualizerChunkSummary": {
    "zh": "片段 {chunkIndex} · 5.0s · 32kHz · Mono", "en": "Segment {chunkIndex} · 5.0s · 32kHz · Mono",
    "nan": "片段 {chunkIndex} · 5.0s · 32kHz · Mono", "hak": "片段 {chunkIndex} · 5.0s · 32kHz · Mono",
    "ja": "セグメント {chunkIndex} · 5.0s · 32kHz · Mono", "ko": "세그먼트 {chunkIndex} · 5.0s · 32kHz · Mono",
    "th": "ส่วน {chunkIndex} · 5.0s · 32kHz · โมโน", "ms": "Segmen {chunkIndex} · 5.0s · 32kHz · Mono",
    "id": "Segmen {chunkIndex} · 5.0s · 32kHz · Mono", "hi": "खंड {chunkIndex} · 5.0s · 32kHz · मोनो",
    "vi": "Phân đoạn {chunkIndex} · 5.0s · 32kHz · Mono", "fil": "Bahagi {chunkIndex} · 5.0s · 32kHz · Mono",
    "fr": "Segment {chunkIndex} · 5,0 s · 32 kHz · Mono", "es": "Segmento {chunkIndex} · 5.0s · 32kHz · Mono",
    "pt": "Segmento {chunkIndex} · 5.0s · 32kHz · Mono", "it": "Segmento {chunkIndex} · 5.0s · 32kHz · Mono",
    "nl": "Segment {chunkIndex} · 5.0s · 32kHz · Mono", "de": "Segment {chunkIndex} · 5.0s · 32kHz · Mono",
    "yue": "片段 {chunkIndex} · 5.0s · 32kHz · Mono", "lzh": "段 {chunkIndex} · 5.0s · 32kHz · Mono"
  },
  "pageMetaTitleSuffix": {
    "zh": "EchoWing - AI 鳥類聲學辨識平台", "en": "EchoWing - AI Bird Sound Recognition",
    "nan": "EchoWing - AI 鳥類聲學辨識平台", "hak": "EchoWing - AI 鳥類聲學辨識平台",
    "ja": "EchoWing - AI鳥類鳴き声認識", "ko": "EchoWing - AI 조류 소리 인식",
    "th": "EchoWing - แพลตฟอร์มการจดจำเสียงนก AI", "ms": "EchoWing - Pengenalan Bunyi Burung AI",
    "id": "EchoWing - Pengenalan Suara Burung AI", "hi": "EchoWing - AI पक्षी ध्वनि पहचान",
    "vi": "EchoWing - Nhận dạng âm thanh chim AI", "fil": "EchoWing - AI Bird Sound Recognition",
    "fr": "EchoWing - Reconnaissance vocale d'oiseaux par IA", "es": "EchoWing - Reconocimiento de sonidos de aves con IA",
    "pt": "EchoWing - Reconhecimento de sons de aves com IA", "it": "EchoWing - Riconoscimento suoni uccelli tramite IA",
    "nl": "EchoWing - AI Vogelgeluidherkenning", "de": "EchoWing - KI-Vogelstimmen-Erkennung",
    "yue": "EchoWing - AI 雀鳥聲學辨識平台", "lzh": "EchoWing - AI 鳥語辨識之平臺"
  },
  "loadingTitle": {
    "zh": "分析中...", "en": "Analyzing...", "nan": "分析中...", "hak": "分析中...",
    "ja": "分析中...", "ko": "분석 중...", "th": "กำลังวิเคราะห์...",
    "ms": "Menganalisis...", "id": "Menganalisis...", "hi": "विश्लेषण हो रहा है...",
    "vi": "Đang phân tích...", "fil": "Sinusuri...",
    "fr": "Analyse en cours...", "es": "Analizando...",
    "pt": "Analisando...", "it": "Analisi in corso...",
    "nl": "Bezig met analyseren...", "de": "Analysieren...",
    "yue": "分析緊...", "lzh": "方析..."
  },
  "apiErrorAudioFormat": {
    "zh": "音訊分析請求失敗", "en": "Audio analysis request failed", "nan": "音訊分析請求失敗", "hak": "音訊分析請求失敗",
    "ja": "音声分析リクエストが失敗しました", "ko": "오디오 분석 요청 실패", "th": "คำขอวิเคราะห์เสียงล้มเหลว",
    "ms": "Permintaan analisis audio gagal", "id": "Permintaan analisis audio gagal", "hi": "ऑडियो विश्लेषण अनुरोध विफल",
    "vi": "Yêu cầu phân tích âm thanh không thành công", "fil": "Nabigo ang kahilingan sa pagsusuri ng audio",
    "fr": "Échec de la demande d'analyse audio", "es": "Error en la solicitud de análisis de audio",
    "pt": "Falha na solicitação de análise de áudio", "it": "Richiesta di analisi audio non riuscita",
    "nl": "Verzoek om audioanalyse mislukt", "de": "Audio-Analyseanforderung fehlgeschlagen",
    "yue": "音訊分析請求失敗", "lzh": "音訊分析之求敗矣"
  },
  "apiErrorStream": {
    "zh": "音訊串流分析請求失敗", "en": "Audio stream analysis request failed", "nan": "音訊串流分析請求失敗", "hak": "音訊串流分析請求失敗",
    "ja": "音声ストリーム分析リクエストが失敗しました", "ko": "오디오 스트림 분석 요청 실패", "th": "คำขอวิเคราะห์สตรีมเสียงล้มเหลว",
    "ms": "Permintaan analisis strim audio gagal", "id": "Permintaan analisis aliran audio gagal", "hi": "ऑडियो स्ट्रीम विश्लेषण अनुरोध विफल",
    "vi": "Yêu cầu phân tích luồng âm thanh không thành công", "fil": "Nabigo ang kahilingan sa pagsusuri ng audio stream",
    "fr": "Échec de la demande d'analyse de flux audio", "es": "Error en la solicitud de análisis de flujo de audio",
    "pt": "Falha na solicitação de análise de fluxo de áudio", "it": "Richiesta di analisi del flusso audio non riuscita",
    "nl": "Verzoek om audiostreamanalyse mislukt", "de": "Audio-Stream-Analyseanforderung fehlgeschlagen",
    "yue": "音訊串流分析請求失敗", "lzh": "音訊串流分析之求敗矣"
  },
  "voteDisclaimer": {
    "zh": "免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。", "en": "Disclaimer: The AI models on this website only provide analysis and suggestions, not final decisions. We do not guarantee absolute accuracy, nor do we make predictive promises or behavioral guarantees.",
    "nan": "免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。", "hak": "免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。",
    "ja": "免責事項：当ウェブサイトのAIモデルは分析および提案のみを提供し、最終決定を下すものではありません。私たちは絶対的な正確性を保証せず、予測の約束や行動の保証も行いません。", "ko": "면책 조항: 이 웹사이트의 AI 모델은 분석 및 제안만 제공하며 최종 결정을 내리지 않습니다. 우리는 절대적인 정확성을 보장하지 않으며 예측 약속이나 행동 보장도 하지 않습니다.",
    "th": "ข้อจำกัดความรับผิดชอบ: โมเดล AI บนเว็บไซต์นี้ให้เพียงการวิเคราะห์และข้อเสนอแนะ ไม่ใช่การตัดสินใจขั้นสุดท้าย เราไม่รับประกันความถูกต้องแม่นยำ 100% หรือให้คำมั่นสัญญาในการทำนาย", "ms": "Penafian: Model AI di laman web ini hanya memberikan analisis dan cadangan, bukan keputusan akhir. Kami tidak menjamin ketepatan mutlak, tidak juga kami membuat janji ramalan.",
    "id": "Penafian: Model AI di situs web ini hanya memberikan analisis dan saran, bukan keputusan akhir. Kami tidak menjamin keakuratan mutlak, juga tidak membuat janji prediktif.", "hi": "अस्वीकरण: इस वेबसाइट पर AI मॉडल केवल विश्लेषण और सुझाव प्रदान करते हैं, अंतिम निर्णय नहीं। हम पूर्ण सटीकता की गारंटी नहीं देते हैं, न ही हम भविष्यवाणी के वादे करते हैं।",
    "vi": "Tuyên bố từ chối trách nhiệm: Các mô hình AI trên trang web này chỉ cung cấp phân tích và đề xuất, không phải là quyết định cuối cùng. Chúng tôi không đảm bảo độ chính xác tuyệt đối, cũng không đưa ra các hứa hẹn dự đoán.", "fil": "Disclaimer: Ang mga AI model sa website na ito ay nagbibigay lamang ng pagsusuri at mga mungkahi, hindi mga pinal na desisyon. Hindi namin ginagarantiyahan ang ganap na katumpakan.",
    "fr": "Avis de non-responsabilité : Les modèles d'IA sur ce site Web fournissent uniquement des analyses et des suggestions, pas des décisions finales. Nous ne garantissons pas une exactitude absolue.", "es": "Descargo de responsabilidad: Los modelos de IA en este sitio web solo proporcionan análisis y sugerencias, no decisiones finales. No garantizamos la precisión absoluta.",
    "pt": "Aviso de isenção: Os modelos de IA neste site fornecem apenas análises e sugestões, não decisões finais. Não garantimos precisão absoluta.", "it": "Disclaimer: I modelli di IA su questo sito web forniscono solo analisi e suggerimenti, non decisioni finali. Non garantiamo la precisione assoluta.",
    "nl": "Disclaimer: De AI-modellen op deze website bieden alleen analyses en suggesties, geen definitieve beslissingen. Wij garanderen geen absolute nauwkeurigheid.", "de": "Haftungsausschluss: Die KI-Modelle auf dieser Website bieten nur Analysen und Vorschläge, keine endgültigen Entscheidungen. Wir garantieren keine absolute Genauigkeit.",
    "yue": "免責聲明：本網站嘅 AI 模組淨係提供分析同行動建議，唔作最後決定。本平台唔保證辨識結果絕對啱，亦唔構成預測承諾、最終決策或者行為保證。", "lzh": "免責之聲：本站之 AI 僅備分析與建言，非為定論。吾等不保其絕對無誤，亦不為預測之諾或行之保。"
  },
  "voteEmptyOverview": {
    "zh": "各片段皆未達 {threshold}% 信心門檻，無可靠物種辨識總覽。", "en": "No segments reached the {threshold}% confidence threshold. No reliable species overview available.",
    "nan": "各片段皆未達 {threshold}% 信心門檻，無可靠物種辨識總覽。", "hak": "各片段皆未達 {threshold}% 信心門檻，無可靠物種辨識總覽。",
    "ja": "どのセグメントも{threshold}%の信頼度閾値に達していません。信頼できる種別の概要はありません。", "ko": "어떤 세그먼트도 {threshold}% 신뢰도 임계값에 도달하지 않았습니다. 신뢰할 수 있는 종 개요가 없습니다.",
    "th": "ไม่มีส่วนใดที่ถึงเกณฑ์ความเชื่อมั่น {threshold}% ไม่มีภาพรวมของชนิดพันธุ์ที่เชื่อถือได้", "ms": "Tiada segmen yang mencapai ambang keyakinan {threshold}%. Tiada gambaran keseluruhan spesies yang boleh dipercayai.",
    "id": "Tidak ada segmen yang mencapai ambang kepercayaan {threshold}%. Tidak ada ikhtisar spesies yang dapat diandalkan.", "hi": "कोई भी खंड {threshold}% विश्वास सीमा तक नहीं पहुंचा। कोई विश्वसनीय प्रजाति अवलोकन उपलब्ध नहीं है।",
    "vi": "Không có phân đoạn nào đạt đến ngưỡng tin cậy {threshold}%. Không có tổng quan về loài đáng tin cậy.", "fil": "Walang mga bahagi na umabot sa {threshold}% confidence threshold. Walang maaasahang pangkalahatang-ideya ng species na magagamit.",
    "fr": "Aucun segment n'a atteint le seuil de confiance de {threshold}%. Aucun aperçu fiable des espèces n'est disponible.", "es": "Ningún segmento alcanzó el umbral de confianza del {threshold}%. No hay un resumen confiable de especies disponible.",
    "pt": "Nenhum segmento atingiu o limite de confiança de {threshold}%. Nenhuma visão geral de espécies confiável disponível.", "it": "Nessun segmento ha raggiunto la soglia di confidenza del {threshold}%. Nessuna panoramica affidabile delle specie disponibile.",
    "nl": "Geen segmenten hebben de betrouwbaarheidsdrempel van {threshold}% bereikt. Geen betrouwbaar soortoverzicht beschikbaar.", "de": "Keine Segmente erreichten die Konfidenzschwelle von {threshold}%. Kein zuverlässiger Artenüberblick verfügbar.",
    "yue": "所有片段都未達 {threshold}% 信心門檻，冇可靠嘅物種辨識總覽。", "lzh": "各段皆未達 {threshold}% 信度之限，無可信之物種總覽。"
  },
  "voteEmptySuggestion": {
    "zh": "建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。", "en": "Consider re-recording a segment with clear bird calls, or examine low-confidence candidates and decision support section by section.",
    "nan": "建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。", "hak": "建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。",
    "ja": "鳥の鳴き声がはっきり聞こえるセグメントを再録音するか、低信頼度の候補と決定支援をセグメントごとに確認することを検討してください。", "ko": "새소리가 선명한 세그먼트를 다시 녹음하거나 낮은 신뢰도의 후보 및 결정 지원을 세그먼트별로 확인하는 것을 고려하세요.",
    "th": "พิจารณาบันทึกส่วนที่มีเสียงนกชัดเจนอีกครั้ง หรือตรวจสอบผู้สมัครที่มีความเชื่อมั่นต่ำและส่วนสนับสนุนการตัดสินใจทีละส่วน", "ms": "Pertimbangkan untuk merakam semula segmen dengan panggilan burung yang jelas, atau periksa calon berkeyakinan rendah dan sokongan keputusan bahagian demi bahagian.",
    "id": "Pertimbangkan untuk merekam ulang segmen dengan suara burung yang jelas, atau periksa kandidat berkepercayaan rendah dan dukungan keputusan bagian demi bagian.", "hi": "स्पष्ट पक्षी कॉल के साथ एक खंड को फिर से रिकॉर्ड करने पर विचार करें, या कम विश्वास वाले उम्मीदवारों और निर्णय समर्थन खंड दर खंड की जांच करें।",
    "vi": "Cân nhắc ghi âm lại phân đoạn có tiếng chim rõ ràng hoặc xem xét các ứng cử viên có độ tin cậy thấp và phần hỗ trợ quyết định theo từng phần.", "fil": "Isaalang-alang ang pag-record muli ng isang bahagi na may malinaw na tawag ng ibon, o suriin ang mga kandidatong mababa ang kumpyansa at suporta sa pagpapasya bawat bahagi.",
    "fr": "Pensez à réenregistrer un segment avec des chants d'oiseaux clairs, ou examinez les candidats à faible confiance et l'aide à la décision section par section.", "es": "Considere volver a grabar un segmento con cantos de aves claros, o examine los candidatos de baja confianza y el soporte de decisiones sección por sección.",
    "pt": "Considere regravar um segmento com cantos de aves claros, ou examine os candidatos de baixa confiança e o suporte de decisão seção por seção.", "it": "Considera di registrare nuovamente un segmento con canti di uccelli chiari, oppure esamina i candidati a bassa confidenza e il supporto decisionale sezione per sezione.",
    "nl": "Overweeg een segment met duidelijke vogelgeluiden opnieuw op te nemen, of bekijk kandidaten met lage betrouwbaarheid en beslissingsondersteuning sectie voor sectie.", "de": "Erwägen Sie, ein Segment mit klaren Vogelstimmen neu aufzunehmen, oder untersuchen Sie Kandidaten mit geringer Konfidenz und die Entscheidungshilfe Abschnitt für Abschnitt.",
    "yue": "建議重新錄過一段有清晰雀鳥聲嘅，或者逐段睇吓低信心候選同決策輔助說明。", "lzh": "議重錄含晰鳥音之段，或逐段察低信之選與決之助。"
  },
  "voteResultOverview": {
    "zh": "投票彙整：{species} 在 {votes}/{validCount} 個分析窗的 Top 預測中出現（整體得票率 {pct}%）。主要出現於片段 {windows}。", "en": "Vote summary: {species} appeared in Top predictions for {votes}/{validCount} analysis windows (overall vote rate {pct}%). Mainly in segments {windows}.",
    "nan": "投票彙整：{species} 在 {votes}/{validCount} 個分析窗的 Top 預測中出現（整體得票率 {pct}%）。主要出現於片段 {windows}。", "hak": "投票彙整：{species} 在 {votes}/{validCount} 個分析窗的 Top 預測中出現（整體得票率 {pct}%）。主要出現於片段 {windows}。",
    "ja": "投票の概要：{species}は{votes}/{validCount}の分析ウィンドウのトップ予測に表示されました（全体的な投票率{pct}%）。主にセグメント{windows}にあります。", "ko": "투표 요약: {species}이(가) {votes}/{validCount} 분석 창의 상위 예측에 나타났습니다(전체 투표율 {pct}%). 주로 세그먼트 {windows}에 있습니다.",
    "th": "สรุปผลโหวต: {species} ปรากฏในการทำนายอันดับสูงสุดสำหรับหน้าต่างวิเคราะห์ {votes}/{validCount} (อัตราการโหวตโดยรวม {pct}%) ส่วนใหญ่อยู่ในส่วน {windows}", "ms": "Ringkasan undian: {species} muncul dalam ramalan teratas untuk tetingkap analisis {votes}/{validCount} (kadar undian keseluruhan {pct}%). Terutamanya dalam segmen {windows}.",
    "id": "Ringkasan suara: {species} muncul dalam prediksi Teratas untuk {votes}/{validCount} jendela analisis (tingkat suara keseluruhan {pct}%). Terutama di segmen {windows}.", "hi": "वोट सारांश: {species} {votes}/{validCount} विश्लेषण विंडो के लिए शीर्ष भविष्यवाणियों में दिखाई दिया (समग्र वोट दर {pct}%)। मुख्य रूप से खंडों {windows} में।",
    "vi": "Tóm tắt bình chọn: {species} xuất hiện trong các dự đoán Hàng đầu cho {votes}/{validCount} cửa sổ phân tích (tỷ lệ bình chọn tổng thể {pct}%). Chủ yếu ở các phân đoạn {windows}.", "fil": "Buod ng boto: Lumabas ang {species} sa Top predictions para sa {votes}/{validCount} analysis windows (kabuuang rate ng boto na {pct}%). Pangunahin sa mga bahagi na {windows}.",
    "fr": "Résumé des votes : {species} est apparu dans les meilleures prédictions pour {votes}/{validCount} fenêtres d'analyse (taux de vote global {pct}%). Principalement dans les segments {windows}.", "es": "Resumen de votos: {species} apareció en las predicciones principales para {votes}/{validCount} ventanas de análisis (tasa de voto general {pct}%). Principalmente en los segmentos {windows}.",
    "pt": "Resumo dos votos: {species} apareceu nas principais previsões para {votes}/{validCount} janelas de análise (taxa de votação geral {pct}%). Principalmente nos segmentos {windows}.", "it": "Riepilogo dei voti: {species} è apparso nelle previsioni principali per {votes}/{validCount} finestre di analisi (tasso di voto complessivo {pct}%). Principalmente nei segmenti {windows}.",
    "nl": "Stemoverzicht: {species} verscheen in de Top-voorspellingen voor {votes}/{validCount} analysevensters (algemeen stempercentage {pct}%). Voornamelijk in segmenten {windows}.", "de": "Abstimmungszusammenfassung: {species} erschien in den Top-Vorhersagen für {votes}/{validCount} Analysefenster (Gesamtabstimmungsrate {pct}%). Hauptsächlich in Segmenten {windows}.",
    "yue": "投票彙整：{species} 喺 {votes}/{validCount} 個分析窗嘅 Top 預測入面出現（整體得票率 {pct}%）。主要出現喺片段 {windows}。", "lzh": "投之彙：{species} 於 {votes}/{validCount} 分析窗之首測中現（總得票率 {pct}%）。要見於段 {windows}。"
  },
  "voteResultSuggestion": {
    "zh": "建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。", "en": "Use the overview as a reference for the entire recording. If segments vary greatly, click the timeline for details.",
    "nan": "建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。", "hak": "建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。",
    "ja": "録音全体の参考として概要を使用してください。セグメントが大きく異なる場合は、タイムラインをクリックして詳細を確認してください。", "ko": "전체 녹음의 참고 자료로 개요를 사용하세요. 세그먼트가 크게 다를 경우 타임라인을 클릭하여 세부 정보를 확인하세요.",
    "th": "ใช้ภาพรวมเป็นข้อมูลอ้างอิงสำหรับการบันทึกทั้งหมด หากส่วนต่างๆ แตกต่างกันมาก ให้คลิกไทม์ไลน์เพื่อดูรายละเอียด", "ms": "Gunakan gambaran keseluruhan sebagai rujukan untuk keseluruhan rakaman. Jika segmen sangat berbeza, klik garis masa untuk mendapatkan butiran.",
    "id": "Gunakan ikhtisar sebagai referensi untuk seluruh rekaman. Jika segmen sangat bervariasi, klik garis waktu untuk detailnya.", "hi": "संपूर्ण रिकॉर्डिंग के संदर्भ के रूप में अवलोकन का उपयोग करें। यदि खंड बहुत भिन्न हैं, तो विवरण के लिए समयरेखा पर क्लिक करें।",
    "vi": "Sử dụng tổng quan làm tài liệu tham khảo cho toàn bộ bản ghi. Nếu các phân đoạn khác nhau nhiều, hãy nhấp vào dòng thời gian để biết chi tiết.", "fil": "Gamitin ang pangkalahatang-ideya bilang sanggunian para sa buong recording. Kung malaki ang pagkakaiba ng mga bahagi, i-click ang timeline para sa mga detalye.",
    "fr": "Utilisez l'aperçu comme référence pour l'intégralité de l'enregistrement. Si les segments varient considérablement, cliquez sur la chronologie pour plus de détails.", "es": "Utilice el resumen como referencia para toda la grabación. Si los segmentos varían mucho, haga clic en la línea de tiempo para obtener más detalles.",
    "pt": "Use a visão geral como referência para toda a gravação. Se os segmentos variarem muito, clique na linha do tempo para obter detalhes.", "it": "Usa la panoramica come riferimento per l'intera registrazione. Se i segmenti variano molto, fai clic sulla sequenza temporale per i dettagli.",
    "nl": "Gebruik het overzicht als referentie voor de hele opname. Als de segmenten sterk variëren, klik dan op de tijdlijn voor details.", "de": "Verwenden Sie die Übersicht als Referenz für die gesamte Aufnahme. Wenn die Segmente stark variieren, klicken Sie auf die Zeitleiste, um Details anzuzeigen.",
    "yue": "建議用總覽結果做成段錄音嘅參考；如果各片段差好多，請點時間軸睇分段詳情。", "lzh": "議以總覽為全錄之參；若各段異大，請按時軸觀其詳。"
  },
  "distanceMeters": {
    "zh": "{meters} 公尺", "en": "{meters} m", "nan": "{meters} 公尺", "hak": "{meters} 公尺", "ja": "{meters} m", "ko": "{meters} m", "th": "{meters} ม.", "ms": "{meters} m", "id": "{meters} m", "hi": "{meters} m", "vi": "{meters} m", "fil": "{meters} m", "fr": "{meters} m", "es": "{meters} m", "pt": "{meters} m", "it": "{meters} m", "nl": "{meters} m", "de": "{meters} m", "yue": "{meters} 米", "lzh": "{meters} 米"
  },
  "distanceKm": {
    "zh": "{km} 公里", "en": "{km} km", "nan": "{km} 公里", "hak": "{km} 公里", "ja": "{km} km", "ko": "{km} km", "th": "{km} กม.", "ms": "{km} km", "id": "{km} km", "hi": "{km} km", "vi": "{km} km", "fil": "{km} km", "fr": "{km} km", "es": "{km} km", "pt": "{km} km", "it": "{km} km", "nl": "{km} km", "de": "{km} km", "yue": "{km} 公里", "lzh": "{km} 里"
  },
  "durationSeconds": {
    "zh": "{s} 秒", "en": "{s} s", "nan": "{s} 秒", "hak": "{s} 秒", "ja": "{s} 秒", "ko": "{s} 초", "th": "{s} วินาที", "ms": "{s} s", "id": "{s} d", "hi": "{s} s", "vi": "{s} giây", "fil": "{s} s", "fr": "{s} s", "es": "{s} s", "pt": "{s} s", "it": "{s} s", "nl": "{s} s", "de": "{s} s", "yue": "{s} 秒", "lzh": "{s} 秒"
  },
  "durationMinSec": {
    "zh": "{m} 分 {s} 秒", "en": "{m} m {s} s", "nan": "{m} 分 {s} 秒", "hak": "{m} 分 {s} 秒", "ja": "{m} 分 {s} 秒", "ko": "{m} 분 {s} 초", "th": "{m} นาที {s} วินาที", "ms": "{m} m {s} s", "id": "{m} m {s} d", "hi": "{m} m {s} s", "vi": "{m} p {s} giây", "fil": "{m} m {s} s", "fr": "{m} m {s} s", "es": "{m} m {s} s", "pt": "{m} m {s} s", "it": "{m} m {s} s", "nl": "{m} m {s} s", "de": "{m} m {s} s", "yue": "{m} 分 {s} 秒", "lzh": "{m} 分 {s} 秒"
  },
  "pdfCheckEmptyPage": {
    "zh": "第 {page} 頁內容過少（疑似空白頁）", "en": "Page {page} has too little content (possibly blank)",
    "nan": "第 {page} 頁內容過少（疑似空白頁）", "hak": "第 {page} 頁內容過少（疑似空白頁）",
    "ja": "{page}ページのコンテンツが少なすぎます（空白の可能性があります）", "ko": "{page} 페이지의 내용이 너무 적습니다(빈 페이지일 수 있음).",
    "th": "หน้าที่ {page} มีเนื้อหาน้อยเกินไป (อาจว่างเปล่า)", "ms": "Halaman {page} mempunyai kandungan yang terlalu sedikit (mungkin kosong)",
    "id": "Halaman {page} memiliki konten yang terlalu sedikit (mungkin kosong)", "hi": "पृष्ठ {page} में सामग्री बहुत कम है (संभवतः खाली है)",
    "vi": "Trang {page} có quá ít nội dung (có thể bị trống)", "fil": "Masyadong kaunti ang nilalaman ng pahina {page} (posibleng blangko)",
    "fr": "La page {page} a trop peu de contenu (peut-être vide)", "es": "La página {page} tiene muy poco contenido (posiblemente en blanco)",
    "pt": "A página {page} tem muito pouco conteúdo (possivelmente em branco)", "it": "La pagina {page} ha troppi pochi contenuti (forse vuota)",
    "nl": "Pagina {page} heeft te weinig inhoud (mogelijk leeg)", "de": "Seite {page} hat zu wenig Inhalt (möglicherweise leer)",
    "yue": "第 {page} 頁內容太少（疑似空白頁）", "lzh": "第 {page} 頁寡文（疑白）"
  },
  "pdfCheckOrphanHeading": {
    "zh": "第 {page} 頁底部可能有 orphan heading", "en": "Page {page} might have an orphan heading at the bottom",
    "nan": "第 {page} 頁底部可能有 orphan heading", "hak": "第 {page} 頁底部可能有 orphan heading",
    "ja": "{page}ページの下部に孤立した見出しがある可能性があります", "ko": "{page} 페이지 하단에 고립된 제목이 있을 수 있습니다.",
    "th": "หน้าที่ {page} อาจมีหัวเรื่องที่ถูกทิ้งไว้ด้านล่าง", "ms": "Halaman {page} mungkin mempunyai tajuk yatim di bahagian bawah",
    "id": "Halaman {page} mungkin memiliki judul yang terabaikan di bagian bawah", "hi": "पृष्ठ {page} के निचले भाग में एक अनाथ शीर्षक हो सकता है",
    "vi": "Trang {page} có thể có tiêu đề bị mồ côi ở dưới cùng", "fil": "Maaaring may naulilang pamagat ang pahina {page} sa ibaba",
    "fr": "La page {page} pourrait avoir un titre orphelin en bas", "es": "La página {page} podría tener un encabezado huérfano en la parte inferior",
    "pt": "A página {page} pode ter um título órfão na parte inferior", "it": "La pagina {page} potrebbe avere un'intestazione orfana in basso",
    "nl": "Pagina {page} heeft mogelijk een weeskoptekst onderaan", "de": "Seite {page} könnte unten eine verwaiste Überschrift haben",
    "yue": "第 {page} 頁底可能有 orphan heading", "lzh": "第 {page} 頁底或有孤題"
  },
  "pdfCheckUnsearchable": {
    "zh": "PDF 無法抽取足夠文字（不可搜尋）", "en": "PDF cannot extract enough text (unsearchable)",
    "nan": "PDF 無法抽取足夠文字（不可搜尋）", "hak": "PDF 無法抽取足夠文字（不可搜尋）",
    "ja": "PDFから十分なテキストを抽出できません（検索不可）", "ko": "PDF에서 텍스트를 충분히 추출할 수 없습니다(검색 불가).",
    "th": "PDF ไม่สามารถดึงข้อความได้เพียงพอ (ไม่สามารถค้นหาได้)", "ms": "PDF tidak dapat mengekstrak teks yang cukup (tidak boleh dicari)",
    "id": "PDF tidak dapat mengekstrak cukup teks (tidak dapat dicari)", "hi": "PDF पर्याप्त पाठ नहीं निकाल सकता (खोजने योग्य नहीं)",
    "vi": "PDF không thể trích xuất đủ văn bản (không thể tìm kiếm)", "fil": "Hindi makapag-extract ng sapat na text ang PDF (hindi ma-search)",
    "fr": "Le PDF ne peut pas extraire suffisamment de texte (non consultable)", "es": "El PDF no puede extraer suficiente texto (no se puede buscar)",
    "pt": "O PDF não pode extrair texto suficiente (não pesquisável)", "it": "Il PDF non può estrarre abbastanza testo (non ricercabile)",
    "nl": "PDF kan niet genoeg tekst extraheren (niet doorzoekbaar)", "de": "PDF kann nicht genügend Text extrahieren (nicht durchsuchbar)",
    "yue": "PDF 抽唔到足夠文字（冇得搜尋）", "lzh": "PDF 弗能取字（不可索）"
  },
  "pdfCheckTooManyPages": {
    "zh": "頁數異常：{count} 頁（預期約 ≤ {max}）", "en": "Abnormal page count: {count} pages (expected ≤ {max})",
    "nan": "頁數異常：{count} 頁（預期約 ≤ {max}）", "hak": "頁數異常：{count} 頁（預期約 ≤ {max}）",
    "ja": "異常なページ数：{count}ページ（予想≤{max}）", "ko": "비정상적인 페이지 수: {count} 페이지(예상 ≤ {max})",
    "th": "จำนวนหน้าผิดปกติ: {count} หน้า (คาดหวัง ≤ {max})", "ms": "Jumlah halaman tidak normal: {count} halaman (dijangkakan ≤ {max})",
    "id": "Jumlah halaman tidak normal: {count} halaman (diharapkan ≤ {max})", "hi": "असामान्य पृष्ठ संख्या: {count} पृष्ठ (अपेक्षित ≤ {max})",
    "vi": "Số trang bất thường: {count} trang (dự kiến ≤ {max})", "fil": "Abnormal na bilang ng pahina: {count} pahina (inaasahan ≤ {max})",
    "fr": "Nombre de pages anormal : {count} pages (attendu ≤ {max})", "es": "Número de páginas anormal: {count} páginas (esperado ≤ {max})",
    "pt": "Contagem de páginas anormal: {count} páginas (esperado ≤ {max})", "it": "Numero di pagine anomalo: {count} pagine (previsto ≤ {max})",
    "nl": "Abnormaal aantal pagina's: {count} pagina's (verwacht ≤ {max})", "de": "Abnormale Seitenanzahl: {count} Seiten (erwartet ≤ {max})",
    "yue": "頁數異常：{count} 頁（預計大概 ≤ {max}）", "lzh": "頁數異常：{count} 頁（期約 ≤ {max}）"
  },
  "spectrogramXLabel": {
    "zh": "時間 (秒)", "en": "Time (seconds)", "nan": "時間 (秒)", "hak": "時間 (秒)", "ja": "時間（秒）", "ko": "시간(초)", "th": "เวลา (วินาที)", "ms": "Masa (saat)", "id": "Waktu (detik)", "hi": "समय (सेकंड)", "vi": "Thời gian (giây)", "fil": "Oras (segundo)", "fr": "Temps (secondes)", "es": "Tiempo (segundos)", "pt": "Tempo (segundos)", "it": "Tempo (secondi)", "nl": "Tijd (seconden)", "de": "Zeit (Sekunden)", "yue": "時間 (秒)", "lzh": "時（秒）"
  },
  "spectrogramYLabel": {
    "zh": "Mel 頻率", "en": "Mel frequency", "nan": "Mel 頻率", "hak": "Mel 頻率", "ja": "メル周波数", "ko": "멜 주파수", "th": "ความถี่ Mel", "ms": "Kekerapan Mel", "id": "Frekuensi Mel", "hi": "Mel आवृत्ति", "vi": "Tần số Mel", "fil": "Mel frequency", "fr": "Fréquence Mel", "es": "Frecuencia Mel", "pt": "Frequência Mel", "it": "Frequenza Mel", "nl": "Mel-frequentie", "de": "Mel-Frequenz", "yue": "Mel 頻率", "lzh": "Mel 頻率"
  },
  "spectrogramIntensity": {
    "zh": "強度", "en": "Intensity", "nan": "強度", "hak": "強度", "ja": "強度", "ko": "강도", "th": "ความเข้ม", "ms": "Intensiti", "id": "Intensitas", "hi": "तीव्रता", "vi": "Cường độ", "fil": "Intensity", "fr": "Intensité", "es": "Intensidad", "pt": "Intensidade", "it": "Intensità", "nl": "Intensiteit", "de": "Intensität", "yue": "強度", "lzh": "強"
  },
  "timelineSingleEventEdge": {
    "zh": "於 {time}s 偵測到 {species}（事件信心 {pct}%）。此事件接近錄音邊界，反卷積覆蓋率可能較低，請謹慎參考。", "en": "{species} detected at {time}s (event confidence {pct}%). This event is near the recording edge, deconvolution coverage may be lower, please reference cautiously.",
    "nan": "於 {time}s 偵測到 {species}（事件信心 {pct}%）。此事件接近錄音邊界，反卷積覆蓋率可能較低，請謹慎參考。", "hak": "於 {time}s 偵測到 {species}（事件信心 {pct}%）。此事件接近錄音邊界，反卷積覆蓋率可能較低，請謹慎參考。",
    "ja": "{time}秒に{species}を検出しました（イベント信頼度{pct}%）。このイベントは録音の端に近く、デコンボリューションのカバレッジが低い可能性があるため、注意して参照してください。", "ko": "{time}초에 {species}이(가) 감지되었습니다(이벤트 신뢰도 {pct}%). 이 이벤트는 녹음 가장자리에 가까워 디콘볼루션 범위가 낮을 수 있으므로 주의해서 참고하세요.",
    "th": "ตรวจพบ {species} ที่ {time}s (ความเชื่อมั่นของเหตุการณ์ {pct}%) เหตุการณ์นี้อยู่ใกล้ขอบการบันทึก ความครอบคลุมการแยกจุดภาพอาจต่ำลง โปรดใช้อ้างอิงอย่างระมัดระวัง", "ms": "{species} dikesan pada {time}s (keyakinan acara {pct}%). Peristiwa ini berhampiran tepi rakaman, liputan dekonvolusi mungkin lebih rendah, sila rujuk dengan berhati-hati.",
    "id": "{species} terdeteksi pada {time}s (kepercayaan peristiwa {pct}%). Peristiwa ini berada di dekat batas rekaman, cakupan dekonvolusi mungkin lebih rendah, harap rujuk dengan hati-hati.", "hi": "{time}s पर {species} का पता चला (घटना विश्वास {pct}%)। यह घटना रिकॉर्डिंग के किनारे के पास है, डिकोनवोल्यूशन कवरेज कम हो सकता है, कृपया सावधानी से संदर्भ लें।",
    "vi": "Đã phát hiện {species} tại {time}s (độ tin cậy của sự kiện {pct}%). Sự kiện này gần rìa của bản ghi, phạm vi phủ sóng deconvolution có thể thấp hơn, vui lòng tham khảo cẩn thận.", "fil": "Natagpuan ang {species} sa {time}s (kumpyansa ng kaganapan {pct}%). Ang kaganapang ito ay malapit sa dulo ng recording, maaaring mas mababa ang deconvolution coverage, mangyaring sumangguni nang may pag-iingat.",
    "fr": "{species} détecté à {time}s (confiance de l'événement {pct}%). Cet événement est près du bord de l'enregistrement, la couverture de déconvolution peut être plus faible, veuillez vous y référer avec prudence.", "es": "{species} detectado a los {time}s (confianza del evento {pct}%). Este evento está cerca del borde de la grabación, la cobertura de deconvolución puede ser menor, por favor tome como referencia con precaución.",
    "pt": "{species} detectado em {time}s (confiança do evento {pct}%). Este evento está próximo à borda da gravação, a cobertura de deconvolução pode ser menor, por favor referencie com cuidado.", "it": "{species} rilevato a {time}s (confidenza dell'evento {pct}%). Questo evento è vicino al bordo della registrazione, la copertura di deconvoluzione potrebbe essere inferiore, fare riferimento con cautela.",
    "nl": "{species} gedetecteerd op {time}s (gebeurtenisvertrouwen {pct}%). Deze gebeurtenis bevindt zich nabij de opnamerand, de deconvolutiedekking kan lager zijn, raadpleeg voorzichtig.", "de": "{species} bei {time}s erkannt (Ereigniskonfidenz {pct}%). Dieses Ereignis befindet sich in der Nähe des Aufnahmerands, die Dekonvolutionsabdeckung kann geringer sein, bitte mit Vorsicht referenzieren.",
    "yue": "喺 {time}s 偵測到 {species}（事件信心 {pct}%）。呢個事件好近錄音邊界，反卷積覆蓋率可能較低，請謹慎參考。", "lzh": "於 {time}s 偵 {species}（信度 {pct}%）。近於錄之涯，反卷覆率或低，慎參之。"
  },
  "timelineSingleEventNormal": {
    "zh": "於 {time}s 偵測到 {species}，事件信心 {pct}%（一般事件門檻 {minPct}%）。此數值顯示該時段有強烈之物種聲學特徵。", "en": "{species} detected at {time}s, event confidence {pct}% (normal threshold {minPct}%). This indicates strong species acoustic features in this period.",
    "nan": "於 {time}s 偵測到 {species}，事件信心 {pct}%（一般事件門檻 {minPct}%）。此數值顯示該時段有強烈之物種聲學特徵。", "hak": "於 {time}s 偵測到 {species}，事件信心 {pct}%（一般事件門檻 {minPct}%）。此數值顯示該時段有強烈之物種聲學特徵。",
    "ja": "{time}秒に{species}を検出しました。イベント信頼度は{pct}%（通常閾値{minPct}%）です。これはこの期間に強い種族の音響特徴があることを示しています。", "ko": "{time}초에 {species}이(가) 감지되었습니다. 이벤트 신뢰도 {pct}%(일반 임계값 {minPct}%). 이는 해당 기간에 강력한 종 음향 특징이 있음을 나타냅니다.",
    "th": "ตรวจพบ {species} ที่ {time}s ความเชื่อมั่นของเหตุการณ์ {pct}% (เกณฑ์ปกติ {minPct}%) สิ่งนี้บ่งชี้ถึงคุณสมบัติทางเสียงของชนิดพันธุ์ที่แข็งแกร่งในช่วงเวลานี้", "ms": "{species} dikesan pada {time}s, keyakinan acara {pct}% (ambang biasa {minPct}%). Ini menunjukkan ciri akustik spesies yang kuat dalam tempoh ini.",
    "id": "{species} terdeteksi pada {time}s, kepercayaan peristiwa {pct}% (ambang normal {minPct}%). Hal ini menunjukkan fitur akustik spesies yang kuat pada periode ini.", "hi": "{time}s पर {species} का पता चला, घटना विश्वास {pct}% (सामान्य सीमा {minPct}%)। यह इस अवधि में मजबूत प्रजाति ध्वनिक विशेषताओं को इंगित करता है।",
    "vi": "Đã phát hiện {species} tại {time}s, độ tin cậy của sự kiện {pct}% (ngưỡng bình thường {minPct}%). Điều này cho thấy các đặc điểm âm thanh của loài mạnh mẽ trong khoảng thời gian này.", "fil": "Natagpuan ang {species} sa {time}s, kumpyansa ng kaganapan {pct}% (normal threshold {minPct}%). Ipinapahiwatig nito ang malakas na katangian ng tunog ng species sa panahong ito.",
    "fr": "{species} détecté à {time}s, confiance de l'événement {pct}% (seuil normal {minPct}%). Cela indique de fortes caractéristiques acoustiques de l'espèce pendant cette période.", "es": "{species} detectado a los {time}s, confianza del evento {pct}% (umbral normal {minPct}%). Esto indica fuertes características acústicas de la especie en este período.",
    "pt": "{species} detectado em {time}s, confiança do evento {pct}% (limite normal {minPct}%). Isso indica fortes características acústicas da espécie neste período.", "it": "{species} rilevato a {time}s, confidenza dell'evento {pct}% (soglia normale {minPct}%). Questo indica forti caratteristiche acustiche della specie in questo periodo.",
    "nl": "{species} gedetecteerd op {time}s, gebeurtenisvertrouwen {pct}% (normale drempel {minPct}%). Dit wijst op sterke akoestische soortkenmerken in deze periode.", "de": "{species} bei {time}s erkannt, Ereigniskonfidenz {pct}% (normale Schwelle {minPct}%). Dies weist auf starke akustische Artenmerkmale in diesem Zeitraum hin.",
    "yue": "喺 {time}s 偵測到 {species}，事件信心 {pct}%（一般門檻 {minPct}%）。呢個數值顯示該時段有強烈嘅物種聲學特徵。", "lzh": "於 {time}s 偵 {species}，信度 {pct}%（常限 {minPct}%）。此示該時有強之鳥聲特徵。"
  },
  "timelineSingleEventSuggestion": {
    "zh": "此事件落在 {window} 分析窗。建議對照頻譜圖與 XAI 時間重要性，並以實地觀察或影像作二次確認。", "en": "This event falls in analysis window {window}. Suggest cross-referencing with spectrogram and XAI temporal importance, and verifying with field observations or images.",
    "nan": "此事件落在 {window} 分析窗。建議對照頻譜圖與 XAI 時間重要性，並以實地觀察或影像作二次確認。", "hak": "此事件落在 {window} 分析窗。建議對照頻譜圖與 XAI 時間重要性，並以實地觀察或影像作二次確認。",
    "ja": "このイベントは分析ウィンドウ{window}に分類されます。スペクトログラムやXAIの時間の重要性と照らし合わせ、現地での観察や画像で再確認することをお勧めします。", "ko": "이 이벤트는 분석 창 {window}에 속합니다. 스펙트로그램 및 XAI 시간적 중요성과 교차 참조하고 현장 관찰이나 이미지로 확인하는 것을 권장합니다.",
    "th": "เหตุการณ์นี้ตกอยู่ในหน้าต่างวิเคราะห์ {window} ขอแนะนำให้อ้างอิงแบบไขว้กับสเปกโตรแกรมและความสำคัญทางเวลาของ XAI และตรวจสอบด้วยการสังเกตการณ์ภาคสนามหรือภาพ", "ms": "Peristiwa ini jatuh dalam tetingkap analisis {window}. Cadangkan rujukan silang dengan spektrogram dan kepentingan masa XAI, dan sahkan dengan pemerhatian medan atau imej.",
    "id": "Peristiwa ini jatuh dalam jendela analisis {window}. Sarankan referensi silang dengan spektrogram dan pentingnya waktu XAI, serta verifikasi dengan pengamatan lapangan atau gambar.", "hi": "यह घटना विश्लेषण विंडो {window} में आती है। स्पेक्ट्रोग्राम और XAI लौकिक महत्व के साथ क्रॉस-रेफ़रेंसिंग का सुझाव दें, और फ़ील्ड अवलोकनों या छवियों के साथ सत्यापन करें।",
    "vi": "Sự kiện này rơi vào cửa sổ phân tích {window}. Đề xuất đối chiếu với phổ đồ và tầm quan trọng về thời gian XAI, đồng thời xác minh bằng quan sát thực địa hoặc hình ảnh.", "fil": "Nahuhulog ang kaganapang ito sa analysis window {window}. Iminumungkahi ang cross-referencing kasama ang spectrogram at XAI temporal importance, at pag-verify gamit ang field observations o mga larawan.",
    "fr": "Cet événement se situe dans la fenêtre d'analyse {window}. Suggérez de croiser les références avec le spectrogramme et l'importance temporelle XAI, et de vérifier avec des observations sur le terrain ou des images.", "es": "Este evento cae en la ventana de análisis {window}. Sugerir referencias cruzadas con el espectrograma y la importancia temporal de XAI, y verificar con observaciones de campo o imágenes.",
    "pt": "Este evento se enquadra na janela de análise {window}. Sugiro referências cruzadas com o espectrograma e a importância temporal do XAI e verificação com observações de campo ou imagens.", "it": "Questo evento rientra nella finestra di analisi {window}. Si suggerisce di fare riferimenti incrociati con lo spettrogramma e l'importanza temporale XAI, e di verificare con osservazioni sul campo o immagini.",
    "nl": "Deze gebeurtenis valt in analysevenster {window}. Stel voor om kruisverwijzingen te maken met het spectrogram en het tijdsbelang van de XAI, en te verifiëren met veldwaarnemingen of afbeeldingen.", "de": "Dieses Ereignis fällt in das Analysefenster {window}. Empfehlen Sie Kreuzreferenzen mit dem Spektrogramm und der XAI-Zeitbedeutung sowie die Überprüfung mit Feldbeobachtungen oder Bildern.",
    "yue": "呢個事件落喺 {window} 分析窗。建議對照頻譜圖同 XAI 時間重要性，並以實地觀察或影像做二次確認。", "lzh": "此事件落於 {window} 分析窗。議對頻譜與 XAI 之時重，復以實觀或影證之。"
  },
  "timelineNoEvents": {
    "zh": "時間軸未偵測到達事件信心門檻（一般事件 ≥{minPct}%、邊界 ≥{boundaryPct}%）的明顯鳴叫事件。", "en": "Timeline detected no distinct vocalization events reaching the confidence threshold (normal ≥{minPct}%, edge ≥{boundaryPct}%).",
    "nan": "時間軸未偵測到達事件信心門檻（一般事件 ≥{minPct}%、邊界 ≥{boundaryPct}%）的明顯鳴叫事件。", "hak": "時間軸未偵測到達事件信心門檻（一般事件 ≥{minPct}%、邊界 ≥{boundaryPct}%）的明顯鳴叫事件。",
    "ja": "タイムラインは、信頼度閾値（通常≥{minPct}%、エッジ≥{boundaryPct}%）に達する明確な発声イベントを検出しませんでした。", "ko": "타임라인에서 신뢰도 임계값(일반 ≥{minPct}%, 가장자리 ≥{boundaryPct}%)에 도달하는 뚜렷한 발성 이벤트를 감지하지 못했습니다.",
    "th": "ไทม์ไลน์ไม่พบเหตุการณ์การเปล่งเสียงที่ชัดเจนซึ่งถึงเกณฑ์ความเชื่อมั่น (ปกติ ≥{minPct}%, ขอบ ≥{boundaryPct}%)", "ms": "Garis masa tidak mengesan sebarang peristiwa penyuaraan yang jelas yang mencapai ambang keyakinan (biasa ≥{minPct}%, tepi ≥{boundaryPct}%).",
    "id": "Garis waktu tidak mendeteksi peristiwa vokalisasi yang jelas yang mencapai ambang kepercayaan (normal ≥{minPct}%, batas ≥{boundaryPct}%).", "hi": "समयरेखा ने विश्वास सीमा (सामान्य ≥{minPct}%, किनारे ≥{boundaryPct}%) तक पहुंचने वाली कोई स्पष्ट स्वर घटना का पता नहीं लगाया।",
    "vi": "Dòng thời gian không phát hiện sự kiện phát âm rõ rệt nào đạt đến ngưỡng tin cậy (bình thường ≥{minPct}%, rìa ≥{boundaryPct}%).", "fil": "Walang natukoy ang timeline na malinaw na kaganapan ng vocalization na umabot sa confidence threshold (normal ≥{minPct}%, gilid ≥{boundaryPct}%).",
    "fr": "La chronologie n'a détecté aucun événement de vocalisation distinct atteignant le seuil de confiance (normal ≥{minPct}%, bord ≥{boundaryPct}%).", "es": "La línea de tiempo no detectó eventos de vocalización distintos que alcanzaran el umbral de confianza (normal ≥{minPct}%, borde ≥{boundaryPct}%).",
    "pt": "A linha do tempo não detectou nenhum evento de vocalização distinto que atingisse o limite de confiança (normal ≥{minPct}%, borda ≥{boundaryPct}%).", "it": "La sequenza temporale non ha rilevato alcun evento di vocalizzazione distinto che raggiungesse la soglia di confidenza (normale ≥{minPct}%, bordo ≥{boundaryPct}%).",
    "nl": "De tijdlijn heeft geen duidelijke vocalisatiegebeurtenissen gedetecteerd die de betrouwbaarheidsdrempel hebben bereikt (normaal ≥{minPct}%, rand ≥{boundaryPct}%).", "de": "Die Zeitleiste erkannte keine eindeutigen Vokalisierungsereignisse, die die Konfidenzschwelle erreichten (normal ≥{minPct}%, Rand ≥{boundaryPct}%).",
    "yue": "時間軸未偵測到達到事件信心門檻（一般事件 ≥{minPct}%、邊界 ≥{boundaryPct}%）嘅明顯鳴叫事件。", "lzh": "時軸未察達限（常 ≥{minPct}%、崖 ≥{boundaryPct}%）之明鳴也。"
  },
  "timelineNoEventsSuggestion": {
    "zh": "建議對照全段頻譜與原始音訊；若預期有鳥鳴，可嘗試在較安靜環境重新錄製或延長錄音時間。", "en": "Suggest reviewing the full spectrogram and original audio. If bird calls were expected, try re-recording in a quieter environment or extending the duration.",
    "nan": "建議對照全段頻譜與原始音訊；若預期有鳥鳴，可嘗試在較安靜環境重新錄製或延長錄音時間。", "hak": "建議對照全段頻譜與原始音訊；若預期有鳥鳴，可嘗試在較安靜環境重新錄製或延長錄音時間。",
    "ja": "全体のスペクトログラムと元の音声を確認することをお勧めします。鳥の鳴き声が予想される場合は、より静かな環境で再録音するか、時間を延長してみてください。", "ko": "전체 스펙트로그램 및 원본 오디오를 검토하는 것을 권장합니다. 새소리가 예상되는 경우 더 조용한 환경에서 다시 녹음하거나 녹음 시간을 연장해 보세요.",
    "th": "ขอแนะนำให้ตรวจสอบสเปกโตรแกรมแบบเต็มและเสียงต้นฉบับ หากคาดว่าจะมีเสียงนก ให้ลองบันทึกใหม่ในสภาพแวดล้อมที่เงียบกว่าหรือยืดระยะเวลาออกไป", "ms": "Cadangkan menyemak spektrogram penuh dan audio asal. Jika panggilan burung dijangka, cuba rakam semula dalam persekitaran yang lebih sunyi atau memanjangkan tempoh.",
    "id": "Sarankan untuk meninjau spektrogram penuh dan audio asli. Jika panggilan burung diharapkan, coba rekam ulang di lingkungan yang lebih tenang atau perpanjang durasi.", "hi": "पूर्ण स्पेक्ट्रोग्राम और मूल ऑडियो की समीक्षा करने का सुझाव दें। यदि पक्षी कॉल की उम्मीद थी, तो शांत वातावरण में फिर से रिकॉर्ड करने या अवधि बढ़ाने का प्रयास करें।",
    "vi": "Đề xuất xem xét toàn bộ phổ đồ và âm thanh gốc. Nếu dự kiến có tiếng chim, hãy thử ghi âm lại trong môi trường yên tĩnh hơn hoặc kéo dài thời gian.", "fil": "Iminumungkahi na suriin ang buong spectrogram at orihinal na audio. Kung inaasahan ang mga tawag ng ibon, subukang mag-record muli sa isang mas tahimik na kapaligiran o pahabain ang tagal.",
    "fr": "Suggérer de revoir le spectrogramme complet et l'audio d'origine. Si des chants d'oiseaux étaient attendus, essayez de réenregistrer dans un environnement plus calme ou de prolonger la durée.", "es": "Sugerir revisar el espectrograma completo y el audio original. Si se esperaban cantos de aves, intente volver a grabar en un entorno más silencioso o extender la duración.",
    "pt": "Sugerir a revisão de todo o espectrograma e do áudio original. Se cantos de aves eram esperados, tente regravar em um ambiente mais silencioso ou aumentar a duração.", "it": "Suggerire di rivedere lo spettrogramma completo e l'audio originale. Se erano previsti canti di uccelli, provare a registrare nuovamente in un ambiente più tranquillo o prolungare la durata.",
    "nl": "Stel voor om het volledige spectrogram en de originele audio te bekijken. Als er vogelgeluiden werden verwacht, probeer dan opnieuw op te nemen in een stillere omgeving of de duur te verlengen.", "de": "Empfehlen Sie, das vollständige Spektrogramm und das Originalaudio zu überprüfen. Wenn Vogelstimmen erwartet wurden, versuchen Sie, in einer ruhigeren Umgebung neu aufzunehmen oder die Dauer zu verlängern.",
    "yue": "建議對照全段頻譜同原始音訊；如果預期有雀鳥聲，可以試下喺安靜啲嘅環境重新錄製或者延長錄音時間。", "lzh": "議觀全譜與原音；若期有鳥鳴，試於靜處重錄或延時。"
  },
  "timelineMultipleEvents": {
    "zh": "時間軸偵測到 {count} 個物種事件、{speciesCount} 種鳥類；最高事件信心為 {species}（{pct}%）。", "en": "Timeline detected {count} species events, {speciesCount} bird species; highest event confidence is {species} ({pct}%).",
    "nan": "時間軸偵測到 {count} 個物種事件、{speciesCount} 種鳥類；最高事件信心為 {species}（{pct}%）。", "hak": "時間軸偵測到 {count} 個物種事件、{speciesCount} 種鳥類；最高事件信心為 {species}（{pct}%）。",
    "ja": "タイムラインは{count}個の種族イベント、{speciesCount}種の鳥を検出しました。最高のイベント信頼度は{species}（{pct}%）です。", "ko": "타임라인에서 {count}개의 종 이벤트, {speciesCount}종의 조류를 감지했습니다. 가장 높은 이벤트 신뢰도는 {species}({pct}%)입니다.",
    "th": "ไทม์ไลน์พบเหตุการณ์ชนิดพันธุ์ {count} รายการ นก {speciesCount} ชนิด; ความเชื่อมั่นของเหตุการณ์สูงสุดคือ {species} ({pct}%)", "ms": "Garis masa mengesan {count} peristiwa spesies, {speciesCount} spesies burung; keyakinan acara tertinggi ialah {species} ({pct}%).",
    "id": "Garis waktu mendeteksi {count} peristiwa spesies, {speciesCount} spesies burung; kepercayaan peristiwa tertinggi adalah {species} ({pct}%).", "hi": "समयरेखा ने {count} प्रजाति की घटनाओं, {speciesCount} पक्षी प्रजातियों का पता लगाया; उच्चतम घटना विश्वास {species} ({pct}%) है।",
    "vi": "Dòng thời gian đã phát hiện {count} sự kiện loài, {speciesCount} loài chim; độ tin cậy của sự kiện cao nhất là {species} ({pct}%).", "fil": "Nakita ng timeline ang {count} na kaganapan ng species, {speciesCount} na uri ng ibon; ang pinakamataas na kumpyansa ng kaganapan ay {species} ({pct}%).",
    "fr": "La chronologie a détecté {count} événements d'espèces, {speciesCount} espèces d'oiseaux ; la confiance de l'événement la plus élevée est {species} ({pct}%).", "es": "La línea de tiempo detectó {count} eventos de especies, {speciesCount} especies de aves; la confianza de evento más alta es {species} ({pct}%).",
    "pt": "A linha do tempo detectou {count} eventos de espécies, {speciesCount} espécies de aves; a confiança de evento mais alta é {species} ({pct}%).", "it": "La sequenza temporale ha rilevato {count} eventi di specie, {speciesCount} specie di uccelli; la confidenza dell'evento più alta è {species} ({pct}%).",
    "nl": "Tijdlijn heeft {count} soortgebeurtenissen gedetecteerd, {speciesCount} vogelsoorten; hoogste gebeurtenisvertrouwen is {species} ({pct}%).", "de": "Die Zeitleiste hat {count} Artenereignisse erkannt, {speciesCount} Vogelarten; die höchste Ereigniskonfidenz ist {species} ({pct}%).",
    "yue": "時間軸偵測到 {count} 個物種事件、{speciesCount} 種鳥類；最高事件信心係 {species}（{pct}%）。", "lzh": "時軸察 {count} 鳥事、{speciesCount} 鳥種；至高信度為 {species}（{pct}%）。"
  },
  "timelineMultipleEventsSuggestion": {
    "zh": "建議以時間軸事件作為整段錄音的參考摘要；點選事件可檢視該時段物種與頻譜。若用於生態調查，請輔以實地觀察或影像確認。", "en": "Suggest using timeline events as a reference summary. Click an event to view species and spectrogram for that period. If used for ecological surveys, supplement with field observations or images.",
    "nan": "建議以時間軸事件作為整段錄音的參考摘要；點選事件可檢視該時段物種與頻譜。若用於生態調查，請輔以實地觀察或影像確認。", "hak": "建議以時間軸事件作為整段錄音的參考摘要；點選事件可檢視該時段物種與頻譜。若用於生態調查，請輔以實地觀察或影像確認。",
    "ja": "タイムラインイベントを参考概要として使用することをお勧めします。イベントをクリックすると、その期間の種族とスペクトログラムを表示できます。生態調査に使用する場合は、現地での観察や画像を補足してください。", "ko": "타임라인 이벤트를 참고 요약으로 사용하는 것을 권장합니다. 이벤트를 클릭하면 해당 기간의 종과 스펙트로그램을 볼 수 있습니다. 생태 조사에 사용하는 경우 현장 관찰이나 이미지를 보충하세요.",
    "th": "แนะนำให้ใช้เหตุการณ์ในไทม์ไลน์เป็นข้อมูลอ้างอิงสรุป คลิกที่เหตุการณ์เพื่อดูชนิดพันธุ์และสเปกโตรแกรมสำหรับช่วงเวลานั้น หากใช้สำหรับการสำรวจทางนิเวศวิทยา ให้เสริมด้วยการสังเกตการณ์ภาคสนามหรือภาพ", "ms": "Cadangkan menggunakan acara garis masa sebagai ringkasan rujukan. Klik acara untuk melihat spesies dan spektrogram untuk tempoh itu. Jika digunakan untuk tinjauan ekologi, lengkapkan dengan pemerhatian medan atau imej.",
    "id": "Sarankan menggunakan peristiwa garis waktu sebagai ringkasan referensi. Klik suatu peristiwa untuk melihat spesies dan spektrogram untuk periode tersebut. Jika digunakan untuk survei ekologi, lengkapi dengan pengamatan lapangan atau gambar.", "hi": "संदर्भ सारांश के रूप में समयरेखा घटनाओं का उपयोग करने का सुझाव दें। उस अवधि के लिए प्रजातियों और स्पेक्ट्रोग्राम को देखने के लिए किसी घटना पर क्लिक करें। यदि पारिस्थितिक सर्वेक्षण के लिए उपयोग किया जाता है, तो फ़ील्ड अवलोकनों या छवियों के साथ पूरक करें।",
    "vi": "Đề xuất sử dụng các sự kiện dòng thời gian làm tóm tắt tham khảo. Nhấp vào một sự kiện để xem loài và phổ đồ cho khoảng thời gian đó. Nếu được sử dụng cho các cuộc khảo sát sinh thái, hãy bổ sung bằng các quan sát thực địa hoặc hình ảnh.", "fil": "Iminumungkahi ang paggamit ng mga kaganapan sa timeline bilang isang sanggunian na buod. Mag-click sa isang kaganapan upang tingnan ang mga species at spectrogram para sa panahong iyon. Kung ginagamit para sa ecological surveys, dagdagan ng field observations o mga larawan.",
    "fr": "Suggérer d'utiliser les événements de la chronologie comme résumé de référence. Cliquez sur un événement pour afficher l'espèce et le spectrogramme pour cette période. S'il est utilisé pour des enquêtes écologiques, complétez par des observations sur le terrain ou des images.", "es": "Sugerir el uso de eventos de la línea de tiempo como un resumen de referencia. Haga clic en un evento para ver la especie y el espectrograma para ese período. Si se usa para encuestas ecológicas, compleméntelo con observaciones de campo o imágenes.",
    "pt": "Sugerir o uso de eventos da linha do tempo como um resumo de referência. Clique em um evento para ver as espécies e o espectrograma para esse período. Se usado para pesquisas ecológicas, complemente com observações de campo ou imagens.", "it": "Suggerire di utilizzare gli eventi della sequenza temporale come riepilogo di riferimento. Fare clic su un evento per visualizzare le specie e lo spettrogramma per quel periodo. Se utilizzato per indagini ecologiche, integrare con osservazioni sul campo o immagini.",
    "nl": "Stel voor om tijdlijngebeurtenissen als referentieoverzicht te gebruiken. Klik op een gebeurtenis om de soort en het spectrogram voor die periode te bekijken. Bij gebruik voor ecologisch onderzoek, aanvullen met veldwaarnemingen of afbeeldingen.", "de": "Empfehlen Sie die Verwendung von Zeitleistenereignissen als Referenzzusammenfassung. Klicken Sie auf ein Ereignis, um Arten und Spektrogramm für diesen Zeitraum anzuzeigen. Bei Verwendung für ökologische Erhebungen durch Feldbeobachtungen oder Bilder ergänzen.",
    "yue": "建議用時間軸事件做參考摘要；點事件可以睇嗰個時段嘅物種同頻譜。如果用喺生態調查，請加埋實地觀察或者影像做確認。", "lzh": "議以時軸之事為參；按之可觀該時鳥種與譜。若為生態之考，請輔以實觀或影證。"
  },
  "pdfRangeTo": {
    "zh": "{from} 至 {to}", "en": "{from} to {to}", "nan": "{from} 至 {to}", "hak": "{from} 至 {to}",
    "ja": "{from}から{to}", "ko": "{from} ~ {to}", "th": "{from} ถึง {to}", "ms": "{from} hingga {to}",
    "id": "{from} hingga {to}", "hi": "{from} से {to}", "vi": "{from} đến {to}", "fil": "{from} hanggang {to}",
    "fr": "{from} à {to}", "es": "de {from} a {to}", "pt": "de {from} a {to}", "it": "da {from} a {to}",
    "nl": "{from} tot {to}", "de": "{from} bis {to}", "yue": "{from} 至 {to}", "lzh": "{from} 至 {to}"
  }
}

LOCALES_DIR = 'frontend/src/i18n/locales'
SUPPORTED_LANGS = [
  'zh', 'en', 'nan', 'hak', 'lzh', 'yue', 'ja', 'ko', 
  'th', 'ms', 'id', 'hi', 'vi', 'fil', 'fr', 'es', 'pt', 'it', 'nl', 'de'
]

# Insert keys into each locale file
for lang in SUPPORTED_LANGS:
    file_path = os.path.join(LOCALES_DIR, f"{lang}.js")
    if not os.path.exists(file_path):
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will find the last closing brace of the default export
    # Usually it's `};` at the end
    last_brace_idx = content.rfind('}')
    if last_brace_idx == -1:
        continue
    
    # Check if we already injected them (idempotent)
    if 'loaderPreprocessing' in content:
        continue
    
    injected_str = ",\n"
    for k, v in new_keys.items():
        val = v.get(lang, v['en'])
        injected_str += f"  {k}: {repr(val)},\n"
    
    # replace last comma just in case
    injected_str = injected_str.rstrip(",\n") + "\n"
    
    new_content = content[:last_brace_idx] + injected_str + content[last_brace_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("Injected 39 new keys into 20 locale files.")

# Next we patch the source files
def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base = 'frontend'

patch_file(f'{base}/src/components/Loader/Loader.jsx', [
    ("正在預處理與切割音訊", "{dict?.loaderPreprocessing}"),
    ("正在利用 Web Audio API 在前端進行強制單聲道、32kHz 降採樣與 5 秒切割。", "{dict?.loaderPreprocessingHint}")
])

patch_file(f'{base}/src/components/Visualizer/SpectrogramView.jsx', [
    ("lang === 'zh' ? '物種事件時間標籤' : 'Species event time labels'", "dict?.spectrogramEventLabels"),
    ("dict?.xaiGenerating ?? (lang === 'zh' ? 'XAI生成中...' : 'Generating XAI...');", "dict?.xaiGenerating;"),
    ("? '可解釋性熱圖計算中，完成後可儲存、分享或列印報告'\n      : 'Computing interpretability heatmap... You can save, share, or print the report when finished.'", "dict?.xaiGeneratingHint"),
    ("{lang === 'zh' ? '尚無頻譜資料' : 'No spectrogram data'}", "{dict?.spectrogramNoData}"),
    ("const title = dict?.spectrogramTitle ?? (lang === 'zh' ? '音訊頻譜圖' : 'Spectrogram');", "const title = dict?.spectrogramTitle;"),
    ("? '橫軸為時間、縱軸為 Mel 頻率；頻譜下方半透明區塊內白色尖峰為 XAI 時間重要性（越高越關鍵）'\n      : 'X-axis is time, Y-axis is Mel frequency; white peaks in the translucent area below indicate XAI temporal importance (higher is more critical).'", "dict?.spectrogramDescription"),
    ("(lang === 'zh' ? '點擊頻譜圖可放大檢視' : 'Click the spectrogram to enlarge')", "dict?.spectrogramClickToEnlarge"),
    ("const enlargeLabel = dict?.spectrogramEnlarge ?? (lang === 'zh' ? '放大檢視頻譜圖' : 'View full spectrogram');", "const enlargeLabel = dict?.spectrogramEnlarge;"),
    ("? `總覽 · ${segmentCount ?? 1} 段 · ${durationSec}s · ${spectrogram.time_frames}×${", "? dict?.spectrogramOverviewSummary?.replace('{segmentCount}', segmentCount ?? 1).replace('{durationSec}', durationSec).replace('{time_frames}', spectrogram.time_frames).replace('{freq_bins}', spectrogram.freq_bins)\n      : `Overview · ${segmentCount ?? 1} segments · ${durationSec}s · ${spectrogram.time_frames}×${"),
    ("? `分析窗 ${chunkIndex + 1} · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`\n      : `Window ${chunkIndex + 1} · ${durationSec}s · ${spectrogram.time_frames}×${spectrogram.freq_bins}`;", "dict?.spectrogramChunkSummary?.replace('{chunkIndex}', chunkIndex + 1).replace('{durationSec}', durationSec).replace('{time_frames}', spectrogram.time_frames).replace('{freq_bins}', spectrogram.freq_bins);")
])

patch_file(f'{base}/src/components/Visualizer/Visualizer.jsx', [
    ("? '越深的紅色代表 AI 模型在辨識時的關注度越高'\n                  : 'Deeper red indicates higher attention from the AI model during recognition.'", "dict?.xaiRedHeatmapHint"),
    ("? `片段 ${chunkIndex + 1} · 5.0s · 32kHz · Mono`\n                : `Segment ${chunkIndex + 1} · 5.0s · 32kHz · Mono`", "dict?.visualizerChunkSummary?.replace('{chunkIndex}', chunkIndex + 1)")
])

patch_file(f'{base}/src/features/results/BackendResultPanel.jsx', [
    ("opts.speciesVariant ?? 'timeline'", "opts.speciesVariant || 'timeline'")
])

patch_file(f'{base}/src/hooks/usePageMeta.js', [
    ("document.title = title ? `${title} | EchoWing` : 'EchoWing - AI 鳥類聲學辨識平台';", "document.title = title ? `${title} | EchoWing` : (dict?.pageMetaTitleSuffix || 'EchoWing');"),
    ("document.title = 'EchoWing - AI 鳥類聲學辨識平台 | Bird Sound Recognition';", "document.title = dict?.pageMetaTitleSuffix || 'EchoWing';")
])

patch_file(f'{base}/src/pages/LandingPage.jsx', [
    ("dict.title || 'AI 鳥類聲學辨識'", "dict.title")
])

patch_file(f'{base}/src/pages/LoadingPage.jsx', [
    ("dict.loadingTitle || '分析中...'", "dict.loadingTitle")
])

patch_file(f'{base}/src/services/api.js', [
    ("console.error('[API Error] 音訊分析請求失敗:', error);", "console.error('[API Error]', error);"),
    ("console.error(`[API Error] 音訊分析請求失敗:`, error);", "console.error(`[API Error]`, error);"),
    ("console.error(`[API Error] 音訊串流分析請求失敗:`, error);", "console.error(`[API Error]`, error);"),
    ("modelSelection = modelOrOptions.modelSelection ?? 'birdnet';", "modelSelection = modelOrOptions.modelSelection || 'birdnet';"),
    ("modelSelection = modelOrOptions ?? 'birdnet';", "modelSelection = modelOrOptions || 'birdnet';")
])

# For aggregateByVote.js, it uses hardcoded zh/en mapping.
patch_file(f'{base}/src/utils/aggregateByVote.js', [
    ("import { modelLabel } from './modelLabel';", "import { modelLabel } from './modelLabel';\nimport { getDict } from '../i18n';"),
    ("zh: '免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。',\n    en: 'Disclaimer: The AI models on this website only provide analysis and suggestions, not final decisions. We do not guarantee absolute accuracy, nor do we make predictive promises or behavioral guarantees.'", "zh: getDict(lang).voteDisclaimer || '',\n    en: getDict(lang).voteDisclaimer || ''"),
    ("zh: `各片段皆未達 ${thresholdPct}% 信心門檻，無可靠物種辨識總覽。`,\n        en: `No segments reached the ${thresholdPct}% confidence threshold. No reliable species overview available.`", "zh: getDict(lang).voteEmptyOverview?.replace('{threshold}', thresholdPct),\n        en: getDict(lang).voteEmptyOverview?.replace('{threshold}', thresholdPct)"),
    ("zh: '建議重新錄製含清晰鳥鳴的片段，或逐段查看低信心候選與決策輔助說明。',\n        en: 'Consider re-recording a segment with clear bird calls, or examine low-confidence candidates and decision support section by section.'", "zh: getDict(lang).voteEmptySuggestion,\n        en: getDict(lang).voteEmptySuggestion"),
    ("zh: `投票彙整：${nameZh} 在 ${votes}/${validCount} 個分析窗的 Top 預測中出現（整體得票率 ${pct}%）。主要出現於片段 ${windows}。`,\n        en: `Vote summary: ${nameEn} appeared in Top predictions for ${votes}/${validCount} analysis windows (overall vote rate ${pct}%). Mainly in segments ${windows}.`", "zh: getDict(lang).voteResultOverview?.replace('{species}', nameZh).replace('{votes}', votes).replace('{validCount}', validCount).replace('{pct}', pct).replace('{windows}', windows),\n        en: getDict(lang).voteResultOverview?.replace('{species}', nameEn).replace('{votes}', votes).replace('{validCount}', validCount).replace('{pct}', pct).replace('{windows}', windows)"),
    ("zh: '建議以總覽結果為整段錄音的參考；若各片段差異大，請點選時間軸查看分段詳情。',\n        en: 'Use the overview as a reference for the entire recording. If segments vary greatly, click the timeline for details.'", "zh: getDict(lang).voteResultSuggestion,\n        en: getDict(lang).voteResultSuggestion"),
    ("const model = modelName ?? chunks?.[0]?.model_name ?? 'perch';", "const model = modelName || chunks?.[0]?.model_name || 'perch';")
])

patch_file(f'{base}/src/utils/buildFullReportModel.js', [
    ("analysisId: firstOk?.analysis_id ?? chunks[0]?.analysis_id ?? 'report',", "analysisId: firstOk?.analysis_id || chunks[0]?.analysis_id || 'report',")
])

patch_file(f'{base}/src/utils/chunkIdentity.js', [
    ("const model = chunk?.model_name ?? 'chunk';", "const model = chunk?.model_name || 'chunk';")
])

patch_file(f'{base}/src/utils/ChunkVisualizerSection.jsx', [
    ("const modelName = resultChunks?.[0]?.model_name ?? chunk?.model_name ?? 'perch';", "const modelName = resultChunks?.[0]?.model_name || chunk?.model_name || 'perch';")
])

patch_file(f'{base}/src/utils/downloadMetadata.js', [
    ("const base = file.name.replace(/\\.[^/.]+$/, '') || 'recording';", "const base = file.name.replace(/\\.[^/.]+$/, '') || 'recording';")
])

patch_file(f'{base}/src/utils/formatDistanceKm.js', [
    ("export function formatDistanceKm(meters, lang = 'en') {", "import { getDict } from '../i18n';\n\nexport function formatDistanceKm(meters, lang = 'en') {"),
    ("return lang === 'zh' ? `${meters} 公尺` : `${meters} m`;", "return getDict(lang).distanceMeters?.replace('{meters}', meters);"),
    ("return lang === 'zh' ? `${rounded} 公里` : `${rounded} km`;", "return getDict(lang).distanceKm?.replace('{km}', rounded);")
])

patch_file(f'{base}/src/utils/formatPredictionDuration.js', [
    ("export function formatPredictionDuration(seconds, lang = 'en') {", "import { getDict } from '../i18n';\n\nexport function formatPredictionDuration(seconds, lang = 'en') {"),
    ("return lang === 'zh' ? `${label} 秒` : `${label} s`;", "return getDict(lang).durationSeconds?.replace('{s}', label);"),
    ("? `${minutes} 分 ${seconds} 秒`\n      : `${minutes} m ${seconds} s`;", "? getDict(lang).durationMinSec?.replace('{m}', minutes).replace('{s}', seconds)\n      : getDict(lang).durationMinSec?.replace('{m}', minutes).replace('{s}', seconds);")
])

patch_file(f'{base}/src/utils/modelLabel.js', [
    ("const key = String(modelName ?? 'birdnet').toLowerCase();", "const key = String(modelName || 'birdnet').toLowerCase();")
])

patch_file(f'{base}/src/utils/pdf/pdfFonts.js', [
    ("export function pdfFallbackReplace(str, lang) {", "import { getDict } from '../../i18n';\n\nexport function pdfFallbackReplace(str, lang) {"),
    (".replace(/(\\d+)～(\\d+)/g, '$1 至 $2')\n    .replace(/(\\d+)~(\\d+)/g, '$1 至 $2');", ".replace(/(\\d+)～(\\d+)/g, getDict(lang).pdfRangeTo || '$1 至 $2')\n    .replace(/(\\d+)~(\\d+)/g, getDict(lang).pdfRangeTo || '$1 至 $2');")
])

patch_file(f'{base}/src/utils/pdf/pdfLayoutEngine.js', [
    ("? `第 ${i} / ${total} 頁`\n        : `Page ${i} / ${total}`;", "? `Page ${i} / ${total}`\n        : `Page ${i} / ${total}`;")
])

patch_file(f'{base}/src/utils/pdf/pdfQualityCheck.js', [
    ("export function performPdfQualityCheck(pdfDoc, lang = 'en') {", "import { getDict } from '../../i18n';\n\nexport function performPdfQualityCheck(pdfDoc, lang = 'en') {"),
    ("? `第 ${p} 頁內容過少（疑似空白頁）`\n        : `Page ${p} has too little content (possibly blank)`", "? getDict(lang).pdfCheckEmptyPage?.replace('{page}', p)\n        : getDict(lang).pdfCheckEmptyPage?.replace('{page}', p)"),
    ("? `第 ${p} 頁底部可能有 orphan heading`\n        : `Page ${p} might have an orphan heading at the bottom`", "? getDict(lang).pdfCheckOrphanHeading?.replace('{page}', p)\n        : getDict(lang).pdfCheckOrphanHeading?.replace('{page}', p)"),
    ("? 'PDF 無法抽取足夠文字（不可搜尋）'\n      : 'PDF cannot extract enough text (unsearchable)'", "? getDict(lang).pdfCheckUnsearchable\n      : getDict(lang).pdfCheckUnsearchable"),
    ("? `頁數異常：${pageCount} 頁（預期約 ≤ ${allowedMax}）`\n        : `Abnormal page count: ${pageCount} pages (expected ≤ ${allowedMax})`", "? getDict(lang).pdfCheckTooManyPages?.replace('{count}', pageCount).replace('{max}', allowedMax)\n        : getDict(lang).pdfCheckTooManyPages?.replace('{count}', pageCount).replace('{max}', allowedMax)")
])

patch_file(f'{base}/src/utils/pdf/pdfReportBuilder.js', [
    ("const base = (sourceName || 'unknown')", "const base = (sourceName || 'audio')"),
    (".replace(/^_|_$/g, '') || 'unknown';", ".replace(/^_|_$/g, '') || 'audio';")
])

patch_file(f'{base}/src/utils/spectrogramWithLabels.js', [
    ("export function renderSpectrogramWithLabels({", "import { getDict } from '../i18n';\n\nexport function renderSpectrogramWithLabels({"),
    ("const xLabel = lang === 'zh' ? '時間 (秒)' : 'Time (seconds)';", "const dict = getDict(lang);\n  const xLabel = dict.spectrogramXLabel || 'Time (seconds)';"),
    ("const yLabel = lang === 'zh' ? 'Mel 頻率' : 'Mel frequency';", "const yLabel = dict.spectrogramYLabel || 'Mel frequency';"),
    ("ctx.fillText(lang === 'zh' ? '強度' : 'Intensity', legendX, legendY - 2);", "ctx.fillText(dict.spectrogramIntensity || 'Intensity', legendX, legendY - 2);")
])

patch_file(f'{base}/src/utils/timeline/buildTimelineDecisionSupport.js', [
    ("export function buildTimelineDecisionSupport({", "import { getDict } from '../../i18n';\n\nexport function buildTimelineDecisionSupport({"),
    ("zh: '免責聲明：本網站之 AI 模組僅提供分析與行動建議，不作最後決定。本平台不保證辨識結果之絕對正確性，亦不構成預測承諾、最終決策或行為保證。',\n    en: 'Disclaimer: The AI models on this website only provide analysis and suggestions, not final decisions. We do not guarantee absolute accuracy, nor do we make predictive promises or behavioral guarantees.'", "zh: getDict(lang).voteDisclaimer,\n    en: getDict(lang).voteDisclaimer"),
    ("? `於 ${selectedEvent.peakTime}s 偵測到 ${nameZh}（事件信心 ${pct}%）。此事件接近錄音邊界，反卷積覆蓋率可能較低，請謹慎參考。`\n          : `${nameEn} detected at ${selectedEvent.peakTime}s (event confidence ${pct}%). This event is near the recording edge, deconvolution coverage may be lower, please reference cautiously.`", "? getDict(lang).timelineSingleEventEdge?.replace('{species}', nameZh).replace('{time}', selectedEvent.peakTime).replace('{pct}', pct)\n          : getDict(lang).timelineSingleEventEdge?.replace('{species}', nameEn).replace('{time}', selectedEvent.peakTime).replace('{pct}', pct)"),
    (": `於 ${selectedEvent.peakTime}s 偵測到 ${nameZh}，事件信心 ${pct}%（一般事件門檻 ${minPct}%）。此數值顯示該時段有強烈之物種聲學特徵。`;\n        const evtEn = isEdge", ": getDict(lang).timelineSingleEventNormal?.replace('{species}', nameZh).replace('{time}', selectedEvent.peakTime).replace('{pct}', pct).replace('{minPct}', minPct);\n        const evtEn = isEdge"),
    (": `${nameEn} detected at ${selectedEvent.peakTime}s, event confidence ${pct}% (normal threshold ${minPct}%). This indicates strong species acoustic features in this period.`;", ": getDict(lang).timelineSingleEventNormal?.replace('{species}', nameEn).replace('{time}', selectedEvent.peakTime).replace('{pct}', pct).replace('{minPct}', minPct);"),
    ("zh: `此事件落在 ${timeRange} 分析窗。建議對照頻譜圖與 XAI 時間重要性，並以實地觀察或影像作二次確認。`,\n        en: `This event falls in analysis window ${timeRange}. Suggest cross-referencing with spectrogram and XAI temporal importance, and verifying with field observations or images.`", "zh: getDict(lang).timelineSingleEventSuggestion?.replace('{window}', timeRange),\n        en: getDict(lang).timelineSingleEventSuggestion?.replace('{window}', timeRange)"),
    ("zh: `時間軸未偵測到達事件信心門檻（一般事件 ≥${minPct}%、邊界 ≥${boundaryPct}%）的明顯鳴叫事件。`,\n        en: `Timeline detected no distinct vocalization events reaching the confidence threshold (normal ≥${minPct}%, edge ≥${boundaryPct}%).`", "zh: getDict(lang).timelineNoEvents?.replace('{minPct}', minPct).replace('{boundaryPct}', boundaryPct),\n        en: getDict(lang).timelineNoEvents?.replace('{minPct}', minPct).replace('{boundaryPct}', boundaryPct)"),
    ("zh: '建議對照全段頻譜與原始音訊；若預期有鳥鳴，可嘗試在較安靜環境重新錄製或延長錄音時間。',\n        en: 'Suggest reviewing the full spectrogram and original audio. If bird calls were expected, try re-recording in a quieter environment or extending the duration.'", "zh: getDict(lang).timelineNoEventsSuggestion,\n        en: getDict(lang).timelineNoEventsSuggestion"),
    ("zh: `時間軸偵測到 ${events.length} 個物種事件、${speciesCount} 種鳥類；最高事件信心為 ${nameZh}（${pct}%）。`,\n        en: `Timeline detected ${events.length} species events, ${speciesCount} bird species; highest event confidence is ${nameEn} (${pct}%).`", "zh: getDict(lang).timelineMultipleEvents?.replace('{count}', events.length).replace('{speciesCount}', speciesCount).replace('{species}', nameZh).replace('{pct}', pct),\n        en: getDict(lang).timelineMultipleEvents?.replace('{count}', events.length).replace('{speciesCount}', speciesCount).replace('{species}', nameEn).replace('{pct}', pct)"),
    ("zh: '建議以時間軸事件作為整段錄音的參考摘要；點選事件可檢視該時段物種與頻譜。若用於生態調查，請輔以實地觀察或影像確認。',\n        en: 'Suggest using timeline events as a reference summary. Click an event to view species and spectrogram for that period. If used for ecological surveys, supplement with field observations or images.'", "zh: getDict(lang).timelineMultipleEventsSuggestion,\n        en: getDict(lang).timelineMultipleEventsSuggestion")
])

print("Patched source files.")
