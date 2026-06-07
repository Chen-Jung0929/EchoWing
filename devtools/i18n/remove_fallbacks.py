import re

def replace_in_file(filepath, pattern, replacement):
    with open(filepath, 'r', encoding='utf-8') as file:
        content = file.read()
    content = re.sub(pattern, replacement, content)
    with open(filepath, 'w', encoding='utf-8') as file:
        file.write(content)

# ErrorPage.jsx
replace_in_file('frontend/src/pages/ErrorPage.jsx', r"dict\.errorTitle \|\| '發生錯誤'", "dict.errorTitle")

# LandingPage.jsx
replace_in_file('frontend/src/pages/LandingPage.jsx', r"dict\.title \|\| 'AI 鳥音辨識'", "dict.title")

# LoadingPage.jsx
replace_in_file('frontend/src/pages/LoadingPage.jsx', r"dict\.loadingTitle \|\| '載入中\.\.\.'", "dict.loadingText")

# NotFoundPage.jsx
replace_in_file('frontend/src/pages/NotFoundPage.jsx', r"dict\.notFound \|\| 'The page you are looking for does not exist\.'", "dict.notFound")
replace_in_file('frontend/src/pages/NotFoundPage.jsx', r"dict\.xaiEducation\?\.backToHome \|\| 'Back to Home'", "dict.xaiEducation?.backToHome")

# ResultPage.jsx
replace_in_file('frontend/src/pages/ResultPage.jsx', r"dict\.resultTitle \|\| '辨識結果'", "dict.resultTitle")

# XaiEducationPage.jsx
replace_in_file('frontend/src/pages/XaiEducationPage/XaiEducationPage.jsx', r'xaiDict\.title \|\| "How EchoWing Works - Explainable AI for Bird Sound Recognition"', "xaiDict.title")
replace_in_file('frontend/src/pages/XaiEducationPage/XaiEducationPage.jsx', r'xaiDict\.subtitle \|\| "Learn how EchoWing uses deep learning and explainable AI to identify bird species from audio recordings\."', "xaiDict.subtitle")

# Animations
replace_in_file('frontend/src/pages/XaiEducationPage/animations/AudioToSpectrogramAnimation.jsx', r"dict\?\.xaiEducation\?\.animations\?\.audioToSpec \|\| 'Audio waves are mapped into time-frequency cells\.'", "dict?.xaiEducation?.animations?.audioToSpec")
replace_in_file('frontend/src/pages/XaiEducationPage/animations/DeconvolutionAnimation.jsx', r"dict\?\.xaiEducation\?\.animations\?\.deconvolution \|\| 'Overlapping window scores project downwards to form a continuous activity curve\.'", "dict?.xaiEducation?.animations?.deconvolution")
replace_in_file('frontend/src/pages/XaiEducationPage/animations/OcclusionXaiAnimation.jsx', r"dict\.xaiEducation\?\.animations\?\.confidence \|\| 'Confidence'", "dict.xaiEducation?.animations?.confidence")
replace_in_file('frontend/src/pages/XaiEducationPage/animations/OcclusionXaiAnimation.jsx', r"dict\?\.xaiEducation\?\.animations\?\.occlusion \|\| 'Masking an important audio segment causes the confidence to drop\.'", "dict?.xaiEducation?.animations?.occlusion")
replace_in_file('frontend/src/pages/XaiEducationPage/animations/SlidingWindowAnimation.jsx', r"dict\?\.xaiEducation\?\.animations\?\.slidingWindow \|\| 'Each window receives its own species score\.'", "dict?.xaiEducation?.animations?.slidingWindow")

# useAudioAnalysis.js
replace_in_file('frontend/src/hooks/useAudioAnalysis.js', r"dict\.fileTooLarge \|\| 'File too large \(max 20MB\)'", "dict.fileTooLarge")
replace_in_file('frontend/src/hooks/useAudioAnalysis.js', r"dict\.fileTooLong \|\| 'File too long \(max 30 seconds\)'", "dict.fileTooLong")
replace_in_file('frontend/src/hooks/useAudioAnalysis.js', r"backendError\.message \|\| 'Unknown backend error'", "backendError.message || dict.unknownError")
replace_in_file('frontend/src/hooks/useAudioAnalysis.js', r"mockError\.message \|\| 'Backend and mock fallback both failed\.'", "mockError.message || dict.unknownError")

# NearbyRecordsModal.jsx
replace_in_file('frontend/src/components/NearbyRecordsModal/NearbyRecordsModal.jsx', r"\|\| '無'", "|| dict.notAvailable")

# pdfReportBuilder.js
replace_in_file('frontend/src/utils/pdf/pdfReportBuilder.js', r"\|\| 'unknown'", "|| dict.notAvailable")
replace_in_file('frontend/src/utils/pdf/pdfReportBuilder.js', r"\|\| '無'", "|| dict.notAvailable")

# buildTimelineDecisionSupport.js
replace_in_file('frontend/src/utils/timeline/buildTimelineDecisionSupport.js', r"\?\? '無'", "?? '-'")

# SpectrogramView.jsx
replace_in_file('frontend/src/components/Visualizer/SpectrogramView.jsx', r"\?\? 'Close enlarged view'", "")
replace_in_file('frontend/src/components/Visualizer/SpectrogramView.jsx', r"\?\? 'View spectrogram larger'", "")

# Visualizer.jsx
replace_in_file('frontend/src/components/Visualizer/Visualizer.jsx', r"\?\? 'Attention Weights'", "")

print("Fallback strings removed.")
