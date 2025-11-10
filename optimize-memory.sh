#!/bin/bash
# Memory Optimization Script for Cloud Deployment
# Run this before deploying to reduce memory footprint

echo "🚀 Starting memory optimization for cloud deployment..."

# 1. Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force

# 2. Remove dev dependencies 
echo "🗑️ Removing development dependencies..."
npm prune --production

# 3. Remove unnecessary files from node_modules
echo "🧹 Cleaning unnecessary files from dependencies..."

# Remove documentation and example files
find node_modules -name "*.md" -delete
find node_modules -name "CHANGELOG*" -delete
find node_modules -name "README*" -delete
find node_modules -name "LICENSE*" -delete
find node_modules -name "*.txt" -delete
find node_modules -name "example*" -delete
find node_modules -name "demo*" -delete
find node_modules -name "test*" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name "tests*" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name "__tests__*" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name "spec*" -type d -exec rm -rf {} + 2>/dev/null

# Remove source maps and TypeScript files
find node_modules -name "*.map" -delete
find node_modules -name "*.ts" -not -name "*.d.ts" -delete

# Remove coverage and build artifacts
find node_modules -name "coverage*" -type d -exec rm -rf {} + 2>/dev/null
find node_modules -name ".nyc_output*" -type d -exec rm -rf {} + 2>/dev/null

# 4. Compress images in dependencies if any
echo "🖼️ Optimizing images..."
find node_modules -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" | head -20 | while read img; do
    # Only compress if file is larger than 10KB
    if [ $(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null) -gt 10240 ]; then
        echo "Compressing: $img"
        # Use built-in compression tools if available
        gzip -9 "$img" 2>/dev/null && mv "$img.gz" "$img" 2>/dev/null || true
    fi
done

echo "✅ Memory optimization complete!"
echo "📊 Current node_modules size:"
du -sh node_modules/

echo "💡 Additional recommendations:"
echo "   - Set NODE_ENV=production"
echo "   - Use --only=production in npm install"
echo "   - Consider using Alpine Linux base image"
echo "   - Enable gzip compression in Express"