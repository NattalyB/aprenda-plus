package com.aprendaplus.controller;

import com.aprendaplus.entity.ChamadoMensagem;
import com.aprendaplus.service.ChamadoService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

// Ajudas comuns aos controllers de chamados: ler o anexo enviado e devolver o anexo para download.
final class ChamadoArquivos {

    private ChamadoArquivos() {
    }

    static ChamadoService.Anexo anexo(MultipartFile arquivo) throws IOException {
        if (arquivo == null || arquivo.isEmpty()) {
            return null;
        }
        return new ChamadoService.Anexo(arquivo.getOriginalFilename(), arquivo.getBytes());
    }

    static ResponseEntity<byte[]> download(ChamadoMensagem mensagem) {
        String nome = URLEncoder.encode(mensagem.getAnexoNome(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mensagem.getAnexoTipo()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename*=UTF-8''" + nome)
                .header("X-Content-Type-Options", "nosniff")
                .body(mensagem.getAnexoConteudo());
    }
}
