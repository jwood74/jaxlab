# JaxLabs 🧪

A collection of interactive tools, visualisations, and widgets designed to help you understand complex concepts in a fun and engaging way.

**Live Site:** [labs.jaxen.au](https://labs.jaxen.au)

## About

JaxLabs is inspired by sites like Neal.Fun, offering a curated collection of interactive tools and visualisations. Each tool is designed to make learning and exploring complex topics enjoyable and accessible.

## Project Structure

```
jaxlab/
├── index.html          # Main homepage
├── css/
│   └── style.css       # Main stylesheet with responsive design
├── js/
│   └── main.js         # Core JavaScript functionality
├── tools/
│   └── placeholder/    # First tool (coming soon)
│       └── index.html
├── README.md
└── LICENSE
```

## Features

- **Mobile Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI** - Clean, dark theme with smooth animations and transitions
- **Accessible** - Built with accessibility in mind (ARIA labels, semantic HTML)
- **Fast Loading** - Minimal dependencies, optimized for performance

## Development

### Local Development

To run the site locally, you can use any static file server. For example:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Adding New Tools

1. Create a new folder in `tools/` with your tool name
2. Add an `index.html` file (use `tools/placeholder/index.html` as a template)
3. Add a card to the main `index.html` linking to your new tool
4. Add any tool-specific CSS/JS files as needed

## Deployment

This site is hosted on GitHub Pages and accessible at [labs.jaxen.au](https://labs.jaxen.au).

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
