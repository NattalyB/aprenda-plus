// Seção do formulário do professor: quais cursos ele leciona e, dentro de cada curso,
// quais disciplinas. Mostra o total de horas (só das disciplinas ativas).

export const estaInativa = (disciplina) => disciplina.status === 'inativa';

// Uma disciplina pode fazer parte de vários cursos
export const pertenceAoCurso = (disciplina, idCurso) =>
  (disciplina.cursos || []).some((curso) => curso.idCurso === idCurso);

// Soma a carga horária das disciplinas selecionadas que estão ativas
export const calcularHorasTotais = (disciplinas, idsSelecionados) =>
  disciplinas
    .filter((d) => idsSelecionados.includes(d.idDisciplina) && !estaInativa(d))
    .reduce((total, d) => total + (Number(d.cargaHoraria) || 0), 0);

function CursosDisciplinasProfessor({ cursos, disciplinas, cursosSelecionados, disciplinasSelecionadas, onAlterar }) {
  const alternarCurso = (idCurso) => {
    if (cursosSelecionados.includes(idCurso)) {
      // Desmarcou o curso: saem as disciplinas dele que não fazem parte
      // de nenhum outro curso que continua marcado
      const cursosRestantes = cursosSelecionados.filter((id) => id !== idCurso);
      const continua = (idDisciplina) => {
        const disciplina = disciplinas.find((d) => d.idDisciplina === idDisciplina);
        return !disciplina || cursosRestantes.some((id) => pertenceAoCurso(disciplina, id));
      };
      onAlterar(cursosRestantes, disciplinasSelecionadas.filter(continua));
    } else {
      onAlterar([...cursosSelecionados, idCurso], disciplinasSelecionadas);
    }
  };

  const alternarDisciplina = (idDisciplina) => {
    const novas = disciplinasSelecionadas.includes(idDisciplina)
      ? disciplinasSelecionadas.filter((id) => id !== idDisciplina)
      : [...disciplinasSelecionadas, idDisciplina];
    onAlterar(cursosSelecionados, novas);
  };

  const selecionadas = disciplinas.filter((d) => disciplinasSelecionadas.includes(d.idDisciplina));
  const inativasSelecionadas = selecionadas.filter(estaInativa);
  const horasTotais = calcularHorasTotais(disciplinas, disciplinasSelecionadas);
  const cursosMarcados = cursos.filter((c) => cursosSelecionados.includes(c.idCurso));

  // Cada disciplina aparece uma vez só, mesmo que seja de mais de um curso marcado
  const disciplinasDosCursosMarcados = disciplinas
    .filter((d) => cursosSelecionados.some((idCurso) => pertenceAoCurso(d, idCurso)))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));

  // Nomes dos cursos marcados aos quais a disciplina pertence: "ADS · Eng. de Software"
  const cursosMarcadosDa = (disciplina) =>
    cursosMarcados
      .filter((curso) => pertenceAoCurso(disciplina, curso.idCurso))
      .map((curso) => curso.nome)
      .join(' · ');

  if (cursos.length === 0) {
    return <p className="prof-vinculos-vazio">Nenhum curso cadastrado ainda.</p>;
  }

  return (
    <div className="prof-vinculos">
      <fieldset className="prof-cursos">
        <legend>Cursos que o professor leciona</legend>
        <div className="prof-cursos-lista">
          {cursos.map((curso) => (
            <label
              key={curso.idCurso}
              className={cursosSelecionados.includes(curso.idCurso) ? 'prof-curso-opcao marcado' : 'prof-curso-opcao'}
            >
              <input
                type="checkbox"
                checked={cursosSelecionados.includes(curso.idCurso)}
                onChange={() => alternarCurso(curso.idCurso)}
              />
              {curso.nome}
            </label>
          ))}
        </div>
      </fieldset>

      {cursosMarcados.length === 0 ? (
        <p className="prof-vinculos-dica">Marque um ou mais cursos para escolher as disciplinas.</p>
      ) : (
        <fieldset className="prof-disciplinas">
          <legend>Disciplinas dos cursos marcados</legend>
          {disciplinasDosCursosMarcados.length === 0 ? (
            <p className="prof-vinculos-dica">Os cursos marcados ainda não têm disciplinas cadastradas.</p>
          ) : (
            <ul className="prof-disciplinas-lista">
              {disciplinasDosCursosMarcados.map((disciplina) => (
                <li key={disciplina.idDisciplina}>
                  <label className={estaInativa(disciplina) ? 'prof-disciplina-opcao inativa' : 'prof-disciplina-opcao'}>
                    <input
                      type="checkbox"
                      checked={disciplinasSelecionadas.includes(disciplina.idDisciplina)}
                      onChange={() => alternarDisciplina(disciplina.idDisciplina)}
                    />
                    <span className="prof-disciplina-nome">
                      {disciplina.nome}
                      {/* display: block garante que os cursos fiquem na linha de baixo */}
                      <small className="prof-disciplina-cursos" style={{ display: 'block' }}>
                        {cursosMarcadosDa(disciplina)}
                      </small>
                    </span>
                    <span className="prof-disciplina-horas">{disciplina.cargaHoraria || 0}h</span>
                    {estaInativa(disciplina) && <span className="status-badge status-inativa">Inativa</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <div className="prof-horas-total" data-testid="horas-totais">
        <span>Total de horas de aula</span>
        <strong>{horasTotais}h</strong>
        <small>
          {selecionadas.length === 1 ? '1 disciplina selecionada' : `${selecionadas.length} disciplinas selecionadas`}
          {inativasSelecionadas.length > 0 &&
            ` · ${inativasSelecionadas.length === 1 ? '1 inativa não entra' : `${inativasSelecionadas.length} inativas não entram`} no total`}
        </small>
      </div>
    </div>
  );
}

export default CursosDisciplinasProfessor;
