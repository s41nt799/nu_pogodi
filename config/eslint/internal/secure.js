module.exports = {
  extends: ['plugin:security/recommended-legacy'],
  rules: {
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-non-literal-require': 'error', // правило нацелено на предотвращение высокого потребления CPU на сервере при парсинге пользовательского запроса, на клиенте правило не имеет отношения к безопасности
    'security/detect-object-injection': 'off' // https://github.com/eslint-community/eslint-plugin-security/blob/main/docs/the-dangers-of-square-bracket-notation.md
  }
};
