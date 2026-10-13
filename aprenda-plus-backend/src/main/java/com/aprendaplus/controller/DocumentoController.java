package com.aprendaplus.controller;

import com.aprendaplus.entity.DocumentoAluno;
import com.aprendaplus.service.DocumentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.util.Map;

// Documento de escolaridade: o aluno envia e acompanha; a secretaria consulta e revisa.
// Quem pode usar cada rota é conferido no AuthInterceptor.
@RestController
@RequestMapping("/documentos")
public class DocumentoController {

    @Autowired
    private DocumentoService documentoService;

    // ===== Aluno =====

    @GetMapping("/meus")
    public ResponseEntity<?> meus(@RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                  @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        if (usuarioId == null || !"ALUNO".equals(papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(documentoService.doAluno(usuarioId));
    }

    @PostMapping(value = "/meus", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> enviar(@RequestPart("arquivo") MultipartFile arquivo,
                                    @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                    @RequestAttribute(name = "usuarioPapel", required = false) String papel) throws IOException {
        if (usuarioId == null || !"ALUNO".equals(papel)) {
            return naoAutorizado();
        }
        return ResponseEntity.ok(documentoService.salvar(usuarioId, arquivo.getOriginalFilename(), arquivo.getBytes()));
    }

    // ===== Painel =====

    @GetMapping("/aluno/{idAluno}")
    public ResponseEntity<?> doAluno(@PathVariable Integer idAluno) {
        return ResponseEntity.ok(documentoService.doAluno(idAluno));
    }

    // { "7": "aprovado", "9": "pendente" } — situação mais recente de cada aluno
    @GetMapping("/situacao")
    public ResponseEntity<?> situacao() {
        return ResponseEntity.ok(documentoService.situacaoPorAluno());
    }

    // Corpo: { "status": "aprovado" | "recusado", "observacao": "motivo" }
    @PutMapping("/{id}/revisao")
    public ResponseEntity<?> revisar(@PathVariable Integer id, @RequestBody Map<String, String> corpo) {
        return ResponseEntity.ok(documentoService.revisar(id, corpo.get("status"), corpo.get("observacao")));
    }

    // ===== Arquivo (o aluno só baixa os próprios; o painel baixa qualquer um) =====

    @GetMapping("/{id}/arquivo")
    public ResponseEntity<?> arquivo(@PathVariable Integer id,
                                     @RequestAttribute(name = "usuarioId", required = false) Integer usuarioId,
                                     @RequestAttribute(name = "usuarioPapel", required = false) String papel) {
        Integer dono = "ALUNO".equals(papel) ? usuarioId : null;
        DocumentoAluno documento = documentoService.arquivo(id, dono);
        String nome = URLEncoder.encode(documento.getNomeArquivo(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(documento.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + nome)
                .header("X-Content-Type-Options", "nosniff")
                .body(documento.getConteudo());
    }

    private ResponseEntity<?> naoAutorizado() {
        return ResponseEntity.status(401).body(Map.of("erro", "Faça login como aluno para continuar."));
    }
}
