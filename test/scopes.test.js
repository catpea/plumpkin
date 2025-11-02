import { test, describe } from 'node:test';
import assert from 'node:assert';
import importmap from '../index.js';

describe('Plumpkin Scopes', () => {

  describe('Scope Resolution', () => {

    test('should use default import when no referrer provided', async () => {
      // Clear cache before test
      importmap.clearCache();

      // Import without referrer URL
      const defaultModule = await importmap('scoped');

      assert.strictEqual(defaultModule.version, 'default');
      assert.strictEqual(defaultModule.name, 'scoped-module');
    });

    test('should use default import when referrer does not match scope', async () => {
      // Clear cache before test
      importmap.clearCache();

      // Import without scope context (or with non-matching context)
      const defaultModule = await importmap('scoped', './test/app.js');

      assert.strictEqual(defaultModule.version, 'default');
      assert.strictEqual(defaultModule.name, 'scoped-module');
    });

    test('should use scoped import when referrer matches scope', async () => {
      // Clear cache before test
      importmap.clearCache();

      // Import with scope context matching './test/fixtures/special/'
      const specialModule = await importmap('scoped', './test/fixtures/special/app.js');

      assert.strictEqual(specialModule.version, 'special');
      assert.strictEqual(specialModule.name, 'scoped-module-special');
    });

  });

});
