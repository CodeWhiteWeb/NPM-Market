window.addEventListener("DOMContentLoaded", () => {
    const vscode = acquireVsCodeApi();
  
    window.addEventListener("message", (event) => {
      const { metadata, readme } = event.data || {};
  
      // Safely update metadata fields
      setText("pkg-name", metadata?.name || "N/A");
      setLink("repo", metadata?.repository);
      setLink("homepage", metadata?.homepage);
      setText("downloads", formatDownloads(metadata?.downloads));
      setText("version", metadata?.version || "N/A");
      setText("license", metadata?.license || "N/A");
      setText("last-publish", formatDate(metadata?.lastPublish));
      setText("collaborators", (metadata?.collaborators || []).join(", ") || "N/A");
  
      if (typeof marked !== "undefined") {
        setHTML("readme", marked.parse(readme || "README not available."));
      } else {
        setHTML("readme", "<p>README renderer not available.</p>");
      }
  
      console.log("Package metadata:", metadata);
    });
  
    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }
  
    function setLink(id, url) {
      const el = document.getElementById(id);
      if (el) {
        el.href = url || "#";
        el.textContent = url || "N/A";
      }
    }
  
    function setHTML(id, html) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }
  
    function formatDownloads(count) {
      if (!count) return "-";
      if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
      if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
      return count.toString();
    }
  
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
    }
  });
  