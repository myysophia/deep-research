/**
 * Template Repository — Local JSON file-based persistence layer (dev-mode).
 *
 * Interface contract:
 *   save(profile, revisionNote?) → upserts a TemplateProfile by id with versioning
 *   list()                      → returns TemplateLibraryItem[] (lightweight summaries)
 *   getById(id)                 → returns full TemplateProfile or null
 *   getHistory(id)              → returns version history for a template
 *
 * The JSON store is kept in <project-root>/.template-repo/templates.json so
 * it survives Next.js hot-reloads and is easy to inspect/reset during dev.
 * Swapping to a database later only requires replacing the exported
 * functions — the route handlers do not need to change.
 *
 * Versioning:
 * - 首次保存创建版本 1
 * - 再次保存同 id 模板时，旧版本归档到 history，新版本成为 current
 * - 历史版本包含 version、updatedAt、revisionNote
 * - 向后兼容：旧格式数据自动迁移到新结构
 */

import path from "path";
import fs from "fs/promises";

// ---------------------------------------------------------------------------
// Storage path
// ---------------------------------------------------------------------------

const STORE_DIR = path.resolve(process.cwd(), ".template-repo");
const STORE_FILE = path.join(STORE_DIR, "templates.json");

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TemplateVersionMeta {
  version: number;
  updatedAt: number;
  revisionNote?: string;
}

interface VersionedTemplate {
  current: TemplateProfile;
  history: Array<TemplateProfile & TemplateVersionMeta>;
}

// 新的存储格式：Record<string, VersionedTemplate>
// 旧格式兼容：Record<string, TemplateProfile>
type Store = Record<string, VersionedTemplate | TemplateProfile>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * 检查存储项是否为新格式（版本化）
 */
function isVersionedTemplate(value: unknown): value is VersionedTemplate {
  return (
    typeof value === "object" &&
    value !== null &&
    "current" in value &&
    "history" in value &&
    Array.isArray((value as VersionedTemplate).history)
  );
}

/**
 * 将旧格式数据迁移到新格式
 */
function migrateToVersioned(profile: TemplateProfile): VersionedTemplate {
  return {
    current: { ...profile, version: profile.version ?? 1 },
    history: [],
  };
}

/**
 * 获取版本化模板，自动处理旧格式数据
 */
function getVersioned(store: Store, id: string): VersionedTemplate | null {
  const entry = store[id];
  if (!entry) return null;

  if (isVersionedTemplate(entry)) {
    return entry;
  }

  // 旧格式数据迁移
  const versioned = migrateToVersioned(entry);
  store[id] = versioned;
  return versioned;
}

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
 * 保存模板（带版本化）。
 * - 首次保存时创建版本 1
 * - 再次保存时，旧版本归档到 history，新版本成为 current
 * - 可选的 revisionNote 用于描述本次修改
 */
export async function save(
  profile: TemplateProfile,
  revisionNote?: string
): Promise<TemplateProfile> {
  const store = await readStore();
  const existing = getVersioned(store, profile.id);

  if (!existing) {
    // 首次保存，创建版本 1
    const newVersioned: VersionedTemplate = {
      current: { ...profile, version: 1 },
      history: [],
    };
    store[profile.id] = newVersioned;
    await writeStore(store);
    return newVersioned.current;
  }

  // 已有模板，创建新版本
  // 旧版本归档（保留必要的元数据）
  const historyEntry: TemplateProfile & TemplateVersionMeta = {
    ...existing.current,
    version: existing.current.version ?? 1,
    revisionNote: existing.current.revisionNote,
  };

  const newVersion = (existing.current.version ?? 1) + 1;
  const newProfile: TemplateProfile = {
    ...profile,
    version: newVersion,
    revisionNote,
  };

  // 更新存储
  const updated: VersionedTemplate = {
    current: newProfile,
    history: [historyEntry, ...existing.history],
  };
  store[profile.id] = updated;

  await writeStore(store);
  return newProfile;
}

/**
 * 返回轻量级摘要列表，适用于模板库视图。
 * 按 updatedAt 降序排序（最新的在前面）。
 */
export async function list(): Promise<TemplateLibraryItem[]> {
  const store = await readStore();
  return Object.values(store)
    .map((entry) => {
      // 兼容新旧格式
      const profile = isVersionedTemplate(entry) ? entry.current : entry;
      return {
        id: profile.id,
        name: profile.name,
        source: profile.source,
        formatSpecId: profile.formatSpecId,
        thesisType: profile.thesisType,
        educationLevel: profile.educationLevel,
        confidenceScore: profile.confidenceScore,
        updatedAt: profile.updatedAt,
      } as TemplateLibraryItem;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 返回指定 id 的完整模板配置，或 null（如果不存在）。
 * 总是返回当前版本。
 */
export async function getById(id: string): Promise<TemplateProfile | null> {
  const store = await readStore();
  const versioned = getVersioned(store, id);
  return versioned ? versioned.current : null;
}

/**
 * 返回指定模板的历史版本列表。
 * 历史版本按版本号降序排序（最新的在前面）。
 * 每个历史条目包含 version、updatedAt、revisionNote。
 */
export async function getHistory(id: string): Promise<Array<TemplateVersionMeta> | null> {
  const store = await readStore();
  const versioned = getVersioned(store, id);

  if (!versioned) {
    return null;
  }

  // 返回历史版本，按版本号降序排序
  return versioned.history
    .map((h) => ({
      version: h.version,
      updatedAt: h.updatedAt,
      revisionNote: h.revisionNote,
    }))
    .sort((a, b) => b.version - a.version);
}
