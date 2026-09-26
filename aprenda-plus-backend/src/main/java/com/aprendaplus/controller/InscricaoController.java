package com.aprendaplus.controller;

import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.service.InscricaoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inscricoes")
public class InscricaoController {

    @Autowired
    private InscricaoService inscricaoService;

    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoService.listarTodos();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inscricao> buscar(@PathVariable Integer id) {
        return ResponseEntity.ok(inscricaoService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Inscricao> criar(@RequestBody Inscricao inscricao) {
        return ResponseEntity.ok(inscricaoService.salvar(inscricao));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inscricao> atualizar(@PathVariable Integer id, @RequestBody Inscricao inscricao) {
        inscricao.setIdInscricao(id);
        return ResponseEntity.ok(inscricaoService.salvar(inscricao));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        inscricaoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}