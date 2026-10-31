import fs from "node:fs";
import path from "node:path";
import { defineConfig, type DefaultTheme } from "vitepress";

const root = path.resolve(import.meta.dirname, "..");
const skippedDirs = new Set([
  ".git",
  ".vitepress",
  "coverage",
  "dist",
  "main",
  "master",
  "node_modules",
  "solution",
]);

type SidebarItem = DefaultTheme.SidebarItem;

function readFirstH1(file: string): string {
  if (!fs.existsSync(file)) return "";
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("# "));
  return line?.slice(2).trim() ?? "";
}

function humanize(value: string): string {
  return value
    .replace(/^\d+-/, "")
    .replace(/[-_]/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bPr\b/g, "PR")
    .replace(/\bUrl\b/g, "URL")
    .replace(/\bRfc\b/g, "RFC")
    .replace(/\bRag\b/g, "RAG")
    .replace(/\bDdd\b/g, "DDD")
    .replace(/\bSlo\b/g, "SLO")
    .replace(/\bAws\b/g, "AWS")
    .replace(/\bOtel\b/g, "OTel")
    .replace(/\bOauth\b/g, "OAuth")
    .replace(/\bJwt\b/g, "JWT")
    .replace(/\bSql\b/g, "SQL")
    .replace(/\bNosql\b/g, "NoSQL")
    .replace(/\bApi\b/g, "API")
    .replace(/\bApis\b/g, "APIs")
    .replace(/\bCqrs\b/g, "CQRS")
    .replace(/\bK8s\b/g, "K8s");
}

