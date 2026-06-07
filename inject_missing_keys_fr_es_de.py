import os
import re

locales = {
    'fr': {'notFound': "La page que vous recherchez n'existe pas.", 'notAvailable': 'N/D', 'unknownError': 'Erreur backend inconnue'},
    'es': {'notFound': 'La página que buscas no existe.', 'notAvailable': 'N/D', 'unknownError': 'Error de backend desconocido'},
    'de': {'notFound': 'Die von Ihnen gesuchte Seite existiert nicht.', 'notAvailable': 'N/A', 'unknownError': 'Unbekannter Backend-Fehler'}
}

base_dir = 'frontend/src/i18n/locales'

for lang, keys in locales.items():
    file_path = os.path.join(base_dir, f"{lang}.js")
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if "notFound:" not in content:
            new_text = f"  notFound: '{keys['notFound']}',\n  notAvailable: '{keys['notAvailable']}',\n  unknownError: '{keys['unknownError']}',\n"
            content = re.sub(r'(subtitle:\s*["\'][^"\']*["\'],)', r'\1\n' + new_text, content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {lang}.js")
