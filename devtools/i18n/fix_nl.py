import re

filepath = 'frontend/src/i18n/locales/nl.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the specific missing keys from nl.js that the translator agent missed
replacements = {
    r"stopRecording:\s*'Stop',": r"stopRecording: 'Stoppen',",
    r"shareTemplateSocial:\s*'\s*🐦 \{topSpecies\} \(\{confidence\}%\)\\n📍 \{tabLabel\}\\n🔬 \{modelLabel\}\\n\\n#BirdID #EchoWing #BirdSound\\n\{url\}\s*',": r"shareTemplateSocial: '🐦 {topSpecies} ({confidence}%)\\n📍 {tabLabel}\\n🔬 {modelLabel}\\n\\n#BirdID #EchoWing #BirdSound\\n{url}',",
    r"privacyNoticeLearnMore:\s*'Privacy details',": r"privacyNoticeLearnMore: 'Privacygegevens',",
    r"guideDisclaimerTitle:\s*'Disclaimer',": r"guideDisclaimerTitle: 'Vrijwaring',",
    r"nearbyRecordsDistance:\s*'~\{distance\}',": r"nearbyRecordsDistance: '~{distance}',",
    r"nearbyRecordsRadiusOption:\s*'\{km\} km',": r"nearbyRecordsRadiusOption: '{km} km',",
    r"googleMapsOpenExternal:\s*'Open in Google Maps',": r"googleMapsOpenExternal: 'Openen in Google Maps',",
    r"pdfApproxSec:\s*'~\{sec\} s',": r"pdfApproxSec: '~{sec} s',",
    r"pdfSampleRate:\s*'Sample rate',": r"pdfSampleRate: 'Samplefrequentie',",
    r"pdfChannelMono:\s*'Mono',": r"pdfChannelMono: 'Mono',",
    r"pdfTimeSec:\s*'\{sec\} s',": r"pdfTimeSec: '{sec} s',",
    r"pdfSegmentTitle:\s*'Segment \{label\} · \{timeRange\}',": r"pdfSegmentTitle: 'Segment {label} · {timeRange}',",
}

for pattern, repl in replacements.items():
    content = re.sub(pattern, repl, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("nl.js fallbacks fixed")
