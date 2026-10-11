package com.aprendaplus.service;

import com.aprendaplus.dto.VinculosProfessor;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoProfessorRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaProfessorRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ProfessorService {

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private CursoRepository cursoRepository;

    @Autowired
    private DisciplinaRepository disciplinaRepository;

    @Autowired
    private CursoProfessorRepository cursoProfessorRepository;

    @Autowired
    private DisciplinaProfessorRepository disciplinaProfessorRepository;

    public List<Professor> listarTodos() {
        return professorRepository.findAll();
    }

    public Professor buscarPorId(Integer id) {
        return professorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Professor não encontrado com id: " + id));
    }

    public Professor salvar(Professor professor) {
        return professorRepository.save(professor);
    }

    // Ao excluir um professor, os vínculos com cursos e disciplinas saem junto
    // (eles só dizem o que o professor leciona, não fazem sentido sozinhos)
    @Transactional
    public void deletar(Integer id) {
        cursoProfessorRepository.deleteAll(cursoProfessorRepository.findByIdProfessorId(id));
        disciplinaProfessorRepository.deleteAll(disciplinaProfessorRepository.findByIdProfessorId(id));
        professorRepository.deleteById(id);
    }

    // ===== Cursos e disciplinas que o professor leciona =====

    @Transactional(readOnly = true)
    public VinculosProfessor buscarVinculos(Integer idProfessor) {
        List<Integer> cursos = cursoProfessorRepository.findByIdProfessorId(idProfessor).stream()
                .map(vinculo -> vinculo.getId().getCursoId())
                .sorted()
                .toList();

        List<Integer> disciplinas = disciplinaProfessorRepository.findByIdProfessorId(idProfessor).stream()
                .map(vinculo -> vinculo.getId().getDisciplinaId())
                .sorted()
                .toList();

        return new VinculosProfessor(cursos, disciplinas);
    }

    // Substitui os cursos e disciplinas do professor pelos informados.
    // Só mexe no que mudou: remove o que foi desmarcado e cria o que foi marcado.
    @Transactional
    public VinculosProfessor salvarVinculos(Integer idProfessor, VinculosProfessor dados) {
        Professor professor = professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));

        Set<Integer> idsCursos = semRepetidos(dados.cursos());
        Set<Integer> idsDisciplinas = semRepetidos(dados.disciplinas());

        Map<Integer, Curso> cursos = buscarTodos(cursoRepository.findAllById(idsCursos), Curso::getIdCurso);
        if (cursos.size() != idsCursos.size()) {
            throw new RegraDeNegocioException("Um dos cursos selecionados não existe mais. Atualize a página.");
        }

        Map<Integer, Disciplina> disciplinas =
                buscarTodos(disciplinaRepository.findAllById(idsDisciplinas), Disciplina::getIdDisciplina);
        if (disciplinas.size() != idsDisciplinas.size()) {
            throw new RegraDeNegocioException("Uma das disciplinas selecionadas não existe mais. Atualize a página.");
        }

        // Cada disciplina precisa fazer parte de pelo menos um dos cursos marcados
        for (Disciplina disciplina : disciplinas.values()) {
            boolean pertenceAUmCursoMarcado = disciplina.getCursos() != null && disciplina.getCursos().stream()
                    .anyMatch(curso -> idsCursos.contains(curso.getIdCurso()));
            if (!pertenceAUmCursoMarcado) {
                throw new RegraDeNegocioException("A disciplina \"" + disciplina.getNome()
                        + "\" não pertence a nenhum dos cursos selecionados.");
            }
        }

        // --- Cursos ---
        List<CursoProfessor> cursosAtuais = cursoProfessorRepository.findByIdProfessorId(idProfessor);
        Set<Integer> cursosJaVinculados = new LinkedHashSet<>();
        List<CursoProfessor> cursosParaRemover = new ArrayList<>();
        for (CursoProfessor vinculo : cursosAtuais) {
            Integer idCurso = vinculo.getId().getCursoId();
            if (idsCursos.contains(idCurso)) {
                cursosJaVinculados.add(idCurso);
            } else {
                cursosParaRemover.add(vinculo);
            }
        }
        cursoProfessorRepository.deleteAll(cursosParaRemover);
        cursoProfessorRepository.saveAll(idsCursos.stream()
                .filter(id -> !cursosJaVinculados.contains(id))
                .map(id -> new CursoProfessor(cursos.get(id), professor))
                .toList());

        // --- Disciplinas ---
        List<DisciplinaProfessor> disciplinasAtuais = disciplinaProfessorRepository.findByIdProfessorId(idProfessor);
        Set<Integer> disciplinasJaVinculadas = new LinkedHashSet<>();
        List<DisciplinaProfessor> disciplinasParaRemover = new ArrayList<>();
        for (DisciplinaProfessor vinculo : disciplinasAtuais) {
            Integer idDisciplina = vinculo.getId().getDisciplinaId();
            if (idsDisciplinas.contains(idDisciplina)) {
                disciplinasJaVinculadas.add(idDisciplina);
            } else {
                disciplinasParaRemover.add(vinculo);
            }
        }
        disciplinaProfessorRepository.deleteAll(disciplinasParaRemover);
        disciplinaProfessorRepository.saveAll(idsDisciplinas.stream()
                .filter(id -> !disciplinasJaVinculadas.contains(id))
                .map(id -> new DisciplinaProfessor(disciplinas.get(id), professor))
                .toList());

        return new VinculosProfessor(
                idsCursos.stream().sorted().toList(),
                idsDisciplinas.stream().sorted().toList());
    }

    // Lista nula vira vazia, e ids repetidos ou nulos são ignorados
    private Set<Integer> semRepetidos(List<Integer> ids) {
        Set<Integer> resultado = new LinkedHashSet<>();
        if (ids != null) {
            ids.stream().filter(id -> id != null).forEach(resultado::add);
        }
        return resultado;
    }

    private <T> Map<Integer, T> buscarTodos(List<T> registros, Function<T, Integer> pegarId) {
        return registros.stream().collect(Collectors.toMap(pegarId, Function.identity()));
    }
}
