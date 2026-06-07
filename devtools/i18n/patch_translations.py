import json

translations = {
  "fileTypeUnsupported": {
    "lzh": "不支此檔，請易常見之聲影格式。",
    "th": "ไม่รองรับไฟล์ประเภทนี้ โปรดใช้รูปแบบเสียงหรือวิดีโอทั่วไป",
    "yue": "唔支援呢個檔案格式，請改用常見嘅音訊或者影片格式。"
  },
  "fileTooLarge": {
    "lzh": "檔案過大（極限 20MB）。",
    "th": "ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 20MB)",
    "yue": "檔案太大（上限 20MB）。"
  },
  "orDivider": {
    "lzh": "或",
    "th": "หรือ",
    "yue": "或者"
  },
  "downloadRecording": {
    "lzh": "載其錄音",
    "th": "ดาวน์โหลดการบันทึก",
    "yue": "下載錄音"
  },
  "clearSelectedFile": {
    "lzh": "棄所選之檔",
    "th": "ล้างไฟล์ที่เลือก",
    "yue": "清除揀好嘅檔案"
  },
  "themeSystem": {
    "lzh": "依系統",
    "th": "ตามระบบ",
    "yue": "跟隨系統"
  },
  "noFileWarning": {
    "lzh": "請先擇音聲或影片。",
    "th": "โปรดเลือกไฟล์เสียงหรือวิดีโอก่อน",
    "yue": "請先上載音訊或者影片檔案。"
  },
  "errorTitle": {
    "lzh": "辨識敗矣",
    "th": "การระบุล้มเหลว",
    "yue": "辨識失敗"
  },
  "retryBtn": {
    "lzh": "復納之",
    "th": "อัปโหลดอีกครั้ง",
    "yue": "重新上載"
  },
  "xaiGenerating": {
    "lzh": "方產 XAI...",
    "th": "กำลังสร้าง XAI...",
    "yue": "XAI 產生緊..."
  },
  "xaiGeneratingHint": {
    "lzh": "方計可解之圖，畢則可存、享或載報。",
    "th": "กำลังคำนวณแผนที่ความร้อนคำอธิบาย เมื่อเสร็จแล้วจะสามารถบันทึก แชร์ หรือดาวน์โหลดรายงานได้",
    "yue": "可解釋性熱圖計算緊，完成之後可以儲存、分享或者下載報告。"
  },
  "probability": {
    "lzh": "信度",
    "th": "ความน่าจะเป็น",
    "yue": "信心分數"
  },
  "lowConfidenceTitle": {
    "lzh": "未達 {threshold}% 信檻",
    "th": "ต่ำกว่าเกณฑ์ความมั่นใจ {threshold}%",
    "yue": "未達 {threshold}% 信心門檻"
  },
  "lowConfidenceBody": {
    "lzh": "此段之果未達定檻，僅可為參。",
    "th": "ผลลัพธ์นี้ต่ำกว่าเกณฑ์ โปรดใช้เป็นข้อมูลอ้างอิงเท่านั้น",
    "yue": "呢個片段最高預測分數低過系統門檻，唔列入正式辨識結果。請參考下面候選清單或者重新錄音。"
  },
  "saveResult": {
    "lzh": "存野外備註",
    "th": "บันทึกข้อมูลภาคสนาม",
    "yue": "儲存預測結果"
  },
  "shareResult": {
    "lzh": "享此頁",
    "th": "แชร์หน้านี้",
    "yue": "分享目前分頁"
  },
  "actionsMenuOpen": {
    "lzh": "啟操作",
    "th": "เปิดเมนูการดำเนินการ",
    "yue": "打開操作選單"
  },
  "actionsMenuClose": {
    "lzh": "閉操作",
    "th": "ปิดเมนูการดำเนินการ",
    "yue": "閂咗操作選單"
  },
  "downloadResult": {
    "lzh": "載 PDF 報",
    "th": "ดาวน์โหลดรายงาน PDF",
    "yue": "下載 PDF 報告"
  },
  "guideTitle": {
    "lzh": "指南與模型",
    "th": "คู่มือและโมเดล",
    "yue": "使用說明同模型宣告"
  },
  "guideSubtitle": {
    "lzh": "EchoWing 之用與 AI 模型",
    "th": "วิธีใช้ EchoWing และโมเดล AI",
    "yue": "EchoWing 雀鳥聲音辨識工具操作方式同 AI 模型引用"
  },
  "guideModalClose": {
    "lzh": "閉之",
    "th": "ปิด",
    "yue": "閂咗"
  },
  "guideUsageTitle": {
    "lzh": "用法",
    "th": "วิธีใช้",
    "yue": "使用方法"
  },
  "guideUsageSteps": {
    "lzh": [
      "納音或影片，或於瀏覽器錄之（五至三十秒）。",
      "擇其模型，點『析而辨之』。",
      "觀預測、頻譜、XAI 及時間軸。",
      "可書野外備註並存之。"
    ],
    "th": [
      "อัปโหลดเสียงหรือวิดีโอ หรือบันทึกในเบราว์เซอร์ (5 ถึง 30 วินาที)",
      "เลือกโมเดลและคลิก 'วิเคราะห์และระบุชนิด'",
      "ดูการคาดการณ์ สเปกโตรแกรม XAI และไทม์ไลน์",
      "บันทึกข้อมูลภาคสนามหากจำเป็น"
    ],
    "yue": [
      "上載音訊或者影片，或者用瀏覽器錄音（最少 5 秒，最多 30 秒，上限 20MB）。",
      "揀辨識模型（Perch、BirdNET 或者 SILIC），撳「開始處理同辨識」。",
      "睇總覽投票結果同各個分析窗嘅物種預測、頻譜同 XAI 熱圖。",
      "填寫田野觀察紀錄之後撳「確認儲存」，會一齊寫入 PDF 同步去 Google 試算表（如果已經設定好）。",
      "用 Messenger、Instagram 等 App 內置瀏覽器開嗰陣，錄音功能可能會受限制，請改用上載或者用出面嘅瀏覽器開。"
    ]
  },
  "guideModelsTitle": {
    "lzh": "模型引用",
    "th": "โมเดลที่อ้างอิง",
    "yue": "模型引用"
  },
  "guideModels": {
    "lzh": [
      {
        "name": "Perch v2 (Google)",
        "window": "五秒",
        "type": "通用鳥音模型",
        "source": "Google Research",
        "link": "https://github.com/google-research/perch",
        "citation": "Google 所造，可辨百鳥之聲。"
      },
      {
        "name": "BirdNET v2.4",
        "window": "三秒",
        "type": "鳥類分類模型",
        "source": "Cornell Lab of Ornithology",
        "link": "https://birdnet.cornell.edu/",
        "citation": "Cornell 之模型，以三秒推斷。"
      },
      {
        "name": "SILIC",
        "window": "五秒",
        "type": "專案模型",
        "source": "Academia Sinica",
        "citation": "中研院所造，五秒一窗。"
      }
    ],
    "th": [
      {
        "name": "Perch v2 (Google)",
        "window": "5 วินาที",
        "type": "โมเดลเสียงนกทั่วไป",
        "source": "Google Research",
        "link": "https://github.com/google-research/perch",
        "citation": "โมเดลการฝังเสียงนกของ Google สำหรับใช้ในงานวิจัย"
      },
      {
        "name": "BirdNET v2.4",
        "window": "3 วินาที",
        "type": "โมเดลแยกประเภทเสียงนก",
        "source": "Cornell Lab of Ornithology",
        "link": "https://birdnet.cornell.edu/",
        "citation": "ตัวแยกประเภทเสียงของ Cornell Lab ใช้หน้าต่างวิเคราะห์ 3 วินาที"
      },
      {
        "name": "SILIC",
        "window": "5 วินาที",
        "type": "โมเดลการทดลอง",
        "source": "Academia Sinica",
        "citation": "โมเดลเสียงนกของ Academia Sinica ใช้หน้าต่าง 5 วินาที"
      }
    ],
    "yue": [
      {
        "name": "Perch v2 (Google)",
        "window": "5 秒",
        "type": "通用鳥類聲學模型",
        "source": "Google Research",
        "link": "https://github.com/google-research/perch",
        "citation": "Google 開發嘅鳥類聲學 embedding 模型。呢個 App 會透過 SavedModel 進行 CPU 推論。"
      },
      {
        "name": "BirdNET v2.4 (Cornell Lab of Ornithology)",
        "window": "3 秒",
        "type": "鳥類聲學分類模型",
        "source": "Cornell Lab of Ornithology",
        "link": "https://birdnet.cornell.edu/",
        "citation": "Cornell 鳥類學實驗室嘅 TFLite 聲學分類模型，用 3 秒分析窗推論，再同信心門檻比較。"
      },
      {
        "name": "SILIC (Academia Sinica)",
        "window": "5 秒",
        "type": "實驗性／專案特定模型",
        "source": "Academia Sinica",
        "citation": "中央研究院團隊開發嘅鳥類聲學辨識模型，用 5 秒分析窗推論。"
      }
    ]
  },
  "guideModelsComparison": {
    "lzh": "諸模型之窗長與類別各異，未可直較其高下。",
    "th": "โมเดลแต่ละตัวใช้หน้าต่างวิเคราะห์และการให้คะแนนที่ต่างกัน ผลลัพธ์อาจไม่สามารถเปรียบเทียบกันได้โดยตรง",
    "yue": "各個模型嘅分析窗、標籤空間同分數校準方式唔同，模型輸出未必可以直接互相比較。"
  },
  "guideModelWindow": {
    "lzh": "析窗",
    "th": "หน้าต่างวิเคราะห์",
    "yue": "分析窗"
  },
  "guideModelType": {
    "lzh": "模型類別",
    "th": "ประเภทโมเดล",
    "yue": "模型類型"
  },
  "guideModelSource": {
    "lzh": "所出",
    "th": "แหล่งที่มา",
    "yue": "來源"
  },
  "guideModelExternalLink": {
    "lzh": "外連",
    "th": "ลิงก์ภายนอก",
    "yue": "外部模型頁面"
  },
  "guideHowTitle": {
    "lzh": "其理為何",
    "th": "การทำงาน",
    "yue": "EchoWing 點樣運作"
  },
  "guideHowSteps": {
    "lzh": [
      "納音聲於瀏覽器，或自錄之。",
      "傳至後端以析。",
      "解為 mono 32 kHz，並依模型切窗。",
      "先推斷物種，後作 XAI。",
      "XAI 示模型之重，非真鳥之聲。",
      "時軸依窗證估算，當慎觀之。"
    ],
    "th": [
      "อัปโหลดหรือบันทึกเสียงในเบราว์เซอร์",
      "ส่งไฟล์ไปส่วนหลังเพื่อวิเคราะห์",
      "แปลงเสียงเป็น mono 32 kHz และแบ่งตามหน้าต่างวิเคราะห์ของโมเดล",
      "ทำนายชนิดและสร้าง XAI แผนที่ความร้อน",
      "XAI แสดงความอ่อนไหวของโมเดล ไม่ได้รับประกันตำแหน่งที่แท้จริง",
      "ไทม์ไลน์เป็นเพียงการประมาณกิจกรรม ควรตีความด้วยความระมัดระวัง"
    ],
    "yue": [
      "用家上載音訊／影片，或者直接喺瀏覽器入面錄音。",
      "瀏覽器會將檔案送去後端進行分析。",
      "後端將音訊解碼做 mono 32 kHz，再跟模型切成唔同長度嘅分析窗。",
      "揀好嘅模型先幫每個分析窗預測候選物種，再串流送返初步結果。",
      "初步預測之後先會產生 XAI 熱圖；XAI 代表模型敏感度，唔係保證正確嘅生物學真相。",
      "時間軸由分析窗證據估算活動曲線，要小心理解。"
    ]
  },
  "guideCreditsTitle": {
    "lzh": "誌謝",
    "th": "เครดิต",
    "yue": "鳴謝／課程背景"
  },
  "guideCreditsBody": {
    "lzh": "此乃臺大 114-2 Web App Development 課程之作，非官方之用。",
    "th": "EchoWing เป็นโปรเจกต์ของรายวิชา NTU 114-2 Web App Development ไม่ใช่บริการอย่างเป็นทางการ",
    "yue": "EchoWing 係國立臺灣大學 114-2 Web App Development 課程專案，唔係臺大官方服務。團隊／專案成員資訊：確認咗之後會再補充。"
  },
  "privacyNoticeReopen": {
    "lzh": "復啟隱私之示",
    "th": "เปิดหน้าความเป็นส่วนตัวอีกครั้ง",
    "yue": "重新顯示私隱提示"
  },
  "guideDisclaimerTitle": {
    "lzh": "免責",
    "th": "ข้อจำกัดความรับผิดชอบ",
    "yue": "免責同使用宣告"
  },
  "guideDisclaimerBody": {
    "lzh": "AI 之果僅為輔助，實不可盡信。請以實地觀察為準。",
    "th": "AI ให้คำแนะนำและการวิเคราะห์เท่านั้น ไม่ได้รับประกันความถูกต้อง โปรดอ้างอิงจากการสังเกตด้วยตนเอง",
    "yue": "呢個網站嘅 AI 模組只會提供分析同行動建議，唔會做最終決定。本平台唔保證辨識結果一定正確。田野紀錄同試算表同步內容由用家自己填寫，請以實地觀察為準。"
  },
  "nearbyRecordsBtn": {
    "lzh": "近旁所紀",
    "th": "บันทึกใกล้เคียง",
    "yue": "附近紀錄"
  },
  "audioFormatUnknown": {
    "lzh": "未明",
    "th": "ไม่ทราบ",
    "yue": "未知"
  }
}

import os
with open('translations.json', 'r', encoding='utf-8') as f:
    orig = json.load(f)

for key, val in translations.items():
    if key not in orig:
        orig[key] = val

with open('translations.json', 'w', encoding='utf-8') as f:
    json.dump(orig, f, ensure_ascii=False, indent=2)

print("translations.json updated.")
