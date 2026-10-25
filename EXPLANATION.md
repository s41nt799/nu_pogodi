<a id="top"></a>
# EXPLANATION.md — «Ну, погоди! — Электроника»

**Стек:** React 17, TypeScript 5, Webpack 5, Less + CSS Modules, Web Audio API, Vitest + Testing Library + jsdom.

**Назначение:** браузерная ретро-аркада, в которой волк двигается по игровому полю и ловит падающие яйца. Код разделён на чистую игровую модель, React-представление, игровой цикл на `requestAnimationFrame`, звуковой менеджер и адаптивное CSS-оформление.

**Дата генерации:** 25 октября 2026 года.

## Содержание

- [1. Обзор проекта](#overview)
- [2. Архитектура, поток данных и порядок разбора](#architecture)
- [3. Разбор файлов](#analysis)
- [4. Тесты](#tests)
- [5. Сквозные сценарии](#scenarios)
- [6. Глоссарий терминов и API](#glossary)
- [7. Известные ограничения и возможные улучшения](#limitations)
- [8. Отсутствующие файлы](#missing-files)
- [9. Самопроверка](#self-check)

<a id="overview"></a>
## 1. Обзор проекта

Игрок управляет волком у нижней границы поля 800 × 600. Сверху падают яйца: пойманное яйцо даёт одно очко, упавшее на землю отнимает жизнь. После трёх пропусков раунд заканчивается, а лучший результат сохраняется в `localStorage`.

Сложность растёт автоматически: каждые 12 секунд увеличивается скорость падения яиц и сокращается интервал их появления. На поле может одновременно находиться несколько яиц.

#### Состояния игры

| Состояние | Что видит игрок | Как попасть | Что происходит с циклом |
|---|---|---|---|
| `start` | Стартовый экран, рекорд, подсказки, кнопка «Играть» | Начальная инициализация; выход в меню | Игровой цикл выключен |
| `playing` | Поле, HUD, волк, яйца, экранные кнопки | «Играть», «Заново», продолжение паузы | `requestAnimationFrame` вызывает `updateState` |
| `paused` | Затемнённое поле и диалог с действиями | Кнопка паузы, `P`, `Esc`, `Пробел`, скрытие вкладки | Цикл остановлен, ввод сброшен |
| `gameover` | Финальный счёт, рекорд, кнопки «Заново» и «В меню» | Потеря последней жизни | Цикл выключен, рекорд сохраняется |

Состояние хранится в `GameModel.phase` (`src/game/types.ts`) и меняется чистыми функциями `startGame`, `togglePause`, `updateState` и `resetGame`. Исключение — `App`, который создаёт начальное состояние через `createInitialState` и переключает экраны по `phase`.

<a id="architecture"></a>
## 2. Архитектура, поток данных и порядок разбора

#### Дерево проекта

```text
.
├── .vscode/
│   └── settings.json             # автоформатирование и ESLint для VS Code
├── config/
│   ├── eslint/
│   │   ├── index.js              # композиция локального ESLint-конфига
│   │   └── internal/             # base/import/promise/typescript/prettier/react/secure
│   └── prettier/
│       └── index.js              # единые правила Prettier
├── public/
│   ├── favicon.ico               # бинарная иконка сайта
│   └── index.html                # HTML-шаблон HtmlWebpackPlugin
├── src/
│   ├── audio/                    # SoundManager на Web Audio API
│   ├── components/               # App, экраны, HUD, управление, SVG-спрайты
│   ├── game/                     # типы, конфигурация и чистая логика
│   ├── hooks/                    # useGameLoop
│   ├── styles/                   # общие CSS-модули кнопок и сцены
│   ├── test/                     # setup для Testing Library
│   ├── utils/                    # безопасная работа с localStorage
│   ├── App.test.tsx              # компонентные тесты
│   ├── index.css                 # глобальный reset
│   └── index.ts                  # точка входа бандла
├── types/
│   └── index.d.ts                # объявления CSS/LESS/PNG-модулей
├── package.json
├── package-lock.json             # lock-файл, не разбирается
├── tsconfig.json
├── vitest.config.ts
├── webpack.config.js
├── .eslintrc.cjs
├── .eslintignore
├── .prettierrc.js
├── .prettierignore
└── README.md
```

`node_modules/`, `dist/`, `.git/` и `package-lock.json` намеренно исключены из разбора. В текущем рабочем окружении каталога `.git` нет.

#### Поток данных

1. Webpack собирает `src/index.ts` в `dist/bundle.js`; `HtmlWebpackPlugin` создаёт `dist/index.html` и подключает бандл.
2. `src/index.ts` импортирует глобальный CSS и модуль `src/components/Init.tsx`.
3. `Init.tsx` вызывает `ReactDOM.render(<StrictMode><App /></StrictMode>, #root)`.
4. `App` читает рекорд из `localStorage`, создаёт модель в состоянии `start`, подписывается на клавиатуру и `visibilitychange`.
5. «Играть» вызывает `startGame(highScore)`; `useGameLoop` включает `requestAnimationFrame` при `phase === 'playing'`.
6. Каждый кадр `updateState` двигает волка, яйца, проверяет коллизии, меняет счёт/жизни и при необходимости создаёт яйцо.
7. React перерисовывает `left/top` волка и яиц. `useEffect` сравнивает счёт/жизни/фазу с предыдущими значениями и запускает звуки.
8. При нулевой жизни модель переходит в `gameover`, рекорд записывается в `localStorage`, `App` показывает `GameOverScreen`.
9. «Заново» вызывает `startGame`, «В меню» — `createInitialState`; оба сохраняют рекорд.

#### Порядок разбора и индекс файлов

Сначала разбираются конфиги и документация, затем HTML/типы/точка входа, `App` и компоненты, после них аудио, хук, логика, стили, утилиты и тесты.

**Конфигурация и документация**

[package.json](#file-package-json) · [webpack.config.js](#file-webpack-config-js) · [tsconfig.json](#file-tsconfig-json) · [.eslintrc.cjs](#file-eslintrc-cjs) · [.eslintignore](#file-eslintignore) · [.prettierrc.js](#file-prettierrc-js) · [.prettierignore](#file-prettierignore) · [vitest.config.ts](#file-vitest-config-ts) · [README.md](#file-readme-md) · [.vscode/settings.json](#file-vscode-settings-json) · [config/prettier/index.js](#file-config-prettier-index-js) · [config/eslint/index.js](#file-config-eslint-index-js) · [base.js](#file-config-eslint-internal-base-js) · [import.js](#file-config-eslint-internal-import-js) · [prettier.js](#file-config-eslint-internal-prettier-js) · [promise.js](#file-config-eslint-internal-promise-js) · [react.js](#file-config-eslint-internal-react-js) · [secure.js](#file-config-eslint-internal-secure-js) · [typescript.js](#file-config-eslint-internal-typescript-js)

**HTML, типы и точка входа**

[public/index.html](#file-public-index-html) · [public/favicon.ico](#file-public-favicon-ico) · [types/index.d.ts](#file-types-index-d-ts) · [src/index.ts](#file-src-index-ts) · [src/index.css](#file-src-index-css) · [src/components/Init.tsx](#file-src-components-init-tsx) · [src/components/App/index.ts](#file-src-components-app-index-ts) · [src/components/App/App.tsx](#file-src-components-app-app-tsx)

**Компоненты**

[FarmBackground/index.ts](#file-src-components-farmbackground-index-ts) · [FarmBackground.tsx](#file-src-components-farmbackground-farmbackground-tsx) · [GameOverScreen/index.ts](#file-src-components-gameoverscreen-index-ts) · [GameOverScreen.tsx](#file-src-components-gameoverscreen-gameoverscreen-tsx) · [GameScreen/index.ts](#file-src-components-gamescreen-index-ts) · [GameScreen.tsx](#file-src-components-gamescreen-gamescreen-tsx) · [Hud/index.ts](#file-src-components-hud-index-ts) · [Hud.tsx](#file-src-components-hud-hud-tsx) · [SoundToggle/index.ts](#file-src-components-soundtoggle-index-ts) · [SoundToggle.tsx](#file-src-components-soundtoggle-soundtoggle-tsx) · [StartScreen/index.ts](#file-src-components-startscreen-index-ts) · [StartScreen.tsx](#file-src-components-startscreen-startscreen-tsx) · [TouchControls/index.ts](#file-src-components-touchcontrols-index-ts) · [TouchControls.tsx](#file-src-components-touchcontrols-touchcontrols-tsx) · [Icons.tsx](#file-src-components-icons-tsx) · [Sprites.tsx](#file-src-components-sprites-tsx)

**Аудио, хук и игровая логика**

[SoundManager.ts](#file-src-audio-soundmanager-ts) · [useGameLoop.ts](#file-src-hooks-usegameloop-ts) · [game/types.ts](#file-src-game-types-ts) · [game/config.ts](#file-src-game-config-ts) · [game/logic.ts](#file-src-game-logic-ts)

**Стили**

[App.module.less](#file-src-components-app-app-module-less) · [FarmBackground.module.less](#file-src-components-farmbackground-farmbackground-module-less) · [GameOverScreen.module.less](#file-src-components-gameoverscreen-gameoverscreen-module-less) · [GameScreen.module.less](#file-src-components-gamescreen-gamescreen-module-less) · [Hud.module.less](#file-src-components-hud-hud-module-less) · [SoundToggle.module.less](#file-src-components-soundtoggle-soundtoggle-module-less) · [StartScreen.module.less](#file-src-components-startscreen-startscreen-module-less) · [TouchControls.module.less](#file-src-components-touchcontrols-touchcontrols-module-less) · [buttons.module.less](#file-src-styles-buttons-module-less) · [stage.module.less](#file-src-styles-stage-module-less)

**Утилиты и тесты**

[storage.ts](#file-src-utils-storage-ts) · [App.test.tsx](#file-src-app-test-tsx) · [logic.test.ts](#file-src-game-logic-test-ts) · [test/setup.ts](#file-src-test-setup-ts)

<a id="analysis"></a>
## 3. Разбор файлов

<a id="file-package-json"></a>
### package.json

**Назначение файла.** Манифест npm-проекта: имя, версия, команды разработки/сборки/проверок и все пакеты для React, Webpack, TypeScript, ESLint, Prettier и Vitest.

**Зависимости.** Кода не импортирует; управляет установкой пакетов и запуском инструментов.

**Разбор по блокам.**

```json
// строки 1–5
{
  "name": "intern",
  "version": "1.0.0",
  "description": "Ну, погоди! — Электроника: ретро-аркада на TypeScript и React",
  "main": "dist/index.js",
```

- `name` — техническое имя пакета, попадает в вывод npm-скриптов.
- `version` — версия приложения.
- `description` — краткое описание.
- `main: "dist/index.js"` — историческое поле шаблона. Реальный Webpack-выход — `dist/bundle.js`; для браузерного приложения поле не используется.

```json
// строки 6–12
"scripts": {
  "dev": "webpack serve",
  "build": "webpack",
  "test": "vitest run",
  "lint": "eslint --ext .ts,.tsx src",
  "typecheck": "tsc --noEmit"
}
```

| Скрипт | Значение | Зачем нужен |
|---|---|---|
| `dev` | `webpack serve` | Dev-сервер на порту 8080 с пересборкой и HMR. |
| `build` | `webpack` | Одна сборка в `dist/` по текущему development-конфигу. |
| `test` | `vitest run` | Однократный запуск тестов без watch. |
| `lint` | `eslint --ext .ts,.tsx src` | Проверка только TS/TSX в `src`. |
| `typecheck` | `tsc --noEmit` | Проверка типов без записи файлов. |


```json
// строки 13–58, devDependencies
"devDependencies": {
  "@babel/core": "^7.29.7",
  "@babel/eslint-parser": "^7.29.9",
  "@babel/eslint-plugin": "^7.29.7",
  "@testing-library/jest-dom": "^6.4.8",
  "@testing-library/react": "^12.1.5",
  "@testing-library/user-event": "^14.5.2",
  "@types/classnames": "^2.3.0",
  "@types/react": "17.0.2",
```

| Пакет | Версия | Роль |
|---|---|---|
| `@babel/core` | `^7.29.7` | Ядро Babel для `@babel/eslint-parser`. |
| `@babel/eslint-parser` | `^7.29.9` | Парсер ESLint для JS/JSX; настроен без отдельного Babel-конфига. |
| `@babel/eslint-plugin` | `^7.29.7` | Babel-правила ESLint, подключённые плагином `@babel`. |
| `@testing-library/jest-dom` | `^6.4.8` | Матчеры `toBeInTheDocument`, `toHaveTextContent` и др. |
| `@testing-library/react` | `^12.1.5` | `render`, `screen`, `within`, совместимые с React 17. |
| `@testing-library/user-event` | `^14.5.2` | Имитация кликов/ввода пользователя. |
| `@types/classnames` | `^2.3.0` | Типы `classnames`; сам пакет в коде не используется. |
| `@types/react` | `17.0.2` | Типы React 17. |
| `@types/react-dom` | `17.0.2` | Типы `react-dom` 17. |
| `@typescript-eslint/eslint-plugin` | `^6.21.0` | TypeScript-правила ESLint. |
| `@typescript-eslint/parser` | `^6.21.0` | Парсер TS/TSX для ESLint. |
| `@vitest/coverage-v8` | `^1.6.1` | Провайдер покрытия Vitest (в скриптах пока не включён). |
| `css-loader` | `^6.5.1` | Разбор CSS и CSS Modules. |
| `eslint` | `8.38.0` | Линтер в legacy-формате конфигурации. |
| `eslint-config-airbnb` | `^19.0.4` | Airbnb-правила для React-проектов. |
| `eslint-config-airbnb-base` | `^15.0.0` | Базовые Airbnb-правила без React. |
| `eslint-config-prettier` | `^9.0.0` | Отключает ESLint-правила, конфликтующие с Prettier. |
| `eslint-import-resolver-typescript` | `^2.0.0` | Разрешение TS-импортов для `eslint-plugin-import`. |
| `eslint-import-resolver-webpack` | `^0.12.2` | Разрешение модулей через Webpack. |
| `eslint-plugin-eslint-comments` | `^3.2.0` | Проверка комментариев-директив ESLint. |
| `eslint-plugin-import` | `^2.22.0` | Порядок/валидность импортов. |
| `eslint-plugin-json` | `^3.0.5` | Линт JSON (подключён корневым конфигом). |
| `eslint-plugin-jsx-a11y` | `^6.5.1` | Доступность JSX (входит в Airbnb). |
| `eslint-plugin-prettier` | `4.2.1` | Prettier как правило ESLint. |
| `eslint-plugin-promise` | `^4.2.1` | Правила Promise. |
| `eslint-plugin-react` | `^7.28.0` | React-правила, нужные Airbnb/JSX. |
| `eslint-plugin-react-hooks` | `4.6.0` | Правила хуков; `exhaustive-deps` отключён. |
| `eslint-plugin-security` | `^2.1.1` | Security-правила; используется legacy-пресет. |
| `eslint-plugin-sort-class-members` | `^1.7.0` | Правила порядка членов класса (не включены). |
| `html-webpack-plugin` | `^5.6.8` | Генерация HTML и подключение бандла. |
| `jsdom` | `^24.1.3` | DOM-окружение для тестов. |
| `less` | `4.2.0` | Компилятор Less. |
| `less-loader` | `^11.1.4` | Less-loader для Webpack. |
| `prettier` | `2.8.8` | Форматирование кода. |
| `react` | `17.0.2` | React runtime. |
| `react-dom` | `^17.0.2` | DOM-рендерер; используется legacy `ReactDOM.render`. |
| `style-loader` | `^3.3.1` | Вставка CSS в `<style>` в runtime. |
| `ts-loader` | `^9.5.1` | Компиляция TS/TSX в Webpack. |
| `typescript` | `^5.5.3` | Компилятор и проверка типов. |
| `url-loader` | `^4.1.1` | Изображения в data URL (сейчас не используются). |
| `vitest` | `^1.6.1` | Test runner на Vite. |
| `webpack` | `^5.92.1` | Сборщик. |
| `webpack-cli` | `^4.10.0` | CLI `webpack`/`webpack serve`. |
| `webpack-dev-server` | `^4.11.1` | Dev-сервер и HMR. |


```json
// строки 59–63
"private": true,
"dependencies": {
  "classnames": "^2.3.2"
}
}
```

- `private: true` — запрещает публикацию пакета в npm.
- `classnames` — runtime-зависимость из шаблона; в актуальных `src`-файлах не импортируется, классы собираются шаблонными строками. Удаление пакета возможно, но в рамках этой задачи код не меняется.

**Подводные камни.** `main` не соответствует фактическому `bundle.js`. `react-dom` задан диапазоном `^17.0.2`, тогда как React и типы зафиксированы. `lint` не проверяет CSS, конфиги и файлы вне `src`.

<a id="file-webpack-config-js"></a>
### webpack.config.js

**Назначение файла.** Конфигурация Webpack: точка входа, dev-сервер, обработка TypeScript, Less/CSS Modules и изображений, разрешение модулей и генерация HTML.

**Зависимости.** Node-модуль `path` и `html-webpack-plugin`. Файл использует CommonJS, потому что Webpack CLI загружает его как Node-модуль.

**Разбор по блокам.**

```js
// строки 1–4
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = () => ({
```

- `path` нужен для абсолютных путей.
- `HtmlWebpackPlugin` создаёт итоговый HTML.
- `config` — фабрика, возвращающая объект; Webpack принимает функцию-конфиг.

```js
// строки 5–7
entry: './src/index.ts',
devtool: 'eval-source-map',
mode: 'development',
```

- `entry` — единственная точка входа, из неё строится граф импортов.
- `eval-source-map` — source maps для отладки; увеличивают dev-бандл.
- `mode: 'development'` отключает production-минификацию и оптимизации.

```js
// строки 8–12
output: {
  filename: 'bundle.js',
  path: path.resolve(__dirname, 'dist'),
  publicPath: '/'
},
```

- `filename` — итоговый `bundle.js`.
- `path` — абсолютный `dist/`.
- `publicPath: '/'` — корневой URL для ассетов.

```js
// строки 13–18
devServer: {
  port: 8080,
  static: {
    directory: path.join(__dirname, 'public'),
  },
},
```

- Порт `8080` используется README и ручными проверками.
- `static` раздаёт `public/` напрямую; HTML генерирует плагин.

```js
// строки 21–33
{
  test: /\.tsx?$/,
  use: [{
    loader: 'ts-loader',
    options: {
      transpileOnly: true,
      configFile: path.resolve(__dirname, 'tsconfig.json'),
    },
  }],
  exclude: [/node_modules/],
},
```

- Правило для `.ts`/`.tsx`.
- `transpileOnly: true` означает: Webpack не проверяет типы, это делает отдельный `npm run typecheck`.
- `configFile` указывает на `tsconfig.json`.

```js
// строка 34
{ test: /\.mjs$/, include: /node_modules/, type: 'javascript/auto' },
```

- Позволяет импортировать `.mjs` из зависимостей как обычные ES-модули.

```js
// строки 35–55
{
  test: /\.(css|less)$/,
  exclude: /module\.less$/,
  use: [
    'style-loader',
    { loader: 'css-loader', options: { esModule: false } },
    { loader: 'less-loader', options: { lessOptions: { javascriptEnabled: true } } },
  ],
},
```

- Обрабатывает глобальные CSS/LESS, кроме CSS Modules.
- Цепочка выполняется справа налево: Less → CSS → вставка в DOM.
- `javascriptEnabled` разрешает Less-синтаксис с JavaScript-выражениями (в проекте не используется, но оставлен из шаблона).

```js
// строки 56–79
{
  test: /\.less$/,
  include: /module\.less$/,
  use: [
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        esModule: false,
        modules: { localIdentName: '[local]_[hash:base64:5]' },
      },
    },
    { loader: 'less-loader', options: { lessOptions: { javascriptEnabled: true } } },
  ],
},
```

- Отдельное правило для `*.module.less`.
- `modules` включает CSS Modules и создаёт уникальные локальные имена.
- `[local]` сохраняет читаемое имя, хеш защищает от коллизий.

```js
// строки 80–89
{
  test: /\.(png|jpg|gif)$/,
  use: [{ loader: 'url-loader' }],
  include: [path.resolve('./src')],
  type: 'javascript/auto',
},
```

- Позволяет импортировать изображения из `src`.
- В текущем приложении PNG/JPG/GIF не используются.

```js
// строки 92–99
resolve: {
  fallback: { fs: false, tls: false },
  extensions: ['.js', '.jsx', '.ts', '.tsx', '*'],
  unsafeCache: true,
},
```

- `fallback` глушит Node-модули `fs`/`tls`.
- `extensions` позволяет опускать расширения.
- `unsafeCache` ускоряет повторные сборки.

```js
// строки 100–105
plugins: [
  new HtmlWebpackPlugin({
    template: path.resolve(__dirname, 'public/index.html'),
    filename: 'index.html',
  }),
],
```

- Плагин создаёт HTML и сам добавляет `<script>` с бандлом.

```js
// строка 108
module.exports = config;
```

- Экспорт функции для Webpack CLI.

**Подводные камни.** `build` тоже работает в development-режиме и с `eval-source-map`, поэтому бандл большой и не минифицирован. Нет правил для SVG, шрифтов и аудио. `transpileOnly` не заменяет `typecheck`. `main` в package.json не совпадает с `bundle.js`.

<a id="file-tsconfig-json"></a>
### tsconfig.json

**Назначение файла.** Настройки TypeScript: цель, модульная система, библиотеки, строгость, JSX и каталоги.

**Зависимости.** Используется `ts-loader` и `tsc`; импортов нет.

**Разбор по ключам.**

```json
// строки 1–4
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "CommonJS",
```

- `target: ESNext` — современный синтаксис без понижения.
- `module: CommonJS` — TypeScript компилирует в CJS, Webpack связывает модули в бандл; Vitest обрабатывает TS своим трансформатором.

```json
// строки 5–11
"lib": ["DOM", "ES5"],
"esModuleInterop": true,
"strict": true,
"skipLibCheck": true,
```

- `lib` объявляет DOM и ES5. Код использует `Array.from` и `Number.isFinite` из ES2015+, которые фактически приходят из типов окружения; это потенциальная хрупкость.
- `esModuleInterop` разрешает `import React from 'react'`.
- `strict` включает `noImplicitAny`, `strictNullChecks` и другие проверки.
- `skipLibCheck` не проверяет внутренние конфликты сторонних `.d.ts`.

```json
// строки 12–15
"outDir": "dist",
"typeRoots": ["node_modules/@types", "types"],
"jsx": "react-jsx",
"importHelpers": true
```

- `outDir` задан, но используется `--noEmit`; реальную сборку делает Webpack.
- `typeRoots` подключает стандартные типы и локальные декларации.
- `jsx: react-jsx` включает автоматический JSX-runtime React 17.
- `importHelpers` заставляет использовать helper’ы из `tslib` при трансформациях.

```json
// строки 17–20
"include": ["src", "types", "config"],
"exclude": ["node_modules"]
```

- Проверяются `src`, декларации и конфиги.
- JS-файлы `config` без `allowJs` не компилируются; фактически TypeScript проверяет `src` и `types`.

**Подводные камни.** Узкий `lib` не содержит ES2015+, хотя код использует соответствующие методы. Нет `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`. `module: CommonJS` при `target: ESNext` допустим для Webpack, но не является современной ESM-конфигурацией.

<a id="file-eslintrc-cjs"></a>
### .eslintrc.cjs

**Назначение файла.** Корневой ESLint-конфиг: подключает локальную сборку правил и JSON-плагин.

**Зависимости.** `./config/eslint`, `eslint-plugin-json`; CommonJS требует расширение `.cjs`.

**Разбор.**

```js
// строки 1–7
module.exports = {
  extends: ['./config/eslint', 'plugin:json/recommended'],
  settings: {
    react: { version: '17.0.2' },
  },
```

- `extends` объединяет локальные presets и JSON-правила.
- `settings.react.version` сообщает `eslint-plugin-react`, какую версию React считать целевой.

```js
// строки 8–19
parserOptions: { tsconfigRootDir: __dirname },
globals: {
  runtime: 'readonly', _: 'readonly', server: 'readonly', config: 'readonly',
  describe: 'readonly', test: 'readonly', expect: 'readonly',
  atob: 'readonly', btoa: 'readonly',
},
```

- `tsconfigRootDir` задаёт корень для резолверов.
- `runtime`, `_`, `server`, `config` — наследие шаблона, в текущем коде не используются.
- `describe`, `test`, `expect` объявлены глобальными, хотя тесты импортируют их из Vitest.
- `atob`/`btoa` объявлены readonly.

**Подводные камни.** Формат `.eslintrc` устарел для ESLint 9; текущий ESLint 8.38 его поддерживает. Дублирующиеся глобальные имена тестов не влияют на выполнение, но создают лишнюю конфигурацию.

<a id="file-eslintignore"></a>
### .eslintignore

**Назначение.** Список путей, которые ESLint не проверяет.

**Разбор по строкам.**

```text
// строки 1–11
node_modules
.idea
.vscode

_build
ci
config
3pc
sdl
coverage
docs
scripts
```

- `node_modules` — зависимости.
- `.idea`, `.vscode` — IDE-метаданные.
- `_build`, `ci`, `coverage`, `docs`, `scripts` — каталоги из шаблона, в проекте могут отсутствовать.
- `config` — ESLint-конфиги не линтуются, но загружаются.
- `3pc`, `sdl` — наследие исходного шаблона.

**Подводные камни.** `dist` не указан, но `npm run lint` и так запускается только по `src`. Ошибки внутри `config` проявятся только при загрузке конфигурации.

<a id="file-prettierrc-js"></a>
### .prettierrc.js

**Назначение.** Перенаправляет правила Prettier в общий `config/prettier/index.js`.

**Зависимости.** `./config/prettier`.

**Разбор.**

```js
// строки 1–3
module.exports = {
  ...require('./config/prettier'),
};
```

- Создаётся объект с копией всех ключей общего конфига.
- Слой позволяет при необходимости переопределить настройки локально.

**Подводные камни.** `.prettierignore` игнорирует `*.js`, поэтому сам конфиг не форматируется Prettier’ом.

<a id="file-prettierignore"></a>
### .prettierignore

**Назначение.** Исключает артефакты и JS-конфиги из форматирования.

**Разбор.**

```text
// строки 1–3
dist
node_modules/*
*.js
```

- `dist` — результат сборки.
- `node_modules/*` — зависимости.
- `*.js` — все JS-файлы, включая конфиги; Prettier через ESLint форматирует только TS/TSX в `src`.

**Подводные камни.** `*.js` не исключает `.cjs`; конфиги вручную не форматируются. Markdown/JSON/LESS не игнорируются.

<a id="file-vitest-config-ts"></a>
### vitest.config.ts

**Назначение.** Конфигурация Vitest: jsdom, глобальные API, setup-файл, CSS и алиас `@`.

**Зависимости.** `vitest/config`, Node `path`.

**Разбор.**

```ts
// строки 1–2
import { defineConfig } from 'vitest/config';
import path from 'path';
```

- `defineConfig` типизирует конфиг.
- `path` нужен для абсолютного алиаса.

```ts
// строки 4–9
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

- Алиас `@` указывает на `src`; в текущем коде не используется.

```ts
// строки 10–15
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  css: true,
},
```

- `globals` разрешает `describe/it/expect` без импорта.
- `jsdom` создаёт DOM, `window`, `document`, `localStorage`.
- `setupFiles` подключает jest-dom-матчеры.
- `css: true` позволяет обрабатывать CSS-импорты компонентов.

**Подводные камни.** Алиас не продублирован в `tsconfig.paths`; при использовании `@` в TypeScript IDE может не найти модуль. jsdom не воспроизводит реальную раскладку/CSS.

<a id="file-readme-md"></a>
### README.md

**Назначение.** Пользовательская и техническая документация: запуск, команды, управление, правила, архитектура, тесты.

**Зависимости.** Нет, Markdown.

**Разбор по блокам.**

- Заголовок и вступление описывают игру.
- «Запуск»: `npm i`, `npm run dev`, адрес `http://localhost:8080`.
- Блок команд: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- «Управление»: стрелки/A/D, `P`/`Esc`/пробел, экранные кнопки, звук и пауза.
- «Правила»: 3 жизни, +1 за яйцо, −1 за пропуск, рекорд в `localStorage`, ускорение каждые 12 секунд.
- «Архитектура»: каталоги, чистые функции `logic.ts`, настройки в `config.ts`.
- «Тесты»: описание двух тестовых файлов, CSS/inline-SVG/Web Audio.
- Финал: звук запускается после действия пользователя из-за autoplay-политики.

**Подводные камни.** README не упоминает development-режим сборки, отсутствие серверной части и особенность портретной раскладки.

<a id="file-vscode-settings-json"></a>
### .vscode/settings.json

**Назначение.** Настройки VS Code для единообразного форматирования и запуска ESLint.

**Разбор.**

```json
// строки 1–12
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 30000,
  "editor.formatOnPaste": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": [".."],
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit"
  },
  "eslint.run": "onSave"
}
```

- Автосохранение через 30 секунд.
- Форматирование при вставке/сохранении.
- Prettier выбран основным форматтером.
- ESLint ищет конфиг на уровень выше.
- `source.fixAll` запускает автоисправления по сохранению.
- `eslint.run` — линт при сохранении.

**Подводные камни.** `eslint.workingDirectories: [".."]` зависит от открытой папки и может быть избыточным при открытии корня.

<a id="file-config-prettier-index-js"></a>
### config/prettier/index.js

**Назначение.** Единый источник правил Prettier, подключаемый корневым `.prettierrc.js`.

**Разбор.**

```js
// строки 1–11
module.exports = {
  printWidth: 120,
  singleQuote: true,
  avoidEscape: true,
  trailingComma: 'all',
  bracketSpacing: true,
  jsxBracketSameLine: false,
  tabWidth: 2,
  semi: true,
  endOfLine: 'auto',
};
```

- `printWidth: 120` — длина строки.
- `singleQuote` — одинарные кавычки.
- `avoidEscape` — попытка избегать экранирования; Prettier 2.8 не знает эту опцию и предупреждает.
- `trailingComma: all` — висячие запятые.
- `bracketSpacing` — пробелы внутри `{}`.
- `jsxBracketSameLine: false` — `>` JSX на новой строке; опция deprecated в Prettier 2.8.
- `tabWidth`, `semi`, `endOfLine` — два пробела, точки с запятой, авто-переводы строк.

**Подводные камни.** Предупреждения при форматировании связаны с `avoidEscape` и `jsxBracketSameLine`. Это не ошибки линта, но шум в выводе.

<a id="file-config-eslint-index-js"></a>
### config/eslint/index.js

**Назначение.** Композиция локального ESLint-конфига из тематических presets.

**Зависимости.** Внутренние файлы `./internal/*`.

**Разбор.**

```js
// строки 1–16
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
  env: { browser: true, node: true },
};
```

- Порядок extends важен: более поздние правила переопределяют ранние.
- `base` — Airbnb-base и общие ограничения.
- `import` — импорт-правила.
- `promise` — Promise.
- `typescript` — TS-overrides.
- `prettier` — интеграция Prettier.
- `react` — хуки.
- `secure` — security.
- `browser`/`node` добавляют соответствующие глобальные имена.

**Подводные камни.** Одновременные browser/node env могут скрыть использование Node-глобалов в клиентском коде. JS-конфиги проверяются базовым Babel-парсером, TS/TSX — TypeScript-парсером.

<a id="file-config-eslint-internal-base-js"></a>
### config/eslint/internal/base.js

**Назначение.** Базовые JS-правила на основе Airbnb и `eslint-comments`, парсер Babel и набор ограничений сложности/стиля.

**Зависимости.** Пакеты `eslint-config-airbnb-base`, `eslint-plugin-eslint-comments`, `eslint-plugin-@babel`, `@babel/eslint-parser`.

**Разбор по блокам.**

```js
// строки 1–17
module.exports = {
  extends: ['eslint-config-airbnb-base', 'plugin:eslint-comments/recommended'],
  parser: '@babel/eslint-parser',
  settings: { 'import/parser': '@babel/eslint-parser' },
  plugins: ['@babel'],
  parserOptions: {
    requireConfigFile: false,
    ecmaFeatures: { legacyDecorators: true },
  },
```

- Airbnb-base даёт большой набор правил JS.
- `eslint-comments` проверяет корректность `eslint-disable`.
- Babel-парсер не требует отдельного Babel-конфига.
- `legacyDecorators` поддерживает старый синтаксис декораторов.
- `plugins`/`settings` сообщают плагинам, каким парсером пользоваться.

```js
// строки 19–39
'no-param-reassign': ['error', { props: false }],
'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],
'func-name-matching': 'off',
'global-require': 'off',
'class-methods-use-this': 'off',
'no-continue': 'off',
```

- Запрещена переприсваиваемая переменная-параметр, но разрешены мутации свойств.
- Короткие замыкания и тернарники разрешены как выражения.
- Функции/классы можно использовать до объявления, переменные — нельзя.
- Отключены правила, мешавшие шаблонному коду.

```js
// строки 40–54
'no-restricted-syntax': [
  'warn',
  { selector: 'LabeledStatement', message: '...' },
  { selector: 'WithStatement', message: '...' },
],
'guard-for-in': 'off',
'no-plusplus': ['warn', { allowForLoopAfterthoughts: true }],
'consistent-return': 'warn',
'vars-on-top': 'warn',
```

- Метки и `with` запрещены, но только предупреждением.
- `for...in` без guard разрешён.
- `++/--` разрешены в шаге `for`, иначе предупреждение.
- `consistent-return` и `vars-on-top` понижены до warning.

```js
// строки 55–81
camelcase: ['warn', { allow: ['^UNSAFE_'], ... }],
'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
'max-depth': ['warn', 4],
'max-params': ['warn', 4],
complexity: ['error', 25],
'max-statements': ['error', 25],
'no-empty': ['error', { allowEmptyCatch: true }],
'no-underscore-dangle': 'off',
'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
'max-nested-callbacks': ['error', 4],
```

- Разрешены `UNSAFE_`-имена, но camelCase остаётся предупреждением.
- Функции предпочтительно объявлять; стрелки разрешены.
- Ограничения сложности: глубина 4, 4 параметра, 4 вложенных callback, 25 ветвей/statements.
- Пустой `catch` разрешён — это важно для `storage.ts`.
- `_`-префиксы разрешены.

```js
// строки 83–120
'array-callback-return': 'error', 'default-case': 'error', 'dot-notation': 'error',
eqeqeq: 'error', 'init-declarations': 'error', 'max-classes-per-file': 'error',
'no-alert': 'error', 'no-await-in-loop': 'error', 'no-constant-condition': 'error',
'no-else-return': 'error', 'no-empty-function': 'error', 'no-implicit-coercion': 'error',
'no-var': 'error', 'prefer-const': 'error', 'prefer-destructuring': 'error',
'prefer-promise-reject-errors': 'error', 'prefer-regex-literals': 'error',
'valid-typeof': 'error', 
```

- Блок усиливает читаемость и безопасность: обязательные `return` в callback, `default` в `switch`, строгое равенство, инициализация, запрет `var`, предпочтение `const`/деструктуризации/литералов regex.
- `no-alert`, `no-await-in-loop`, `no-implicit-coercion` предотвращают нежелательные практики.

```js
// строки 102–120
'no-unsafe-finally': 'error', 'no-control-regex': 'error',
'no-dupe-class-members': 'error', 'no-func-assign': 'error',
'no-misleading-character-class': 'error', 'no-redeclare': 'error',
'no-loss-of-precision': 'error', 'no-global-assign': 'error',
'no-shadow-restricted-names': 'error', 'no-prototype-builtins': 'error',
'no-cond-assign': 'error', 'no-setter-return': 'error', 'getter-return': 'error',
'no-self-assign': 'error', 'no-sparse-arrays': 'error', 'no-undef': 'error',
```

- Блок «Security warnings» и связанные с ним проверки ловят опасные конструкции: `finally` с `return`, управляющие символы, дубликаты, присваивание функциям, переопределение глобальных имён, `__proto__`-вызовы, присваивание в условии, разреженные массивы.
- `no-undef` важен для JS-конфигов; TypeScript-файлы получают свою версию через `typescript.js`.

**Подводные камни.** `init-declarations: always` конфликтует с распространённой практикой `let` без значения; `func-style` разрешает стрелки, но требует декларации для обычных функций. `no-plusplus` только warning, хотя Airbnb обычно запрещает жёстче. Комментарий со ссылкой на внутреннюю Confluence-страницу не влияет на работу.

<a id="file-config-eslint-internal-import-js"></a>
### config/eslint/internal/import.js

**Назначение.** Правила импортов, порядок групп, резолверы и зоны запрещённых зависимостей.

**Зависимости.** `eslint-plugin-import`, резолверы Node/TypeScript/Webpack.

**Разбор.**

```js
// строки 1–12
plugins: ['import'],
settings: {
  'import/resolver': {
    node: { extensions: ['.js', '.ts'] },
    typescript: {},
    webpack: {},
  },
},
```

- Node-резолвер понимает `.js` и `.ts`.
- TypeScript-резолвер читает `tsconfig.json`.
- Webpack-резолвер использует `webpack.config.js` и алиасы.

```js
// строки 14–29
'import/no-commonjs': 'off',
'import/unambiguous': 'off',
'import/no-deprecated': 'warn',
'import/prefer-default-export': 'off',
'import/default': 'error',
'import/extensions': ['error', 'always', {
  js: 'never', jsx: 'never', ts: 'never', tsx: 'never',
}],
```

- CommonJS в JS-конфигах допустим.
- `prefer-default-export` отключён намеренно.
- Расширения `.js/.jsx/.ts/.tsx` в импортах запрещены; остальные нужно указывать.
- `import/default` проверяет наличие default-экспорта.

```js
// строки 30–50
'import/order': ['error', {
  alphabetize: { order: 'asc', caseInsensitive: true },
  'newlines-between': 'always',
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
  pathGroups: [
    { pattern: '@kl/**', group: 'external', position: 'after' },
    { pattern: '@*/**', group: 'internal', position: 'after' },
  ],
  pathGroupsExcludedImportTypes: ['internal', '@kl/**'],
}],
```

- Импорты сортируются по группам и алфавиту.
- Между группами обязательна пустая строка.
- Группы `@kl/**` и `@*/**` — корпоративные/шаблонные паттерны; в игре не используются.

```js
// строки 51–59
'import/no-extraneous-dependencies': 'off',
'import/no-cycle': 'off',
'import/no-restricted-paths': ['error', { zones: [...] }],
```

- Отключены проверка лишних зависимостей и циклов — они слишком шумны для шаблона.
- `no-restricted-paths` задаёт зоны: клиент не должен импортировать сервер, сервер — клиент, общий модуль не должен зависеть от обеих сторон.
- Зоны ссылаются на отсутствующие в игре `client/server/@mainShared`; для текущего проекта правило фактически не срабатывает.

**Подводные камни.** В конфиге остались закомментированные TODO и корпоративные пути. Сортировка импортов может конфликтовать с ручной группировкой. Резолверы требуют установленных плагинов; при отсутствии `eslint-import-resolver-typescript` конфиг упадёт.

<a id="file-config-eslint-internal-prettier-js"></a>
### config/eslint/internal/prettier.js

**Назначение.** Подключает Prettier как ESLint-правило.

**Разбор.**

```js
// строки 1–7
module.exports = {
  extends: ['prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
  },
};
```

- `extends: ['prettier']` отключает конфликтующие стилистические правила.
- Плагин `prettier` добавляет правило.
- Любое расхождение с Prettier становится ошибкой ESLint, а не предупреждением.
- Prettier читает `.prettierrc.js` автоматически.

**Подводные камни.** Форматирование теперь часть `npm run lint`; ошибка форматирования валит линт. Предупреждения Prettier 2.8 о неизвестных/устаревших опциях могут появляться в выводе, но не меняют exit code при успешном форматировании.

<a id="file-config-eslint-internal-promise-js"></a>
### config/eslint/internal/promise.js

**Назначение.** Базовые правила `eslint-plugin-promise`.

**Разбор.**

```js
// строки 1–10
module.exports = {
  extends: ['plugin:promise/recommended'],
  rules: {
    'promise/always-return': 'off',
    'promise/no-callback-in-promise': 'off',
    'promise/catch-or-return': 'warn',
    'promise/param-names': 'warn',
  },
};
```

- `recommended` включает базовые проверки Promise.
- `always-return` отключён: не каждый `.then` обязан возвращать значение.
- `no-callback-in-promise` отключён: callback-стиль допустим.
- `catch-or-return` и `param-names` оставлены предупреждениями.

**Подводные камни.** В игре Promise почти не используются, поэтому конфиг не влияет на рантайм. Предупреждения не ломают сборку.

<a id="file-config-eslint-internal-react-js"></a>
### config/eslint/internal/react.js

**Назначение.** Правила React Hooks.

**Разбор.**

```js
// строки 1–7
module.exports = {
  extends: ['plugin:react-hooks/recommended'],
  rules: {
    'react-hooks/exhaustive-deps': 'off',
  },
};
```

- `rules-of-hooks` остаётся ошибкой: хуки нельзя вызывать условно/вне компонента.
- `exhaustive-deps` отключён, поэтому неполные зависимости `useEffect` не считаются ошибкой.
- В проекте это существенно: эффекты `App` намеренно зависят не от всех используемых значений, а от конкретных полей модели.

**Подводные камни.** Отключённый `exhaustive-deps` скрывает риск устаревших замыканий. Например, обработчик клавиатуры использует `soundEnabled`, `phase` и действия; при неверных зависимостях можно получить устаревшее состояние. В текущем коде зависимости подобраны осознанно.

<a id="file-config-eslint-internal-secure-js"></a>
### config/eslint/internal/secure.js

**Назначение.** Security-правила плагина `eslint-plugin-security`.

**Разбор.**

```js
// строки 1–10
module.exports = {
  extends: ['plugin:security/recommended-legacy'],
  rules: {
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'off',
  },
};
```

- `recommended-legacy` соответствует API плагина версии 2.x; вариант `recommended` в этой версии не существует и ломал загрузку конфига.
- `non-literal-fs-filename` и `non-literal-require` важны для Node, но в браузерном коде не встречаются.
- `unsafe-regex` и `non-literal-regexp` защищают от ReDoS/динамических регулярок.
- `possible-timing-attacks` предупреждает о сравнении секретов; в игре секретов нет.
- `object-injection` отключён: правило даёт много ложных срабатываний на обычную индексацию объектов.

**Подводные камни.** Префикс `recommended-legacy` — ключевая деталь: при замене на `recommended` ESLint падает с ошибкой «couldn't find plugin». В клиентском приложении большинство security-правил нерелевантны, но они остаются в общем шаблоне.

<a id="file-config-eslint-internal-typescript-js"></a>
### config/eslint/internal/typescript.js

**Назначение.** TypeScript-парсер и правила для `.ts`/`.tsx`, переопределяющие базовые JS-правила.

**Зависимости.** `@typescript-eslint/parser`, `eslint-plugin-@typescript-eslint`, `plugin:import/typescript`.

**Разбор.**

```js
// строки 1–13
module.exports = {
  extends: ['plugin:@typescript-eslint/eslint-recommended'],
  overrides: [{
    extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/typescript'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    files: ['*.ts', '*.tsx'],
```

- `eslint-recommended` отключает JS-правила, которые TS проверяет сам.
- `recommended` добавляет TS-правила.
- `plugin:import/typescript` учит `eslint-plugin-import` разрешать TS-импорты.
- `overrides.files` применяет блок только к TS/TSX.

```js
// строки 14–25, 75–78
'no-useless-constructor': 'off',
'@typescript-eslint/explicit-function-return-type': 'off',
'no-unused-vars': 'off',
'@typescript-eslint/no-unused-vars': ['warn', {
  argsIgnorePattern: '^_', varsIgnorePattern: '^_',
}],
'@typescript-eslint/no-explicit-any': 'off',
camelcase: 'off',
```

- Конструктор с parameter properties не считается бесполезным.
- Возвращаемые типы можно не указывать.
- Неиспользуемые аргументы/переменные с `_` игнорируются, остальные — warning.
- `any` разрешён; camelcase отключён в пользу `naming-convention`.

```js
// строки 26–72
'class-methods-use-this': 'off',
'@typescript-eslint/member-ordering': ['off', {...}],
'@typescript-eslint/ban-types': ['error', {
  types: { String: {...}, Boolean: {...}, Number: {...}, Object: {...}, object: {...} },
  extendDefaults: false,
}],
'@typescript-eslint/no-extraneous-class': ['error', {
  allowWithDecorator: true, allowStaticOnly: true,
}],
```

- Порядок членов класса задан, но правило выключено (`off`).
- Запрещены боксированные типы `String/Boolean/Number/Object/object`; предлагаются примитивы или `Record<string, any>`.
- Класс только со статикой или декоратором не считается лишним.

```js
// строки 78–108
'@typescript-eslint/naming-convention': ['error',
  { selector: 'variable', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'allowSingleOrDouble', trailingUnderscore: 'allowSingleOrDouble' },
  { selector: 'property', format: ['camelCase', 'UPPER_CASE', 'snake_case'], ... },
  { selector: 'objectLiteralProperty', format: ['camelCase', 'UPPER_CASE', 'snake_case', 'PascalCase'], ... },
  { selector: 'enum', format: ['PascalCase'] },
  { selector: 'enumMember', format: ['PascalCase'] },
],
```

- Переменные: camelCase/PascalCase/UPPER_CASE, разрешены `_`/`__` по краям.
- Свойства: camelCase/UPPER_CASE/snake_case.
- Свойства объектных литералов допускают ещё PascalCase (например, поля API).
- Enum и его члены — PascalCase.
- Исключение `KLPRSS_Val/KLPRSS_Mnd` — наследие шаблона.

```js
// строки 109–142
'@typescript-eslint/no-var-requires': 'warn',
'@typescript-eslint/no-namespace': 'off',
'no-use-before-define': 'off',
'@typescript-eslint/no-use-before-define': ['error', {
  functions: false, classes: false, variables: true, enums: true, typedefs: true,
}],
'@typescript-eslint/explicit-module-boundary-types': 'off',
'consistent-return': 'off',
'@typescript-eslint/consistent-type-imports': ['warn', {
  prefer: 'type-imports', disallowTypeAnnotations: false,
}],
'no-shadow': 'off',
'@typescript-eslint/no-shadow': ['warn'],
'import/no-duplicates': 'off',
```

- `require` допустим, но предупреждается.
- Namespace разрешён.
- `use-before-define` для переменных/enum/type запрещён, для функций/классов — нет.
- Явные типы на границах модуля не обязательны.
- Предпочтительны `import type`.
- Затенение имён — warning.
- `import/no-duplicates` отключён из-за конфликта с разделением type/value импортов.

**Подводные камни.** `member-ordering` выключен. `naming-convention` может ругаться на CSS-модульные ключи вроде `game-screen`, но такие ключи импортируются как типизированные объекты. `import/no-duplicates` отключён, поэтому дубли импортов не ловятся.

<a id="file-public-index-html"></a>
### public/index.html

**Назначение.** HTML-шаблон, который `HtmlWebpackPlugin` превращает в `dist/index.html`.

**Разбор.**

```html
<!-- строки 1–9 -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0a1322">
  <meta name="description" content="Ну, погоди! Электроника — аркада, в которой волк ловит яйца.">
  <title>Ну, погоди! — Электроника</title>
</head>
```

- `lang="ru"` задаёт язык для скринридеров.
- `viewport` разрешает мобильный масштаб и учитывает «вырезы» (`viewport-fit=cover`).
- `theme-color` красит адресную строку мобильного браузера.
- `description` и `title` описывают игру.
- Кодировка UTF-8 обязательна для русских символов.

```html
<!-- строки 10–13 -->
<body>
<div id="root"></div>
</body>
</html>
```

- Единственный контейнер для React.
- Плагин автоматически добавляет `<script src="/bundle.js">`.

**Подводные камни.** Нет `<noscript>`-сообщения и favicon-link; favicon отдаётся браузеру по стандартному пути, если он есть в `public`. Нет preload для бандла.

<a id="file-public-favicon-ico"></a>
### public/favicon.ico

**Назначение.** Бинарная иконка сайта, копируется Webpack’ом в `dist/` как статический файл.

**Разбор.** Это не текст, а ICO-контейнер; строк и функций внутри нет. Файл не импортируется в TS-код и не участвует в графе зависимостей. Браузер запрашивает `/favicon.ico` автоматически.

**Подводные камни.** В HTML нет явного `<link rel="icon">`; при изменении имени файла иконка перестанет находиться. Содержимое иконки в рамках анализа кода не интерпретируется.

<a id="file-types-index-d-ts"></a>
### types/index.d.ts

**Назначение.** Ambient-декларации для импортов, которые TypeScript сам не понимает: CSS, LESS-модули и PNG.

**Разбор.**

```ts
// строки 1–4
declare module '*.css' {
  const content: { [classNames: string]: string };
  export default content;
}
```

- Любой `import styles from './x.css'` получает объект «класс → строка».
- Для глобального CSS это не совсем точно (там обычно нет именованных экспортов), но позволяет импорт без типовой ошибки.

```ts
// строки 6–9
declare module '*.module.less' {
  const content: { [classNames: string]: string };
  export default content;
}
```

- CSS-модули типизируются как индексная запись.
- Ключи не проверяются: опечатка в `styles.foo` даст `undefined` в runtime, но не ошибку TS.

```ts
// строки 11–14
declare module '*.png' {
  const src: string;
  export default src;
}
```

- PNG импортируется как URL-строка.
- Для JPG/GIF аналогичных деклараций нет, хотя Webpack их обрабатывает.

**Подводные камни.** Нет деклараций для `.svg`, `.jpg`, `.gif`, аудио. Модульные классы не типизированы по фактическим именам, поэтому `noUncheckedIndexedAccess` не включён и опечатки не ловятся.

<a id="file-src-index-ts"></a>
### src/index.ts

**Назначение.** Точка входа бандла: подключает глобальные стили и монтирует приложение.

```ts
// строки 1–2
import './index.css';
import './components/Init';
```

- Побочный импорт CSS добавляет reset в бандл.
- Побочный импорт `Init` выполняет `ReactDOM.render`; экспорт не нужен.
- Порядок важен: CSS загружается до компонентов.

**Подводные камни.** Нет проверки наличия `#root`; ошибка проявится внутри `Init.tsx`. Побочные импорты затрудняют tree-shaking, но приложение и так монтируется целиком.

<a id="file-src-index-css"></a>
### src/index.css

**Назначение.** Глобальная база: цвета, шрифт, сброс отступов и box-sizing.

```css
/* строки 1–9 */
:root {
  color: #f8f4e8;
  font-family: 'Trebuchet MS', 'Segoe UI', Tahoma, sans-serif;
  background: #0a1322;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- Светлый текст на тёмно-синем фоне.
- `font-synthesis: none` запрещает браузеру синтезировать начертания.
- `optimizeLegibility` и сглаживание улучшают вид текста.

```css
/* строки 11–27 */
* { box-sizing: border-box; }
html, body, #root { min-height: 100%; }
body { margin: 0; }
button { font: inherit; }
```

- `border-box` включает padding/border в ширину.
- Корневые элементы растягиваются по высоте.
- Убирается стандартный margin `body`.
- Кнопки наследуют шрифт, иначе браузер использует системный.

**Подводные камни.** `html, body` без `height: 100%` могут не заполнить экран в старых браузерах; `#root` растягивается через `min-height`. Глобальный `button` не сбрасывает `color`/`background`.

<a id="file-src-components-init-tsx"></a>
### src/components/Init.tsx

**Назначение.** Монтирует React-приложение в DOM.

```tsx
// строки 1–4
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';
```

- React нужен для JSX/`StrictMode`.
- `react-dom` даёт legacy API `render` (React 17).
- `App` — корневой компонент.

```tsx
// строки 6–11
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root') as HTMLElement,
);
```

- `StrictMode` включает дополнительные проверки в development.
- `#root` приводится к `HTMLElement`; если элемента нет, React получит `null` и упадёт.
- `render` вызывается один раз при загрузке модуля.

**Подводные камни.** React 18 использует `createRoot`, но проект на React 17. В `StrictMode` некоторые эффекты намеренно вызываются дважды в dev, что влияет на звуки только при разработке. Нет Error Boundary.

<a id="file-src-components-app-index-ts"></a>
### src/components/App/index.ts

**Назначение.** Публичный фасад компонента.

```ts
// строка 1
export { App } from './App';
```

- Реэкспортирует именованный `App`.
- Позволяет импортировать `./components/App` без указания файла.

**Подводные камни.** Нет default-экспорта; это соответствует `import/prefer-default-export: off`.

<a id="file-src-components-app-app-tsx"></a>
### src/components/App/App.tsx

**Назначение.** Корневой компонент: хранит `GameModel`, запускает игровой цикл, обрабатывает клавиатуру, паузу при скрытии вкладки, звуки, сохранение рекорда и выбор экрана.

**Зависимости.** React-хуки; `soundManager`; чистые функции логики; типы; `useGameLoop`; storage; три экрана; CSS-модуль.

```tsx
// строки 1–22
const [model, setModel] = useState<GameModel>(() => createInitialState(loadHighScore()));
const [muted, setMuted] = useState<boolean>(() => soundManager.isMuted());
const inputRef = useRef<InputState>({ left: false, right: false });
const previousRef = useRef({ score: model.score, lives: model.lives, phase: model.phase });
```

- `model` — единственный источник состояния игры; ленивый initializer читает рекорд один раз.
- `muted` дублирует состояние `soundManager` для перерисовки иконки.
- `inputRef` хранит нажатия без ре-рендера на каждый кадр.
- `previousRef` хранит предыдущие счёт/жизни/фазу для детектирования событий.

```tsx
// строки 24–26
useGameLoop((deltaSeconds) => {
  setModel((previous) => updateState(previous, deltaSeconds, inputRef.current));
}, model.phase === 'playing');
```

- Колбэк получает секунды с прошлого кадра.
- Функциональное обновление защищает от устаревшего `model`.
- Цикл активен только в `playing`.

```tsx
// строки 28–33
useEffect(() => {
  if (model.phase !== 'playing') {
    inputRef.current.left = false;
    inputRef.current.right = false;
  }
}, [model.phase]);
```

- При паузе/gameover/start движение сбрасывается, чтобы волк не «уехал» после продолжения.

```tsx
// строки 35–57
const onKeyDown = (event: KeyboardEvent) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  const leftPressed = key === 'arrowleft' || key === 'a';
  const rightPressed = key === 'arrowright' || key === 'd';
  const pausePressed = key === 'p' || key === 'escape' || key === ' ';
  const canPause = model.phase === 'playing' || model.phase === 'paused';
  if (leftPressed || rightPressed) {
    if (model.phase !== 'playing') return;
    event.preventDefault();
    if (leftPressed) inputRef.current.left = true;
    if (rightPressed) inputRef.current.right = true;
    return;
  }
  if (pausePressed && canPause && !event.repeat) {
    event.preventDefault();
    setModel((previous) => togglePause(previous));
  }
};
```

- Модификаторы отсекаются, чтобы не перехватывать браузерные сочетания.
- Поддерживаются стрелки и A/D; регистр не важен.
- Пауза — P, Escape или пробел; `repeat` не даёт многократно переключать паузу.
- Движение работает только в `playing`.
- `preventDefault` не даёт странице прокручиваться стрелками/пробелом.

```tsx
// строки 59–79
const onKeyUp = (event: KeyboardEvent) => { ... };
const resetInput = () => { inputRef.current.left = false; inputRef.current.right = false; };
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);
window.addEventListener('blur', resetInput);
return () => { ... };
```

- `keyup` снимает флаг соответствующей стороны.
- `blur` сбрасывает ввод при уходе из окна.
- Cleanup удаляет все три слушателя.
- Эффект пересоздаётся при смене `model.phase`, чтобы обработчик видел актуальную фазу.

```tsx
// строки 81–92
const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    setModel((previous) => (previous.phase === 'playing' ? togglePause(previous) : previous));
  }
};
document.addEventListener('visibilitychange', onVisibilityChange);
return () => document.removeEventListener('visibilitychange', onVisibilityChange);
```

- При скрытии вкладки активная игра ставится на паузу.
- Повторный вызов идемпотентен: `paused`/`gameover` не меняются.
- Слушатель живёт весь жизненный цикл компонента.

```tsx
// строки 94–112
if (model.score > previous.score) soundManager.playCatch();
if (model.lives < previous.lives) soundManager.playLoseLife();
if (model.phase === 'gameover' && previous.phase !== 'gameover') soundManager.playGameOver();
previousRef.current = { score: model.score, lives: model.lives, phase: model.phase };

useEffect(() => {
  if (model.phase === 'gameover') saveHighScore(model.highScore);
}, [model.phase, model.highScore]);
```

- Сравнение с предыдущими значениями запускает звуки ровно один раз на событие.
- Переход в gameover проигрывает отдельный звук.
- `previousRef` обновляется после проверок.
- Рекорд сохраняется при входе в gameover и при изменении `highScore`.
- Повторное сохранение безвредно.

```tsx
// строки 114–132
const startRound = () => {
  soundManager.unlock(); soundManager.playStart();
  setModel((previous) => startGame(previous.highScore));
};
const goToMenu = () => setModel((previous) => createInitialState(previous.highScore));
const handleTogglePause = () => setModel((previous) => togglePause(previous));
const handleToggleMute = () => {
  const nextMuted = soundManager.toggleMute();
  if (!nextMuted) soundManager.unlock();
  setMuted(nextMuted);
};
```

- `startRound` разблокирует AudioContext пользовательским жестом, проигрывает старт и создаёт новую модель.
- `goToMenu` создаёт начальное состояние, сохраняя рекорд.
- Пауза переключается функционально.
- При включении звука контекст разблокируется, затем состояние иконки синхронизируется.

```tsx
// строки 134–148
const onLeftDown = () => { inputRef.current.left = true; };
const onLeftUp = () => { inputRef.current.left = false; };
const onRightDown = () => { inputRef.current.right = true; };
const onRightUp = () => { inputRef.current.right = false; };
```

- Экранные кнопки пишут в тот же `inputRef`, что и клавиатура.
- Отдельные обработчики нужны, потому что `TouchControls` вызывает их по pointer-событиям.

```tsx
// строки 150–192
if (model.phase === 'start') return <StartScreen ... />;
if (model.phase === 'gameover') return <GameOverScreen ... />;
return <GameScreen ... />;
return <div className={styles.page}><div className={styles.shell}>{renderScreen()}</div></div>;
```

- `start` и `gameover` получают колбэки старта/меню/звука.
- Все остальные фазы (`playing`, `paused`) отображает `GameScreen`: пауза — оверлей поверх поля.
- `page` — градиентный фон, `shell` — ограничитель ширины/высоты.

**Подводные камни.** Эффект клавиатуры зависит только от `model.phase`; `soundEnabled` не используется, потому что звук управляется самим менеджером. `model.highScore` не обновляется мгновенно при побитии рекорда во время игры, но HUD показывает `Math.max`. Сохранение происходит только в gameover; закрытие вкладки до проигрыша не записывает новый рекорд. `StrictMode` в dev может дважды монтировать эффекты, но cleanup корректен.

<a id="file-src-components-app-app-module-less"></a>
### src/components/App/App.module.less

**Назначение.** Полноэкранный фон и центрирующая оболочка приложения.

```less
// строки 1–13
.page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(8px, 2.2vw, 30px);
  overflow: hidden;
  background: radial-gradient(...), radial-gradient(...), linear-gradient(...);
}
```

- `position: relative` — якорь для псевдоэлементов.
- Flex центрирует игру.
- `100dvh` — корректная высота на мобильных с динамическими панелями; `100vh` — fallback.
- `padding` адаптивный.
- `overflow: hidden` обрезает декоративные пятна.
- Многослойный фон: тёплое пятно, холодное пятно, основной градиент.

```less
// строки 15–35
.page::before { position: absolute; inset: 0; ... background-image: radial-gradient(...); background-size: 26px 26px; opacity: .16; }
.page::after { top: -34vmax; right: -24vmax; width/height: 66vmax; ... border-radius: 50%; }
```

- `::before` рисует сетку из точек.
- `pointer-events: none` не мешает кликам.
- `::after` — большое размытое жёлтое свечение за пределами экрана.

```less
// строки 37–43
.shell {
  position: relative;
  z-index: 1;
  width: min(100%, 980px, calc(133.333vh - 85.333px));
  width: min(100%, 980px, calc(133.333dvh - 85.333px));
  margin: auto;
}
```

- Оболочка поверх псевдоэлементов.
- `min()` ограничивает ширину 980 px и сохраняет пропорцию 4:3 по высоте.
- Коэффициент `133.333` = 4/3 × 100; вычитание учитывает отступы.
- `margin: auto` центрирует.

**Подводные камни.** `calc(133.333vh - 85.333px)` — эмпирическая формула, а не строгая геометрия; на узких экранах ширина упирается в `100%`. Два объявления `width` дают fallback для браузеров без `dvh`.

<a id="file-src-components-startscreen-index-ts"></a>
### src/components/StartScreen/index.ts

**Назначение.** Реэкспорт стартового экрана.

```ts
// строка 1
export { StartScreen } from './StartScreen';
```

Единственная строка делает `./StartScreen` импортируемым как модуль каталога. Подводных камней нет.

<a id="file-src-components-startscreen-startscreen-tsx"></a>
### src/components/StartScreen/StartScreen.tsx

**Назначение.** Меню перед игрой: заголовок, управление, рекорд, кнопка старта, звук, декоративные маскоты.

**Зависимости.** Общие CSS-модули кнопок/сцены, `FarmBackground`, `SoundToggle`, `WolfSprite`, `ChickenSprite`.

```tsx
// строки 11–18
type Props = { highScore: number; muted: boolean; onPlay: () => void; onToggleMute: () => void };
export const StartScreen: React.FC<Props> = ({ highScore, muted, onPlay, onToggleMute }) => (
```

- `highScore` показывает рекорд и переключает текст.
- `muted` управляет иконкой звука.
- `onPlay` запускает раунд.
- `onToggleMute` меняет звук на уровне `App`.

```tsx
// строки 19–24
<section className={`${stage.stage} ${styles.screen}`} aria-labelledby="game-title">
  <FarmBackground />
  <div className={styles.soundCorner}><SoundToggle ... /></div>
```

- `stage` задаёт соотношение 4:3 и рамку.
- `aria-labelledby` связывает секцию с `h1`.
- Фон декоративный, звук — в углу.

```tsx
// строки 26–36
<div className={styles.mascots} aria-hidden="true">
  <div className={styles.wolfMascot}><WolfSprite /></div>
  <div className={styles.chickenMascot}><ChickenSprite /></div>
  <span className={`${styles.egg} ${styles.eggOne}`} />
  ... eggTwo, eggThree
</div>
```

- Маскоты скрыты от скринридеров, так как не несут информации.
- Три пустых `span` — декоративные яйца с CSS-формами.

```tsx
// строки 38–47
<main className={styles.content}>
  <span className={styles.kicker}>Серия «Электроника»</span>
  <h1 id="game-title" className={styles.title}>Ну, погоди!</h1>
  <p className={styles.subtitle}>...</p>
  <button ... className={`${buttons.base} ${buttons.primary} ${styles.playButton}`} onClick={onPlay}>Играть</button>
```

- `main` — основной контент экрана.
- `kicker` — надзаголовок.
- `h1` связан с `aria-labelledby`.
- Кнопка совмещает базовый, основной и локальный классы.

```tsx
// строки 49–55
{highScore > 0 ? (
  <p className={styles.best}>Рекорд: <strong>{highScore}</strong></p>
) : (
  <p className={styles.bestHint}>Первый рекорд ждёт тебя</p>
)}
```

- При положительном рекорде выводится число.
- При нуле — мотивирующая подсказка.
- `strong` семантически выделяет значение.

```tsx
// строки 57–67
<div className={styles.hint}>
  <span><kbd>←</kbd><kbd>→</kbd> или <kbd>A</kbd><kbd>D</kbd> — движение</span>
  <span><kbd>P</kbd> или <kbd>Пробел</kbd> — пауза</span>
  <span>На телефоне — экранные кнопки</span>
</div>
```

- `kbd` обозначает клавиши.
- Подсказки соответствуют обработчику `App`.
- Упоминаются экранные кнопки.

**Подводные камни.** В тексте «A» и «D» идут подряд без пробела между `<kbd>`; визуально это компенсируется CSS. `aria-hidden` на маскотах скрывает и вложенные SVG, что правильно. `StartScreen` не управляет фокусом при появлении.

<a id="file-src-components-gameoverscreen-index-ts"></a>
### src/components/GameOverScreen/index.ts

**Назначение.** Реэкспорт финального экрана.

```ts
// строка 1
export { GameOverScreen } from './GameOverScreen';
```

Одна строка; подводных камней нет.

<a id="file-src-components-gameoverscreen-gameoverscreen-tsx"></a>
### src/components/GameOverScreen/GameOverScreen.tsx

**Назначение.** Итоговый экран: финальный счёт, рекорд, признак нового рекорда, звук и действия.

```tsx
// строки 10–18
type Props = {
  score: number; highScore: number; isNewRecord: boolean;
  muted: boolean; onRestart: () => void; onMenu: () => void; onToggleMute: () => void;
};
```

- `score` — результат раунда.
- `highScore` — актуальный рекорд.
- `isNewRecord` управляет бейджем.
- `onRestart`/`onMenu`/`onToggleMute` приходят из `App`.

```tsx
// строки 29–35
<section className={`${stage.stage} ${styles.screen}`} aria-labelledby="gameover-title">
  <FarmBackground />
  <div className={styles.dim} aria-hidden="true" />
  <div className={styles.soundCorner}><SoundToggle ... /></div>
```

- Та же сцена, что у меню/игры.
- `dim` затемняет фон.
- Заголовок связан с секцией.

```tsx
// строки 37–49
<main className={styles.panel}>
  <span className={styles.kicker}>Игра окончена</span>
  <h1 id="gameover-title" className={styles.title}>Ну, погоди...</h1>
  <p className={styles.text}>...</p>
  <div className={styles.scoreBox}>
    <span className={styles.scoreLabel}>Финальный счёт</span>
    <strong className={styles.scoreValue} data-testid="final-score">{score}</strong>
  </div>
```

- Информационная панель поверх затемнения.
- Счёт доступен тестам через `data-testid`.
- Заголовок продолжает фразу игры.

```tsx
// строки 51–57
<div className={styles.recordRow}>
  <span className={styles.recordLabel}>Рекорд</span>
  <strong className={styles.recordValue} data-testid="high-score">{highScore}</strong>
  {isNewRecord && <span className={styles.recordBadge}>Новый рекорд!</span>}
</div>
```

- Рекорд всегда виден.
- Бейдж появляется только при новом достижении.
- `data-testid` используется компонентными тестами.

```tsx
// строки 59–66
<div className={styles.actions}>
  <button ... onClick={onRestart}>Заново</button>
  <button ... onClick={onMenu}>В меню</button>
</div>
```

- «Заново» сразу запускает новый раунд без возврата в меню.
- «В меню» создаёт начальное состояние.

**Подводные камни.** Нет кнопки сохранения/шаринга результата. `aria-modal` отсутствует, потому что это не диалог, а полноценный экран. Фокус автоматически не переносится на заголовок.

<a id="file-src-components-gamescreen-index-ts"></a>
### src/components/GameScreen/index.ts

**Назначение.** Реэкспорт игрового экрана.

```ts
// строка 1
export { GameScreen } from './GameScreen';
```

Одна строка; подводных камней нет.

<a id="file-src-components-gamescreen-gamescreen-tsx"></a>
### src/components/GameScreen/GameScreen.tsx

**Назначение.** Игровая сцена: HUD, волк, яйца, экранное управление и оверлей паузы.

**Зависимости.** Конфиг размеров, типы, общие стили, фон, HUD, спрайт волка, touch-контролы.

```tsx
// строки 27–48
function toPercentX(value: number): string { return `${(value / gameConfig.width) * 100}%`; }
function toPercentY(value: number): string { return `${(value / gameConfig.height) * 100}%`; }
const wolfStyle: React.CSSProperties = {
  width: `${(gameConfig.wolfWidth / gameConfig.width) * 100}%`,
  height: `${(gameConfig.wolfHeight / gameConfig.height) * 100}%`,
};
function getEggStyle(egg: Egg): React.CSSProperties {
  return { left: toPercentX(egg.x), top: toPercentY(egg.y),
    width: `${(gameConfig.eggWidth / gameConfig.width) * 100}%`,
    height: `${(gameConfig.eggHeight / gameConfig.height) * 100}%`,
    transform: `rotate(${egg.rotation}deg)` };
}
```

- Логика работает в пикселях виртуального поля 800 × 600.
- В проценты переводятся координаты и размеры, чтобы сцена масштабировалась.
- `wolfStyle` статичен и создаётся один раз.
- Яйцо получает `left/top` (левый верхний угол), размеры и поворот.
- Функции чистые, зависят только от аргументов/конфига.

```tsx
// строки 50–76
const paused = model.phase === 'paused';
<section ... aria-label="Игровое поле">
  <FarmBackground />
  <Hud score={model.score} lives={model.lives}
       highScore={Math.max(model.score, model.highScore)}
       paused={paused} muted={muted} ... />
```

- Признак паузы вычисляется один раз.
- `Math.max` показывает текущий счёт как рекорд, пока он выше сохранённого.
- HUD получает колбэки паузы/звука.

```tsx
// строки 78–92
<div className={styles.wolf} data-testid="wolf" style={{ ...wolfStyle, left: toPercentX(model.wolf.x), top: toPercentY(model.wolf.y) }}>
  <WolfSprite />
</div>
{model.eggs.map((egg) => (
  <div key={egg.id} className={styles.egg} style={getEggStyle(egg)} />
))}
```

- Волк позиционируется абсолютно.
- `data-testid` нужен тестам.
- Яйца рендерятся списком по стабильному `egg.id`.
- Пустые `div` оформляются CSS (белок/желток через псевдоэлементы).

```tsx
// строки 94–118
<TouchControls ... />
{paused && (
  <div className={styles.pauseOverlay} role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <div className={styles.pauseCard}>
      <span className={styles.pauseKicker}>Пауза</span>
      <h2 id="pause-title" className={styles.pauseTitle}>Передышка</h2>
      <p className={styles.pauseText}>Волк замер. Яйца подождут.</p>
      <div className={styles.pauseActions}>
        <button ... onClick={onTogglePause}>Продолжить</button>
        <button ... onClick={onRestart}>Заново</button>
        <button ... onClick={onExit}>В меню</button>
      </div>
    </div>
  </div>
)}
```

- Touch-контролы видны всегда, на десктопе скрываются CSS.
- Оверлей паузы имеет `role="dialog"` и `aria-modal`.
- Три действия: продолжить, перезапустить, выйти.
- Оверлей рендерится только в `paused`.

**Подводные камни.** Волк и яйца используют `left/top` от верхнего левого угла; координаты в модели трактуются как позиция элемента, а не центра. При паузе оверлей перекрывает сцену, но touch-кнопки остаются в DOM под ним. `aria-label` поля не описывает счёт/жизни — их озвучивает HUD. Нет `tabIndex`/ловушки фокуса в pause-диалоге, поэтому клавиатурный фокус не удерживается внутри него.

<a id="file-src-components-hud-index-ts"></a>
### src/components/Hud/index.ts

**Назначение.** Реэкспорт HUD.

```ts
// строка 1
export { Hud } from './Hud';
```

Одна строка; подводных камней нет.

<a id="file-src-components-hud-hud-tsx"></a>
### src/components/Hud/Hud.tsx

**Назначение.** Верхняя панель во время игры: счёт, жизни, рекорд, пауза и звук.

```tsx
// строки 9–19
type Props = {
  score: number; lives: number; highScore: number;
  paused: boolean; muted: boolean;
  onToggleMute: () => void; onTogglePause: () => void;
};
export const Hud: React.FC<Props> = ({ ... }) => (
```

- Числовые данные приходят из `GameModel`.
- `paused` меняет иконку/подпись паузы.
- Колбэки не изменяют модель напрямую.

```tsx
// строки 20–24
<header className={styles.hud}>
  <div className={styles.scoreBadge} aria-live="polite">
    <span className={styles.label}>Счёт</span>
    <strong className={styles.score}>{score}</strong>
  </div>
```

- `header` — семантическая панель.
- `aria-live="polite"` сообщает скринридеру об изменении счёта, не перебивая пользователя.
- Счёт выделен `strong`.

```tsx
// строки 26–35
<div className={styles.lives} aria-label={`Жизни: ${lives}`}>
  <span className={styles.label}>Жизни</span>
  <span className={styles.hearts}>
    {Array.from({ length: gameConfig.initialLives }, (_, index) => (
      <span key={index} className={`${styles.heart} ${index < lives ? '' : styles.heartEmpty}`}>
        <HeartIcon />
      </span>
    ))}
  </span>
</div>
```

- Всегда рендерится `initialLives` сердец.
- Заполненные/пустые различаются классом.
- `aria-label` сообщает точное количество.
- `Array.from({length}, mapper)` создаёт массив нужной длины.
- `HeartIcon` декоративна (внутри SVG `aria-hidden`).

```tsx
// строки 37–40
<div className={styles.best}>
  <span className={styles.label}>Рекорд</span>
  <strong className={styles.bestValue}>{highScore}</strong>
</div>
```

- Показывает сохранённый или текущий рекорд (передан `Math.max`).

```tsx
// строки 42–53
<div className={styles.actions}>
  <button ... onClick={onTogglePause}
    aria-label={paused ? 'Продолжить' : 'Пауза'}
    title={paused ? 'Продолжить' : 'Пауза'}>
    {paused ? <PlayIcon /> : <PauseIcon />}
  </button>
  <SoundToggle muted={muted} onToggle={onToggleMute} />
</div>
```

- Кнопка паузы меняет иконку и доступное имя.
- `title` даёт подсказку мышью.
- `SoundToggle` переиспользуется на всех экранах.

**Подводные камни.** Ключ по индексу допустим, так как список фиксированной длины и не переупорядочивается. `aria-live` на счёте может озвучиваться слишком часто при быстрых изменениях. Кнопка звука внутри HUD имеет собственный стиль, отличный от кнопки паузы.

<a id="file-src-components-soundtoggle-index-ts"></a>
### src/components/SoundToggle/index.ts

**Назначение.** Реэкспорт переключателя звука.

```ts
// строка 1
export { SoundToggle } from './SoundToggle';
```

Одна строка; подводных камней нет.

<a id="file-src-components-soundtoggle-soundtoggle-tsx"></a>
### src/components/SoundToggle/SoundToggle.tsx

**Назначение.** Кнопка включения/выключения звука.

```tsx
// строки 7–12
type Props = { muted: boolean; onToggle: () => void };
export const SoundToggle: React.FC<Props> = ({ muted, onToggle }) => (
```

- `muted` только отображает состояние.
- `onToggle` делегирует изменение в `App`.

```tsx
// строки 13–22
<button type="button" className={styles.button} onClick={onToggle}
  aria-label={muted ? 'Включить звук' : 'Выключить звук'}
  aria-pressed={!muted}
  title={muted ? 'Включить звук' : 'Выключить звук'}>
  {muted ? <SoundOffIcon /> : <SoundOnIcon />}
</button>
```

- `type="button"` предотвращает отправку формы.
- Доступное имя описывает действие.
- `aria-pressed` отражает состояние «звук включён».
- Иконки декоративны.

**Подводные камни.** Начальное состояние `muted` берётся из менеджера, поэтому перезагрузка сбрасывает выбор (он не сохраняется в `localStorage`). `aria-pressed` и `aria-label` одновременно меняются, что корректно, но некоторые скринридеры произносят состояние дважды.

<a id="file-src-components-touchcontrols-index-ts"></a>
### src/components/TouchControls/index.ts

**Назначение.** Реэкспорт экранного управления.

```ts
// строка 1
export { TouchControls } from './TouchControls';
```

Одна строка; подводных камней нет.

<a id="file-src-components-touchcontrols-touchcontrols-tsx"></a>
### src/components/TouchControls/TouchControls.tsx

**Назначение.** Две экранные кнопки «влево/вправо» для сенсорных устройств.

```tsx
// строки 7–16
type Props = {
  onLeftDown: () => void; onLeftUp: () => void;
  onRightDown: () => void; onRightUp: () => void;
};
type PressHandler = (event: React.PointerEvent<HTMLButtonElement>) => void;
export const TouchControls: React.FC<Props> = ({ ... }) => {
```

- Раздельные down/up позволяют удерживать кнопку.
- `PressHandler` типизирует обработчики pointer-событий.

```tsx
// строки 17–32
const createDownHandler = (setPressed) => (event) => {
  event.preventDefault();
  if (typeof event.currentTarget.setPointerCapture === 'function') {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  setPressed(true);
};
const createUpHandler = (setPressed) => (event) => {
  event.preventDefault();
  setPressed(false);
};
```

- Фабрики создают обработчики для левой/правой кнопки.
- `preventDefault` подавляет эмуляцию клика/выделение.
- Pointer capture удерживает события на кнопке, даже если палец ушёл.
- Проверка `typeof` нужна для jsdom/старых браузеров, где метода нет.
- Up всегда снимает флаг.

```tsx
// строки 34–39
const preventContextMenu = (event: React.MouseEvent<HTMLDivElement>) => event.preventDefault();
return (
  <div className={styles.controls} onContextMenu={preventContextMenu}>
```

- Долгое нажатие на мобильном не открывает контекстное меню.

```tsx
// строки 40–63
<button ... aria-label="Влево"
  onPointerDown={createDownHandler(onLeftDown)}
  onPointerUp={createUpHandler(onLeftUp)}
  onPointerCancel={createUpHandler(onLeftUp)}
  onPointerLeave={createUpHandler(onLeftUp)}
  onLostPointerCapture={createUpHandler(onLeftUp)}>
  <ChevronLeftIcon />
</button>
... аналогично «Вправо»
```

- Пять событий гарантируют снятие флага при отпускании, отмене, уходе курсора и потере capture.
- Повторный `onPointerLeave` после capture безвреден.
- Иконки декоративны.
- Кнопки доступны как «Влево»/«Вправо».

**Подводные камни.** Фабрики создают новые функции на каждый рендер, что нормально для двух кнопок. На устройствах без Pointer Events управление не работает. Нет визуальной обратной связи нажатия в JSX — она может быть в CSS через `:active`. Кнопки не скрыты от клавиатуры, поэтому на десктопе доступны и кликом.

<a id="file-src-components-farmbackground-index-ts"></a>
### src/components/FarmBackground/index.ts

**Назначение.** Реэкспорт фона.

```ts
// строка 1
export { FarmBackground } from './FarmBackground';
```

Одна строка; подводных камней нет.

<a id="file-src-components-farmbackground-farmbackground-tsx"></a>
### src/components/FarmBackground/FarmBackground.tsx

**Назначение.** Декоративный деревенский фон: солнце, облака, холмы, забор и земля.

```tsx
// строки 7–15
const GROUND_HEIGHT_VARIABLE = '--ground-height';
type BackgroundStyle = React.CSSProperties & Record<typeof GROUND_HEIGHT_VARIABLE, string>;
const groundHeightPercent = `${(gameConfig.groundHeight / gameConfig.height) * 100}%`;
const backgroundStyle = { [GROUND_HEIGHT_VARIABLE]: groundHeightPercent } as BackgroundStyle;
```

- Имя CSS-переменной вынесено в константу.
- Пересечение типов добавляет кастомное свойство к `CSSProperties`.
- Высота земли вычисляется из конфига и передаётся в CSS.
- `as` нужен, потому что TS не знает произвольные CSS-переменные в типе.

```tsx
// строки 17–27
<div className={styles.background} style={backgroundStyle} aria-hidden="true">
  <div className={styles.sun} />
  <div className={`${styles.cloud} ${styles.cloudOne}`} />
  ... cloudTwo, cloudThree
  <div className={styles.hills} />
  <div className={styles.fence} />
  <div className={styles.ground} />
</div>
```

- Весь фон декоративен и скрыт от скринридеров.
- Слои рисуются CSS-градиентами/псевдоэлементами.
- Земля использует `var(--ground-height)`.
- Порядок DOM задаёт наложение.

**Подводные камни.** Переменная не имеет fallback в CSS-модуле; при ручном использовании компонента без `style` земля может получить некорректную высоту. Нет реакции на resize, потому что проценты пересчитываются стилями автоматически.

<a id="file-src-components-icons-tsx"></a>
### src/components/Icons.tsx

**Назначение.** Набор небольших inline-SVG иконок с `currentColor`.

**Разбор по компонентам.**

- `SoundOnIcon` (строки 3–19): динамик и две дуги звука; заливка/обводка `currentColor`. `viewBox="0 0 24 24"`, `fill="none"`, `aria-hidden`, `focusable="false"`.
- `SoundOffIcon` (21–26): тот же динамик и крест; крест нарисован двумя сегментами пути.
- `PauseIcon` (28–33): два скруглённых прямоугольника.
- `PlayIcon` (35–39): треугольник, скруглённый через путь.
- `ChevronLeftIcon` (41–51): левый шеврон, толщина 2.8, круглые концы.
- `ChevronRightIcon` (53–63): зеркальный правый шеврон.
- `HeartIcon` (65–72): сердце одной замкнутой формой.

Все компоненты:

```tsx
export const XIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">...</svg>
);
```

- Не принимают props, поэтому размер задаёт CSS контейнера.
- `aria-hidden` исключает иконки из дерева доступности: кнопки имеют текстовые `aria-label`.
- `focusable="false"` убирает SVG из tab-порядка в старых IE/Edge.
- `currentColor` позволяет менять цвет через `color` родителя.

**Подводные камни.** Размеры захардкожены в `viewBox`, но не в `width/height`; без CSS SVG может занять неожиданную площадь. Нет общего типа `IconProps` для `className`/`title`, что ограничивает переиспользование.

<a id="file-src-components-sprites-tsx"></a>
### src/components/Sprites.tsx

**Назначение.** Два крупных inline-SVG спрайта: волк и курица.

**Разбор `WolfSprite` (строки 3–52).**

- `viewBox="0 0 220 180"` — широкая сцена персонажа.
- Первый `ellipse` — тень под волком (opacity 0.2).
- Серии `path` рисуют хвост, ноги, туловище, живот, шорты, руки, лапы, уши, голову, глаза, брови, морду, нос, рот, зубы, язык и шерсть.
- Цвета заданы hex-литералами: серые оттенки шерсти, синие шорты, бежевая морда, тёмные глаза.
- Маленькие белые круги — блики глаз.
- Нет `id`, `defs`, градиентов и анимаций.
- Корневой SVG декоративен (`aria-hidden`, `focusable="false"`).

**Разбор `ChickenSprite` (строки 54–77).**

- `viewBox="0 0 140 140"`.
- Тень, лапы, хвост, тело, крыло, голова, гребень, серёжка, клюв, глаз, яйца/пятна.
- Контурные элементы используют `stroke="#cbbfa8"`/`#e4d7c2`.
- Красный гребень и оранжевый клюв создают акцент.
- Так же декоративен и не принимает props.

**Подводные камни.** Большие SVG повторяются в DOM на стартовом экране; это acceptable для одного экрана. Спрайты не масштабируются через `width/height` без CSS. Цвета не токенизированы, поэтому тема не переключается. В `WolfSprite` глаза/зрачки — отдельные круги, из-за чего при сильном уменьшении они могут сливаться.

<a id="file-src-audio-soundmanager-ts"></a>
### src/audio/SoundManager.ts

**Назначение.** Синтезатор коротких звуков на Web Audio API: старт, поимка, потеря жизни, game over, плюс глобальный mute.

**Зависимости.** Только браузерные `AudioContext`, `OscillatorNode`, `GainNode`; DOM-типы.

```ts
// строки 1–12
type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext };
type ToneOptions = {
  type: OscillatorType; startFrequency: number; endFrequency?: number;
  durationSeconds: number; volume: number; delaySeconds?: number;
};
```

- `AudioContextWindow` добавляет к `Window` нестандартное поле Safari.
- `ToneOptions` описывает один тон: форма волны, частоты, длительность, громкость, задержка.

```ts
// строки 14–28
class SoundManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  public isMuted(): boolean { return this.muted; }
  public toggleMute(): boolean { this.muted = !this.muted; return this.muted; }
```

- `context` лениво создаётся.
- `master` — общий gain, к которому подключаются все тоны.
- `muted` — пользовательская настройка; не сохраняется.
- `toggleMute` переключает и возвращает новое значение.

```ts
// строки 30–51
public init(): void {
  if (this.context) return;
  const AudioContextClass = typeof window === 'undefined' ? undefined
    : window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext;
  if (!AudioContextClass) return;
  try {
    const context = new AudioContextClass();
    const master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    this.context = context; this.master = master;
  } catch { this.context = null; this.master = null; }
}
```

- Инициализация идемпотентна.
- Проверка `window` защищает SSR/Node-тесты.
- Порядок выбора: стандартный `AudioContext`, затем `webkitAudioContext`.
- Громкость мастера 0.5 ограничивает общую громкость.
- При ошибке создания поля сбрасываются; звук просто не работает.
- Пустой `catch` соответствует правилу `no-empty: allowEmptyCatch`.

```ts
// строки 53–59
public unlock(): void {
  this.init();
  if (this.context && this.context.state === 'suspended') {
    this.context.resume().catch(() => undefined);
  }
}
```

- Создаёт контекст, если нужно.
- Возобновляет приостановленный контекст после жеста пользователя.
- Ошибка `resume` глушится, чтобы не ломать UI.

```ts
// строки 61–96
private playTone({ type, startFrequency, endFrequency = startFrequency,
  durationSeconds, volume, delaySeconds = 0 }: ToneOptions): void {
  if (this.muted) return;
  this.init();
  if (!this.context || !this.master) return;
  if (this.context.state === 'suspended') this.context.resume().catch(() => undefined);
  const { context, master } = this;
  const startAt = context.currentTime + delaySeconds;
  const stopAt = startAt + durationSeconds;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), stopAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  oscillator.connect(gain); gain.connect(master);
  oscillator.start(startAt); oscillator.stop(stopAt + 0.02);
}
```

- При mute тон не создаётся.
- Частота линейно стартует и экспоненциально скользит к конечной (минимум 1 Гц).
- Огибающая gain: почти ноль → громкость за 12 мс → почти ноль к концу. Это предотвращает щелчки.
- `0.0001` вместо 0 нужен для экспоненциальной кривой.
- Осциллятор останавливается через 20 мс после конца; узлы собираются сборщиком мусора.
- Задержка позволяет строить арпеджио.

```ts
// строки 98–139
playCatch(): square 880→1180 Гц, 80 мс, 0.16
playLoseLife(): sawtooth 180→70 Гц, 320 мс, 0.22
playStart(): triangle 523.25, 659.25, 783.99 Гц с задержками 0/0.11/0.22
```

- Поимка — короткий восходящий «блип».
- Потеря жизни — низкий нисходящий сигнал.
- Старт — мажорное арпеджио C5–E5–G5.

```ts
// строки 141–164
playGameOver(): triangle 392 (0.38 с), 329.63 (0.55 с), 261.63→196 (0.72 с)
```

- Нисходящая фраза G4–E4–C4 создаёт «грустный» финал.
- Звуки не накладываются на старт раунда, потому что gameover наступает позже.

```ts
// строка 167
export const soundManager = new SoundManager();
```

- Синглтон на всё приложение, поэтому mute общий для экранов.

**Подводные камни.** `AudioContext` создаётся лениво, но первый `new` должен происходить после жеста; `startRound` вызывает `unlock` из клика — это корректно. В тестах jsdom не имеет Web Audio, `init` тихо возвращается. `muted` не сохраняется между перезагрузками. Звук включается при `muted=false`, но если контекст был создан в suspended, resume вызывается без await. Нет ограничения на количество одновременных осцилляторов, но игровые события редки.

<a id="file-src-hooks-usegameloop-ts"></a>
### src/hooks/useGameLoop.ts

**Назначение.** Хук `requestAnimationFrame` с ограничением дельты и актуальным колбэком.

```ts
// строки 1–10
export function useGameLoop(onTick: (deltaSeconds: number) => void, active: boolean): void {
  const tickRef = useRef(onTick);
  useEffect(() => { tickRef.current = onTick; }, [onTick]);
```

- `tickRef` хранит последний колбэк.
- Эффект обновляет его после каждого рендера, не перезапуская RAF.
- Это решает проблему устаревшего замыкания без зависимости цикла от `onTick`.

```ts
// строки 12–18
useEffect(() => {
  if (!active || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return undefined;
  }
  let frameId = 0;
  let lastTime = window.performance.now();
```

- При `active=false` цикл не запускается.
- Проверки делают хук безопасным для SSR/jsdom.
- `lastTime` инициализируется текущим временем, чтобы первый delta не был огромным.

```ts
// строки 20–27
const frame = (time: number) => {
  const deltaSeconds = Math.min(Math.max((time - lastTime) / 1000, 0), gameConfig.maxFrameDeltaSec);
  lastTime = time;
  tickRef.current(deltaSeconds);
  frameId = window.requestAnimationFrame(frame);
};
frameId = window.requestAnimationFrame(frame);
```

- Дельта переводится в секунды.
- Ограничение `[0, 0.05]` не даёт скачку после фоновой вкладки.
- Колбэк вызывается до планирования следующего кадра.
- `frameId` сохраняется для отмены.
- Цикл самоподдерживающийся.

```ts
// строки 29–32
return () => { window.cancelAnimationFrame(frameId); };
```

- Cleanup останавливает цикл при паузе/размонтировании.
- `frameId` на момент cleanup — последний запланированный кадр.

**Подводные камни.** Если `onTick` выбросит исключение, следующий кадр не запланируется. Хук не использует `setTimeout` fallback. При `active=false` возвращается `undefined`, что допустимо для `useEffect`. Ограничение 50 мс замедляет игровое время при низком FPS, но предотвращает телепортацию яиц.

<a id="file-src-game-types-ts"></a>
### src/game/types.ts

**Назначение.** Типы предметной области; не содержит runtime-кода.

```ts
// строка 1
export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover';
```

- Фаза — строковый union; исчерпывающе описывает экраны.

```ts
// строки 3–19
export type InputState = { left: boolean; right: boolean };
export type Wolf = { x: number; y: number };
export type Egg = { id: number; x: number; y: number; vy: number; rotation: number };
```

- Ввод — два независимых флага.
- Волк — верхний левый угол и размеры из конфига.
- Яйцо хранит уникальный id, позицию, вертикальную скорость и угол поворота.
- `vy` положительна вниз.

```ts
// строки 21–32
export type GameModel = {
  phase: GamePhase; score: number; lives: number; highScore: number;
  isNewRecord: boolean; wolf: Wolf; eggs: Egg[]; elapsedMs: number;
  spawnCooldownMs: number; nextEggId: number;
};
```

- `score`/`lives`/`highScore` — UI и правила.
- `isNewRecord` вычисляется в момент gameover.
- `elapsedMs` управляет сложностью.
- `spawnCooldownMs` — остаток до следующего яйца.
- `nextEggId` гарантирует стабильные React-ключи.

```ts
// строки 34–59
export type GameConfig = { width; height; groundHeight; wolfWidth; wolfHeight; wolfSpeed;
  wolfCatchInsetX; wolfCatchInsetTop; wolfCatchInsetBottom; eggWidth; eggHeight;
  eggSidePadding; initialLives; baseFallSpeed; fallSpeedIncrease; maxFallSpeed;
  difficultyRampMs; maxDifficultyLevel; spawnIntervalMs; spawnIntervalDecrease;
  minSpawnIntervalMs; initialSpawnDelayMs; maxFrameDeltaSec; highScoreStorageKey };
```

- Все размеры/скорости/интервалы/ключ storage типизированы.
- Конфиг не помечен `readonly`, поэтому объект теоретически можно мутировать.

**Подводные камни.** Нет брендированных типов для координат/времени. `Egg.vy` можно случайно сделать отрицательной. `GameConfig` дублирует имена, но это осознанная простая структура.

<a id="file-src-game-config-ts"></a>
### src/game/config.ts

**Назначение.** Единственный источник числовых настроек.

```ts
// строки 1–28
export const gameConfig: GameConfig = {
  width: 800, height: 600, groundHeight: 64,
  wolfWidth: 112, wolfHeight: 88, wolfSpeed: 440,
  wolfCatchInsetX: 8, wolfCatchInsetTop: 10, wolfCatchInsetBottom: 6,
  eggWidth: 28, eggHeight: 38, eggSidePadding: 16,
  initialLives: 3,
  baseFallSpeed: 150, fallSpeedIncrease: 32, maxFallSpeed: 640,
  difficultyRampMs: 12000, maxDifficultyLevel: 15,
  spawnIntervalMs: 1300, spawnIntervalDecrease: 90, minSpawnIntervalMs: 380,
  initialSpawnDelayMs: 900, maxFrameDeltaSec: 0.05,
  highScoreStorageKey: 'nupogodi.high-score',
};
```

| Параметр | Значение | Смысл |
|---|---|---|
| `width`/`height` | 800/600 | Виртуальная сцена 4:3. |
| `groundHeight` | 64 | Высота земли; волк стоит на ней. |
| `wolfWidth`/`wolfHeight` | 112/88 | Хитбокс/визуальный размер. |
| `wolfSpeed` | 440 | Пикселей в секунду. |
| `wolfCatchInset*` | 8/10/6 | Сужение зоны ловли. |
| `eggWidth`/`eggHeight` | 28/38 | Размер яйца. |
| `eggSidePadding` | 16 | Отступ спавна от краёв. |
| `initialLives` | 3 | Стартовые жизни. |
| `baseFallSpeed` | 150 | Начальная скорость падения. |
| `fallSpeedIncrease` | 32 | Прирост за уровень. |
| `maxFallSpeed` | 640 | Потолок скорости. |
| `difficultyRampMs` | 12000 | Уровень каждые 12 с. |
| `maxDifficultyLevel` | 15 | Потолок сложности. |
| `spawnIntervalMs` | 1300 | Начальный интервал спавна. |
| `spawnIntervalDecrease` | 90 | Уменьшение интервала за уровень. |
| `minSpawnIntervalMs` | 380 | Минимальный интервал. |
| `initialSpawnDelayMs` | 900 | Задержка первого яйца. |
| `maxFrameDeltaSec` | 0.05 | Максимальный шаг физики. |
| `highScoreStorageKey` | `nupogodi.high-score` | Ключ localStorage. |

**Подводные камни.** Размеры волка/яйца участвуют и в позиционировании, и в коллизиях; изменение одного без другого ломает баланс. `maxDifficultyLevel` 15 даёт скорость 630 (не достигает 640) и интервал 380. Ключ storage при смене «осиротит» старые рекорды.

<a id="file-src-game-logic-ts"></a>
### src/game/logic.ts

**Назначение.** Чистая игровая модель: создание состояния, пауза, сложность, спавн, движение, коллизии, обновление, gameover.

**Зависимости.** `gameConfig`; типы `Egg`, `GameModel`, `InputState`, `Wolf`.

```ts
// строки 4–14
type EggStepResult = { eggs: Egg[]; caught: number; missed: number };
type RandomSource = () => number;
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

- Результат шага яиц: выжившие, пойманные, пропущенные.
- `RandomSource` позволяет тестам подменять `Math.random`.
- `clamp` ограничивает значение.

```ts
// строки 16–26
function normalizeHighScore(highScore: number): number {
  if (!Number.isFinite(highScore)) return 0;
  return Math.max(0, Math.floor(highScore));
}
function createWolf(): Wolf {
  return { x: gameConfig.width / 2 - gameConfig.wolfWidth / 2,
    y: gameConfig.height - gameConfig.groundHeight - gameConfig.wolfHeight };
}
```

- NaN/Infinity превращаются в 0; дробное округляется вниз.
- Волк стартует по центру и стоит на земле.
- Формула: 600 − 64 − 88 = 448 по Y.

```ts
// строки 28–55
function createBaseState(phase, highScore): GameModel { return {
  phase, score: 0, lives: 3, highScore: normalized, isNewRecord: false,
  wolf: createWolf(), eggs: [], elapsedMs: 0,
  spawnCooldownMs: initialSpawnDelayMs, nextEggId: 1,
}; }
export function createInitialState(highScore = 0): GameModel { return createBaseState('start', highScore); }
export function startGame(highScore = 0): GameModel { return createBaseState('playing', highScore); }
export function resetGame(highScore = 0): GameModel { return startGame(highScore); }
```

- Базовое состояние сбрасывает счёт, жизни, яйца, время и счётчик id.
- `start` отличается от `playing` только фазой.
- `resetGame` — алиас `startGame`; используется тестами/семантикой.
- Рекорд нормализуется при каждом создании.

```ts
// строки 57–61
export function togglePause(state: GameModel): GameModel {
  if (state.phase === 'playing') return { ...state, phase: 'paused' };
  if (state.phase === 'paused') return { ...state, phase: 'playing' };
  return state;
}
```

- Переключение только между `playing` и `paused`.
- В `start`/`gameover` возвращается тот же объект.
- Иммутабельность: создаётся новый объект только при изменении.

```ts
// строки 63–76
export function getDifficultyLevel(elapsedMs: number): number {
  const level = Math.floor(Math.max(0, elapsedMs) / gameConfig.difficultyRampMs);
  return Math.min(level, gameConfig.maxDifficultyLevel);
}
export function getFallSpeed(level: number): number {
  const speed = gameConfig.baseFallSpeed + level * gameConfig.fallSpeedIncrease;
  return Math.min(speed, gameConfig.maxFallSpeed);
}
export function getSpawnInterval(level: number): number {
  const interval = gameConfig.spawnIntervalMs - level * gameConfig.spawnIntervalDecrease;
  return Math.max(interval, gameConfig.minSpawnIntervalMs);
}
```

- Уровень = прошедшие 12-секундные отрезки, ограничен 15.
- Скорость растёт линейно, ограничена 640.
- Интервал уменьшается линейно, не ниже 380 мс.
- Отрицательное время даёт уровень 0.
- Отрицательный `level` не защищён; функции рассчитаны на неотрицательный уровень.

```ts
// строки 78–98
export function spawnEgg(state: GameModel, random: RandomSource = Math.random): GameModel {
  if (state.phase !== 'playing') return state;
  const level = getDifficultyLevel(state.elapsedMs);
  const availableWidth = Math.max(0, width - eggWidth - eggSidePadding * 2);
  const id = state.nextEggId;
  const egg: Egg = { id, x: eggSidePadding + random() * availableWidth,
    y: -eggHeight, vy: getFallSpeed(level),
    rotation: ((id * 37) % 25) - 12 };
  return { ...state, eggs: [...state.eggs, egg], nextEggId: id + 1,
    spawnCooldownMs: getSpawnInterval(level) };
}
```

- Спавн только в игре.
- `availableWidth` — ширина поля минус яйцо и два отступа.
- Новое яйцо стартует над сценой (`y = -38`).
- `x` распределён равномерно в доступной полосе.
- Поворот детерминирован от id: диапазон −12…+12°, стабилен между рендерами.
- Массив яиц копируется, исходное состояние не мутируется.
- Кулдаун сбрасывается на актуальный интервал.

```ts
// строки 100–107
function moveWolf(wolf: Wolf, deltaSeconds: number, input: InputState): Wolf {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxX = gameConfig.width - gameConfig.wolfWidth;
  const x = clamp(wolf.x + direction * gameConfig.wolfSpeed * deltaSeconds, 0, maxX);
  if (x === wolf.x) return wolf;
  return { ...wolf, x };
}
```

- Оба флага дают 0 — волк стоит.
- Движение влево/вправо с ограничением `[0, 688]`.
- Если позиция не изменилась, возвращается исходный объект — экономия ре-рендеров.

```ts
// строки 109–118
function isEggCaught(egg: Egg, wolf: Wolf): boolean {
  const wolfLeft = wolf.x + wolfCatchInsetX;
  const wolfRight = wolf.x + wolfWidth - wolfCatchInsetX;
  const catchTop = wolf.y + wolfCatchInsetTop;
  const catchBottom = wolf.y + wolfHeight - wolfCatchInsetBottom;
  const hasHorizontalOverlap = egg.x + eggWidth >= wolfLeft && egg.x <= wolfRight;
  const hasVerticalOverlap = egg.y + eggHeight >= catchTop && egg.y <= catchBottom;
  return hasHorizontalOverlap && hasVerticalOverlap;
}
```

- Зона ловли — прямоугольник волка, суженный inset’ами.
- Пересечение AABB по обеим осям.
- Учитываются полные размеры яйца.
- Границы включительные.

```ts
// строки 120–143
function advanceEggs(eggs, deltaSeconds, wolf): EggStepResult {
  const survivors: Egg[] = [];
  const groundY = gameConfig.height - gameConfig.groundHeight;
  let caught = 0; let missed = 0;
  eggs.forEach((egg) => {
    const movedEgg = { ...egg, y: egg.y + egg.vy * deltaSeconds };
    if (isEggCaught(movedEgg, wolf)) { caught += 1; return; }
    if (movedEgg.y + eggHeight >= groundY) { missed += 1; return; }
    survivors.push(movedEgg);
  });
  return { eggs: survivors, caught, missed };
}
```

- Сначала яйцо сдвигается вниз.
- Проверка поимки имеет приоритет над приземлением.
- Пойманные и упавшие не попадают в `survivors`.
- `groundY` — верхняя граница земли (536).
- `forEach` с `return` работает как `continue`.

```ts
// строки 145–185
export function updateState(state, deltaSeconds, input): GameModel {
  if (state.phase !== 'playing') return state;
  const delta = clamp(deltaSeconds, 0, maxFrameDeltaSec);
  if (delta === 0) return state;
  const wolf = moveWolf(...);
  const eggStep = advanceEggs(...);
  const score = state.score + eggStep.caught;
  const lives = Math.max(0, state.lives - eggStep.missed);
  const elapsedMs = state.elapsedMs + delta * 1000;
  if (lives === 0) return { ...state, phase: 'gameover', score, lives: 0,
    highScore: Math.max(state.highScore, score),
    isNewRecord: score > state.highScore, wolf, eggs: [],
    elapsedMs, spawnCooldownMs: initialSpawnDelayMs };
  const spawnCooldownMs = state.spawnCooldownMs - delta * 1000;
  const nextState = { ...state, score, lives, wolf, eggs: eggStep.eggs,
    elapsedMs, spawnCooldownMs };
  if (spawnCooldownMs <= 0) return spawnEgg(nextState);
  return nextState;
}
```

- Вне `playing` состояние не меняется.
- Дельта защищена от отрицательных/огромных значений.
- Счёт увеличивается на число пойманных, жизни уменьшаются на число пропущенных.
- Время накапливается в миллисекундах.
- При нуле жизней: gameover, пустые яйца, сброс кулдауна, обновление рекорда.
- `isNewRecord` — строгое превышение, не равенство.
- Иначе кулдаун уменьшается; при `<= 0` вызывается `spawnEgg`, который ставит новый интервал.
- За один кадр появляется максимум одно яйцо, даже если кулдаун сильно отрицательный.
- Спавн происходит после движения/коллизий, поэтому новое яйцо не проверяется в этом кадре.

**Подводные камни.** `advanceEggs` использует `forEach` и мутирует локальный массив, но не входной. При очень большом `delta` (сверху ограничен 0.05) яйцо не может «проскочить» волка, но при 640 px/s за 50 мс сдвиг 32 px — меньше высоты зоны. Проверка земли использует верх яйца; яйцо исчезает, когда его низ касается земли. `isNewRecord` выставляется только в moment gameover; если рекорд уже 0 и счёт 0, нового рекорда нет. `resetGame` не используется в UI, но покрыт тестами. `spawnEgg` не проверяет `random()` на диапазон; тестовый генератор должен возвращать `[0,1)`.

<a id="file-src-utils-storage-ts"></a>
### src/utils/storage.ts

**Назначение.** Безопасное чтение/запись рекорда в `localStorage`.

```ts
// строки 1–11
import { gameConfig } from '../game/config';
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}
```

- Ключ берётся из конфига.
- SSR/Node не имеют `window`.
- Доступ к `localStorage` может бросить исключение (privacy mode, sandbox); тогда возвращается `null`.

```ts
// строки 13–28
export function loadHighScore(): number {
  const storage = getStorage();
  if (!storage) return 0;
  try {
    const raw = storage.getItem(key);
    if (!raw) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  } catch { return 0; }
}
```

- Нет storage — 0.
- Нет значения — 0.
- `Number('')` дал бы 0, но пустая строка отсечена раньше.
- NaN/Infinity/отрицательные — 0.
- Дробное округляется вниз.
- Любая ошибка чтения — 0.

```ts
// строки 30–39
export function saveHighScore(score: number): void {
  const storage = getStorage();
  if (!storage) return;
  const value = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  try { storage.setItem(key, String(value)); } catch {}
}
```

- Без storage запись пропускается.
- Некорректный score сохраняется как 0.
- Ошибка записи (quota/security) игнорируется пустым `catch`.
- Значение хранится строкой.

**Подводные камни.** Рекорд не сохраняется мгновенно при побитии — только в gameover. Если `localStorage` переполнен, запись молча теряется. `getStorage` возвращает ссылку, а не копию; это нормально. Пустой `catch` разрешён ESLint, но скрывает диагностику.

<a id="file-src-components-startscreen-startscreen-module-less"></a>
### src/components/StartScreen/StartScreen.module.less

**Назначение.** Оформление стартового экрана: фон, заголовок, подсказки, маскоты, яйца и адаптивность.

```less
// строки 1–22
.screen { background: #8ed8f4; }
.soundCorner { position: absolute; top/right: clamp(10px, 2cqw, 20px); z-index: 12; }
.content { position: relative; z-index: 4; display: flex; flex-direction: column;
  align-items: center; justify-content: center; height: 100%;
  padding: 6% 8% 18%; text-align: center; }
```

- `screen` — голубое небо как fallback под фоном.
- `soundCorner` — звук в правом верхнем углу; `cqw` привязан к ширине контейнера сцены.
- `content` — центральная колонка; нижний padding оставляет место маскотам.
- `z-index` распределяет слои: фон 0, маскоты 2, контент 4, звук 12.

```less
// строки 24–37
.kicker { display: inline-flex; padding: .6em 1.1em;
  font-size: clamp(9px, 1.45cqw, 14px); font-weight: 900;
  letter-spacing: .18em; color: #ffe38a; text-transform: uppercase;
  background: #1b2c40; border: 1px solid rgba(255,255,255,.3);
  border-radius: 999px; box-shadow: 0 4px 12px rgba(27,44,64,.22);
  transform: rotate(-1.5deg); }
```

- «Пилюля» с тёмным фоном и жёлтым текстом.
- Разрядка и uppercase создают ретро-плашку.
- Лёгкий наклон добавляет рукотворности.

```less
// строки 39–48
.title { margin: .28em 0 0; font-family: 'Arial Black', 'Segoe UI Black', Impact, sans-serif;
  font-size: clamp(2rem, 9cqw, 5.4rem); line-height: .9;
  color: #fff8df; letter-spacing: -.045em;
  text-shadow: 0 .18cqw 0 #a05a32, 0 .42cqw 0 #743b24, 0 1cqw 2.2cqw rgba(27,52,70,.42);
  transform: rotate(-1deg); }
```

- Очень крупный тяжёлый заголовок.
- `line-height: .9` уплотняет строки.
- Многослойная тень имитирует объёмные буквы.
- `-0.045em` сближает символы.

```less
// строки 50–63
.subtitle { max-width: 58ch; margin: clamp(12px, 2.2cqw, 22px) 0 0;
  padding: .7em 1.2em; font-size: clamp(12px, 1.75cqw, 18px);
  font-weight: 700; line-height: 1.35; color: #23374c;
  background: rgba(255,252,240,.76); border: 1px solid rgba(255,255,255,.7);
  border-radius: 1.1em; box-shadow: 0 8px 20px rgba(48,94,115,.12);
  backdrop-filter: blur(3px); }
```

- Ограничение 58 символов улучшает читаемость.
- Полупрозрачная карточка с blur.

```less
// строки 65–91
.playButton { margin-top: clamp(...); padding-right/left: clamp(34px, 6cqw, 60px); font-size: clamp(...); }
.best, .bestHint { padding: .42em 1em; font-size...; background: rgba(255,246,214,.78); border-radius: 999px; }
.best strong { color: #a35b19; }
.bestHint { color: #52677b; background: rgba(255,255,255,.45); }
```

- Кнопка «Играть» получает более широкие боковые отступы и крупный шрифт.
- Рекорд и подсказка — «пилюли».
- Число рекорда выделено коричневым.
- Подсказка при нулевом рекорде светлее.

```less
// строки 93–124
.hint { display: flex; flex-wrap: wrap; gap: .55em 1.1em; align-items: center;
  justify-content: center; margin-top: clamp(...); font-size: clamp(9px,1.3cqw,12px);
  font-weight: 700; color: #344b60;
  span { display: inline-flex; gap: .3em; align-items: center; white-space: nowrap; } }
.hint kbd { display: inline-grid; min-width: 1.9em; height: 1.9em;
  padding: 0 .45em; place-items: center; font-family: inherit;
  color: #fff8e6; background: #253a50; border-radius: .38em;
  box-shadow: 0 2px 0 #101d2c; }
```

- Подсказки переносятся на новую строку.
- Каждая группа не разрывается (`nowrap`).
- `kbd` стилизованы как клавиши: тёмный фон и нижняя тень.
- `place-items` центрирует текст.

```less
// строки 126–194
.mascots { position: absolute; right: 0; left: 0; bottom: calc(var(--ground-height, 10.6667%) - 1%);
  z-index: 2; height: 29%; pointer-events: none; }
.wolfMascot { position: absolute; bottom: 0; left: 3.2%; width: 25%;
  filter: drop-shadow(...); animation: mascotBob 3.4s ease-in-out infinite;
  svg { display: block; width: 100%; height: auto; overflow: visible; } }
.chickenMascot { right: 4.5%; bottom: 2%; width: 14%;
  animation: mascotBob 3.9s ease-in-out .4s infinite; }
.egg { position: absolute; width: 2.8%; aspect-ratio: 28/38;
  background: radial-gradient(...); border: 1px solid...;
  border-radius: 50% 50% 47% 47% / 62% 62% 38% 38%;
  box-shadow: 0 5px 8px rgba(28,66,28,.15); }
.eggOne { bottom: 2%; left: 31%; transform: rotate(-13deg); }
.eggTwo { bottom: .5%; left: 35.5%; transform: rotate(7deg); }
.eggThree { right: 22%; bottom: 1.5%; transform: rotate(15deg); }
```

- Маскоты стоят на линии земли, вычисленной через CSS-переменную с fallback.
- `pointer-events: none` — декор не перехватывает клики.
- Волк слева, курица справа; разные длительности анимации создают естественность.
- SVG занимает всю ширину контейнера.
- Яйца — аспект 28:38, сложный `border-radius` придаёт яйцевидность.
- Три яйца повёрнуты по-разному.

```less
// строки 196–205
@keyframes mascotBob {
  0%, 100% { transform: translateY(0) rotate(-.4deg); }
  50% { transform: translateY(-4%) rotate(.5deg); }
}
```

- Плавное покачивание вверх-вниз.
- Поворот усиливает «живость».

```less
// строки 207–240
@media (max-width: 620px) {
  .content { padding: 5% 6% 14%; }
  .hint { display: none; }
  .mascots { opacity: .82; }
  .wolfMascot { left: 1.5%; width: 22%; }
  .chickenMascot { right: 2.5%; width: 13%; }
  .eggThree { right: 18%; }
}
@media (prefers-reduced-motion: reduce) {
  .wolfMascot, .chickenMascot { animation: none; }
}
```

- На узком экране подсказки скрываются, чтобы не переполнять сцену.
- Маскоты немного уменьшаются.
- `prefers-reduced-motion` отключает анимацию для чувствительных пользователей.

**Подводные камни.** Сцена использует container queries (`cqw`); без `container-type` в `stage` единицы не работали бы. Подсказки полностью исчезают на мобильных, хотя управление остаётся. `--ground-height` имеет fallback только в одном месте, но используется в маскотах; если родитель не задал переменную, fallback 10.6667% соответствует 64/600.

<a id="file-src-components-gamescreen-gamescreen-module-less"></a>
### src/components/GameScreen/GameScreen.module.less

**Назначение.** Стили игрового поля: волк, яйца, оверлей и карточка паузы, анимации.

```less
// строки 1–20
.arena { touch-action: none; }
.wolf { position: absolute; z-index: 5; display: block;
  filter: drop-shadow(0 10px 8px rgba(31,61,36,.22));
  transform-origin: 50% 100%; will-change: left, top;
  animation: wolfBob 420ms ease-in-out infinite alternate;
  svg { display: block; width: 100%; height: 100%; overflow: visible; } }
```

- `touch-action: none` отключает браузерные жесты на поле, чтобы pointer-события работали стабильно.
- Волк выше фона, ниже HUD.
- Тень отделяет от земли.
- `transform-origin` внизу — покачивание выглядит как шаги.
- `will-change` подсказывает браузеру анимировать позицию.
- `alternate` даёт плавное «дыхание» 420 мс.

```less
// строки 22–51
.egg { position: absolute; z-index: 6;
  background: radial-gradient(circle at 34% 26%, #fffef6 0%, #fff9e8 38%, #f2dfb4 76%, #d8b976 100%);
  border: 1px solid rgba(137,95,38,.5);
  border-radius: 50% 50% 47% 47% / 62% 62% 38% 38%;
  box-shadow: inset -.4cqw -.5cqw .7cqw rgba(156,111,48,.22), 0 .6cqw 1cqw rgba(38,70,31,.18);
  will-change: top;
  &::before { top: 16%; left: 22%; width: 26%; height: 36%; ...
    background: radial-gradient(circle, rgba(255,255,255,.95), transparent 72%); border-radius: 50%; }
  &::after { inset: 12%; ...
    background: radial-gradient(...) x3; border-radius: inherit; } }
```

- Яйцо выше волка.
- Радиальный градиент создаёт объём.
- Внутренняя и внешняя тени усиливают 3D.
- `::before` — блик; `::after` — три крапинки.
- `will-change: top` оптимизирует падение.

```less
// строки 53–74
.pauseOverlay { position: absolute; inset: 0; z-index: 40; display: grid;
  padding: 7%; place-items: center; background: rgba(6,16,29,.62);
  backdrop-filter: blur(4px); animation: overlayIn 180ms ease-out; }
.pauseCard { width: min(76%, 430px); padding: clamp(18px, 3.4cqw, 34px);
  text-align: center; background: linear-gradient(160deg, #fffdf4 0%, #fff5d6 70%, #ffe8ac 100%);
  border: clamp(2px, .45cqw, 4px) solid #1c2b3d;
  border-radius: clamp(14px, 2.4cqw, 24px);
  box-shadow: .8cqw .8cqw 0 #b5802c, 0 24px 50px rgba(0,0,0,.35);
  animation: cardIn 220ms ease-out; }
```

- Затемняющий слой с blur.
- Карточка центрируется grid’ом.
- Светлый «бумажный» градиент и толстая тёмная рамка.
- Жёсткая смещённая тень создаёт ретро-вид.

```less
// строки 76–111
.pauseKicker { ... background: #253b52; border-radius: 999px; }
.pauseTitle { font-family: 'Arial Black'...; font-size: clamp(24px, 4.5cqw, 42px); ... }
.pauseText { ... color: #526174; }
.pauseActions { display: grid; gap: clamp(8px, 1.4cqw, 13px);
  button { width: 100%; min-width: 0; } }
```

- Плашка «Пауза».
- Крупный заголовок.
- Текст приглушён.
- Кнопки вертикально на всю ширину.

```less
// строки 113–143
@keyframes wolfBob { from { transform: translateY(0) rotate(-.6deg); }
  to { transform: translateY(-1.4%) rotate(.6deg); } }
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes cardIn { from { opacity: 0; transform: translateY(12px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .wolf,.pauseOverlay,.pauseCard { animation: none; } }
```

- Волк покачивается.
- Оверлей плавно проявляется.
- Карточка «всплывает» и масштабируется.
- Reduced-motion отключает всё.

**Подводные камни.** Анимация волка использует `transform`, а позиция — `left/top`; они не конфликтуют, но `will-change` на двух свойствах может расходовать память. Яйца не анимируются CSS — двигает React. `backdrop-filter` не поддерживается частью браузеров, фон останется затемнённым. Размеры в `cqw` требуют контейнера сцены.

<a id="file-src-components-gameoverscreen-gameoverscreen-module-less"></a>
### src/components/GameOverScreen/GameOverScreen.module.less

**Назначение.** Оформление финального экрана: затемнение, панель результата, рекорд, бейдж и кнопки.

```less
// строки 1–22
.screen { display: flex; align-items: center; justify-content: center; padding: 5%; }
.dim { position: absolute; inset: 0; z-index: 1;
  background: radial-gradient(circle at 50% 42%, rgba(21,39,56,.1) 0%, rgba(6,16,29,.72) 72%), rgba(7,17,30,.38);
  backdrop-filter: blur(2px); }
.soundCorner { position: absolute; top/right: clamp(...); z-index: 12; }
```

- Экран центрирует панель.
- Затемнение темнее по краям, светлее в центре.
- Звук поверх затемнения.

```less
// строки 24–37
.panel { position: relative; z-index: 3; width: min(74%, 600px); max-height: 90%;
  padding: clamp(...) clamp(...); overflow-y: auto; text-align: center;
  background: linear-gradient(155deg, #fffdf4 0%, #fff8e3 58%, #ffe9b4 100%);
  border: clamp(...) solid #1a2b3d; border-radius: clamp(...);
  box-shadow: .9cqw .9cqw 0 #b37a2a, 0 28px 60px rgba(0,0,0,.4);
  animation: panelIn 280ms ease-out; }
```

- Панель ограничена по ширине/высоте.
- `overflow-y: auto` спасает на маленьких экранах.
- Светлый градиент, тёмная рамка, смещённая тень.
- Появление анимировано.

```less
// строки 39–66
.kicker { ... background: #d45145; box-shadow: 0 3px 0 #8e2e2a; }
.title { font-size: clamp(28px, 5.6cqw, 54px); ... color: #1a2b3d; }
.text { font-size: clamp(11px, 1.55cqw, 15px); color: #5b6878; }
```

- Красная плашка «Игра окончена».
- Крупный тёмный заголовок.
- Приглушённое пояснение.

```less
// строки 68–94
.scoreBox { display: flex; flex-direction: column; gap: .08em; align-items: center;
  padding: clamp(...) 12px; background: rgba(37,59,82,.08);
  border: 2px dashed rgba(37,59,82,.22); border-radius: clamp(...); }
.scoreLabel { ... color: #778493; text-transform: uppercase; }
.scoreValue { font-family: 'Arial Black'...; font-size: clamp(38px, 8.4cqw, 82px);
  font-variant-numeric: tabular-nums; color: #d26728; }
```

- Счёт в отдельной рамке с пунктиром.
- Табличные цифры не «прыгают».
- Огромное оранжевое число — визуальный центр.

```less
// строки 96–140
.recordRow { display: flex; flex-wrap: wrap; gap: .5em; align-items: center;
  justify-content: center; margin-top: clamp(...); }
.recordLabel { ... text-transform: uppercase; color: #687687; }
.recordValue { font-size: 1.3em; font-variant-numeric: tabular-nums; color: #263a4f; }
.recordBadge { padding: .3em .75em; font-size: .85em; font-weight: 900; color: #fff9e7;
  text-transform: uppercase; background: #3d7e46; border-radius: 999px; transform: rotate(-2deg); }
.actions { display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
  gap: clamp(...); margin-top: clamp(...); button { width: 100%; min-width: 0; } }
```

- Рекорд и бейдж переносятся.
- Зелёный бейдж слегка наклонён.
- Две равные кнопки в grid.

```less
// строки 142–215
@keyframes panelIn { from { opacity: 0; transform: translateY(18px) scale(.96); }
  to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 620px) {
  .panel { width: 86%; max-height: 94%; padding: 10px 14px; }
  .kicker { font-size: 8px; }
  .title { font-size: clamp(22px, 6.8cqw, 34px); }
  .text { display: none; }
  .scoreValue { font-size: clamp(30px, 9cqw, 44px); }
  ...
  .actions button { padding: 8px 6px; font-size: 11px; }
}
@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
```

- На мобильных панель шире, текст скрывается, счёт уменьшается.
- Кнопки компактнее.
- Reduced-motion отключает появление.

**Подводные камни.** Скрытие `.text` на мобильных убирает пояснение, но не влияет на функцию. `max-height` + `overflow` может обрезать фокусное кольцо кнопки. Бейдж «Новый рекорд!» не имеет `aria-live`, поэтому скринридер узнает о нём только при чтении панели.

<a id="file-src-components-hud-hud-module-less"></a>
### src/components/Hud/Hud.module.less

**Назначение.** Верхняя панель: полупрозрачный градиент, «пилюли» счёта/жизней/рекорда, сердца и круглые иконки.

```less
// строки 1–20
.hud { position: absolute; top/right/left: 0; z-index: 20; display: flex;
  gap: clamp(6px,1.4cqw,14px); align-items: center;
  padding: clamp(7px,1.3cqw,13px) clamp(10px,1.9cqw,22px);
  background: linear-gradient(180deg, rgba(7,20,35,.84) 0%, rgba(7,20,35,.42) 62%, transparent 100%);
  pointer-events: none; }
.scoreBadge, .lives, .best, .actions { pointer-events: auto; }
```

- Панель растянута по верхнему краю.
- Тёмный градиент плавно растворяется вниз.
- Панель не перехватывает клики, но её интерактивные блоки — да.
- `z-index: 20` выше поля, ниже паузы.

```less
// строки 22–36
.scoreBadge, .lives, .best { display: flex; gap: clamp(5px,.8cqw,9px);
  align-items: center; min-height: clamp(28px,4.1cqw,42px);
  padding: 0 clamp(9px,1.5cqw,16px); color: #fff8e8;
  background: rgba(8,20,34,.58); border: 1px solid rgba(255,255,255,.16);
  border-radius: 999px;
  box-shadow: 0 4px 14px rgba(5,15,27,.22), inset 0 1px 0 rgba(255,255,255,.1);
  backdrop-filter: blur(5px); }
.scoreBadge { border-color: rgba(255,208,89,.44); }
```

- Три «пилюли» с общим стилем.
- Полупрозрачный фон и blur.
- Внутренняя светлая грань создаёт стеклянный эффект.
- У счёта золотая рамка.

```less
// строки 42–65
.label { font-size: clamp(8px,1.25cqw,12px); font-weight: 800;
  letter-spacing: .13em; color: rgba(255,255,255,.62); text-transform: uppercase; }
.score { font-size: clamp(18px,2.7cqw,28px); font-variant-numeric: tabular-nums;
  line-height: 1; color: #ffd35f; }
.best { margin-left: auto; }
.bestValue { font-size: clamp(13px,1.8cqw,19px); font-variant-numeric: tabular-nums; color: #e8f2ff; }
```

- Подписи мелкие, разряжённые, приглушённые.
- Счёт крупный золотой.
- `margin-left: auto` прижимает рекорд вправо вместе с действиями.
- Цифры табличные.

```less
// строки 67–95
.lives { padding-right: clamp(10px,1.7cqw,18px); }
.hearts { display: flex; gap: clamp(2px,.45cqw,5px); align-items: center; }
.heart { display: block; width: clamp(14px,2.1cqw,22px); color: #eb5c4a;
  filter: drop-shadow(0 2px 3px rgba(83,13,15,.3));
  transition: color 200ms ease, opacity 200ms ease, transform 200ms ease;
  svg { display: block; width: 100%; height: auto; } }
.heartEmpty { color: rgba(255,255,255,.2); filter: none; transform: scale(.9); }
```

- Сердца красные с тенью.
- Пустые — полупрозрачные и чуть меньше.
- Плавный переход на случай изменения жизней.

```less
// строки 97–136
.actions { display: flex; gap: clamp(5px,.8cqw,9px); align-items: center; }
.iconButton { display: grid; width: clamp(32px,4.5cqw,44px); aspect-ratio: 1;
  padding: 0; place-items: center; color: #fff8e6; cursor: pointer;
  background: rgba(9,22,38,.58); border: 1px solid rgba(255,255,255,.22);
  border-radius: 50%; box-shadow: ...; transition: ...;
  svg { width: 50%; height: 50%; }
  &:hover { ... transform: translateY(-1px); }
  &:active { transform: translateY(0) scale(.96); }
  &:focus-visible { outline: 3px solid #ffd15c; outline-offset: 3px; } }
```

- Круглая кнопка паузы.
- Иконка занимает половину.
- Hover/active/focus дают обратную связь.
- Focus-visible видим только при клавиатуре.

```less
// строки 138–177
@media (max-width: 620px) {
  .hud { gap: 5px; padding: 6px 8px; }
  .scoreBadge, .lives, .best { min-height: 28px; padding: 0 8px; }
  .label { display: none; }
  .scoreBadge .label { display: inline; font-size: 8px; }
  .heart { width: 13px; }
  .iconButton { width: 30px; }
}
@media (max-width: 430px) { .best { display: none; } }
```

- На мобильных подписи скрываются, кроме «Счёт».
- Сердца/кнопки компактнее.
- На очень узких экранах рекорд исчезает, чтобы не переполнять строку.

**Подводные камни.** Скрытый рекорд на ≤430 px означает, что игрок не видит его в HUD, но увидит на финальном экране. HUD не переносится на новую строку; при экстремально узком контейнере элементы могут сжаться. `pointer-events` управляется точечно, иначе панель блокировала бы клики по полю.

<a id="file-src-components-soundtoggle-soundtoggle-module-less"></a>
### src/components/SoundToggle/SoundToggle.module.less

**Назначение.** Круглая кнопка звука, визуально совпадающая с кнопкой паузы.

```less
// строки 1–34
.button { display: grid; width: clamp(32px,4.5cqw,44px); aspect-ratio: 1;
  padding: 0; place-items: center; color: #fff8e6; cursor: pointer;
  background: rgba(9,22,38,.58); border: 1px solid rgba(255,255,255,.22);
  border-radius: 50%; box-shadow: 0 4px 14px rgba(6,16,30,.25), inset 0 1px 0 rgba(255,255,255,.15);
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
  svg { width: 52%; height: 52%; }
  &:hover { background: rgba(20,44,70,.82); border-color: rgba(255,212,92,.65); transform: translateY(-1px); }
  &:active { transform: translateY(0) scale(.96); }
  &:focus-visible { outline: 3px solid #ffd15c; outline-offset: 3px; } }
```

- Квадратный контейнер с `aspect-ratio: 1` и `border-radius: 50%` даёт круг.
- Полупрозрачный тёмный фон.
- При наведении подсвечивается золотая рамка.
- Нажатие слегка уменьшает.
- Фокус заметен.
- В отличие от `Hud`, SVG чуть больше (52% против 50%).

**Подводные камни.** Стили почти дублируют `.iconButton` из HUD; изменение одного не синхронизирует другое. Кнопка не имеет текста, поэтому полностью зависит от `aria-label` в JSX.

<a id="file-src-components-touchcontrols-touchcontrols-module-less"></a>
### src/components/TouchControls/TouchControls.module.less

**Назначение.** Расположение и стиль двух крупных сенсорных кнопок внизу сцены.

```less
// строки 1–11
.controls { position: absolute; right: 0; bottom: max(8px,1.6cqw); left: 0; z-index: 25;
  display: flex; justify-content: space-between;
  padding: 0 clamp(10px,2.2cqw,24px); pointer-events: none; }
```

- Контейнер растянут по низу.
- Кнопки разнесены по краям.
- Контейнер не ловит pointer-события, кнопки включают их обратно.

```less
// строки 13–48
.button { display: grid; width: clamp(46px,8.5cqw,76px); aspect-ratio: 1;
  padding: 0; place-items: center; color: #1a2b3d; cursor: pointer;
  touch-action: none; pointer-events: auto;
  background: linear-gradient(180deg, rgba(255,250,234,.93) 0%, rgba(255,226,155,.92) 100%);
  border: clamp(2px,.45cqw,4px) solid rgba(26,43,61,.78);
  border-radius: 50%; box-shadow: 0 5px 0 rgba(25,47,66,.45), ...;
  transition: transform 100ms ease, box-shadow 100ms ease, filter 100ms ease;
  svg { width: 54%; height: 54%; }
  &:hover { filter: brightness(1.04); }
  &:active { box-shadow: 0 2px 0 ...; transform: translateY(3px); }
  &:focus-visible { outline: 3px solid #fff8df; outline-offset: 3px; } }
```

- Крупные круглые «кнопки-печати».
- Градиент кремово-жёлтый.
- Толстая тёмная рамка и нижняя тень дают объём.
- `touch-action: none` + `pointer-events: auto` обязательны для pointer-управления.
- Активное состояние «вдавливает» кнопку.

```less
// строки 50–59
@media (max-width: 620px) {
  .controls { bottom: 6px; padding: 0 10px; }
  .button { width: 48px; }
}
```

- На мобильных кнопки фиксированы 48 px и ближе к краю.

**Подводные камни.** Кнопки всегда в DOM, на десктопе не скрываются, хотя дублируют клавиатуру. Они могут перекрывать нижнюю часть игрового поля и волка; `z-index: 25` выше волка (5) и яиц (6), но ниже паузы (40). На устройствах с мышью клик работает как pointerdown/up.

<a id="file-src-components-farmbackground-farmbackground-module-less"></a>
### src/components/FarmBackground/FarmBackground.module.less

**Назначение.** Многослойный пейзаж: небо, солнце, облака, холмы, забор, земля.

```less
// строки 1–7
.background { position: absolute; inset: 0; z-index: 0; overflow: hidden;
  background: linear-gradient(180deg, #5dbde9 0%, #91daf7 44%, #d9f4ff 68%, #fff8d8 var(--ground-height), #fff8d8 100%); }
```

- Слой на всю сцену, под всем.
- Небо переходит в светлую полосу на линии земли.
- `var(--ground-height)` приходит из React.

```less
// строки 9–19
.sun { position: absolute; top: 17%; right: 9%; width: 12%; aspect-ratio: 1;
  background: radial-gradient(circle at 38% 34%, #fffbd6 0%, #ffe072 48%, #ffc63f 75%, #f7ad2e 100%);
  border-radius: 50%; box-shadow: 0 0 0 1.8cqw rgba(255,241,174,.24), 0 0 6cqw rgba(255,210,86,.42);
  animation: sunPulse 6s ease-in-out infinite; }
```

- Солнце справа сверху.
- Два ореола: резкий и размытый.
- Медленное «дыхание».

```less
// строки 21–73
.cloud { position: absolute; height: 5.8%; background: rgba(255,255,255,.82);
  border-radius: 999px; filter: drop-shadow(...); animation: cloudDrift 32s ease-in-out infinite;
  &::before, &::after { position: absolute; bottom: 8%; content: ''; background: inherit; border-radius: 50%; }
  &::before { left: 12%; width: 58%; aspect-ratio: 1; }
  &::after { right: 10%; bottom: 18%; width: 42%; aspect-ratio: 1; } }
.cloudOne { top: 15%; left: 5%; width: 19%; }
.cloudTwo { top: 29%; right: 17%; width: 13%; opacity: .72; animation-duration: 40s; animation-direction: reverse; }
.cloudThree { top: 8%; left: 44%; width: 10%; opacity: .56; animation-duration: 48s; }
```

- Облако — скруглённая полоса плюс два круга.
- Каждое облако имеет свой размер/прозрачность/скорость.
- Второе движется в обратную сторону.
- Анимация сдвигает на 2.2cqw.

```less
// строки 75–84
.hills { position: absolute; right: -6%; bottom: var(--ground-height); left: -6%; height: 20%;
  background: radial-gradient(ellipse at 23% 108%, #84bd58 0 46%, transparent 47%),
    radial-gradient(ellipse at 67% 112%, #74ad4b 0 51%, transparent 52%),
    linear-gradient(transparent 68%, #a4d477 68%);
  opacity: .88; }
```

- Два эллипса образуют холмы.
- Нижняя полоса сглаживает переход к земле.

```less
// строки 86–132
.fence { right/bottom/left: 0; z-index: 1; height: 9%;
  background: repeating-linear-gradient(90deg, transparent 0 7.5%, rgba(180,118,58,.88) 7.5% 9.4%, transparent 9.4% 16%);
  border-top/bottom: ...; opacity: .88;
  &::after { top: 42%; right/left: 0; height: 12%; content: ''; background: rgba(169,108,50,.8); } }
.ground { right/bottom/left: 0; z-index: 2; height: var(--ground-height);
  background: linear-gradient(180deg, #a6e568 0%, #7bc84b 22%, #54a234 100%);
  border-top: .7cqw solid #c2f083;
  &::after { inset: 0; ... background-image: radial-gradient(...) x2; background-size: 44px 26px; } }
```

- Забор — повторяющиеся вертикальные доски и горизонтальная перекладина.
- Земля — зелёный градиент, светлая кромка и крапчатая текстура.
- `z-index` забора 1, земли 2: земля перекрывает низ забора.

```less
// строки 134–161
@keyframes sunPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes cloudDrift { 0%,100% { transform: translateX(0); } 50% { transform: translateX(2.2cqw); } }
@media (prefers-reduced-motion: reduce) { .sun, .cloud { animation: none; } }
```

- Солнце пульсирует на 4%.
- Облака дрейфуют.
- Reduced-motion выключает обе анимации.

**Подводные камни.** В React-компоненте `--ground-height` задаётся инлайн-стилем; в CSS fallback отсутствует. Если переменная не определена, `height: var(--ground-height)` станет невалидным и земля исчезнет. Фон не реагирует на resize вручную — всё в процентах. `repeating-linear-gradient` с дробными процентами может давать швы на некоторых DPI.

<a id="file-src-styles-buttons-module-less"></a>
### src/styles/buttons.module.less

**Назначение.** Общие стили кнопок: базовый размер, primary/secondary/ghost и focus.

```less
// строки 1–16
.base { display: inline-flex; align-items: center; justify-content: center;
  min-width: min(44cqw,220px); padding: clamp(9px,1.8cqw,17px) clamp(20px,4cqw,42px);
  font-weight: 900; font-size: clamp(13px,2cqw,20px); line-height: 1;
  letter-spacing: .06em; text-transform: uppercase; white-space: nowrap;
  cursor: pointer; border-radius: 999px;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease; }
```

- Общая основа для всех кнопок.
- Минимальная ширина адаптивна, но не более 220 px.
- Крупный uppercase-текст, разрядка.
- `white-space: nowrap` не даёт переносить подпись.
- Переходы для hover/active.

```less
// строки 18–34
.primary { color: #1b2b3d; background: linear-gradient(180deg,#ffe48a 0%,#ffd15c 54%,#f4b63f 100%);
  border: 2px solid #fff2b6; box-shadow: 0 7px 0 #a96d24, 0 16px 28px rgba(46,71,34,.3);
  &:hover { ... transform: translateY(-2px); }
  &:active { box-shadow: 0 3px 0 #a96d24,...; transform: translateY(4px); } }
```

- Жёлтая объёмная кнопка с «подошвой».
- Hover приподнимает и усиливает тень.
- Active опускает и уменьшает тень — эффект нажатия.

```less
// строки 36–52
.secondary { color: #24374d; background: rgba(255,249,233,.94);
  border: 2px solid #2b3e55; box-shadow: 0 5px 0 rgba(43,62,85,.65), ...;
  &:hover { background: #fffdf8; transform: translateY(-2px); ... }
  &:active { ... transform: translateY(3px); } }
```

- Светлая кнопка с тёмной рамкой.
- Менее акцентная, чем primary.

```less
// строки 54–69
.ghost { color: #35495e; background: transparent;
  border: 2px solid rgba(43,62,85,.36); box-shadow: none;
  &:hover { background: rgba(43,62,85,.08); border-color: rgba(43,62,85,.6); transform: translateY(-1px); }
  &:active { transform: translateY(1px); } }
```

- Прозрачная кнопка для второстепенных действий (выход в меню).

```less
// строки 71–74
.base:focus-visible { outline: 3px solid #fff8df; outline-offset: 3px; }
```

- Единое светлое кольцо фокуса.

**Подводные камни.** `.base` не сбрасывает `background`/`border` браузера, поэтому модификатор обязателен. `min-width: min(44cqw,220px)` на узких экранах может быть меньше текста, но `nowrap` не даёт переносу; кнопка может выйти за контейнер. В `:active` кнопка не теряет фокус.

<a id="file-src-styles-stage-module-less"></a>
### src/styles/stage.module.less

**Назначение.** Общая сцена 4:3 с рамкой, тенью, container queries и отключением выделения.

```less
// строки 1–15
.stage { position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden;
  isolation: isolate; container-type: inline-size; background: #9ee1fb;
  border-radius: clamp(16px,2.4vw,30px);
  box-shadow: 0 35px 80px rgba(0,0,0,.48), 0 0 0 5px #f3c653, 0 0 0 10px #1a2638,
    0 0 0 12px rgba(255,255,255,.08);
  user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
```

- `aspect-ratio` фиксирует 4:3.
- `overflow: hidden` обрезает слои.
- `isolation: isolate` создаёт stacking context, чтобы `z-index` детей не влиял на внешний layout.
- `container-type: inline-size` включает `cqw`/`cqh` для всех дочерних стилей.
- Голубой fallback.
- Многослойная рамка: жёлтая, тёмная, светлая.
- `user-select: none` предотвращает выделение текста при перетаскивании.
- `tap-highlight-color: transparent` убирает синюю вспышку на мобильных.

```less
// строки 17–22
@media (max-width: 620px) {
  .stage { border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0,0,0,.45), 0 0 0 3px #f3c653, 0 0 0 7px #1a2638; }
}
```

- На мобильных меньше радиус и тени.

**Подводные камни.** `container-type: inline-size` не создаёт высотный контейнер, поэтому `cqh` не работает; в проекте используются только `cqw`. `aspect-ratio` может конфликтовать с процентной высотой родителя. `isolation: isolate` важен для корректного наложения оверлеев.

<a id="tests"></a>
## 4. Тесты

Vitest запускается через `npm test` (`vitest run`), окружение — `jsdom`, CSS обрабатывается, jest-dom-матчеры подключаются глобально. Всего 18 тестов: 13 в `logic.test.ts` и 5 в `App.test.tsx`.

#### Общая схема

- `src/game/logic.test.ts` проверяет чистую модель без DOM.
- `src/App.test.tsx` рендерит настоящий `App`, но подменяет `startGame`, чтобы детерминированно попасть в `gameover`.
- `requestAnimationFrame`/`cancelAnimationFrame` застаблены, поэтому цикл не крутится и тесты не зависят от времени.
- `localStorage` очищается перед каждым тестом.
- `userEvent.setup()` имитирует реальные клики.

<a id="file-src-app-test-tsx"></a>
### src/App.test.tsx

**Назначение.** Интеграционные тесты корневого компонента и переходов между экранами.

```tsx
// строки 1–8
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './components/App';
import { gameConfig } from './game/config';
```

- Явные импорты Vitest делают файл независимым от `globals`.
- `within` ограничивает поиск внутри диалога.
- `userEvent` имитирует клики с фокусом/событиями.

```tsx
// строки 10–29
const mockFlags = vi.hoisted(() => ({ forceGameOver: false }));

vi.mock('./game/logic', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game/logic')>();
  return {
    ...actual,
    startGame: (highScore = 0) => {
      if (!mockFlags.forceGameOver) return actual.startGame(highScore);
      return {
        ...actual.createInitialState(highScore),
        phase: 'gameover' as const,
        score: 9,
        highScore: Math.max(highScore, 12),
        isNewRecord: true,
      };
    },
  };
});
```

- `vi.hoisted` создаёт объект до подъёма `vi.mock`, иначе фабрика не смогла бы к нему обратиться.
- Мок частичный: остальные функции (`updateState`, `togglePause`, `createInitialState`) остаются настоящими.
- `forceGameOver=false` — обычный старт.
- При `true` `startGame` возвращает валидную модель `gameover` со счётом 9 и рекордом минимум 12.
- Это позволяет проверить финальный экран без симуляции трёх пропусков и без управления кадрами.
- `Math.max` гарантирует новый рекорд при пустом storage.

```tsx
// строки 31–44
describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFlags.forceGameOver = false;
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });
```

- Изоляция тестов: чистый storage и флаг.
- RAF-заглушки предотвращают реальный цикл и утечки.
- `vi.fn(() => 0)` возвращает фиктивный id.
- `unstubAllGlobals` восстанавливает оригиналы.

```tsx
// строки 46–58
it('shows the start screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Ну, погоди!' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Играть' })).toBeInTheDocument();
});
it('shows the saved record on the start screen', () => {
  localStorage.setItem(gameConfig.highScoreStorageKey, '42');
  render(<App />);
  expect(screen.getByText(/Рекорд:/)).toHaveTextContent('Рекорд: 42');
});
```

- Первый тест проверяет заголовок и кнопку через доступные роли.
- Второй предварительно пишет `42` по реальному ключу и проверяет отображение.
- Ленивый initializer `App` читает storage при монтировании.

```tsx
// строки 60–69
it('clicking play switches to the game screen', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Играть' }));
  expect(screen.getByText('Счёт')).toBeInTheDocument();
  expect(screen.getByText('Жизни')).toBeInTheDocument();
  expect(screen.getByTestId('wolf')).toBeInTheDocument();
});
```

- Проверяет переход `start → playing`.
- HUD отображает счёт/жизни, поле — волка.
- `findBy` не нужен: обновление синхронное после клика.

```tsx
// строки 71–84
it('shows the final score and high score when the game is over', async () => {
  mockFlags.forceGameOver = true;
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Играть' }));
  expect(screen.getByText('Финальный счёт')).toBeInTheDocument();
  expect(screen.getByTestId('final-score')).toHaveTextContent('9');
  expect(screen.getByTestId('high-score')).toHaveTextContent('12');
  expect(screen.getByText('Новый рекорд!')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Заново' })).toBeInTheDocument();
  expect(localStorage.getItem(gameConfig.highScoreStorageKey)).toBe('12');
});
```

- Флаг заставляет `startGame` сразу вернуть `gameover`.
- Проверяются счёт 9, рекорд 12, бейдж нового рекорда, кнопка «Заново».
- `saveHighScore` вызывается эффектом `App` и записывает `'12'`.
- Это одновременно проверяет интеграцию storage и gameover-экрана.

```tsx
// строки 86–100
it('can pause and resume the game', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Играть' }));
  await user.click(screen.getByRole('button', { name: 'Пауза' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByText('Пауза')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Продолжить' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- Проверяет открытие диалога паузы.
- `within` гарантирует, что текст и кнопка находятся внутри диалога.
- После продолжения диалог исчезает.
- Реальный `togglePause` используется, мок его не подменяет.

**Подводные камни.** Мок `startGame` не проверяет, что модель валидна по всем полям, но использует `createInitialState`, поэтому структура корректна. Тест gameover не проверяет звук (jsdom без Web Audio) и не проверяет `visibilitychange`. `requestAnimationFrame` стаб возвращает 0; cleanup вызывает `cancelAnimationFrame(0)`, что безопасно. Тесты не используют fake timers и не проверяют рост сложности в UI.

<a id="file-src-game-logic-test-ts"></a>
### src/game/logic.test.ts

**Назначение.** 13 модульных тестов чистой логики: старт, ловля/пропуск, gameover, границы, пауза, спавн, сложность.

```ts
// строки 17–36
const idleInput: InputState = { left: false, right: false };
function makePlayingState(overrides: Partial<GameModel> = {}): GameModel {
  return { ...startGame(0), spawnCooldownMs: 60_000, ...overrides };
}
function makeEgg(overrides: Partial<Egg> = {}): Egg {
  return { id: 1, x: gameConfig.width/2 - gameConfig.eggWidth/2, y: 0,
    vy: gameConfig.baseFallSpeed, rotation: 0, ...overrides };
}
```

- `idleInput` исключает движение.
- `makePlayingState` создаёт игру и отключает спавн на 60 с, чтобы тесты контролировали яйца.
- `overrides` позволяет точечно менять поля.
- `makeEgg` ставит яйцо по центру над полем; переопределения задают коллизию.

```ts
// строки 38–57 — стартовые состояния
createInitialState(11): phase 'start', lives 3, score 0, highScore 11, eggs [].
startGame(7): phase 'playing', score 0, lives 3, eggs [], highScore 7.
```

- Проверяет базовую инициализацию и сохранение рекорда.
- Не проверяет координаты волка здесь; это делает тест `resetGame`.

```ts
// строки 59–71 — поимка
const egg = makeEgg({ x: state.wolf.x + 20, y: state.wolf.y + wolfCatchInsetTop });
const result = updateState({ ...state, eggs: [egg] }, 1/60, idleInput);
score 1, lives 3, egg removed.
```

- Яйцо размещено внутри зоны ловли.
- После шага оно удалено и приносит очко.
- Жизни не меняются.

```ts
// строки 73–86 — пропуск
const egg = makeEgg({ x: 2, y: groundY - eggHeight - 1 });
lives 2, score 0, eggs [].
```

- Яйцо на волосок выше земли; за кадр пересекает границу.
- `x=2` далеко от волка, поэтому коллизии нет.
- Жизнь уменьшается, яйцо исчезает.

```ts
// строки 88–104 — последняя жизнь
state lives 1, score 3, highScore 0; egg as above;
phase 'gameover', lives 0, score 3, highScore 3, isNewRecord true, eggs [].
```

- Проверяет переход в gameover и сохранение счёта.
- Рекорд обновляется до 3, флаг нового рекорда истинен.

```ts
// строки 106–119 — рекорд не перезаписывается
state lives 1, score 3, highScore 10;
phase 'gameover', highScore 10, isNewRecord false.
```

- Меньший результат не ухудшает рекорд.
- `isNewRecord` ложен.

```ts
// строки 121–136 — края
wolf.x=1 + left => 0;
wolf.x=maxX-1 + right => maxX (688).
```

- Проверяет clamp и точные границы.
- `maxX = width - wolfWidth`.

```ts
// строки 138–147 — resetGame
resetGame(42): phase 'playing', score 0, lives 3, eggs [], highScore 42,
wolf.x = width/2 - wolfWidth/2 = 344.
```

- Сброс сохраняет рекорд и центрирует волка.
- Подтверждает, что `resetGame` — алиас нового раунда.

```ts
// строки 149–156 — пауза
const paused = togglePause(state);
paused.phase 'paused';
updateState(paused, ...) === paused;
togglePause(paused).phase 'playing'.
```

- Пауза замораживает симуляцию: `updateState` возвращает тот же объект.
- Повторное переключение возвращает игру.
- Проверка по ссылке важна для иммутабельности.

```ts
// строки 158–168 — спавн
spawnEgg(state, () => 0): x = 16;
spawnEgg(state, () => 1): x = 800 - 28 - 16 = 756;
vy = 150; nextEggId = 2; cooldown = 1300.
```

- Границы распределения: левый и правый край доступной полосы.
- Скорость и кулдаун берутся из конфига.
- `random=() => 1` технически выходит за `[0,1)`, но проверяет максимум.

```ts
// строки 170–176 — сложность
getFallSpeed(0) = 150; getFallSpeed(3) > getFallSpeed(0);
getSpawnInterval(3) < getSpawnInterval(0);
getSpawnInterval(100) = 380;
getDifficultyLevel(12000*2) = 2.
```

- Проверяет направление изменения и нижний предел.
- 2 уровня = 24 с.

```ts
// строки 178–185 — спавн по кулдауну
state.spawnCooldownMs=1; updateState(state, .05, idle);
eggs length 1; spawnCooldownMs = 1300.
```

- Кулдаун уменьшается на 50 мс и становится ≤0.
- `spawnEgg` добавляет яйцо и сбрасывает таймер.
- Проверяет интеграцию `updateState` → `spawnEgg`.

**Подводные камни.** Тесты используют `1/60` и `0.05`, поэтому коллизии предсказуемы. `makePlayingState` отключает спавн большим кулдауном, иначе случайное яйцо могло бы повлиять на количество. Тест правого края использует `vi`? Нет, только чистые функции. Нет тестов на `normalizeHighScore` с NaN/Infinity и на несколько пропусков за кадр. `spawnEgg(state, () => 1)` — граничный случай, а не реальный Math.random.

<a id="file-src-test-setup-ts"></a>
### src/test/setup.ts

**Назначение.** Глобальная настройка Vitest.

```ts
// строка 1
import '@testing-library/jest-dom';
```

- Добавляет матчеры `toBeInTheDocument`, `toHaveTextContent`, `toHaveAttribute` и др. к `expect`.
- Выполняется до каждого тестового файла через `setupFiles`.
- Не содержит очистки DOM; Testing Library делает её автоматически.

**Подводные камни.** Импорт рассчитан на глобальный `expect`; при `globals: false` матчеры нужно подключать иначе. Setup не мокает Web Audio/localStorage — это делают сами тесты или окружение.

<a id="scenarios"></a>
## 5. Сквозные сценарии

#### 5.1. Загрузка приложения

1. Браузер запрашивает `/`, dev-сервер отдаёт сгенерированный `index.html`.
2. Загружается `/bundle.js`; выполняется `src/index.ts`.
3. Импортируется `index.css` (style-loader вставляет reset).
4. Импортируется `Init.tsx`; `ReactDOM.render` монтирует `App` в `#root`.
5. `App` вызывает `createInitialState(loadHighScore())`; storage читает `nupogodi.high-score`.
6. `phase='start'`, рендерится `StartScreen`; цикл выключен.

#### 5.2. Старт раунда

1. Клик «Играть» вызывает `startRound`.
2. `soundManager.unlock()` создаёт/возобновляет AudioContext в рамках жеста.
3. `playStart()` играет арпеджио (если не mute).
4. `startGame(highScore)` создаёт модель `playing`: счёт 0, 3 жизни, волк по центру, пустые яйца.
5. `useGameLoop` видит `active=true` и планирует первый RAF.

#### 5.3. Игровой кадр

1. RAF получает `time`; delta ограничивается 50 мс.
2. `updateState` двигает волка по `inputRef`.
3. Яйца сдвигаются на `vy * delta`.
4. Для каждого проверяется поимка (AABB с inset’ами).
5. Пойманные удаляются и увеличивают счёт.
6. Достигшие земли удаляются и уменьшают жизни.
7. `elapsedMs` растёт; кулдаун уменьшается.
8. При `spawnCooldownMs <= 0` создаётся новое яйцо.
9. React перерисовывает волка/яйца.
10. Эффект звука сравнивает счёт/жизни/фазу и играет нужный сигнал.

#### 5.4. Ввод

- Клавиатура: `ArrowLeft/A` → `inputRef.left=true`; `ArrowRight/D` → `right=true`; keyup снимает.
- Обе клавиши одновременно дают направление 0.
- `P`/`Escape`/`Space` переключают паузу только в `playing`/`paused`, без автоповтора.
- Модификаторы Alt/Ctrl/Meta игнорируются.
- Pointer: down захватывает указатель и ставит флаг; up/cancel/leave/lost-capture снимают.
- `blur` окна и выход из `playing` сбрасывают оба флага.

#### 5.5. Пауза

1. `togglePause` меняет `playing ↔ paused`.
2. `GameScreen` показывает оверлей с `role="dialog"`.
3. `useGameLoop` получает `active=false`, cleanup отменяет RAF.
4. «Продолжить» снова включает цикл; «Заново» начинает новый раунд; «В меню» создаёт start-состояние.
5. Скрытие вкладки автоматически ставит паузу.

#### 5.6. Потеря жизни и gameover

1. Яйцо пересекает `groundY`, `missed++`.
2. `lives = max(0, lives - missed)`.
3. Если жизни >0, игра продолжается; звук потери жизни играет один раз.
4. Если 0: `phase='gameover'`, яйца очищаются, `highScore=max(...)`, `isNewRecord = score > oldHighScore`.
5. Эффект `App` сохраняет рекорд в storage.
6. `GameOverScreen` показывает счёт/рекорд/бейдж.
7. «Заново» вызывает `startGame`, «В меню» — `createInitialState`.
8. Повторный gameover не проигрывает звук, если фаза уже была gameover.

#### 5.7. Сложность

- `elapsedMs` накапливается только в `playing`.
- Уровень = `floor(elapsedMs / 12000)`, максимум 15.
- Скорость = `min(150 + 32*level, 640)`.
- Интервал = `max(1300 - 90*level, 380)`.
- На 15 уровне скорость 630, интервал 380 мс.
- Пауза не увеличивает `elapsedMs`, поэтому сложность не растёт.

#### 5.8. Сохранение рекорда

- Ключ: `nupogodi.high-score`.
- Чтение при старте `App`; некорректное значение → 0.
- Запись при входе в gameover и изменении `highScore`.
- Значение нормализуется: конечное, неотрицательное, целое.
- Ошибки privacy mode/quota игнорируются.
- Новый рекорд в текущем раунде виден в HUD через `Math.max(score, highScore)`, но в storage попадает только при gameover.

<a id="glossary"></a>
## 6. Глоссарий терминов и API

| Термин | Значение в проекте |
|---|---|
| **Модель** | `GameModel` — неизменяемый снимок игры; обновляется чистыми функциями. |
| **Фаза** | `start`, `playing`, `paused`, `gameover`; определяет экран и активность цикла. |
| **Чистая функция** | Функция без побочных эффектов, возвращающая новое состояние (`startGame`, `updateState`, `togglePause`). |
| **Иммутабельность** | Старый объект не мутируется; создаётся новый с изменениями. |
| **AABB** | Axis-Aligned Bounding Box — прямоугольное пересечение для коллизии яйца и волка. |
| **Inset** | Внутренний отступ хитбокса, делающий ловлю чуть сложнее/точнее. |
| **Delta time** | Время между кадрами в секундах; ограничено 0.05 для стабильной физики. |
| **RAF** | `requestAnimationFrame` — браузерный планировщик кадров. |
| **Кулдаун** | Остаток миллисекунд до следующего спавна. |
| **Уровень сложности** | Номер 12-секундного отрезка, ограничен 15. |
| **CSS Module** | LESS-файл `*.module.less`, классы которого хешируются и импортируются объектом. |
| **`cqw`** | 1% ширины контейнера-сцены (`container-type: inline-size`). |
| **`dvh`** | Dynamic viewport height — высота с учётом мобильных панелей. |
| **`localStorage`** | Синхронное хранилище строк; используется для рекорда. |
| **Web Audio API** | API синтеза звука через осцилляторы и gain-узлы. |
| **AudioContext** | Граф аудио; создаётся лениво и требует жеста для запуска. |
| **GainNode** | Узел управления громкостью. |
| **OscillatorNode** | Генератор волны (square/sawtooth/triangle). |
| **`vi.hoisted`** | Vitest API для переменных, доступных внутри hoisted-мока. |
| **`vi.mock`** | Подмена модуля в тестах. |
| **jsdom** | Эмуляция DOM в Node для тестов. |
| **jest-dom** | Набор DOM-матчеров для `expect`. |
| **React StrictMode** | Режим дополнительных проверок; в dev может дважды вызывать эффекты. |
| **Pointer capture** | Захват указателя элементом, чтобы получать события вне его границ. |
| **`aria-live`** | Область, изменения которой озвучиваются скринридером. |
| **`aria-pressed`** | Состояние кнопки-переключателя. |
| **`prefers-reduced-motion`** | Медиазапрос для отключения анимаций. |
| **Focus-visible** | Стиль фокуса только при клавиатурной навигации. |
| **Source map** | Карта соответствия бандла исходникам для отладки. |
| **`transpileOnly`** | Режим ts-loader без проверки типов. |
| **HMR** | Hot Module Replacement в dev-сервере. |

<a id="limitations"></a>
## 7. Известные ограничения и возможные улучшения

#### Ограничения текущей реализации

1. **Рекорд сохраняется только в gameover.** Если закрыть вкладку во время игры с новым рекордом, результат потеряется. Можно сохранять при каждом увеличении счёта (с дебаунсом).
2. **Нет серверной части и таблицы лидеров.** Рекорд локален для браузера/профиля.
3. **Нет сохранения настроек звука.** `muted` сбрасывается при перезагрузке.
4. **Development-сборка.** `mode: 'development'`, `eval-source-map`; бандл ~3.11 MiB. Для production нужен `mode: 'production'`, минификация, content hashing.
5. **Нет `ReactDOM.createRoot`.** React 17 legacy `render`; обновление до 18 потребует миграции.
6. **Слабые типы CSS-модулей.** Любое имя класса типизировано как `string`; опечатки не ловятся.
7. **Нет тестов на звук, `useGameLoop`, storage и клавиатуру.** Покрыты логика и основные переходы.
8. **Нет e2e-тестов.** Реальная раскладка, touch и canvas-подобные эффекты не проверяются.
9. **Пауза не ловит фокус.** `role="dialog"` и `aria-modal` есть, но фокус не перемещается и не удерживается; Escape обрабатывается глобально.
10. **Нет паузы при потере фокуса окна.** Обрабатывается только `visibilitychange`, не `blur` (blur сбрасывает ввод).
11. **Touch-кнопки видны на десктопе.** Они не скрываются медиазапросом по указателю.
12. **Сложность ограничена 15 уровнями.** После ~3 минут скорость и интервал перестают расти.
13. **Одно яйцо за кадр.** При большом пропуске кулдауна спавнится только одно.
14. **Нет таблицы рекордов/истории.**
15. **Нет интернационализации.** Все строки на русском захардкожены.
16. **Нет error boundary.** Ошибка рендера/аудио может уронить всё приложение.
17. **`package.json.main` указывает на несуществующий `dist/index.js`.**
18. **Неиспользуемая зависимость `classnames`.**
19. **Зависимости шаблона.** ESLint-конфиг содержит корпоративные пути/резолверы и TODO.
20. **Нет `.gitignore`.** В окружении нет git, но при инициализации репозитория `node_modules`/`dist` нужно исключить.

#### Возможные улучшения

- Перевести сборку в production, добавить `TerserPlugin`, `CssMinimizerPlugin`, хеширование имён.
- Сохранять рекорд при каждом побитии с троттлингом.
- Добавить `useGameLoop`-тесты с fake RAF/timers.
- Покрыть `SoundManager` моком AudioContext.
- Добавить e2e (Playwright) для клавиатуры, touch и паузы.
- Ввести строгие типы CSS-модулей (`typed-css-modules` или `vite-plugin-sass-dts`).
- Сделать паузу доступным модальным окном с focus trap и возвратом фокуса.
- Скрывать touch-кнопки на устройствах с точным указателем.
- Добавить настройку звука в storage.
- Убрать неиспользуемые зависимости/правила шаблона.
- Добавить Error Boundary и graceful degradation без Web Audio.
- Добавить таблицу лидеров на сервере, если нужен онлайн-рейтинг.
- Добавить PWA/offline-режим.

<a id="missing-files"></a>
## 8. Отсутствующие файлы

Следующие типичные файлы в проекте **отсутствуют**. Это не ошибка сборки: архитектура использует другие инструменты.

| Файл | Почему отсутствует | Последствие |
|---|---|---|
| `.gitignore` | В каталоге нет git-репозитория | При `git init` нужно вручную исключить `node_modules`, `dist`, логи. |
| `.babelrc` / `babel.config.js` | Babel используется только парсером ESLint с `requireConfigFile: false` | Нет отдельной Babel-трансформации; TS компилирует `ts-loader`. |
| `postcss.config.js` | Нет PostCSS-плагинов; Less компилируется `less-loader` | Автопрефиксы не добавляются; используются ручные `-webkit-` свойства. |
| `jest.config.js` / `jest.setup.js` | Тесты на Vitest | Конфигурация в `vitest.config.ts`, setup — `src/test/setup.ts`. |
| `.browserslistrc` | Не настроен browserslist | `autoprefixer`/Babel не знают целевые браузеры. |
| `tsconfig.paths` | Алиас `@` объявлен только в Vitest | Импорт `@/...` может не разрешаться TypeScript/IDE. |
| `src/vite-env.d.ts` | Проект на Webpack, не Vite | Не нужен. |
| `public/robots.txt` | Нет SEO/краулерной политики | По умолчанию краулеры могут индексировать. |
| `LICENSE` | Не указана лицензия | Правовой статус неопределён. |
| `CONTRIBUTING.md` | Нет процесса вклада | Для учебного проекта допустимо. |
| `.editorconfig` | Стиль задан Prettier/ESLint | Разные редакторы могут использовать разные отступы вне TS. |
| `src/components/**/__snapshots__` | Нет snapshot-тестов | Визуальные регрессии не отслеживаются. |
| `src/assets/` | Графика inline-SVG/CSS | Нет оптимизации изображений. |

Также отсутствуют аудиофайлы: все звуки синтезируются Web Audio API. Нет внешних шрифтов: используются системные семейства. Нет изображений, кроме `public/favicon.ico`.

**Важно:** отсутствие этих файлов не является заглушкой или незавершённой реализацией; это осознанная конфигурация проекта. Добавление файлов не требуется для работы игры.

<a id="self-check"></a>
## 9. Самопроверка

Проверка выполнялась после создания документа, без изменения кода проекта. В PowerShell нет Unix-команд `wc` и `grep`, поэтому использованы бинарники Git for Windows.

```text
PS> & "C:\Program Files\Git\usr\bin\wc.exe" -l EXPLANATION.md
3916 EXPLANATION.md

PS> & "C:\Program Files\Git\usr\bin\grep.exe" -c '^### ' EXPLANATION.md
62
```

#### Контрольные показатели

| Проверка | Метод | Результат |
|---|---|---|
| Количество строк | Git `wc -l` | `3916` |
| Количество файловых разделов | Git `grep -c '^### '` | `62` |
| Количество файлов проекта | рекурсивный список без `node_modules`, `dist`, `.git`, lock-файлов и самого отчёта | `62` |
| Полнота покрытия | сравнение имён файлов с заголовками `###` | расхождений `0` |
| Уникальность якорей | проверка всех `<a id="...">` | дубликатов `0` |
| Внутренние ссылки | сверка всех `](#...)` с якорями | битых ссылок `0` |
| Парность code fences | подсчёт строк с тройными обратными кавычками | `410`, чётное |
| TOC | полный перечень разделов | 9 пунктов; выведен полностью в финальном сообщении |

#### Что проверено вручную

- Все 62 файла имеют отдельный раздел `### <путь>`.
- Для каждого файла описаны назначение, зависимости и разбор по блокам/строкам.
- Для TS/TSX приведены сигнатуры/пропсы/возвращаемые значения и ключевые ветки.
- Для CSS/LESS перечислены селекторы, ключевые свойства, анимации и медиазапросы.
- Тесты разобраны по сценариям и проверяемым утверждениям.
- Сценарии описывают полный путь от загрузки страницы до сохранения рекорда.
- В документе нет TODO, заглушек и вымышленных файлов.
- Код проекта не изменялся; единственный созданный файл — `EXPLANATION.md`.
