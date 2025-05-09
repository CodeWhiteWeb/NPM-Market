window.addEventListener("DOMContentLoaded", () => {
  const vscode = acquireVsCodeApi();
  const searchBox = document.getElementById("searchBox");
  const packageList = document.getElementById("packageList");

  let debounceTimer;
  let currentPage = 0;
  let currentQuery = '';
  let loading = false;

  searchBox.addEventListener("input", () => {
    const text = searchBox.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentPage = 0;
      currentQuery = text;
      performSearch(text, true);
    }, 500);
  });

  function performSearch(query, reset = false) {
    if (loading) return;
    loading = true;

    vscode.postMessage({
      command: 'search',
      text: query,
      page: reset ? 0 : currentPage,
    });
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message.command === "searchResults") {
      if (message.page === 0) packageList.innerHTML = '';
      renderPackages(message.results, false);
      loading = false;
      currentPage++;
    } else if (message.command === "installedPackages") {
      renderPackages(message.packages, true);
    }
  });

  function renderPackages(packages, isInstalled = false) {
    packageList.innerHTML = "";

    packages.slice(0, 10).forEach((pkg) => {
      const item = document.createElement("div");
      item.className = "item";

      // Whole item click triggers opening package
      item.addEventListener("click", () => {
        vscode.postMessage({
          command: "openPackage",
          name: pkg.name,
        });
      });

      // Title + Downloads
      const titleContainer = document.createElement("div");
      titleContainer.className = "item-title-container";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = pkg.name;

      const downloads = document.createElement("div");
      downloads.className = "item-downloads";
      downloads.textContent = pkg.downloads || "";

      titleContainer.appendChild(title);
      titleContainer.appendChild(downloads);

      const desc = document.createElement("div");
      desc.className = "item-desc";
      desc.textContent = pkg.description || "No description";

      item.appendChild(titleContainer);
      item.appendChild(desc);

      if (!isInstalled) {
        const button = document.createElement("button");
        button.className = "install-btn";
        button.textContent = "Install";
        button.addEventListener("click", (e) => {
          e.stopPropagation(); // 🚫 prevent triggering item click
          vscode.postMessage({
            command: "installPackage",
            name: pkg.name,
          });
          button.textContent = "Installing...";
          button.disabled = true;
        });
        item.appendChild(button);
      }

      packageList.appendChild(item);
    });
  }

  packageList.onscroll = function () {
    if (packageList.scrollTop + packageList.clientHeight >= packageList.scrollHeight - 5) {
      performSearch(currentQuery);
    }
  };

  // Initial load
  vscode.postMessage({ command: "getInstalledPackages" });
});
