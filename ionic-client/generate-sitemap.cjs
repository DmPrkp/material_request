/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
const fs = require("fs");
const path = require("path");
const routes = [
  {
    path: "locale/about",
    name: "about",
  },
  {
    path: "locale/main",
    name: "main",
    children: [
      {
        path: ":workType",
        name: "work-type",
        children: [
          {
            path: ":system",
            name: "system",
            children: [
              {
                path: "materialList",
                name: "material-list",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "locale/zayavka",
    name: "zayavka-list",
    children: [
      {
        path: ":zayavka",
        name: "zayavka",
      },
    ],
  },
  {
    path: "locale/settings",
    name: "settings",
  },
];

const baseUrl = "https://zayavka.xyz";

// Recursively extract all route paths
function getPaths(routes, parentPath = "") {
  let paths = [];

  routes.forEach((route) => {
    const fullPath = `${parentPath}/${route.path}`.replace(/\/+/g, "/"); // Ensure proper slashes
    if (!route.children) {
      paths.push(fullPath);
    } else {
      paths.push(fullPath);
      paths = paths.concat(getPaths(route.children, fullPath));
    }
  });

  return paths;
}

const pages = getPaths(routes).map((path) => ({
  url: path.replace(/\/$/, ""), // Remove trailing slashes
  lastmod: new Date().toISOString().split("T")[0], // Format YYYY-MM-DD
  changefreq: "weekly",
  priority: path === "/locale/main" ? 1.0 : 0.8,
}));

// Generate XML content
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join("\n")}
</urlset>`;

// Write to a sitemap file
fs.writeFileSync(path.join(__dirname, "public", "sitemap.xml"), sitemapContent);

console.log("✅ Sitemap generated: public/sitemap.xml");
