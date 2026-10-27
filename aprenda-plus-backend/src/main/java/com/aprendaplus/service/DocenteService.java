package com.aprendaplus.service;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.dto.TurmaDoProfessor;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.PlanoDeAulaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.TurmaProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

// Portal do Professor: o professor só enxerga e mexe nas turmas dele
// (as que ele é o responsável pela sala de aula ou em que foi vinculado no cadastro).
@Service
public class DocenteService {

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private PlanoDeAulaRepository planoRepository;

    @Autowired
    private TurmaProfessorRepository turmaProfessorRepository;

    @Autowired
    private DisciplinaRepository disciplinaRepository;

    @Autowired
    private ConteudoEadService conteudoEadService;

    public record MeusDados(Integer idProfessor, String nome, String email) {
    }

    public MeusDados meusDados(Integer idProfessor) {
        Professor p = professor(idProfessor);
        return new MeusDados(p.getIdProfessor(), p.getNomeCompleto(), p.getEmail());
    }

    public String nome(Integer idProfessor) {
        return professorRepository.findById(idProfessor).map(Professor::getNomeCompleto).orElse(null);
    }

    // Turmas do professor: id -> é o responsável pela sala?
    @Transactional(readOnly = true)
    public Map<Integer, Boolean> idsDasTurmas(Integer idProfessor) {
        Map<Integer, Boolean> turmas = new LinkedHashMap<>();
        if (idProfessor == null) return turmas;
        for (PlanoDeAula plano : planoRepository.findByProfessorResponsavel_IdProfessor(idProfessor)) {
            if (plano.getTurma() != null) turmas.put(plano.getTurma().getIdTurma(), true);
        }
        for (TurmaProfessor vinculo : turmaProfessorRepository.findByProfessor_IdProfessor(idProfessor)) {
            if (vinculo.getTurma() != null) turmas.putIfAbsent(vinculo.getTurma().getIdTurma(), false);
        }
        return turmas;
    }

    public boolean ehTurmaDoProfessor(Integer idProfessor, Integer idTurma) {
        return idTurma != null && idsDasTurmas(idProfessor).containsKey(idTurma);
    }

    @Transactional(readOnly = true)
    public List<TurmaDoProfessor> turmas(Integer idProfessor) {
        List<TurmaDoProfessor> lista = new ArrayList<>();
        Map<Integer, Turma> porId = new LinkedHashMap<>();
        for (PlanoDeAula plano : planoRepository.findByProfessorResponsavel_IdProfessor(idProfessor)) {
            if (plano.getTurma() != null) porId.put(plano.getTurma().getIdTurma(), plano.getTurma());
        }
        for (TurmaProfessor vinculo : turmaProfessorRepository.findByProfessor_IdProfessor(idProfessor)) {
            if (vinculo.getTurma() != null) porId.putIfAbsent(vinculo.getTurma().getIdTurma(), vinculo.getTurma());
        }
        Map<Integer, Boolean> responsavel = idsDasTurmas(idProfessor);

        for (Turma turma : porId.values()) {
            PlanoDaTurma sala = conteudoEadService.planoDaTurma(turma.getIdTurma());
            List<AndamentoAluno> andamento = sala.idPlano() == null ? List.of() : conteudoEadService.andamento(turma.getIdTurma());
            int media = andamento.isEmpty() ? 0
                    : (int) Math.round(andamento.stream().mapToInt(AndamentoAluno::percentual).average().orElse(0));
            lista.add(new TurmaDoProfessor(
                    turma.getIdTurma(),
                    turma.getNome(),
                    turma.getCurso() == null ? null : turma.getCurso().getIdCurso(),
                    turma.getCurso() == null ? null : turma.getCurso().getNome(),
                    turma.getModalidade(),
                    turma.getDiasHorarios(),
                    turma.getPeriodoLetivo() == null ? null : turma.getPeriodoLetivo().getNome(),
                    Boolean.TRUE.equals(responsavel.get(turma.getIdTurma())),
                    sala.idPlano() != null,
                    andamento.size(),
                    sala.aulas() == null ? 0 : sala.aulas().size(),
                    media));
        }
        lista.sort(Comparator.comparing(TurmaDoProfessor::nome, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return lista;
    }

    // Disciplinas do curso da turma (para o formulário de aula)
    @Transactional(readOnly = true)
    public List<Map<String, Object>> disciplinasDaTurma(Integer idTurma) {
        PlanoDaTurma sala = conteudoEadService.planoDaTurma(idTurma);
        Set<Integer> vistos = new LinkedHashSet<>();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Disciplina d : disciplinaRepository.findAll()) {
            boolean doCurso = sala.idCurso() == null || d.getCursos() == null
                    || d.getCursos().stream().anyMatch(c -> Objects.equals(c.getIdCurso(), sala.idCurso()));
            if (doCurso && vistos.add(d.getIdDisciplina())) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("idDisciplina", d.getIdDisciplina());
                item.put("nome", d.getNome());
                lista.add(item);
            }
        }
        lista.sort(Comparator.comparing(m -> String.valueOf(m.get("nome")), String.CASE_INSENSITIVE_ORDER));
        return lista;
    }

    private Professor professor(Integer idProfessor) {
        if (idProfessor == null) throw new RegraDeNegocioException("Professor não encontrado.");
        return professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
    }
}
