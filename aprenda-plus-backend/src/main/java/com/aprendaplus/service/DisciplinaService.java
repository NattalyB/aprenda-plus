package com.aprendaplus.service;

import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class DisciplinaService {

    @Autowired
    private DisciplinaRepository disciplinaRepository;

    @Autowired
    private CursoRepository cursoRepository;

    public List<Disciplina> listarTodos() {
        return disciplinaRepository.findAll();
    }

    public Disciplina buscarPorId(Integer id) {
        return disciplinaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Disciplina não encontrada com id: " + id));
    }

    public Disciplina salvar(Disciplina disciplina) {
        // Sem status informado, a disciplina fica ativa
        if (disciplina.getStatus() == null || disciplina.getStatus().isBlank()) {
            disciplina.setStatus("ativa");
        }

        // Do navegador vêm só os ids dos cursos: { "cursos": [ { "idCurso": 1 }, { "idCurso": 3 } ] }.
        // Aqui buscamos os cursos de verdade no banco (e conferimos se todos existem).
        Set<Integer> idsCursos = new LinkedHashSet<>();
        if (disciplina.getCursos() != null) {
            disciplina.getCursos().stream()
                    .filter(Objects::nonNull)
                    .map(Curso::getIdCurso)
                    .filter(Objects::nonNull)
                    .forEach(idsCursos::add);
        }
        if (idsCursos.isEmpty()) {
            throw new RegraDeNegocioException("Selecione pelo menos um curso para a disciplina.");
        }

        List<Curso> cursos = cursoRepository.findAllById(idsCursos);
        if (cursos.size() != idsCursos.size()) {
            throw new RegraDeNegocioException("Um dos cursos selecionados não existe mais. Atualize a página.");
        }
        disciplina.setCursos(new ArrayList<>(cursos));

        return disciplinaRepository.save(disciplina);
    }

    public void deletar(Integer id) {
        disciplinaRepository.deleteById(id);
    }
}
