# Run from the repository root after pushing the updated monorepo to main.
# gh auth login
$ErrorActionPreference = 'Stop'
$repo = 'auraxite/RuClaude'
$browser = 'RuClaude-Browser-v1.0.1'
$android = 'RuClaude-Android-source-v1.0.0.zip'

# Build browser assets before publishing.
npm run build
Compress-Archive -Path 'browser/dist/chromium/*' -DestinationPath "$browser-Chromium.zip" -Force
Compress-Archive -Path 'browser/dist/firefox/*' -DestinationPath "$browser-Firefox.zip" -Force

# Android SOURCE ONLY (not installable APK)
Compress-Archive -Path 'android/*' -DestinationPath $android -Force

# Two independent tags pointing at the current main commit.
gh release create browser/v1.0.1 "$browser-Chromium.zip" "$browser-Firefox.zip" --repo $repo --target main --title 'RuClaude Browser v1.0.1' --notes-file 'release-notes/browser-v1.0.1.md' --prerelease
gh release create android/v1.0.0 $android --repo $repo --target main --title 'RuClaude Android v1.0.0' --notes-file 'release-notes/android-v1.0.0.md' --prerelease
