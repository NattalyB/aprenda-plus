package com.aprendaplus.service;

import com.aprendaplus.entity.PeriodoLetivoCurso;
import com.aprendaplus.entity.PeriodoLetivoCursoId;
import com.aprendaplus.repository.PeriodoLetivoCursoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PeriodoLetivoCursoService {

    @Autowired
    private PeriodoLetivoCursoRepository periodoLetivoCursoRepository;

    public List<PeriodoLetivoCurso> listarTodos() {
        return periodoLetivoCursoRepository.findAll();
    }

    public PeriodoLetivoCurso salvar(PeriodoLetivoCurso periodoLetivoCurso) {
        return periodoLetivoCursoRepository.save(periodoLetivoCurso);
    }

    public void deletar(PeriodoLetivoCursoId id) {
        periodoLetivoCursoRepository.deleteById(id);
    }
}