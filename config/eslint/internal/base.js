module.exports = {
  extends: ['eslint-config-airbnb-base', 'plugin:eslint-comments/recommended'],

  parser: '@babel/eslint-parser',

  settings: {
    'import/parser': '@babel/eslint-parser',
  },

  plugins: ['@babel'],

  parserOptions: {
    requireConfigFile: false,
    ecmaFeatures: {
      legacyDecorators: true,
    },
  },

  rules: {
    'no-param-reassign': ['error', { props: false }],
    'no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    'no-use-before-define': [
      'error',
      {
        functions: false,
        classes: false,
        variables: true,
      },
    ],
    'func-name-matching': 'off',
    'global-require': 'off',
    'class-methods-use-this': 'off',
    'no-continue': 'off',
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    'guard-for-in': 'off',
    'no-plusplus': ['warn', { allowForLoopAfterthoughts: true }],
    'consistent-return': 'warn',
    'vars-on-top': 'warn',
    camelcase: [
      'warn',
      {
        allow: ['^UNSAFE_'],
        ignoreDestructuring: false,
        properties: 'never',
      },
    ],
    'func-style': [
      'error',
      'declaration',
      {
        allowArrowFunctions: true,
      },
    ],
    'max-depth': ['warn', 4],
    'max-params': ['warn', 4],
    complexity: ['error', 25],
    'max-statements': ['error', 25],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-underscore-dangle': 'off',
    'no-return-assign': ['error', 'except-parens'],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'spaced-comment': ['error', 'always', { exceptions: ['*'] }],
    'max-nested-callbacks': ['error', 4],
    'no-bitwise': 'warn',
    'no-useless-escape': 'warn',

    'array-callback-return': ['error'],
    'default-case': ['error'],
    'dot-notation': ['error'],
    eqeqeq: ['error'],
    'init-declarations': ['error', 'always'],
    'max-classes-per-file': ['error', 1],
    'no-alert': ['error'],
    'no-await-in-loop': ['error'],
    'no-constant-condition': ['error'],
    'no-else-return': ['error'],
    'no-empty-function': ['error'],
    'no-implicit-coercion': ['error'],
    'no-useless-call': ['error'],
    'no-var': ['error'],
    'prefer-const': ['error'],
    'prefer-destructuring': ['error'],
    'prefer-promise-reject-errors': ['error'],
    'prefer-regex-literals': ['error'],
    'valid-typeof': ['error'],
    /* https://confluence.kaspersky.com/display/CAO/ESLint */
    /* Security warnings */
    'no-unsafe-finally': ['error'],
    'no-control-regex': ['error'],
    'no-dupe-class-members': ['error'],
    'no-func-assign': ['error'],
    'no-misleading-character-class': ['error'],
    'no-redeclare': ['error'],
    'no-loss-of-precision': ['error'],
    'no-global-assign': ['error'],
    'no-shadow-restricted-names': ['error'],
    /* no security but misleading */
    'no-prototype-builtins': ['error'],
    'no-cond-assign': ['error'],
    'no-setter-return': ['error'],
    'getter-return': ['error'],
    'no-self-assign': ['error'],
    'no-sparse-arrays': ['error'],
    'no-undef': ['error'],
  },
};
