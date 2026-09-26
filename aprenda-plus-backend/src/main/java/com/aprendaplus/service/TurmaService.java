package com.aprendaplus.service;

import com.aprendaplus.entity.Turma;
import com.aprendaplus.repository.TurmaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TurmaService {

    @Autowired
    private TurmaRepository turmaRepository;

    public List<Turma> listarTodos() {
        return turmaRepository.findAll();
    }

    public Turma buscarPorId(Integer id) {
        return turmaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Turma não encontrada com id: " + id));
    }

    public Turma salvar(Turma turma) {
        return turmaRepository.save(turma);
    }

    public void deletar(Integer id) {
        turmaRepository.deleteById(id);
    }
}