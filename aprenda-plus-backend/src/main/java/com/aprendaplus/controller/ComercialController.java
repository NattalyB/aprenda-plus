package com.aprendaplus.controller;

import com.aprendaplus.dto.ContatoForm;
import com.aprendaplus.dto.LeadComercial;
import com.aprendaplus.dto.PainelComercial;
import com.aprendaplus.entity.ContatoComercial;
import com.aprendaplus.service.ComercialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Módulo Comercial do painel (só para níveis com o módulo "comercial" liberado).
// GET  /comercial/painel?dias=30      funil, cursos com mais interesse, buscas e movimento por dia
// GET  /comercial/leads               quem começou a comprar e não terminou
// GET  /comercial/contatos?aluno=12   contatos já feitos com um aluno
// POST /comercial/contatos            registra um novo contato
@RestController
@RequestMapping("/comercial")
public class ComercialController {

    @Autowired
    private ComercialService comercialService;

    @GetMapping("/painel")
    public ResponseEntity<PainelComercial> painel(@RequestParam(required = false) Integer dias) {
        return ResponseEntity.ok(comercialService.painel(dias));
    }

    @GetMapping("/leads")
    public ResponseEntity<List<LeadComercial>> leads() {
        return ResponseEntity.ok(comercialService.leads());
    }

    @GetMapping("/contatos")
    public ResponseEntity<List<ContatoComercial>> contatos(@RequestParam("aluno") Integer idAluno) {
        return ResponseEntity.ok(comercialService.contatosDoAluno(idAluno));
    }

    @PostMapping("/contatos")
    public ResponseEntity<ContatoComercial> registrarContato(@RequestBody ContatoForm form,
                                                             @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(comercialService.registrarContato(form, usuarioId));
    }
}
