import { useEffect, useState } from 'react';
import { andamentoDaTurma } from '../../../services/conteudoEadService';
import { formatarDataHora } from '../../../utils/salaDeAula';
import BarraProgresso from '../../BarraProgresso';

const STATUS = { ativa: 'Ativa', trancada: 'Trancada', concluida: 'Concluída' };

// Progresso de cada aluno na sala de aula da turma
function AndamentoDaTurma({ idTurma }) {
  const [alunos, setAlunos] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setAlunos(null);
    setErro(null);
    andamentoDaTurma(idTurma)
      .then((lista) => setAlunos(lista || []))
      .catch(() => setErro('Não foi possível carregar o andamento da turma.'));
  }, [idTurma]);

  if (erro) return <div className="form-erro">{erro}</div>;
  if (!alunos) return <p className="form-dica">Carregando andamento...</p>;
  if (alunos.length === 0) return <p className="form-dica">Nenhum aluno matriculado nesta turma ainda.</p>;

  const media = Math.round(alunos.reduce((soma, a) => soma + a.percentual, 0) / alunos.length);
  const concluintes = alunos.filter((a) => a.totalAulas > 0 && a.concluidas === a.totalAulas).length;
  const certificados = alunos.filter((a) => a.certificado).length;

  return (
    <div>
      <div className="ead-indicadores">
        <div><strong>{alunos.length}</strong><span>{alunos.length === 1 ? 'aluno' : 'alunos'}</span></div>
        <div><strong>{media}%</strong><span>progresso médio</span></div>
        <div><strong>{concluintes}</strong><span>concluíram todas as aulas</span></div>
        <div><strong>{certificados}</strong><span>{certificados === 1 ? 'certificado emitido' : 'certificados emitidos'}</span></div>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Matrícula</th>
                <th>Progresso</th>
                <th>Última atividade</th>
                <th>Certificado</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a) => (
                <tr key={a.idAluno}>
                  <td>
                    <strong>{a.nome}</strong>
                    <br />
                    <small>{a.email}</small>
                  </td>
                  <td>
                    <span className={`status-badge status-${a.statusMatricula}`}>{STATUS[a.statusMatricula] || a.statusMatricula}</span>
                  </td>
                  <td className="ead-andamento-progresso">
                    <BarraProgresso percentual={a.percentual} rotulo={`Progresso de ${a.nome}`} />
                    <small>{a.percentual}% · {a.concluidas}/{a.totalAulas} aulas</small>
                  </td>
                  <td>{a.ultimaAtividade ? formatarDataHora(a.ultimaAtividade) : '-'}</td>
                  <td>{a.certificado ? '🎓 Emitido' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AndamentoDaTurma;
