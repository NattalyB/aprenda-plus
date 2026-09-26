package com.aprendaplus.service;

import com.aprendaplus.entity.CursoProfessor;
import com.aprendaplus.entity.CursoProfessorId;
import com.aprendaplus.repository.CursoProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CursoProfessorService {

    @Autowired
    private CursoProfessorRepository cursoProfessorRepository;

    public List<CursoProfessor> listarTodos() {
        return cursoProfessorRepository.findAll();
    }

    public CursoProfessor salvar(CursoProfessor cursoProfessor) {
        return cursoProfessorRepository.save(cursoProfessor);
    }

    public void deletar(CursoProfessorId id) {
        cursoProfessorRepository.deleteById(id);
    }
}