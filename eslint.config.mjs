import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  // 1. グローバル無視設定
  globalIgnores([
    'logs',
    '*.log',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'lerna-debug.log*',
    'report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json',
    'pids',
    '*.pid',
    '*.seed',
    '*.pid.lock',
    '.DS_Store',
    'lib-cov',
    'coverage',
    '*.lcov',
    '.nyc_output',
    '.lock-wscript',
    'build/Release',
    'node_modules/',
    'jspm_packages/',
    'typings/',
    '*.tsbuildinfo',
    '.npm',
    '.eslintcache',
    '.node_repl_history',
    '*.tgz',
    '.yarn-integrity',
    '.env',
    '.env.test',
    '.cache',
    '.next',
    '.nuxt',
    '.vuepress/dist',
    '.serverless/',
    '.fusebox/',
    '.dynamodb/',
    '.webpack/',
    '.vite/',
    'out/',
  ]),

  // 2. JS / TS ネイティブ推奨設定（配列を展開して挿入）
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. 旧形式プラグインのみ FlatCompat で読み込み
  ...fixupConfigRules(
    compat.extends(
      'plugin:import-x/recommended',
      'plugin:import-x/electron',
      'plugin:import-x/typescript',
      'prettier'
    )
  ),

  // 4. プロジェクト固有の設定
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es6,
        ...globals.node,
      },
    },
    rules: {
      'import-x/no-unresolved': 'off',
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'no-constant-binary-expression': 'off',
      'no-empty-static-block': 'off',
      'no-new-native-nonconstructor': 'off',
      'no-unused-private-class-members': 'off',
    },
  },
]);
