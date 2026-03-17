/**
 * Template Repository — Local JSON file-based persistence layer (dev-mode).
 *
 * Interface contract:
 *   save(profile)      → upserts a TemplateProfile by id
 *   list()             → returns TemplateLibraryItem[] (lightweight summaries)
 *   getById(id)        → returns full TemplateProfile or null
 *
 * The JSON store is kept in <project-root>/.template-repo/templates.json so
 * it survives Next.js hot-reloads and is easy to inspect/reset during dev.
 * Swapping to a database later only requires replacing the three exported
 * functions — the route handlers above do not need to change.
 */

import path from "path";
import fs from "fs/promises";

// ---------------------------------------------------------------------------
// Storage path
// ---------------------------------------------------------------------------

const STORE_DIR = path.resolve(process.cwd(), ".template-repo");
const STORE_FILE = path.join(STORE_DIR, "templates.json");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Store = Record<string, TemplateProfile>;

async function ensureStoreFile(): Promise<void> {
  try {
    await fs.access(STORE_DIR);
  } catch {
    await fs.mkdir(STORE_DIR, { recursive: true });
  }
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, "{}", "utf-8");
  }
}

async function readStore(): Promise<Store> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_FILE, "utf-8");
  return JSON.parse(raw) as Store;
}

async function writeStore(store: Store): Promise<void> {
  await ensureStoreFile();
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upsert a TemplateProfile. If a profile with the same id already exists it
 * will be completely replaced.
 */
export async function save(profile: TemplateProfile): Promise<TemplateProfile> {
  const store = await readStore();
  store[profile.id] = profile;
  await writeStore(store);
  return profile;
}

/**
 * Return a lightweight summary list suitable for library/index views.
 * Sorted by updatedAt descending (most recent first).
 */
export async function list(): Promise<TemplateLibraryItem[]> {
  const store = await readStore();
  return Object.values(store)
    .map(
      (p): TemplateLibraryItem => ({
        id: p.id,
        name: p.name,
        source: p.source,
        formatSpecId: p.formatSpecId,
        thesisType: p.thesisType,
        educationLevel: p.educationLevel,
        confidenceScore: p.confidenceScore,
        updatedAt: p.updatedAt,
      })
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Return the full TemplateProfile for the given id, or null if not found.
 */
export async function getById(id: string): Promise<TemplateProfile | null> {
  const store = await readStore();
  return store[id] ?? null;
}
