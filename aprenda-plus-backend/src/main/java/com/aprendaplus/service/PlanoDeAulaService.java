package com.aprendaplus.service;

import com.aprendaplus.entity.PlanoDeAula;
import com.aprendaplus.repository.PlanoDeAulaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlanoDeAulaService {

    @Autowired
    private PlanoDeAulaRepository planoDeAulaRepository;

    public List<PlanoDeAula> listarTodos() {
        return planoDeAulaRepository.findAll();
    }

    public PlanoDeAula buscarPorId(Integer id) {
        return planoDeAulaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plano de aula não encontrado com id: " + id));
    }

    public PlanoDeAula salvar(PlanoDeAula planoDeAula) {
        return planoDeAulaRepository.save(planoDeAula);
    }

    public void deletar(Integer id) {
        planoDeAulaRepository.deleteById(id);
    }
}