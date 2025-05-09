# NPM Market

**NPM Market** is a Visual Studio Code extension that allows developers to search, explore, and view details of NPM packages directly within the editor.

## Features

* 🔍 **Search NPM Packages**: Quickly search for NPM packages without leaving VS Code.
* 📦 **View Package Details**: Access detailed information including repository links, homepage, weekly downloads, version, license, last publish date, and collaborators.
* 📄 **Readme Preview**: View the package's README rendered in markdown format within VS Code.
* 📈 **Download Statistics**: See weekly download counts to gauge package popularity.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
3. Search for `NPM Market`.
4. Click **Install** to install the extension.


## Usage

1. Open the **NPM Market** view from the Activity Bar.
2. Use the search bar to find NPM packages.
3. Click on a package from the search results to view its details.
4. The package details panel will display metadata and the README.

## Known Issues

* Some packages may not display the README correctly due to formatting issues or missing data in the NPM registry.
* If you encounter issues with loading package details, ensure you have an active internet connection.

## Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Make your changes and commit them: `git commit -m 'Add new feature'`.
4. Push to the branch: `git push origin feature-name`.
5. Open a pull request.

Please ensure your code adheres to the existing style guidelines and includes appropriate tests.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

* [Visual Studio Code Extension API](https://code.visualstudio.com/api)
* [NPM Registry API](https://registry.npmjs.org/)
* [Marked - A markdown parser](https://github.com/markedjs/marked)