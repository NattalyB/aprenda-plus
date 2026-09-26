package com.aprendaplus.service;

import com.aprendaplus.entity.Professor;
import com.aprendaplus.repository.ProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProfessorService {

    @Autowired
    private ProfessorRepository professorRepository;

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

    public void deletar(Integer id) {
        professorRepository.deleteById(id);
    }
}