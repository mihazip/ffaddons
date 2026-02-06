#!/bin/bash
set -euo pipefail

# Tab Snooze addon upgrade script
# Bumps version, creates zip, and optionally signs/submits to AMO

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"
ADDON_NAME="tab-snooze"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [patch|minor|major|VERSION] [--sign] [--lint] [--run]"
    echo ""
    echo "  patch         Bump patch version (default): 1.5.2 -> 1.5.3"
    echo "  minor         Bump minor version: 1.5.2 -> 1.6.0"
    echo "  major         Bump major version: 1.5.2 -> 2.0.0"
    echo "  X.Y.Z         Set explicit version"
    echo ""
    echo "Options:"
    echo "  --lint        Run web-ext lint before packaging"
    echo "  --run         Launch Firefox with the addon loaded for testing"
    echo "  --sign        Sign and submit to AMO (requires API keys)"
    echo "                Set AMO_JWT_ISSUER and AMO_JWT_SECRET env vars"
    echo ""
    echo "Examples:"
    echo "  $0              # Bump patch, create zip"
    echo "  $0 minor        # Bump minor, create zip"
    echo "  $0 --lint       # Bump patch, lint, create zip"
    echo "  $0 1.6.0 --sign # Set version to 1.6.0, create zip, submit to AMO"
    exit 1
}

# Parse current version from manifest
get_version() {
    grep '"version"' "$MANIFEST" | sed 's/.*"\([0-9][0-9.]*\)".*/\1/'
}

# Bump version
bump_version() {
    local current="$1"
    local bump_type="$2"

    IFS='.' read -r major minor patch <<< "$current"

    case "$bump_type" in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "$major.$((minor + 1)).0" ;;
        patch) echo "$major.$minor.$((patch + 1))" ;;
        *) echo "$bump_type" ;;  # Explicit version
    esac
}

# Update manifest version
set_version() {
    local new_version="$1"
    sed -i "s/\"version\": \"[0-9][0-9.]*\"/\"version\": \"$new_version\"/" "$MANIFEST"
}

# Main
BUMP_TYPE="patch"
DO_LINT=false
DO_RUN=false
DO_SIGN=false

for arg in "$@"; do
    case "$arg" in
        --lint) DO_LINT=true ;;
        --run) DO_RUN=true ;;
        --sign) DO_SIGN=true ;;
        --help|-h) usage ;;
        patch|minor|major) BUMP_TYPE="$arg" ;;
        [0-9]*) BUMP_TYPE="$arg" ;;
        *) echo -e "${RED}Unknown argument: $arg${NC}"; usage ;;
    esac
done

OLD_VERSION=$(get_version)
NEW_VERSION=$(bump_version "$OLD_VERSION" "$BUMP_TYPE")

echo -e "${BLUE}=== Tab Snooze Upgrade ===${NC}"
echo -e "Version: ${YELLOW}$OLD_VERSION${NC} -> ${GREEN}$NEW_VERSION${NC}"
echo ""

# Update version in manifest
set_version "$NEW_VERSION"
echo -e "${GREEN}✓${NC} Updated manifest.json version to $NEW_VERSION"

# Lint with web-ext
if $DO_LINT; then
    echo -e "\n${BLUE}Running web-ext lint...${NC}"
    npx web-ext lint --source-dir "$SCRIPT_DIR" --warnings-as-errors || {
        echo -e "${RED}Lint failed! Fix issues before packaging.${NC}"
        # Revert version on failure
        set_version "$OLD_VERSION"
        exit 1
    }
    echo -e "${GREEN}✓${NC} Lint passed"
fi

# Create zip
ZIP_FILE="$SCRIPT_DIR/../${ADDON_NAME}-${NEW_VERSION}.zip"
# Remove old zip if it exists
rm -f "$ZIP_FILE"

# Package only addon files (exclude dev files)
cd "$SCRIPT_DIR"
zip -r "$ZIP_FILE" \
    manifest.json \
    background.js \
    popup.html popup.js \
    options.html options.js \
    snoozed.html snoozed.js \
    styles.css \
    icons/moon-16.png icons/moon-32.png icons/moon-48.png icons/moon-128.png \
    -x "*.DS_Store" "*.swp"

ZIP_ABS="$(cd "$(dirname "$ZIP_FILE")" && pwd)/$(basename "$ZIP_FILE")"
echo -e "${GREEN}✓${NC} Created $ZIP_ABS"

# Show zip contents
echo -e "\n${BLUE}Zip contents:${NC}"
unzip -l "$ZIP_FILE" | tail -n +4 | head -n -2

# Sign and submit to AMO
if $DO_SIGN; then
    if [[ -z "${AMO_JWT_ISSUER:-}" || -z "${AMO_JWT_SECRET:-}" ]]; then
        echo -e "\n${RED}Error: AMO_JWT_ISSUER and AMO_JWT_SECRET must be set${NC}"
        echo "Get your API keys at: https://addons.mozilla.org/en-US/developers/addon/api/key/"
        exit 1
    fi
    echo -e "\n${BLUE}Submitting to AMO for signing...${NC}"
    npx web-ext sign \
        --source-dir "$SCRIPT_DIR" \
        --api-key "$AMO_JWT_ISSUER" \
        --api-secret "$AMO_JWT_SECRET" \
        --channel unlisted
    echo -e "${GREEN}✓${NC} Submitted to AMO"
fi

# Run in Firefox for testing
if $DO_RUN; then
    echo -e "\n${BLUE}Launching Firefox with addon loaded...${NC}"
    npx web-ext run --source-dir "$SCRIPT_DIR" --browser-console
fi

echo -e "\n${GREEN}=== Done! ===${NC}"
echo -e "Version ${GREEN}$NEW_VERSION${NC} is ready."
echo ""
echo -e "To install manually in Firefox:"
echo -e "  1. Open ${YELLOW}about:debugging#/runtime/this-firefox${NC}"
echo -e "  2. Click 'Load Temporary Add-on...'"
echo -e "  3. Select ${YELLOW}$ZIP_ABS${NC}"
echo ""
echo -e "Or use: ${YELLOW}$0 --run${NC} to auto-load in Firefox"
