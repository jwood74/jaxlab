# JaxLab - Copilot Coding Agent Instructions

## Repository Overview

**JaxLab** is a static website hosting interactive tools and visualizations designed to make learning complex concepts fun and accessible. It's inspired by sites like Neal.Fun and is hosted on GitHub Pages at [lab.jaxen.au](https://lab.jaxen.au).

### Repository Type & Size
- **Type**: Static website (HTML, CSS, JavaScript)
- **Size**: ~400KB, 42 files total
- **Languages**: HTML, CSS, JavaScript (vanilla, no frameworks)
- **Target Runtime**: Modern web browsers (Chrome, Firefox, Safari, Edge)
- **No Build System**: This is a static site with no compilation or bundling required

### Key Technologies
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Fonts**: Google Fonts (Inter)
- **Deployment**: GitHub Pages with custom domain (lab.jaxen.au)
- **Data**: CSV files for population data

## Project Structure

```
jaxlab/
├── index.html              # Homepage with tool cards grid
├── CNAME                   # Custom domain configuration: lab.jaxen.au
├── LICENSE                 # GNU General Public License v3.0
├── README.md               # Project documentation
├── css/
│   └── style.css          # Main stylesheet (394 lines) - dark theme, responsive design
├── js/
│   └── main.js            # Core JS (47 lines) - mobile menu functionality
├── data/
│   └── australia_population_20250918.csv  # Population data source
└── tools/
    ├── index.html         # Redirect to homepage
    ├── aus-population/    # Australian Population Viewer tool
    │   ├── index.html     # Tool page
    │   ├── style.css      # Tool-specific styles (442 lines)
    │   └── app.js         # Tool logic (531 lines)
    └── monty-hall/        # Monty Hall Problem Simulator
        ├── index.html     # Tool page
        ├── style.css      # Tool-specific styles (449 lines)
        └── app.js         # Tool logic (539 lines)
```

### Important Files

**Root Level:**
- `index.html`: Main homepage featuring tool cards in a responsive grid layout
- `CNAME`: Contains `lab.jaxen.au` for GitHub Pages custom domain

**Shared Styles:**
- `css/style.css`: Comprehensive stylesheet with CSS custom properties, dark theme, responsive breakpoints at 768px and 480px

**Shared JavaScript:**
- `js/main.js`: Handles mobile menu toggle functionality

**Tools Architecture:**
- Each tool lives in `tools/<tool-name>/` with its own `index.html`, `style.css`, and `app.js`
- Tools import shared CSS from `../../css/style.css` then add tool-specific styles
- Tools maintain consistent header/footer structure with the homepage

## Development & Testing

### Local Development - VERIFIED WORKING

**IMPORTANT**: This is a static site - no build, compilation, or package installation is required.

To run the site locally, use any static file server:

**Option 1 - Python (Recommended):**
```bash
cd /home/runner/work/jaxlab/jaxlab
python3 -m http.server 8000
```
Then visit http://localhost:8000

**Option 2 - Node.js npx serve:**
```bash
cd /home/runner/work/jaxlab/jaxlab
npx serve . -l 8001
```
Note: First run will install `serve` package (takes ~5-10 seconds). Ignore clipboard warnings.

**Option 3 - PHP:**
```bash
cd /home/runner/work/jaxlab/jaxlab
php -S localhost:8000
```

**Available Runtime Versions:**
- Python: 3.12.3
- Node.js: v20.19.6
- npm: 10.8.2

### Validation & Linting

**HTML Validation (htmlhint) - RECOMMENDED:**
```bash
cd /home/runner/work/jaxlab/jaxlab
npx htmlhint index.html
npx htmlhint tools/*/index.html
```
This will check for HTML syntax errors, missing tags, and accessibility issues. Always run this before committing HTML changes.

**JavaScript Linting:**
No ESLint configuration exists. Code follows vanilla JavaScript best practices:
- Use strict mode implicitly (ES6 modules)
- Document functions with JSDoc-style comments
- Use descriptive variable names
- Event listeners with proper cleanup

**CSS Validation:**
No automated CSS linting configured. Follow existing patterns:
- Use CSS custom properties (defined in `:root` in style.css)
- Follow BEM-like naming conventions
- Mobile-first responsive design
- Maintain existing color palette and spacing variables

