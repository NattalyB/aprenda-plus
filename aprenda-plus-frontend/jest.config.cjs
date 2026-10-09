// Configuração dos testes do front-end (Jest + Testing Library)
module.exports = {
  // Simula um navegador (DOM) para renderizar os componentes React
  testEnvironment: 'jsdom',

  // Roda depois de preparar o ambiente: adiciona os "matchers" do jest-dom
  // (toBeInTheDocument, toHaveTextContent, etc.)
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Arquivos que o Jest não sabe ler: CSS e imagens viram objetos de mentira
  moduleNameMapper: {
    '\\.(css)$': 'identity-obj-proxy',
    '\\.(png|jpe?g|gif|svg|webp)$': '<rootDir>/src/__mocks__/arquivoMock.js',
  },

  // Onde estão os testes
  testMatch: ['<rootDir>/src/**/*.test.{js,jsx}'],

  // Cobertura: mede todo o código do src, menos o que não tem lógica
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/setupTests.js',
    '!src/__mocks__/**',
    '!src/testUtils.jsx',
    '!src/**/*.test.{js,jsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'text', 'html'],

  // Meta do trabalho: se a cobertura cair abaixo de 70%, o comando falha
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
