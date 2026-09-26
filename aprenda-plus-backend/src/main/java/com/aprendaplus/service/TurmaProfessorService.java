package com.aprendaplus.service;

import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.entity.TurmaProfessorId;
import com.aprendaplus.repository.TurmaProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TurmaProfessorService {

    @Autowired
    private TurmaProfessorRepository turmaProfessorRepository;

    public List<TurmaProfessor> listarTodos() {
        return turmaProfessorRepository.findAll();
    }

    public TurmaProfessor salvar(TurmaProfessor turmaProfessor) {
        return turmaProfessorRepository.save(turmaProfessor);
    }

    public void deletar(TurmaProfessorId id) {
        turmaProfessorRepository.deleteById(id);
    }
}