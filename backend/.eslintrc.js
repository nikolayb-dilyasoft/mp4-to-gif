module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
        'prettier'
    ],
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'warn',
        'no-unused-vars': ['error', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }],
        'no-use-before-define': ['error', { 
            'functions': false,
            'classes': true,
            'variables': true
        }],
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'brace-style': ['error', '1tbs'],
        'indent': ['error', 4],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'comma-dangle': ['error', 'always-multiline'],
        'no-trailing-spaces': 'error',
        'max-len': ['error', { 
            'code': 100,
            'ignoreUrls': true,
            'ignoreStrings': true,
            'ignoreTemplateLiterals': true,
            'ignoreRegExpLiterals': true
        }],
        'camelcase': ['error', {
            'properties': 'never',
            'ignoreDestructuring': true
        }],
        'no-multiple-empty-lines': ['error', { 
            'max': 1,
            'maxEOF': 1
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', {
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }]
    },
    ignorePatterns: [
        'node_modules/',
        'dist/',
        'build/',
        'coverage/',
        '*.config.js'
    ]
};
