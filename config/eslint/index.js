module.exports = {
  extends: [
    './internal/base',
    './internal/import',
    './internal/promise',
    './internal/typescript',
    './internal/prettier',
    './internal/react',
    './internal/secure',
  ],

  env: {
    browser: true,
    node: true,
  },
};
