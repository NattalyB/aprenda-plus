package com.aprendaplus.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.aprendaplus.entity.Curso;
import com.aprendaplus.repository.CursoRepository;

@Service
public class CursoService {

    @Autowired
    private CursoRepository cursoRepository;

    public List<Curso> listarTodos() {
        return cursoRepository.findAll();
    }

    public Curso buscarPorId(Integer id) {
        return cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Curso não encontrado com id: " + id));
    }

    public Curso salvar(Curso curso) {
        return cursoRepository.save(curso);
    }

    public void deletar(Integer id) {
        cursoRepository.deleteById(id);
    }
}