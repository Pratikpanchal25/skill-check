import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'


/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            // https://eslint.org/docs/rules/linebreak-style
            'linebreak-style': ['error', 'unix'],
            // https://eslint.org/docs/rules/quotes
            'quotes': ['error', 'single'],
            // https://eslint.org/docs/rules/semi
            'semi': ['error', 'never'],
            // https://eslint.org/docs/rules/keyword-spacing
            'keyword-spacing': ['error', { 'before': true }],
            // https://eslint.org/docs/rules/space-before-blocks
            'space-before-blocks': ['error', 'always'],
            // https://eslint.org/docs/rules/no-multiple-empty-lines
            'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
            // https://eslint.org/docs/rules/comma-spacing
            'comma-spacing': ['error', { 'before': false, 'after': true }],
            // https://eslint.org/docs/rules/spaced-comment
            'spaced-comment': ['error', 'always'],
            // https://eslint.org/docs/rules/no-trailing-spaces
            'no-trailing-spaces': 'error',
            // https://eslint.org/docs/rules/comma-dangle
            'comma-dangle': ['error', 'never'],
            // https://eslint.org/docs/rules/array-bracket-spacing
            'array-bracket-spacing': ['error', 'never'],
            // https://eslint.org/docs/rules/eol-last
            'eol-last': ['error', 'always'],
            // https://eslint.org/docs/rules/no-var
            'no-var': 'error',
            // https://eslint.org/docs/rules/no-debugger
            'no-debugger': 'error'
        }
    },
    {
        ignores: ['dist/**/*']
    }
]
