#!/usr/bin/env bash
# Adds js/core/decor.js to every HTML file in the project, just before </body>.
# Safe to re-run: files that already include decor.js are skipped.
set -euo pipefail

SCRIPT_PATH="js/core/decor.js"

# Build the file list. Exclusions are written out and quoted, so the
# shell cannot expand them against real files.
FILES=()
while IFS= read -r line; do
    FILES+=("$line")
done < <(find . -name "*.html" -not -path "./node_modules/*" -not -path "./.git/*" | sed 's|^\./||' | sort)

added=0
skipped=0

for file in "${FILES[@]}"; do
    if ! grep -q "</body>" "$file"; then
        echo "SKIP  $file (no </body> tag)"
        skipped=$((skipped + 1))
        continue
    fi

    if grep -q "core/decor.js" "$file"; then
        echo "OK    $file (already has decor.js)"
        skipped=$((skipped + 1))
        continue
    fi

    # Count folders deep the file sits, so the path reaches js/ correctly
    dir=$(dirname "$file")
    if [ "$dir" = "." ]; then
        prefix=""
    else
        depth=$(echo "$dir" | awk -F/ '{print NF}')
        prefix=$(printf '../%.0s' $(seq 1 "$depth"))
    fi
    src="${prefix}${SCRIPT_PATH}"

    sed -i "s|</body>|    <script src=\"${src}\"></script>\n</body>|" "$file"
    echo "ADDED $file -> $src"
    added=$((added + 1))
done

echo
echo "Done. Added: $added  Skipped: $skipped"