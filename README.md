# Cobertura Viewer

Interactive Visualization Tool for Code Coverage Reports

Cobertura Viewer is a modern, responsive web application for visualizing and analyzing Cobertura XML code coverage reports. Built with Angular, this tool helps development teams gain insights into their test coverage, identify underperforming areas, and improve code quality.

![Cobertura Viewer](https://via.placeholder.com/800x450)

## Features

- **Interactive Coverage Visualization:** View coverage data through intuitive charts and graphs.
- **Code Analysis:** Inspect line-by-line coverage with syntax highlighting.
- **Risk Assessment:** Identify high-risk areas in your codebase.
- **Detailed Statistics:** Get comprehensive metrics on line, branch, and method coverage.
- **GitHub Integration:** Authenticate with GitHub to save and share reports.
- **Responsive Design:** Works on desktop and mobile devices.
- **Light/Dark Theme:** Choose your preferred viewing experience.

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm (v10.9.2 or higher)

### Installation

The application will be available at [http://localhost:4200/](http://localhost:4200/).

### Usage

1. Upload your Cobertura XML file through the interface.
2. Explore the coverage data using various visualization tools.
3. Drill down into specific packages, classes, and methods.
4. Export reports for sharing with your team.

## Building for Production

### Environment Configuration

The application uses environment-specific configuration files:

- `environment.ts` - Default development environment.
- `env.develop.ts` - Development build configuration.
- `env.prod.ts` - Production build configuration.

## Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- **Angular:** The web framework used.
- **Google Charts:** For data visualization.
- **Cobertura:** The code coverage tool that generates the XML reports.

Created with ❤️ by lhajoosten
