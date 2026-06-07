import os
from PIL import Image

def generate_favicons():
    logo_path = 'frontend/public/logo.png'
    if not os.path.exists(logo_path):
        print('Logo not found')
        return

    try:
        img = Image.open(logo_path)
    except Exception as e:
        print('Error opening logo:', e)
        return

    # Generate favicons
    img.resize((16, 16), Image.Resampling.LANCZOS).save('frontend/public/favicon-16x16.png')
    img.resize((32, 32), Image.Resampling.LANCZOS).save('frontend/public/favicon-32x32.png')
    img.resize((180, 180), Image.Resampling.LANCZOS).save('frontend/public/apple-touch-icon.png')
    
    # Generate favicon.ico (contains multiple sizes)
    icon_sizes = [(16,16), (32, 32), (48, 48), (64,64)]
    img.save('frontend/public/favicon.ico', sizes=icon_sizes)
    
    # Generate og-image.png (1200x630)
    # We'll create a dark background #141A1A and center the logo
    og_bg = Image.new('RGB', (1200, 630), '#141A1A')
    # Resize logo to 400x400
    logo_resized = img.resize((400, 400), Image.Resampling.LANCZOS)
    
    # calculate position
    x = (1200 - 400) // 2
    y = (630 - 400) // 2
    
    # If logo has alpha, composite it
    if logo_resized.mode in ('RGBA', 'LA') or (logo_resized.mode == 'P' and 'transparency' in logo_resized.info):
        og_bg.paste(logo_resized, (x, y), logo_resized.convert('RGBA'))
    else:
        og_bg.paste(logo_resized, (x, y))
        
    og_bg.save('frontend/public/og-image.png')
    print('Favicons generated successfully.')

generate_favicons()
