package com.aprendaplus.service;

import com.aprendaplus.entity.Aula;
import com.aprendaplus.repository.AulaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AulaService {

    @Autowired
    private AulaRepository aulaRepository;

    public List<Aula> listarTodos() {
        return aulaRepository.findAll();
    }

    public Aula buscarPorId(Integer id) {
        return aulaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Aula não encontrada com id: " + id));
    }

    public Aula salvar(Aula aula) {
        return aulaRepository.save(aula);
    }

    public void deletar(Integer id) {
        aulaRepository.deleteById(id);
    }
}