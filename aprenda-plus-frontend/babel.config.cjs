// Configuração do Babel usada SOMENTE pelo Jest (o Vite não usa este arquivo).
// Converte JSX e import/export para um formato que o Jest entende.
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  // Troca o import.meta.env do Vite (usado no api.js) por process.env nos testes
  plugins: ['babel-plugin-transform-vite-meta-env'],
};
