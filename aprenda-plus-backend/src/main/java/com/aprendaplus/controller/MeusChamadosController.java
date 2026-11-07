package com.aprendaplus.controller;

import com.aprendaplus.service.ChamadoService;
import com.aprendaplus.service.ChamadoService.Solicitante;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

// Chamados que o próprio funcionário do painel abriu (qualquer nível de acesso pode abrir).
// Cada um só enxerga os seus; quem atende usa o módulo Chamados (/chamados).
@RestController
@RequestMapping("/meus-chamados")
public class MeusChamadosController {

    @Autowired
    private ChamadoService chamadoService;

    @GetMapping
    public ResponseEntity<?> listar(@RequestAttribute(name = "usuarioId", required = false) Integer id,
                                    @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ResponseEntity.ok(chamadoService.meus(Solicitante.funcionario(id)));
    }

    @GetMapping("/{idChamado}")
    public ResponseEntity<?> buscar(@PathVariable Integer idChamado,
                                    @RequestAttribute(name = "usuarioId", required = false) Integer id,
                                    @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ResponseEntity.ok(chamadoService.meu(Solicitante.funcionario(id), idChamado));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> abrir(@RequestParam(value = "assunto", required = false) String assunto,
                                   @RequestParam(value = "categoria", required = false) String categoria,
                                   @RequestParam(value = "prioridade", required = false) String prioridade,
                                   @RequestParam(value = "descricao", required = false) String descricao,
                                   @RequestParam(value = "tela", required = false) String tela,
                                   @RequestPart(value = "anexo", required = false) MultipartFile anexo,
                                   @RequestAttribute(name = "usuarioId", required = false) Integer id,
                                   @RequestAttribute(name = "usuarioPapel", required = false) String papel) throws IOException {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ResponseEntity.ok(chamadoService.abrir(Solicitante.funcionario(id),
                new ChamadoService.NovoChamado(assunto, categoria, prioridade, descricao, tela),
                ChamadoArquivos.anexo(anexo)));
    }

    @PostMapping(value = "/{idChamado}/mensagens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> responder(@PathVariable Integer idChamado,
                                       @RequestParam(value = "texto", required = false) String texto,
                                       @RequestPart(value = "anexo", required = false) MultipartFile anexo,
                                       @RequestAttribute(name = "usuarioId", required = false) Integer id,
                                       @RequestAttribute(name = "usuarioPapel", required = false) String papel) throws IOException {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ResponseEntity.ok(chamadoService.responderComoSolicitante(Solicitante.funcionario(id), idChamado, texto,
                ChamadoArquivos.anexo(anexo)));
    }

    @PutMapping("/{idChamado}/fechar")
    public ResponseEntity<?> fechar(@PathVariable Integer idChamado,
                                    @RequestAttribute(name = "usuarioId", required = false) Integer id,
                                    @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ResponseEntity.ok(chamadoService.fecharComoSolicitante(Solicitante.funcionario(id), idChamado));
    }

    @GetMapping("/{idChamado}/mensagens/{idMensagem}/anexo")
    public ResponseEntity<?> anexo(@PathVariable Integer idChamado, @PathVariable Integer idMensagem,
                                   @RequestAttribute(name = "usuarioId", required = false) Integer id,
                                   @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (!ehFuncionario(id, papel)) return naoLogado();
        return ChamadoArquivos.download(chamadoService.anexoDoSolicitante(Solicitante.funcionario(id), idChamado, idMensagem));
    }

    private static boolean ehFuncionario(Integer id, String papel) {
        return id != null && "ADMIN".equals(papel);
    }

    private static ResponseEntity<?> naoLogado() {
        return ResponseEntity.status(401).body(Map.of("mensagem", "Faça login no painel para continuar."));
    }
}
