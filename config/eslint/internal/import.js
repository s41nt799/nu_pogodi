module.exports = {
  plugins: ['import'],

  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
      typescript: {},
      webpack: {},
    },
  },

  rules: {
    'import/no-commonjs': 'off',
    'import/unambiguous': 'off',
    'import/no-deprecated': 'warn',
    'import/prefer-default-export': 'off', // default imports is evil
    'import/default': 'error', // enable default import validation
    'import/extensions': [
      'error',
      'always',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
        pathGroups: [
          {
            pattern: '@kl/**',
            group: 'external',
            position: 'after',
          },
          {
            pattern: '@*/**',
            group: 'internal',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['internal', '@kl/**'],
      },
    ],
    // TODO Need on after fix KeyValues and DatePicker
    // "import/no-internal-modules": [
    //   "error",
    //   {
    //     forbid: ['@kl/components-v6/**/*'],
    //   }
    // ],
    'import/no-extraneous-dependencies': 'off',
    'import/no-cycle': 'off',
    'import/no-restricted-paths': [
      'error',
      {
        'zones': [
          // {
          //   'target': './src/client',
          //   'from': './src/server',
          //   'message': 'Export to the "./src/client" from "./src/server" is prohibited',
          // },
          {
            'target': ['./client'],
            'from': ['./src/server', './server'],
            'message': 'Export to the "["./client", "./src/client"]" from ["./src/server", "./server"] is prohibited',
          },
          // Replace the top 2 rules after fixing (129 errors) imports from the server to ./src/client
          // {
          //   'target': ['./client', './src/client'],
          //   'from': ['./src/server', './server'],
          //   'message': 'Export to the ["./src/client", "./client"] from the ["./server", "./src/server"] is prohibited',
          // },
          // For fix errors top rules
          // {
          //   'target': './src/client',
          //   'from': './server',
          //   'message': 'Export to the "./src/client" from "./server" is prohibited',
          // },
          {
            'target': ['./server', './src/server'],
            'from': ['./src/client', './client'],
            'message': 'Export to the ["./server", "./src/server"] from ["./src/client", "./client"] is prohibited',
          },
          {
            'target': './@mainShared',
            'from': ['./src/server', './src/client', './client', './server'],
            'message': 'Export to the "./@mainShared" from ["./src/server", "./src/client", "./client", "./server"] is prohibited',
          },
        ],
      },
    ],
  },
};
