# Plumpkin

A runtime import map resolver for Node.js with caching and remote URL support.

## What is Plumpkin?

Plumpkin lets you use **short, friendly names** (like `"lodash"` or `"my-utils"`) to import modules instead of long, messy file paths. Think of it as creating shortcuts for your imports!

### Before Plumpkin
```javascript
// Ugh, long and brittle paths...
import { helper } from '../../src/utils/helpers/helper.js';
import { validator } from '../../src/validation/validator.js';
```

### With Plumpkin
```javascript
import importmap from 'plumpkin';

// Clean and simple!
const helper = await importmap('my-utils/helper');
const validator = await importmap('validation/validator');
```

## Why Use Plumpkin?

- **Cleaner Imports**: Use simple names instead of complex relative paths
- **Easy Refactoring**: Move files around without updating every import
- **Secure by Default**: Remote imports are disabled unless explicitly enabled
- **Remote Modules**: Optional support for loading modules from HTTP(S) URLs
- **Caching**: Built-in module caching for better performance
- **Standards-Based**: Follows the [ES Module Shims import maps spec](https://github.com/guybedford/es-module-shims#import-maps)

## Installation

```bash
npm install plumpkin
```

**Requirements:**
- Node.js >= 18.0.0
- ES Modules support (`"type": "module"` in your package.json)

## Security

**Remote imports are disabled by default for your safety.**

Plumpkin can load modules from remote URLs (HTTP/HTTPS), but this poses security risks:

- **Supply Chain Attacks**: Remote code can be modified without your knowledge
- **Man-in-the-Middle**: Network interception could inject malicious code
- **Availability**: Dependency on external servers can cause failures
- **Data Exfiltration**: Malicious remote modules can steal sensitive data

**Best Practices:**

1. **Use local imports by default** - Only enable remote imports when absolutely necessary
2. **Enable selectively** - Set `"importmapRemote": true` in package.json only after careful consideration
3. **Trust your sources** - Only import from URLs you completely trust and control
4. **Use HTTPS only** - Never use HTTP URLs for remote imports
5. **Pin versions** - Use specific version URLs (e.g., `https://cdn.example.com/lib@1.2.3/`) not floating versions
6. **Audit regularly** - Review your remote imports and verify they haven't changed
7. **Consider alternatives** - Use npm packages instead of CDN imports when possible

### Enabling Remote Imports

If you need remote imports, explicitly enable them in package.json:

```json
{
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "local-module": "./src/module.js",
      "remote-module": "https://trusted-cdn.example.com/module@1.0.0.js"
    }
  }
}
```

**Without `"importmapRemote": true`, remote URLs will throw an error:**

```
Error: Remote import "https://..." blocked for security.
Set "importmapRemote": true in package.json to enable remote imports.
```

## Configuration

Plumpkin supports two configuration options in package.json that control its behavior. **Both settings are frozen after the first import** and cannot be changed at runtime for security.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `importmapField` | string | `"importmap"` | Which field in package.json contains the import map |
| `importmapRemote` | boolean | `false` | Whether to allow remote HTTP(S) imports |

### `importmapField` (Optional)

Specifies which field in package.json contains the import map. Defaults to `"importmap"`.

**Use case:** Avoid conflicts with other tools or use a custom field name.

```json
{
  "importmapField": "myCustomImports",
  "myCustomImports": {
    "imports": {
      "my-module": "./src/module.js"
    }
  }
}
```

### `importmapRemote` (Optional)

Enables or disables remote HTTP(S) imports. Defaults to `false` for security.

```json
{
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "remote-lib": "https://cdn.example.com/lib.js"
    }
  }
}
```

### Using Both Options Together

You can combine both configuration options:

```json
{
  "importmapField": "devImports",
  "importmapRemote": true,
  "devImports": {
    "imports": {
      "local-utils": "./src/utils.js",
      "remote-lib": "https://cdn.example.com/lib@1.0.0.js"
    }
  }
}
```

**Security:** These settings are **frozen after first use** to prevent runtime tampering. They can only be set in package.json, not programmatically. If you change them, you must restart your Node.js process for the changes to take effect.

## Quick Start

### Step 1: Add Import Map to package.json

Open your `package.json` and add an `"importmap"` field:

```json
{
  "type": "module",
  "name": "my-project",

  "importmap": {
    "imports": {
      "my-utils": "./src/utils/index.js",
      "config": "./src/config.js"
    }
  }
}
```

### Step 2: Use Plumpkin in Your Code

```javascript
import importmap from 'plumpkin';

// Load modules using your short names
const utils = await importmap('my-utils');
const config = await importmap('config');

// Use them like normal imports
utils.doSomething();
console.log(config.apiKey);
```

That's it! You're ready to go.

## Basic Examples

### Example 1: Simple Module Mapping

Map a friendly name to a specific file:

**package.json:**
```json
{
  "importmap": {
    "imports": {
      "database": "./src/db/connection.js",
      "logger": "./src/logging/logger.js"
    }
  }
}
```

**your-code.js:**
```javascript
import importmap from 'plumpkin';

const db = await importmap('database');
const logger = await importmap('logger');

logger.info('Connected to database');
```

### Example 2: Directory Mapping (Prefix Matching)

Map a prefix to load any file from a directory:

**package.json:**
```json
{
  "importmap": {
    "imports": {
      "components/": "./src/components/",
      "utils/": "./src/utilities/"
    }
  }
}
```

**Note:** Both the key AND value must end with `/` for directory mappings.

**your-code.js:**
```javascript
import importmap from 'plumpkin';

// Load specific files from the directories
const Button = await importmap('components/Button.js');
const Header = await importmap('components/layout/Header.js');
const format = await importmap('utils/format.js');
```

### Example 3: Remote Modules (Use with Caution)

Load modules from a remote server. **You must explicitly enable remote imports** for security:

**package.json:**
```json
{
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "remote-lib": "https://cdn.example.com/lib/v1.0.0/index.js",
      "api-helpers/": "https://api.mysite.com/helpers/"
    }
  }
}
```

**your-code.js:**
```javascript
import importmap from 'plumpkin';

const remoteLib = await importmap('remote-lib');
const apiHelper = await importmap('api-helpers/auth.js');
```

**Security Notes:**
- Remote imports are **disabled by default**
- Only use remote URLs from sources you completely trust
- Always use HTTPS, never HTTP
- Pin specific versions (e.g., `v1.0.0`) to prevent unexpected updates
- See the [Security](#security) section for more details

## Advanced Features

### Scopes: Context-Specific Mappings

Scopes let you use different mappings depending on which part of your app is running. This is useful when different folders need different versions of the same module.

**package.json:**
```json
{
  "importmap": {
    "imports": {
      "logger": "./src/logger.js"
    },
    "scopes": {
      "./src/legacy/": {
        "logger": "./src/legacy/old-logger.js"
      }
    }
  }
}
```

**How it works:**
- Code in `./src/legacy/` will use `./src/legacy/old-logger.js`
- Code everywhere else will use `./src/logger.js`

**your-code.js:**
```javascript
import importmap from 'plumpkin';

// Pass the referrer URL as the second argument for scope resolution
const logger = await importmap('logger', './src/legacy/app.js');
// This will load ./src/legacy/old-logger.js

const logger2 = await importmap('logger', './src/app.js');
// This will load ./src/logger.js
```

### Longest Prefix Wins

When multiple prefixes could match, Plumpkin uses the **longest** one:

**package.json:**
```json
{
  "importmap": {
    "imports": {
      "lib/": "./src/lib/",
      "lib/special/": "./src/special-lib/"
    }
  }
}
```

```javascript
// Uses "./src/lib/" (shorter prefix)
await importmap('lib/utils.js');
// → ./src/lib/utils.js

// Uses "./src/special-lib/" (longer, more specific prefix)
await importmap('lib/special/utils.js');
// → ./src/special-lib/utils.js
```

### Using a Custom Import Map Field

By default, Plumpkin reads the import map from the `"importmap"` field in package.json. You can change this with `importmapField`:

**Use case:** Avoid naming conflicts with other tools or organize multiple import map configurations.

**package.json:**
```json
{
  "importmapField": "devImports",
  "devImports": {
    "imports": {
      "logger": "./src/dev-logger.js",
      "utils/": "./src/utils/"
    }
  }
}
```

**your-code.js:**
```javascript
import importmap from 'plumpkin';

// Plumpkin will read from "devImports" instead of "importmap"
const logger = await importmap('logger');
```

**Important:** The `importmapField` setting is **frozen after the first import** and cannot be changed at runtime.

### Clearing the Cache

Plumpkin caches imported modules. To clear the cache:

```javascript
import importmap from 'plumpkin';

const module1 = await importmap('my-module');

// Clear cache (useful for testing or hot-reloading)
importmap.clearCache();

const module2 = await importmap('my-module'); // Fresh import
```

## Common Patterns

### Organizing a Large Project

```json
{
  "importmap": {
    "imports": {
      "components/": "./src/components/",
      "services/": "./src/services/",
      "utils/": "./src/utils/",
      "models/": "./src/models/",
      "config": "./config/production.js"
    }
  }
}
```

### Development vs Production

```json
{
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "config": "./config/production.js",
      "analytics": "https://cdn.analytics.com/v2/tracker.js"
    },
    "scopes": {
      "./test/": {
        "config": "./config/test.js",
        "analytics": "./mocks/analytics.js"
      }
    }
  }
}
```

**Note:** `importmapRemote: true` is required for the remote `analytics` URL.

### Using Custom Field for Tool Compatibility

If you're using other tools that conflict with the `"importmap"` field, use `importmapField`:

```json
{
  "importmapField": "plumpkinImports",
  "plumpkinImports": {
    "imports": {
      "db": "./src/database.js",
      "api/": "./src/api/"
    }
  },
  "importmap": {
    "someOtherToolConfig": "..."
  }
}
```

This keeps Plumpkin's configuration separate from other tools.

### Third-Party CDN Modules

**Warning:** Only use this pattern if you trust the CDN completely. Consider using npm packages instead.

```json
{
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react-dom": "https://esm.sh/react-dom@18",
      "lodash/": "https://esm.sh/lodash-es/"
    }
  }
}
```

**Note:** Remote imports require `importmapRemote: true` and carry security risks.

## Import Maps Specification

This implementation follows the [Import Maps specification](https://github.com/guybedford/es-module-shims#import-maps) with:

- **Exact matching**: Direct specifier-to-URL mappings
- **Prefix matching**: Trailing slash for directory mappings with longest-prefix-wins resolution
- **Scopes**: Context-specific mappings for different parts of your application
- **Remote URLs**: Support for both local paths and HTTP(S) URLs
- **Validation**: Warnings for mismatched trailing slashes between prefixes and targets

## API Reference

### `importmap(specifier, referrerUrl?)`

Resolves and imports a module using the import map.

**Parameters:**
- `specifier` (string): The module name/path to import (e.g., `"my-module"` or `"utils/helper"`)
- `referrerUrl` (string, optional): The URL of the importing module (used for scope resolution)

**Returns:** Promise that resolves to the imported module

**Example:**
```javascript
const module = await importmap('my-module');
const scopedModule = await importmap('my-module', './src/special/app.js');
```

### `importmap.clearCache()`

Clears the internal module cache.

**Example:**
```javascript
importmap.clearCache();
```

## Troubleshooting

### Error: "Specifier not found in importmap"

**Problem:** Plumpkin couldn't find a matching entry in your import map.

**Solution:**
1. Check the spelling of your specifier
2. Make sure you added it to `"imports"` in package.json
3. For directory imports, ensure both the key and value end with `/`

```json
// Wrong - missing trailing slash on value
"utils/": "./src/utils"

// Correct
"utils/": "./src/utils/"
```

### Error: "Remote import blocked for security"

**Problem:** You're trying to import a remote URL but remote imports are disabled (this is the default for security).

**Full error message:**
```
Error: Remote import "https://..." blocked for security.
Set "importmapRemote": true in package.json to enable remote imports.
```

**Solution:** Only if you trust the remote source, add `"importmapRemote": true` to your package.json:

```json
{
  "type": "module",
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "my-remote-lib": "https://trusted-cdn.example.com/lib@1.0.0.js"
    }
  }
}
```

**Security warning:** Only enable remote imports if absolutely necessary. See the [Security](#security) section for risks and best practices.

### Warning: "prefix ends with / but target does not"

**Problem:** You have a directory mapping where the key ends with `/` but the value doesn't.

**Solution:** Add a trailing slash to the target path:

```json
// Before
"components/": "./src/components"

// After
"components/": "./src/components/"
```

### Modules Not Updating After Changes

**Problem:** Plumpkin caches modules, so changes might not be reflected.

**Solution:** Clear the cache:

```javascript
importmap.clearCache();
```

### Can't Find package.json

**Problem:** Plumpkin searches upward from its location to find package.json.

**Solution:** Make sure:
1. Your package.json is in a parent directory
2. You're running Node.js from within your project
3. Your package.json has `"type": "module"` set

### Configuration Not Taking Effect

**Problem:** You changed `importmapField` or `importmapRemote` in package.json but it's not working.

**Solution:** Configuration is frozen after the first import. If you've already imported a module:

1. **Restart your Node.js process** - Configuration is loaded once and frozen
2. **Clear cache and restart** - `importmap.clearCache()` doesn't reload configuration
3. **Check timing** - Make sure package.json changes are saved before the first import

**Why frozen?** For security, these settings cannot be changed at runtime to prevent tampering.

## Examples in Action

### Complete Working Example

**package.json:**
```json
{
  "type": "module",
  "name": "my-app",
  "importmapRemote": true,
  "importmap": {
    "imports": {
      "chalk": "https://esm.sh/chalk@5",
      "config": "./src/config.js",
      "utils/": "./src/utils/",
      "db": "./src/database/connection.js"
    }
  }
}
```

**Note:** This example uses a remote import for `chalk`, so `importmapRemote: true` is required.

**src/config.js:**
```javascript
export default {
  port: 3000,
  dbUrl: 'mongodb://localhost/myapp'
};
```

**src/utils/format.js:**
```javascript
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}
```

**app.js:**
```javascript
import importmap from 'plumpkin';

// Load all modules
const chalk = await importmap('chalk');
const config = await importmap('config');
const { formatDate } = await importmap('utils/format.js');
const db = await importmap('db');

// Use them
console.log(chalk.green('App started!'));
console.log('Port:', config.port);
console.log('Date:', formatDate(new Date()));
```

Run it:
```bash
node app.js
```

## Testing

Plumpkin uses Node.js's built-in test runner and assertion library. Tests are located in the `test/` directory.

### Running Tests

```bash
npm test
```

### Test Coverage

The test suite includes:

- **Basic Import Mapping** - Exact matches and prefix matching
- **Longest Prefix Matching** - Ensures the spec-compliant resolution algorithm works
- **Scopes** - Context-specific import resolution
- **Caching** - Module caching and cache clearing
- **Security** - Configuration validation and security features
- **API** - Exported functions and methods
- **Error Handling** - Non-existent specifiers and validation

### Test Structure

```
test/
├── fixtures/           # Test modules and fixtures
│   ├── test-module.js
│   ├── scoped-module.js
│   ├── utils/
│   └── special/
├── index.test.js       # Main functionality tests
├── scopes.test.js      # Scope resolution tests
└── security.test.js    # Security feature tests
```

## Contributing

Issues and pull requests welcome at [github.com/catpea/plumpkin](https://github.com/catpea/plumpkin)

## License

MIT - see LICENSE file
