package com.aprendaplus.controller;

import com.aprendaplus.service.AtualizacaoSistemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// Manutenções programadas também aparecem no Portal do Professor (só consulta).
@RestController
public class DocenteManutencaoController {

    @Autowired
    private AtualizacaoSistemaService service;

    @GetMapping("/docente/manutencoes")
    public ResponseEntity<?> manutencoes() {
        return ResponseEntity.ok(service.manutencoesPendentes());
    }
}
