import { useState } from 'react';
import { estaLogado } from '../services/authService';
import { adicionarAoCarrinho } from '../services/carrinhoService';

function CursoModal({ curso, onClose }) {
  const [mensagem, setMensagem] = useState(null);

  if (!curso) return null;

  const handleAdicionar = () => {
    if (!estaLogado()) {
      setMensagem('Você precisa fazer login para adicionar cursos ao carrinho.');
      return;
    }
    adicionarAoCarrinho(curso.idCurso)
      .then(() => setMensagem('Curso adicionado ao carrinho!'))
      .catch(() => setMensagem('Não foi possível adicionar ao carrinho.'));
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
          <p>{curso.conteudo}</p>
          {mensagem && <p style={{ marginTop: '1rem' }}>{mensagem}</p>}
        </div>

        <div className="modal-footer">
          <span className="modal-price">R$ {curso.valor}</span>
          <button className="btn-buy modal-buy-btn" onClick={handleAdicionar}>ADICIONAR AO CARRINHO</button>
        </div>
      </div>
    </div>
  );
}

export default CursoModal;