### Testing Checklist

When making changes, always:
1. **Start a local server** using one of the methods above
2. **Open the site** in a browser at http://localhost:8000
3. **Test on different viewport sizes** (desktop, tablet 768px, mobile 480px)
4. **Validate HTML** with `npx htmlhint` on modified files
5. **Check browser console** for JavaScript errors
6. **Test all interactive elements** (buttons, links, forms, animations)

## Adding New Tools

To add a new tool to JaxLab:

1. **Create tool directory:**
   ```bash
   mkdir -p tools/new-tool-name
   ```

2. **Create tool files:**
   - `tools/new-tool-name/index.html` - Use `tools/monty-hall/index.html` as template
   - `tools/new-tool-name/style.css` - Tool-specific styles
   - `tools/new-tool-name/app.js` - Tool logic

3. **Add tool card to homepage:**
   Edit `index.html` and add a new `.tool-card` in the `.tools-grid` section:
   ```html
   <a href="tools/new-tool-name/" class="tool-card">
       <div class="tool-card-icon">🎯</div>
       <h3>Tool Name</h3>
       <p>Tool description goes here.</p>
   </a>
   ```

4. **Maintain consistency:**
   - Use shared header/footer structure
   - Import `../../css/style.css` before tool-specific CSS
   - Follow mobile-responsive design patterns
   - Use consistent icon style (emoji in gradient box)

## Code Style & Conventions

### HTML
- Semantic HTML5 elements (`<header>`, `<main>`, `<footer>`, `<nav>`)
- ARIA labels for accessibility
- Meta tags for SEO and social sharing
- Consistent indentation (4 spaces)

### CSS
- CSS custom properties for theming (see `:root` in style.css)
- Color palette: Primary (#6366f1), Secondary (#10b981), Background (#0f172a)
- Spacing scale: xs (0.25rem) to 2xl (3rem)
- Transitions: fast (150ms) and normal (250ms)
- Mobile-first responsive design with breakpoints at 768px and 480px

### JavaScript
- Vanilla JavaScript (no frameworks or libraries)
- DOMContentLoaded for initialization
- JSDoc-style function documentation
- Descriptive variable names (camelCase)
- Constants in UPPER_SNAKE_CASE
- Event delegation where appropriate

## Deployment

This site is deployed via **GitHub Pages** to [lab.jaxen.au](https://lab.jaxen.au).

**Deployment Process:**
- Changes pushed to the main branch are automatically deployed
- No CI/CD pipelines or build steps required
- GitHub Pages serves static files directly
- Custom domain configured via `CNAME` file

**Important Notes:**
- Do not modify or delete the `CNAME` file (breaks custom domain)
- All paths should be relative or absolute from root (/)
- Site is publicly accessible immediately after push to main

## Known Issues & Workarounds

### HTML Typo in index.html (Line 84)
There is a known typo in `index.html` at line 84:
```html
<a href="https://lab.jaxen.au"pan class="footer-domain">
```
Should be:
```html
<a href="https://lab.jaxen.au"><span class="footer-domain">
```
This causes htmlhint validation errors but doesn't affect site functionality.

### No .gitignore
The repository doesn't have a `.gitignore` file. Avoid committing:
- `node_modules/` (if npm packages are installed)
- `.DS_Store` (macOS)
- Editor-specific files (.vscode/, .idea/)

## Quick Reference Commands

```bash
# Navigate to repository
cd /home/runner/work/jaxlab/jaxlab

# Start local server
python3 -m http.server 8000

# Validate HTML
npx htmlhint index.html tools/*/index.html

# Check Git status
git --no-pager status

# View file structure
find . -type f -name "*.html" -o -name "*.css" -o -name "*.js" | grep -v ".git"
```

## Trust These Instructions

These instructions have been thoroughly validated by:
- Testing all local development servers
- Running HTML validation tools
- Inspecting all project files and structure
- Verifying deployment configuration
- Testing interactive features in browser

**Only search for additional information if:**
- These instructions are incomplete for your specific task
- You discover information that contradicts these instructions
- You're working with a newly added tool or feature not documented here

When in doubt, start a local server and test your changes in a browser before committing.
