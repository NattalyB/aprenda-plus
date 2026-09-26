package com.aprendaplus.service;

import com.aprendaplus.entity.PeriodoLetivo;
import com.aprendaplus.repository.PeriodoLetivoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PeriodoLetivoService {

    @Autowired
    private PeriodoLetivoRepository periodoLetivoRepository;

    public List<PeriodoLetivo> listarTodos() {
        return periodoLetivoRepository.findAll();
    }

    public PeriodoLetivo buscarPorId(Integer id) {
        return periodoLetivoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Período letivo não encontrado com id: " + id));
    }

    public PeriodoLetivo salvar(PeriodoLetivo periodoLetivo) {
        return periodoLetivoRepository.save(periodoLetivo);
    }

    public void deletar(Integer id) {
        periodoLetivoRepository.deleteById(id);
    }
}