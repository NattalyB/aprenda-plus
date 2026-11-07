package com.aprendaplus.controller;

import com.aprendaplus.service.ChamadoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

// Módulo Chamados do painel: quem atende vê todos os chamados, responde, muda a situação,
// a prioridade e o responsável. O acesso ao módulo é conferido no AuthInterceptor.
@RestController
@RequestMapping("/chamados")
public class ChamadoController {

    @Autowired
    private ChamadoService chamadoService;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(chamadoService.todos());
    }

    @GetMapping("/{idChamado}")
    public ResponseEntity<?> buscar(@PathVariable Integer idChamado) {
        return ResponseEntity.ok(chamadoService.doSuporte(idChamado));
    }

    // Responde o chamado; "status" (opcional) já muda a situação junto (ex.: responder e marcar como resolvido)
    @PostMapping(value = "/{idChamado}/mensagens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> responder(@PathVariable Integer idChamado,
                                       @RequestParam(value = "texto", required = false) String texto,
                                       @RequestParam(value = "status", required = false) String status,
                                       @RequestPart(value = "anexo", required = false) MultipartFile anexo,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer funcionario)
            throws IOException {
        if (funcionario == null) {
            return ResponseEntity.status(401).body(Map.of("mensagem", "Faça login no painel para continuar."));
        }
        return ResponseEntity.ok(chamadoService.responderComoSuporte(funcionario, idChamado, texto,
                ChamadoArquivos.anexo(anexo), status));
    }

    @PutMapping("/{idChamado}")
    public ResponseEntity<?> atender(@PathVariable Integer idChamado, @RequestBody ChamadoService.Atendimento dados) {
        return ResponseEntity.ok(chamadoService.atender(idChamado, dados));
    }

    @GetMapping("/{idChamado}/mensagens/{idMensagem}/anexo")
    public ResponseEntity<?> anexo(@PathVariable Integer idChamado, @PathVariable Integer idMensagem) {
        return ChamadoArquivos.download(chamadoService.anexoDoSuporte(idChamado, idMensagem));
    }
}
