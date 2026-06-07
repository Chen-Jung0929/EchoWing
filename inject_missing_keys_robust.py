import os
import re

locales = {
    'zh': {'notFound': '您尋找的頁面不存在。', 'notAvailable': '無', 'unknownError': '未知的後端錯誤'},
    'en': {'notFound': 'The page you are looking for does not exist.', 'notAvailable': 'N/A', 'unknownError': 'Unknown backend error'},
    'nan': {'notFound': '找不到您要找的頁面。', 'notAvailable': '無', 'unknownError': '未知的後端錯誤'},
    'hak': {'notFound': '找不到您要找的頁面。', 'notAvailable': '無', 'unknownError': '未知的後端錯誤'},
    'lzh': {'notFound': '尋之頁無存。', 'notAvailable': '無', 'unknownError': '未知之後端錯誤'},
    'yue': {'notFound': '您搵嘅頁面唔存在。', 'notAvailable': '無', 'unknownError': '未知嘅後端錯誤'},
    'ja': {'notFound': 'お探しのページは見つかりません。', 'notAvailable': 'N/A', 'unknownError': '不明なバックエンドエラー'},
    'ko': {'notFound': '찾으시는 페이지가 없습니다.', 'notAvailable': '해당 없음', 'unknownError': '알 수 없는 백엔드 오류'},
    'th': {'notFound': 'ไม่พบหน้าที่คุณค้นหา', 'notAvailable': 'ไม่มีข้อมูล', 'unknownError': 'ข้อผิดพลาดแบ็กเอนด์ที่ไม่รู้จัก'},
    'ms': {'notFound': 'Halaman yang anda cari tidak wujud.', 'notAvailable': 'Tiada', 'unknownError': 'Ralat bahagian belakang tidak diketahui'},
    'id': {'notFound': 'Halaman yang Anda cari tidak ada.', 'notAvailable': 'Tidak tersedia', 'unknownError': 'Kesalahan backend tidak diketahui'},
    'hi': {'notFound': 'आप जिस पेज को खोज रहे हैं वह मौजूद नहीं है।', 'notAvailable': 'उपलब्ध नहीं', 'unknownError': 'अज्ञात बैकएंड त्रुटि'},
    'vi': {'notFound': 'Không tìm thấy trang bạn đang tìm.', 'notAvailable': 'Không có', 'unknownError': 'Lỗi backend không xác định'},
    'fil': {'notFound': 'Ang pahinang hinahanap mo ay hindi umiiral.', 'notAvailable': 'Wala', 'unknownError': 'Hindi kilalang backend error'},
    'fr': {'notFound': "La page que vous recherchez n\\'existe pas.", 'notAvailable': 'N/D', 'unknownError': 'Erreur backend inconnue'},
    'es': {'notFound': 'La página que buscas no existe.', 'notAvailable': 'N/D', 'unknownError': 'Error de backend desconocido'},
    'de': {'notFound': 'Die von Ihnen gesuchte Seite existiert nicht.', 'notAvailable': 'N/A', 'unknownError': 'Unbekannter Backend-Fehler'}
}

base_dir = 'frontend/src/i18n/locales'

for lang, keys in locales.items():
    file_path = os.path.join(base_dir, f"{lang}.js")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # fix existing syntax error in fr.js first
        content = content.replace("notFound: 'La page que vous recherchez n'existe pas.',", "")
        content = content.replace("notAvailable: 'N/D',", "")
        content = content.replace("unknownError: 'Erreur backend inconnue',", "")

        if "notFound:" not in content:
            # find "const lang = {" or "const lang={"
            pattern = re.compile(rf"const\s+{lang}\s*=\s*{{")
            new_text = f"\n  notFound: '{keys['notFound']}',\n  notAvailable: '{keys['notAvailable']}',\n  unknownError: '{keys['unknownError']}',"
            
            content = pattern.sub(f"const {lang} = {{{new_text}", content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {lang}.js")
