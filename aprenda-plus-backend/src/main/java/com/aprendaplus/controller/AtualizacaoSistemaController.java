package com.aprendaplus.controller;

import com.aprendaplus.service.AtualizacaoSistemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Atualizações do sistema. Consultar: toda a equipe. Publicar, editar e excluir: só o Master (AuthInterceptor).
@RestController
@RequestMapping("/atualizacoes")
public class AtualizacaoSistemaController {

    @Autowired
    private AtualizacaoSistemaService service;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/manutencoes")
    public ResponseEntity<?> manutencoes() {
        return ResponseEntity.ok(service.manutencoesPendentes());
    }

    @PostMapping
    public ResponseEntity<?> criar(@RequestBody AtualizacaoSistemaService.Dados dados,
                                   @RequestAttribute(name = "usuarioId", required = false) Integer funcionario) {
        return ResponseEntity.ok(service.criar(dados, funcionario));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Integer id, @RequestBody AtualizacaoSistemaService.Dados dados) {
        return ResponseEntity.ok(service.editar(id, dados));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Integer id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
