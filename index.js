// importmap.js
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * A runtime import map resolver with caching and remote URL support.
 * Usage:
 *   import importmap from './importmap.js';
 *   const mod = await importmap('incremental-copy');
 *   importmap.clearCache();
 */

class ImportMap {

  #importmapRemote = false;
  #packageField = "importmap";
  #configFrozen = false; // Track if config has been loaded from package.json

  #cache = new Map();
  #imports = null;
  #pkgDir = null;

  constructor({ packageField, importmapRemote }={}) {
  if(importmapRemote) this.#importmapRemote = importmapRemote;
  if(packageField) this.#packageField = packageField;

    // Bind import() so you can call the instance like a function
    const bound = this.import.bind(this);
    bound.clearCache = this.clearCache.bind(this);
    return bound;
  }

  async #loadPackageImports() {
    if (this.#imports) return this.#imports;

    // Locate nearest package.json
    let dir = dirname(fileURLToPath(import.meta.url));
    let pkgPath;
    while (true) {
      const candidate = resolve(dir, "package.json");
      try {
        await readFile(candidate);
        pkgPath = candidate;
        break;
      } catch {
        const parent = resolve(dir, "..");
        if (parent === dir)
          throw new Error("package.json not found while resolving importmap");
        dir = parent;
      }
    }

    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
    this.#pkgDir = dirname(pkgPath);

    // Load configuration from package.json (only if not already frozen)
    if (!this.#configFrozen) {
      // Read importmapField from package.json (defines which field to use for import map)
      if (pkg.importmapField && typeof pkg.importmapField === 'string') {
        this.#packageField = pkg.importmapField;
      }

      // Check if remote imports are enabled in package.json
      if (pkg.importmapRemote === true) {
        this.#importmapRemote = true;
      }

      // Freeze configuration - cannot be changed at runtime after this point
      this.#configFrozen = true;
    }

    // Load and validate import map structure per spec
    const importmapData = pkg[this.#packageField] || {};
    this.#imports = {
      imports: importmapData.imports || {},
      scopes: importmapData.scopes || {}
    };

    // Validate trailing slashes per spec
    this.#validateImportMap(this.#imports);

    return this.#imports;
  }

  #validateImportMap(importMap) {
    const isRemoteUrl = (url) => /^https?:\/\//i.test(url);

    // Validate imports
    for (const [key, value] of Object.entries(importMap.imports)) {
      if (key.endsWith('/') && !value.endsWith('/')) {
        console.warn(`Import map: prefix "${key}" ends with / but target "${value}" does not`);
      }

      // Security warning for remote URLs
      if (isRemoteUrl(value) && !this.#importmapRemote) {
        console.warn(
          `Import map: remote URL "${value}" found but remote imports are disabled. ` +
          `Set "importmapRemote": true in package.json to enable.`
        );
      }
    }

    // Validate scopes
    for (const [scopePrefix, scopeImports] of Object.entries(importMap.scopes)) {
      for (const [key, value] of Object.entries(scopeImports)) {
        if (key.endsWith('/') && !value.endsWith('/')) {
          console.warn(`Import map scope "${scopePrefix}": prefix "${key}" ends with / but target "${value}" does not`);
        }

        // Security warning for remote URLs in scopes
        if (isRemoteUrl(value) && !this.#importmapRemote) {
          console.warn(
            `Import map scope "${scopePrefix}": remote URL "${value}" found but remote imports are disabled. ` +
            `Set "importmapRemote": true in package.json to enable.`
          );
        }
      }
    }
  }

  async import(specifier, referrerUrl) {
    const importMap = await this.#loadPackageImports();

    if (this.#cache.has(specifier)) return this.#cache.get(specifier);

    // Resolve specifier using spec-compliant algorithm
    const target = this.#resolveImportMatch(specifier, importMap, referrerUrl);

    if (!target)
      throw new Error(`Specifier not found in importmap: ${specifier}`);

    // Security check: block remote URLs unless explicitly enabled
    const isRemote = /^https?:\/\//i.test(target);
    if (isRemote && !this.#importmapRemote) {
      throw new Error(
        `Remote import "${target}" blocked for security. ` +
        `Set "importmapRemote": true in package.json to enable remote imports.`
      );
    }

    let module;
    if (isRemote) {
      module = await import(target);
    } else {
      const abs = resolve(this.#pkgDir, target);
      module = await import(pathToFileURL(abs).href);
    }

    this.#cache.set(specifier, module);
    return module;
  }

  #resolveImportMatch(specifier, importMap, referrerUrl) {
    // Step 1: Check scopes first if referrerUrl is provided
    if (referrerUrl && Object.keys(importMap.scopes).length > 0) {
      // Sort scope keys by length (longest first) per spec
      const scopeKeys = Object.keys(importMap.scopes).sort((a, b) => b.length - a.length);

      for (const scopePrefix of scopeKeys) {
        if (referrerUrl.startsWith(scopePrefix)) {
          const scopeImports = importMap.scopes[scopePrefix];
          const scopeMatch = this.#resolveImportsMatch(specifier, scopeImports);
          if (scopeMatch) return scopeMatch;
        }
      }
    }

    // Step 2: Check main imports
    return this.#resolveImportsMatch(specifier, importMap.imports);
  }

  #resolveImportsMatch(specifier, importsMap) {
    // Per spec: exact match takes precedence
    if (importsMap[specifier]) {
      return importsMap[specifier];
    }

    // Per spec: find longest matching prefix
    const prefixes = Object.keys(importsMap)
      .filter(key => key.endsWith('/') && specifier.startsWith(key))
      .sort((a, b) => b.length - a.length); // Longest first

    if (prefixes.length > 0) {
      const longestPrefix = prefixes[0];
      const baseUrl = importsMap[longestPrefix];
      const afterPrefix = specifier.slice(longestPrefix.length);
      return baseUrl + afterPrefix;
    }

    return null;
  }

  clearCache() {
    this.#cache.clear();
  }
}

// Default export is a callable singleton
const options = {
  packageField: "importmap",
  importmapRemote: false,
};

const importmap = new ImportMap(options);

export default importmap;
