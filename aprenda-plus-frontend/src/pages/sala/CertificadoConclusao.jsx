import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import logo from '../../assets/logo-aprenda-plus.png';
import { estaLogado } from '../../services/authService';
import { emitirCertificado } from '../../services/salaService';
import { dataPorExtenso } from '../../utils/salaDeAula';

// Endereço público onde qualquer pessoa confere o certificado
export const linkDeValidacao = (codigo) => {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/certificado/${codigo}`;
};

// Certificado de conclusão pronto para imprimir ou salvar em PDF (página sem cabeçalho do site)
function CertificadoConclusao() {
  const { idTurma } = useParams();
  const [certificado, setCertificado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!estaLogado()) {
      setErro('Faça login para ver o seu certificado.');
      return;
    }
    // Emitir é seguro de repetir: se já existe, o servidor devolve o mesmo certificado
    emitirCertificado(idTurma)
      .then(setCertificado)
      .catch((error) => setErro(error.response?.data?.mensagem || 'Não foi possível emitir o certificado.'));
  }, [idTurma]);

  if (erro) {
    return (
      <div className="certificado-pagina">
        <div className="certificado-erro">
          <div className="form-erro">{erro}</div>
          <Link to={`/sala/${idTurma}`} className="admin-btn admin-btn-secundario">← Voltar para a sala</Link>
        </div>
      </div>
    );
  }

  if (!certificado) {
    return (
      <div className="certificado-pagina">
        <p className="carrinho-carregando">Preparando o seu certificado...</p>
      </div>
    );
  }

  return (
    <div className="certificado-pagina">
      <div className="certificado-acoes">
        <Link to={`/sala/${idTurma}`} className="admin-btn admin-btn-secundario">← Voltar para a sala</Link>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => window.print()}>
          🖨️ Imprimir ou salvar em PDF
        </button>
      </div>

      <article className="certificado" aria-label="Certificado de conclusão">
        <div className="certificado-borda">
          <img src={logo} alt="Aprenda Plus" className="certificado-logo" />
          <p className="certificado-sobre">Certificado de conclusão</p>
          <p className="certificado-texto">Certificamos que</p>
          <h1 className="certificado-nome">{certificado.aluno}</h1>
          <p className="certificado-texto">
            concluiu o curso <strong>{certificado.curso || certificado.turma}</strong>
            {certificado.curso && certificado.turma ? ` (${certificado.turma})` : ''}
            {certificado.cargaHoraria ? (
              <>
                , com carga horária de <strong>{certificado.cargaHoraria} horas</strong>
              </>
            ) : null}
            , na modalidade a distância da plataforma AprendaPlus.
          </p>
          <p className="certificado-data">Emitido em {dataPorExtenso(certificado.emitidoEm)}</p>

          <div className="certificado-assinaturas">
            {certificado.professor && (
              <div>
                <span className="certificado-linha" />
                <strong>{certificado.professor}</strong>
                <small>Professor(a) responsável</small>
              </div>
            )}
            <div>
              <span className="certificado-linha" />
              <strong>AprendaPlus</strong>
              <small>Coordenação acadêmica</small>
            </div>
          </div>

          <p className="certificado-codigo">
            Código de verificação: <strong>{certificado.codigo}</strong>
            <br />
            Confira em <span className="certificado-url">{linkDeValidacao(certificado.codigo)}</span>
          </p>
        </div>
      </article>
    </div>
  );
}

export default CertificadoConclusao;
