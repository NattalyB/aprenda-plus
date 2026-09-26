package com.aprendaplus.service;

import com.aprendaplus.entity.DisciplinaProfessor;
import com.aprendaplus.entity.DisciplinaProfessorId;
import com.aprendaplus.repository.DisciplinaProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DisciplinaProfessorService {

    @Autowired
    private DisciplinaProfessorRepository disciplinaProfessorRepository;

    public List<DisciplinaProfessor> listarTodos() {
        return disciplinaProfessorRepository.findAll();
    }

    public DisciplinaProfessor salvar(DisciplinaProfessor disciplinaProfessor) {
        return disciplinaProfessorRepository.save(disciplinaProfessor);
    }

    public void deletar(DisciplinaProfessorId id) {
        disciplinaProfessorRepository.deleteById(id);
    }
}