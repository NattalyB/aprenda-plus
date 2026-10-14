package com.aprendaplus.controller;

import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.SalaDeAulaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Validação pública do certificado (rota aberta: quem recebe o certificado confere se é verdadeiro)
@RestController
@RequestMapping("/certificados")
public class CertificadoController {

    @Autowired
    private SalaDeAulaService salaDeAulaService;

    @GetMapping("/{codigo}")
    public ResponseEntity<?> validar(@PathVariable String codigo) {
        try {
            return ResponseEntity.ok(salaDeAulaService.validar(codigo));
        } catch (RegraDeNegocioException e) {
            return ResponseEntity.status(404).body(Map.of("mensagem", e.getMessage()));
        }
    }
}