function phaseLabel(phase: string): string {
  const heading = readFirstH1(path.join(root, phase, "README.md"));
  const name = heading
    .replace(/^Phase\s+\d+\s*[—-]\s*/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim();
  return `Phase ${phase.slice(0, 2)} — ${name || humanize(phase)}`;
}

function topicLabel(topicDir: string): string {
  const heading = readFirstH1(path.join(topicDir, "README.md"));
  const text = heading.replace(/^Topic:\s*/i, "").replace(/^#\s*/, "");
  return text.split(" — ")[0].trim() || humanize(path.basename(topicDir));
}

function projectLabel(projectDir: string): string {
  const heading = readFirstH1(path.join(projectDir, "project-brief.md"));
  const match = heading.match(/^(?:Capstone|Flagship)\s+\d+\s*[—-]\s*(.+)$/i);
  return match?.[1].replace(/\s*\(.*\)\s*$/, "").trim() || humanize(path.basename(projectDir));
}

function projectNumber(projectDir: string): number {
  const heading = readFirstH1(path.join(projectDir, "project-brief.md"));
  const match = heading.match(/(?:Capstone|Flagship)\s+(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function docLabel(relativePath: string): string {
  return humanize(path.basename(relativePath, ".md"));
}

function routeFor(relativePath: string): string {
  if (relativePath === "README.md") return "/README";
  if (relativePath.endsWith("/README.md")) {
    return `/${relativePath.slice(0, -"README.md".length)}`;
  }
  if (relativePath === "index.md") return "/";
  if (relativePath.endsWith("/index.md")) {
    return `/${relativePath.slice(0, -"index.md".length)}`;
  }
  return `/${relativePath.replace(/\.md$/, "")}`;
}

function labelFor(relativePath: string): string {
  const base = path.basename(relativePath, ".md");
  const special: Record<string, string> = {
    README: "Concepts",
    assignment: "Assignment",
    "build-guide": "Build guide",
    index: "Overview",
    "project-brief": "Project brief",
    template: "Template",
  };
  if (special[base]) {
    if (base === "index" && relativePath.includes("/milestones/")) {
      return "Milestones overview";
    }
    if (base === "index" && relativePath.includes("/diffs/")) {
      return "Diffs overview";
    }
    return special[base];
  }

  const milestone = base.match(/^(M\d+(?:-M\d+)?)-(.+)$/i);
  if (milestone) {
    return `${milestone[1].toUpperCase()} — ${humanize(milestone[2])}`;
  }

  if (/^\d+-/.test(base)) {
    const heading = readFirstH1(path.join(root, relativePath));
    const match = heading.match(/^(?:Design prompt|Topic|Capstone|Flagship)\s+\d+\s*[—-]\s*(.+)$/i);
    if (match)
      return match[1]
        .split(" — ")[0]
        .replace(/\s*\(.*\)\s*$/, "")
        .trim();
  }

  return humanize(base);
}

function fileRank(relativePath: string): number {
  const base = path.basename(relativePath);
  if (base === "README.md" || base === "project-brief.md") return 0;
  if (base === "build-guide.md") return 1;
  if (base === "assignment.md") return 2;
  if (base === "index.md") return 2.5;
  return 3;
}

function collectMarkdown(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skippedDirs.has(entry.name)) continue;
      files.push(...collectMarkdown(fullPath));
    } else if (entry.name.endsWith(".md")) {
      files.push(path.relative(root, fullPath).split(path.sep).join("/"));
    }
  }
  return files.sort((a, b) => fileRank(a) - fileRank(b) || a.localeCompare(b, "en"));
}

function childDirs(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith(".") && !skippedDirs.has(entry.name),
    )
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function hasMarkdown(dir: string): boolean {
  return collectMarkdown(dir).length > 0;
}

function pageItem(relativePath: string): SidebarItem {
  return {
    text: labelFor(relativePath),
    link: routeFor(relativePath),
  };
}

const phaseDirs = childDirs(root).filter((dir) => /^\d{2}-/.test(path.basename(dir)));
const capstoneDirs = childDirs(path.join(root, "capstones"))
  .filter((dir) => hasMarkdown(dir))
  .sort((a, b) => projectNumber(a) - projectNumber(b));
const flagshipDirs = childDirs(path.join(root, "flagships"))
  .filter((dir) => hasMarkdown(dir))
  .sort((a, b) => projectNumber(a) - projectNumber(b));
const docFiles = collectMarkdown(path.join(root, "docs"));

function phaseSidebar(phaseDir: string): SidebarItem {
  const phase = path.basename(phaseDir);
  const topicDirs = childDirs(phaseDir).filter((dir) => hasMarkdown(dir));
  return {
    text: phaseLabel(phase),
    items: [
      { text: "Phase overview", link: `/${phase}/` },
      ...topicDirs.map((topicDir) => ({
        text: topicLabel(topicDir),
        collapsed: false,
        items: collectMarkdown(topicDir).map(pageItem),
      })),
    ],
  };
}

function projectSidebar(projectDir: string, groupedMilestones: boolean): SidebarItem {
  const files = collectMarkdown(projectDir);
  if (!groupedMilestones) {
    return {
      text: projectLabel(projectDir),
      collapsed: false,
      items: files.map(pageItem),
    };
  }

  const topLevel = files.filter((file) => !file.includes("/milestones/"));
  const milestones = files.filter((file) => file.includes("/milestones/"));
  return {
    text: projectLabel(projectDir),
    collapsed: false,
    items: [
      ...topLevel.map(pageItem),
      ...(milestones.length > 0
        ? [
            {
              text: "Milestones",
              collapsed: false,
              items: milestones.map(pageItem),
            } satisfies SidebarItem,
          ]
        : []),
    ],
  };
}

const phaseSidebars = Object.fromEntries(
  phaseDirs.map((phaseDir) => [`/${path.basename(phaseDir)}/`, [phaseSidebar(phaseDir)]]),
);

const capstoneSidebar: SidebarItem[] = [
  { text: "Overview", link: "/capstones/" },
  ...capstoneDirs.map((dir) => projectSidebar(dir, false)),
];
const flagshipSidebar: SidebarItem[] = [
  { text: "Overview", link: "/flagships/" },
  ...flagshipDirs.map((dir) => projectSidebar(dir, true)),
];
const docsSidebar: SidebarItem[] = [
  {
    text: "Guides",
    items: docFiles.map((file) => ({
      text: docLabel(file),
      link: routeFor(file),
    })),
  },
];

const globalSidebar: SidebarItem[] = [
  {
    text: "Start here",
    items: [
      { text: "Home", link: "/" },
      { text: "Full README", link: "/README" },
      { text: "Roadmap", link: "/ROADMAP" },
    ],
  },
  {
    text: "Curriculum",
    items: phaseDirs.map((phaseDir) => {
      const phase = path.basename(phaseDir);
      return { text: phaseLabel(phase), link: `/${phase}/` };
    }),
  },
  {
    text: "Projects",
    items: [
      { text: "Capstones", link: "/capstones/" },
      { text: "Flagships", link: "/flagships/" },
    ],
  },
  ...docsSidebar,
  {
    text: "Maintainers",
    items: [{ text: "Build plan", link: "/PLAN" }],
  },
];

const nav: DefaultTheme.NavItem[] = [
  {
    text: "Curriculum",
    items: phaseDirs.map((phaseDir) => {
      const phase = path.basename(phaseDir);
      return { text: phaseLabel(phase), link: `/${phase}/` };
    }),
  },
  { text: "Capstones", link: "/capstones/" },
  { text: "Flagships", link: "/flagships/" },
  {
    text: "Docs",
    items: docFiles.map((file) => ({
      text: docLabel(file),
      link: routeFor(file),
    })),
  },
  { text: "Roadmap", link: "/ROADMAP" },
];

const readingOrder: { relativePath: string; text: string; link: string }[] = [];
function pushPage(relativePath: string, text = labelFor(relativePath)) {
  readingOrder.push({
    relativePath,
    text,
    link: routeFor(relativePath),
  });
}

pushPage("ROADMAP.md", "Roadmap");
for (const phaseDir of phaseDirs) {
  const phase = path.basename(phaseDir);
  pushPage(`${phase}/README.md`, "Phase overview");
  for (const topicDir of childDirs(phaseDir).filter((dir) => hasMarkdown(dir))) {
    for (const file of collectMarkdown(topicDir)) pushPage(file);
  }
}
pushPage("capstones/index.md", "Capstones overview");
for (const projectDir of capstoneDirs) {
  for (const file of collectMarkdown(projectDir)) pushPage(file);
}
pushPage("flagships/index.md", "Flagships overview");
for (const projectDir of flagshipDirs) {
  const files = collectMarkdown(projectDir);
  for (const file of files.filter((entry) => !entry.includes("/milestones/"))) {
    pushPage(file);
  }
  for (const file of files.filter((entry) => entry.includes("/milestones/"))) {
    pushPage(file);
  }
}
for (const file of docFiles) pushPage(file);

export default defineConfig({
  title: "Backend Mastery",
  description:
    "A hands-on TypeScript + Node backend engineering curriculum with assignments, tests, capstones, and flagship projects.",
  lang: "en-US",
  cleanUrls: true,
  srcExclude: [
    "**/node_modules/**",
    "**/solution/**",
    "**/dist/**",
    ".vitepress/**",
    "coverage/**",
    "main/**",
    "master/**",
  ],
  ignoreDeadLinks: true,
  rewrites(id) {
    if (id === "README.md") return id;
    return id.replace(/\/README\.md$/, "/index.md");
  },
  markdown: {
    config(md) {
      md.core.ruler.before("normalize", "details-markdown", (state) => {
        state.src = state.src
          .replace(
            /<details><summary>([\s\S]*?)<\/summary>\s*/g,
            (_match, summary: string) => `<details><summary>${summary}</summary>\n\n`,
          )
          .replace(/\s*<\/details>/g, "\n\n</details>");
      });

      md.core.ruler.after("inline", "readme-links", (state) => {
        for (const token of state.tokens) {
          if (token.type !== "inline" || !token.children) continue;
          for (const child of token.children) {
            if (child.type !== "link_open") continue;
            const href = child.attrGet("href");
            if (href && /(^|\/)README\.md(?:#.*)?$/.test(href)) {
              child.attrSet("href", href.replace(/README\.md/, "index.md"));
            }
          }
        }
      });
    },
  },
  themeConfig: {
    nav,
    sidebar: {
      "/capstones/": capstoneSidebar,
      "/flagships/": flagshipSidebar,
      "/docs/": docsSidebar,
      "/": globalSidebar,
      ...phaseSidebars,
    },
    search: {
      provider: "local",
    },
    outline: {
      level: [2, 3],
    },
    docFooter: {
      prev: "Previous",
      next: "Next",
    },
    returnToTopLabel: "Back to top",
    sidebarMenuLabel: "Menu",
    darkModeSwitchLabel: "Theme",
  },
  transformPageData(pageData) {
    if (!pageData.filePath) return;
    const relativePath = (
      path.isAbsolute(pageData.filePath)
        ? path.relative(root, pageData.filePath)
        : pageData.filePath
    )
      .split(path.sep)
      .join("/");
    const index = readingOrder.findIndex((page) => page.relativePath === relativePath);
    if (index === -1) return;

    if (index > 0 && pageData.frontmatter.prev == null) {
      const previous = readingOrder[index - 1];
      pageData.frontmatter.prev = { text: previous.text, link: previous.link };
    }
    if (index < readingOrder.length - 1 && pageData.frontmatter.next == null) {
      const next = readingOrder[index + 1];
      pageData.frontmatter.next = { text: next.text, link: next.link };
    }
  },
});
