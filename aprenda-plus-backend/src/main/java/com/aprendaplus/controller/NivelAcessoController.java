package com.aprendaplus.controller;

import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.service.NivelAcessoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Módulo "Sistema": níveis de acesso do painel.
// Quem pode usar cada rota é conferido no AuthInterceptor.
@RestController
@RequestMapping("/niveis-acesso")
public class NivelAcessoController {

    @Autowired
    private NivelAcessoService nivelAcessoService;

    // A lista aparece também no cadastro de funcionários: quem não é Master não vê o nível Master
    @GetMapping
    public List<NivelAcesso> listar(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        List<NivelAcesso> niveis = nivelAcessoService.listar();
        if (usuarioId == null || nivelAcessoService.ehMaster(usuarioId)) {
            return niveis;
        }
        return niveis.stream().filter(n -> !n.isMaster()).toList();
    }

    // Nível e módulos de quem está logado
    @GetMapping("/meu")
    public ResponseEntity<?> meu(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId) {
        if (usuarioId == null) {
            return ResponseEntity.status(401).body(Map.of("erro", "Faça login para continuar."));
        }
        return ResponseEntity.ok(nivelAcessoService.doFuncionario(usuarioId));
    }

    @PostMapping
    public ResponseEntity<NivelAcesso> criar(@RequestBody NivelAcesso nivel) {
        nivel.setIdNivel(null);
        return ResponseEntity.ok(nivelAcessoService.salvar(nivel));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NivelAcesso> atualizar(@PathVariable Integer id, @RequestBody NivelAcesso nivel) {
        nivel.setIdNivel(id);
        return ResponseEntity.ok(nivelAcessoService.salvar(nivel));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Integer id) {
        nivelAcessoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
