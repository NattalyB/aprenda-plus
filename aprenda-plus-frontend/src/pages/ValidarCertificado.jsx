import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { validarCertificado } from '../services/salaService';
import { dataPorExtenso } from '../utils/salaDeAula';

// Página pública: qualquer pessoa confere se um certificado do AprendaPlus é verdadeiro
function ValidarCertificado() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [digitado, setDigitado] = useState(codigo || '');
  const [resultado, setResultado] = useState(null); // { valido, certificado?, mensagem? }
  const [conferindo, setConferindo] = useState(false);

  useEffect(() => {
    if (!codigo) {
      setResultado(null);
      return;
    }
    setDigitado(codigo);
    setConferindo(true);
    validarCertificado(codigo)
      .then((certificado) => setResultado({ valido: true, certificado }))
      .catch((error) =>
        setResultado({
          valido: false,
          mensagem:
            error.response?.status === 404
              ? error.response.data?.mensagem || 'Certificado não encontrado. Confira o código.'
              : 'Não foi possível conferir agora. Tente novamente.',
        })
      )
      .finally(() => setConferindo(false));
  }, [codigo]);

  const conferir = (e) => {
    e.preventDefault();
    const limpo = digitado.trim().toUpperCase();
    if (limpo) navigate(`/certificado/${limpo}`);
  };

  const c = resultado?.certificado;

  return (
    <div className="form-page">
      <div className="form-card validar-card">
        <h1 className="form-title">Validar certificado</h1>
        <p className="form-subtitle">Digite o código que aparece no rodapé do certificado.</p>

        <form onSubmit={conferir} className="validar-form">
          <label htmlFor="codigo" className="sr-only">Código do certificado</label>
          <input
            id="codigo"
            name="codigo"
            placeholder="Ex.: ABCD-EFGH-JKLM"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="admin-btn admin-btn-primary" disabled={conferindo}>
            {conferindo ? 'Conferindo...' : 'Conferir'}
          </button>
        </form>

        {resultado &&
          (resultado.valido ? (
            <div className="validar-resultado valido" role="status">
              <h2>✅ Certificado válido</h2>
              <dl>
                <div><dt>Aluno(a)</dt><dd>{c.aluno}</dd></div>
                <div><dt>Curso</dt><dd>{c.curso || '-'}</dd></div>
                <div><dt>Turma</dt><dd>{c.turma || '-'}</dd></div>
                {c.cargaHoraria ? <div><dt>Carga horária</dt><dd>{c.cargaHoraria} horas</dd></div> : null}
                <div><dt>Emitido em</dt><dd>{dataPorExtenso(c.emitidoEm)}</dd></div>
                <div><dt>Código</dt><dd>{c.codigo}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="validar-resultado invalido" role="status">
              <h2>❌ Não encontramos este certificado</h2>
              <p>{resultado.mensagem}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ValidarCertificado;
