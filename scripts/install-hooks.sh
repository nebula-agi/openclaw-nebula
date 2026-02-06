#!/bin/sh
# Install git hooks

echo "Installing git hooks..."

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
# Auto-format code before commit

echo "Running biome formatter..."
npx @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true .

# Add formatted files back to staging
git add -u

exit 0
EOF

chmod +x .git/hooks/pre-commit

echo "✓ Pre-commit hook installed"
