import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * ESLint 9 flat config
 * - @typescript-eslint：TS 类型与代码质量规则
 * - react-hooks：Hooks 规则（rules-of-hooks / exhaustive-deps）
 * - react-refresh：仅开发环境，Fast Refresh 边界检查
 *
 * 配置原则：先以 warning 落地，避免一次性把现有代码全部阻断构建。
 */
export default tseslint.config(
  // 忽略目录与无需 TS 校验的配置/脚本文件
  {
    ignores: [
      'dist',
      'coverage',
      'node_modules',
      'src/lib/mockData.ts',
      'src/lib/mockRouter.ts',
      'eslint.config.js',
      'postcss.config.js',
      'vite.config.ts',
      'scripts/**',
    ],
  },

  // 基础 JS 推荐规则
  js.configs.recommended,

  // TS 推荐规则（非 type-checked 版本，避免历史包袱一次性报数百个 error）
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ['tailwind.config.ts', 'vitest.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React 专属规则
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // 项目级规则微调
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // 显式 any 在 API 层尚未完全清理前暂降级为 warn（见 #10）
      '@typescript-eslint/no-explicit-any': 'warn',
      // 未使用变量保留报错，但允许下划线前缀豁免
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // exhaustive-deps 用 warn，避免大量现有 disable 失控
      'react-hooks/exhaustive-deps': 'warn',
      // 关闭需类型信息的严格规则（当前用非 type-checked 配置）
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },

  // 测试文件放宽
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // 脚本与配置文件
  {
    files: ['*.mjs', '*.cjs', 'scripts/**/*.{mjs,js}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Tailwind 配置用 require() 加载插件，属合法用法
  {
    files: ['tailwind.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
