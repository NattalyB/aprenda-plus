package com.aprendaplus.service;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.repository.InscricaoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InscricaoService {

    @Autowired
    private InscricaoRepository inscricaoRepository;

    public List<Inscricao> listarTodos() {
        return inscricaoRepository.findAll();
    }

    public Inscricao buscarPorId(Integer id) {
        return inscricaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inscrição não encontrada com id: " + id));
    }

    public Inscricao salvar(Inscricao inscricao) {
        return inscricaoRepository.save(inscricao);
    }

    public void deletar(Integer id) {
        inscricaoRepository.deleteById(id);
    }
}