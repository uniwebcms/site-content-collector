# Uniweb CLI Documentation

The Uniweb CLI (`@uniwebcms/dev-toolkit`) is a command-line tool for creating and managing Uniweb sites, modules, and components. It provides a comprehensive set of commands to streamline your development workflow.

## Installation

You can install the Uniweb CLI in several ways:

### Project Installation (Recommended)

Add the CLI to your project's development dependencies:

```bash
# Using npm
npm install --save-dev @uniwebcms/dev-toolkit

# Using yarn
yarn add -D @uniwebcms/dev-toolkit
```

Then add this script to your `package.json`:

```json
{
  "scripts": {
    "uniweb": "uniweb",
    "dev:site": "uniweb dev",
    "build:site": "uniweb build site",
    "build:module": "uniweb build module",
    "new:component": "uniweb create component"
  }
}
```

Now you can run commands using:

```bash
# npm
npm run uniweb <command>

# yarn
yarn uniweb <command>
```

### Global Installation

If you prefer, you can install the CLI globally:

```bash
# Using npm
npm install -g @uniwebcms/dev-toolkit

# Using yarn
yarn global add @uniwebcms/dev-toolkit
```

Then use the `uniweb` command directly:

```bash
uniweb <command>
```

### One-off Usage

For one-off commands without installation:

```bash
# Using npx
npx @uniwebcms/dev-toolkit <command>

# Using yarn
yarn dlx @uniwebcms/dev-toolkit <command>
```

## Basic Commands

### Creating Resources

Create new sites, modules, or components:

```bash
# Create a new site
uniweb create site [name] [--template <template>]

# Create a new module
uniweb create module [name] [--template <template>]

# Create a new component
uniweb create component --name MyComponent [options]
```

Component creation options:

- `--module <moduleName>`: Target module (defaults to most recent)
- `--type <type>`: section, block, or element (default: section)
- `--export`: Make component exportable
- `--shared`: Create in shared folder
- `--description <text>`: Brief component description
- `--parameters <params>`: Initial parameters (format: "align:string,items:number")

### Development

Start the development server:

```bash
# Start dev server for all sites
uniweb dev [--port <number>]

# Start dev server for specific site
uniweb dev --site MySite [--port <number>]
```

### Building

Build sites or modules:

```bash
# Build a site
uniweb build site [--name <siteName>] [--production]

# Build a module
uniweb build module [--name <moduleName>] [--production]
```

### Using Modules

Link modules to sites:

```bash
# Use a local module
uniweb use module --name MyModule --for MySite

# Use a remote module
uniweb use module --url https://example.com/module.js --for MySite
```

### Content Collection

Collect and process site content:

```bash
uniweb collect content --source ./pages --output ./dist/content.json [options]
```

Options:

- `--pretty`: Pretty print JSON output
- `--verbose`: Enable verbose logging
- `--require-prefix`: Require numeric prefixes for section files

### Resource Management

List and inspect resources:

```bash
# List resources
uniweb list sites
uniweb list modules [--site <siteName>]
uniweb list components [--module <moduleName>]

# Get resource info
uniweb info site --name MySite
uniweb info module --name MyModule
uniweb info component --name MyComponent --module MyModule

# Remove resources
uniweb remove site --name MySite
uniweb remove module --name MyModule
uniweb remove component --name MyComponent --module MyModule
```

### Validation

Validate resources:

```bash
uniweb validate site --name MySite [--fix]
uniweb validate module --name MyModule [--fix]
```

## Output Structure

By default, all built sites and modules are output to a common `dist` directory with the following structure:

```
dist/
├── sites/
│   ├── site1/
│   └── site2/
└── modules/
    ├── module1/
    └── module2/
```

This structure allows:

- Multiple sites and modules to coexist
- Easy access through relative paths
- Single development server for all resources

## Common Workflows

### Creating a New Site

```bash
# Create the site
npm run uniweb create site my-site

# Add a module
npm run uniweb use module --name my-module --for my-site

# Start development
npm run dev:site
```

### Creating a New Component

```bash
# Create component
npm run uniweb create component \
  --name Hero \
  --module my-module \
  --type section \
  --export \
  --parameters "title:string,layout:string"

# Build the module
npm run build:module
```

### Deploying to Production

```bash
# Build site for production
npm run uniweb build site --name my-site --production

# Build module for production
npm run uniweb build module --name my-module --production
```

## Tips and Best Practices

1. **Naming Conventions**

   - Use kebab-case for site and module names
   - Use PascalCase for component names

2. **Development**

   - Use the dev server's hot reloading for faster development
   - Take advantage of the `--verbose` flag when debugging

3. **Organization**

   - Keep related components in the same module
   - Use the shared components feature for common elements

4. **Production**
   - Always use the `--production` flag for production builds
   - Validate resources before deployment

## Troubleshooting

If you encounter issues:

1. Use the `--verbose` flag for more detailed error messages
2. Check that all required dependencies are installed
3. Verify your project structure matches the expected format
4. Use the validation commands to check for common issues

For more help, check our [documentation](https://link-to-docs) or [report an issue](https://github.com/uniweb/issues).
