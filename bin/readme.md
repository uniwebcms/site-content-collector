For package usage instructions, it's best to cover both npm and yarn approaches. Here's how we should instruct users:

1. **Global Installation (recommended for frequent use)**:

```bash
# Using npm
npm install -g @uniwebcms/dev-toolkit

# Using yarn
yarn global add @uniwebcms/dev-toolkit

# Then use anywhere
uniweb create site
```

2. **One-off Usage (without installing)**:

```bash
# Using npx
npx @uniwebcms/dev-toolkit create site

# Using yarn
yarn dlx @uniwebcms/dev-toolkit create site
```

3. **Project-level Installation**:

```bash
# Using npm
npm install --save-dev @uniwebcms/dev-toolkit

# Using yarn
yarn add -D @uniwebcms/dev-toolkit

# Then use via package.json scripts or npx/yarn locally
```
