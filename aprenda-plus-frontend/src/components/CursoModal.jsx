import { useState } from 'react';
import { estaLogado } from '../services/authService';
import { adicionarAoCarrinho } from '../services/carrinhoService';
import { mostrarAviso } from '../services/avisoService';

function CursoModal({ curso, onClose }) {
  const [adicionando, setAdicionando] = useState(false);

  if (!curso) return null;

  // Separa o conteúdo em tópicos (cada linha ou cada ";" vira um item)
  const topicos = (curso.conteudo || '')
    .split(/\r?\n|;/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const handleAdicionar = () => {
    if (!estaLogado()) {
      mostrarAviso('Você precisa fazer login para adicionar cursos ao carrinho.', 'aviso');
      return;
    }

    setAdicionando(true);
    adicionarAoCarrinho(curso.idCurso)
      .then(() => {
        mostrarAviso(`"${curso.nome}" foi adicionado ao carrinho!`, 'sucesso');
        onClose();
      })
      .catch(() => {
        mostrarAviso('Não foi possível adicionar ao carrinho. Tente novamente.', 'erro');
      })
      .finally(() => setAdicionando(false));
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="modal-header">
          <span className="modal-tag">{curso.categoria}</span>
          <h2>{curso.nome}</h2>
          <p className="modal-desc">{curso.descricao}</p>
        </div>

        <div className="modal-stats">
          <div className="modal-stat">
            <span className="modal-stat-icon">⏱️</span>
            <span className="modal-stat-label">Carga horária</span>
            <span className="modal-stat-value">{curso.cargaHoraria}h</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-icon">📚</span>
            <span className="modal-stat-label">Modalidade</span>
            <span className="modal-stat-value">{curso.modalidade}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-icon">🎓</span>
            <span className="modal-stat-label">Pré-requisitos</span>
            <span className="modal-stat-value">{curso.preRequisitos || 'Nenhum'}</span>
          </div>
        </div>

        <div className="modal-body">
          <h3>Conteúdo programático</h3>
          {topicos.length > 1 ? (
            <ul className="modal-topicos">
              {topicos.map((topico, index) => (
                <li key={index}>{topico}</li>
              ))}
            </ul>
          ) : (
            <p>{curso.conteudo}</p>
          )}
        </div>

        <div className="modal-footer">
          <span className="modal-price">R$ {curso.valor}</span>
          <button
            className="btn-buy modal-buy-btn"
            onClick={handleAdicionar}
            disabled={adicionando}
          >
            {adicionando ? 'ADICIONANDO...' : 'ADICIONAR AO CARRINHO'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CursoModal;