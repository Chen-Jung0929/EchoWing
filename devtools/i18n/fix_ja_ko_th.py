import os

fixes = {
    'ja': {
        "In in-app browsers (Messenger, Instagram, etc.), recording may be unavailable—upload a file or open in Safari/Chrome instead.": "アプリ内ブラウザ（Messenger、Instagramなど）では録音が利用できない場合があります。代わりにファイルをアップロードするか、Safari/Chromeで開いてください。",
        "The timeline estimates activity from window-level evidence and should be interpreted cautiously.": "タイムラインはウィンドウレベルの証拠からアクティビティを推定するものであり、慎重に解釈する必要があります。"
    },
    'ko': {
        "In in-app browsers (Messenger, Instagram, etc.), recording may be unavailable—upload a file or open in Safari/Chrome instead.": "인앱 브라우저(Messenger, Instagram 등)에서는 녹음이 불가능할 수 있습니다. 대신 파일을 업로드하거나 Safari/Chrome에서 열어주세요.",
        "The timeline estimates activity from window-level evidence and should be interpreted cautiously.": "타임라인은 창 수준의 증거를 기반으로 활동을 추정하므로 신중하게 해석해야 합니다."
    },
    'th': {
        "In in-app browsers (Messenger, Instagram, etc.), recording may be unavailable—upload a file or open in Safari/Chrome instead.": "ในเบราว์เซอร์ในแอป (Messenger, Instagram ฯลฯ) อาจไม่สามารถบันทึกเสียงได้ โปรดอัปโหลดไฟล์หรือเปิดใน Safari/Chrome แทน",
        "The timeline estimates activity from window-level evidence and should be interpreted cautiously.": "ไทม์ไลน์จะประมาณกิจกรรมจากหลักฐานระดับหน้าต่างและควรตีความอย่างระมัดระวัง"
    }
}

base_dir = 'frontend/src/i18n/locales'

for lang, texts in fixes.items():
    file_path = os.path.join(base_dir, f"{lang}.js")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for eng, trans in texts.items():
        content = content.replace(eng, trans)
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed ja, ko, th missing translations.")
