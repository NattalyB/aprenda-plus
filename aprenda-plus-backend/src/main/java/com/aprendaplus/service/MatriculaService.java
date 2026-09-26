package com.aprendaplus.service;

import com.aprendaplus.entity.Matricula;
import com.aprendaplus.repository.MatriculaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MatriculaService {

    @Autowired
    private MatriculaRepository matriculaRepository;

    public List<Matricula> listarTodos() {
        return matriculaRepository.findAll();
    }

    public Matricula buscarPorId(Integer id) {
        return matriculaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matrícula não encontrada com id: " + id));
    }

    public Matricula salvar(Matricula matricula) {
        return matriculaRepository.save(matricula);
    }

    public void deletar(Integer id) {
        matriculaRepository.deleteById(id);
    }
}