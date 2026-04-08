module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
    },
    extends: [
        'eslint:recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
    ],
    plugins: ['react-refresh', 'jsx-a11y'],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'server', '*.test.*'],
    globals: {
        React: 'readonly',
        JSX: 'readonly',
    },
    rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/no-static-element-interactions': 'warn',
        'jsx-a11y/anchor-is-valid': 'warn',
    },
};
