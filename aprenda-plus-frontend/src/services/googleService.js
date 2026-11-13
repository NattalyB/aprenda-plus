import api from './api';

// Entrar com o Google (alunos e professores).
// O navegador recebe do Google uma "credencial"; o servidor confere com o Google antes de confiar no e-mail.
const dados = (r) => r.data;

let config = null;
export const buscarConfigGoogle = () => {
  if (!config) {
    config = api
      .get('/auth/google/config')
      .then(dados)
      .catch(() => {
        config = null; // tenta de novo na próxima tela
        return { ativo: false };
      });
  }
  return config;
};

export const entrarAlunoComGoogle = (credencial) => api.post('/auth/google/aluno', { credencial }).then(dados);

export const entrarProfessorComGoogle = (credencial) => api.post('/auth/google/professor', { credencial }).then(dados);

// Primeira vez do aluno: o passe do Google + os dados que faltam (+ o certificado, como no cadastro normal)
export const cadastrarComGoogle = (tokenCadastro, aluno, arquivo) => {
  const formulario = new FormData();
  formulario.append('tokenCadastro', tokenCadastro);
  formulario.append('aluno', new Blob([JSON.stringify(aluno)], { type: 'application/json' }));
  if (arquivo) formulario.append('documento', arquivo);
  return api
    .post('/auth/google/cadastro', formulario, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(dados);
};

// Biblioteca oficial do botão do Google (carregada só nas telas que mostram o botão)
const SCRIPT = 'https://accounts.google.com/gsi/client';
let carregando = null;
export const carregarScriptGoogle = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!carregando) {
    carregando = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT;
      script.async = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        carregando = null;
        reject(new Error('Não foi possível carregar o Google.'));
      };
      document.head.appendChild(script);
    });
  }
  return carregando;
};

/** Só para os testes. */
export const _reiniciarGoogle = () => {
  config = null;
  carregando = null;
};
