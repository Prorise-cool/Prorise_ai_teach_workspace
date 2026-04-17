#!/bin/bash
FILE="packages/student-web/src/features/video/styles/partials/_video-input-card.scss"

# xm-video-input__card-config-chip--accent
sed -i '' 's/background:[[:space:]]*linear-gradient(135deg, color-mix(in srgb, var(--xm-color-brand-500) 18%, transparent), transparent 70%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 92%, transparent);/background: color-mix(in srgb, var(--xm-color-brand-500) 12%, var(--xm-color-surface));/g' $FILE

# xm-video-input__card-tool-btn.is-active
sed -i '' 's/background:[[:space:]]*linear-gradient(135deg, color-mix(in srgb, var(--xm-color-brand-500) 14%, transparent), transparent 70%),[[:space:]]*color-mix(in srgb, var(--xm-color-secondary) 72%, var(--xm-color-surface));/background: color-mix(in srgb, var(--xm-color-brand-500) 10%, var(--xm-color-secondary));/g' $FILE

# xm-video-input__preset-popover
sed -i '' 's/background:[[:space:]]*linear-gradient(180deg, color-mix(in srgb, var(--xm-color-brand-500) 8%, transparent), transparent 38%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 96%, transparent);/background: color-mix(in srgb, var(--xm-color-surface) 96%, transparent);/g' $FILE

# xm-video-input__preset-option:hover
sed -i '' 's/background:[[:space:]]*linear-gradient(135deg, color-mix(in srgb, var(--xm-color-brand-500) 10%, transparent), transparent 65%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 92%, transparent);/background: color-mix(in srgb, var(--xm-color-brand-500) 6%, var(--xm-color-surface));/g' $FILE

# xm-video-input__preset-option.is-active
sed -i '' 's/background:[[:space:]]*linear-gradient(135deg, color-mix(in srgb, var(--xm-color-brand-500) 16%, transparent), transparent 62%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 96%, transparent);/background: color-mix(in srgb, var(--xm-color-brand-500) 12%, var(--xm-color-surface));/g' $FILE

# xm-video-input__advanced-dialog
sed -i '' 's/background:[[:space:]]*linear-gradient(180deg, rgba(245, 197, 71, 0.08), transparent 20%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 94%, white 6%);/background: color-mix(in srgb, var(--xm-color-surface) 94%, white 6%);/g' $FILE

# xm-video-input__advanced-choice.is-active
sed -i '' 's/background:[[:space:]]*linear-gradient(135deg, color-mix(in srgb, var(--xm-color-brand-500) 16%, transparent), transparent 75%),[[:space:]]*color-mix(in srgb, var(--xm-color-surface) 96%, transparent);/background: color-mix(in srgb, var(--xm-color-brand-500) 12%, var(--xm-color-surface));/g' $FILE

echo "Done"
