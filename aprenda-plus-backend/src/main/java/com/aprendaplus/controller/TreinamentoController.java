package com.aprendaplus.controller;

import com.aprendaplus.entity.Treinamento;
import com.aprendaplus.service.TreinamentoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// Treinamentos do painel (vídeos e PDFs de como usar o sistema).
// Consultar: toda a equipe. Cadastrar, editar e excluir: só o Master (conferido no AuthInterceptor).
// Os formulários chegam como multipart, porque podem trazer o PDF junto.
@RestController
@RequestMapping("/treinamentos")
public class TreinamentoController {

    @Autowired
    private TreinamentoService treinamentoService;

    @GetMapping
    public ResponseEntity<?> listar() {
        return ResponseEntity.ok(treinamentoService.listar());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> criar(@RequestParam(value = "titulo", required = false) String titulo,
                                   @RequestParam(value = "descricao", required = false) String descricao,
                                   @RequestParam(value = "videoUrl", required = false) String videoUrl,
                                   @RequestParam(value = "ordem", required = false) Integer ordem,
                                   @RequestPart(value = "pdf", required = false) MultipartFile pdf) throws IOException {
        return ResponseEntity.ok(treinamentoService.criar(dados(titulo, descricao, videoUrl, ordem, pdf, false)));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> atualizar(@PathVariable Integer id,
                                       @RequestParam(value = "titulo", required = false) String titulo,
                                       @RequestParam(value = "descricao", required = false) String descricao,
                                       @RequestParam(value = "videoUrl", required = false) String videoUrl,
                                       @RequestParam(value = "ordem", required = false) Integer ordem,
                                       @RequestParam(value = "removerPdf", defaultValue = "false") boolean removerPdf,
                                       @RequestPart(value = "pdf", required = false) MultipartFile pdf) throws IOException {
        return ResponseEntity.ok(treinamentoService.atualizar(id, dados(titulo, descricao, videoUrl, ordem, pdf, removerPdf)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluir(@PathVariable Integer id) {
        treinamentoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<?> pdf(@PathVariable Integer id) {
        Treinamento treinamento = treinamentoService.pdf(id);
        String nome = URLEncoder.encode(treinamento.getPdfNome(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + nome)
                .header("X-Content-Type-Options", "nosniff")
                .body(treinamento.getPdfConteudo());
    }

    private static TreinamentoService.Dados dados(String titulo, String descricao, String videoUrl, Integer ordem,
                                                  MultipartFile pdf, boolean removerPdf) throws IOException {
        boolean temArquivo = pdf != null && !pdf.isEmpty();
        return new TreinamentoService.Dados(titulo, descricao, videoUrl, ordem,
                temArquivo ? pdf.getOriginalFilename() : null, temArquivo ? pdf.getBytes() : null, removerPdf);
    }
}
