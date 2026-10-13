package com.aprendaplus.controller;

import com.aprendaplus.dto.DocumentoResumo;
import com.aprendaplus.entity.DocumentoAluno;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.DocumentoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DocumentoController.class)
class DocumentoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DocumentoService documentoService;

    private static DocumentoResumo resumo(String status) {
        return new DocumentoResumo(4, 7, "certificado.pdf", "application/pdf", 10, status, null, null, null);
    }

    @Test
    void alunoVeOsProprios() throws Exception {
        when(documentoService.doAluno(7)).thenReturn(List.of(resumo("pendente")));

        mockMvc.perform(get("/documentos/meus").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("pendente"))
                .andExpect(jsonPath("$[0].conteudo").doesNotExist());
    }

    @Test
    void semSerAlunoNaoVeNemEnvia() throws Exception {
        mockMvc.perform(get("/documentos/meus"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/documentos/meus").requestAttr("usuarioId", 1).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/documentos/meus").file(new MockMultipartFile("arquivo", "a.pdf", "application/pdf", new byte[]{1})))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/documentos/meus").file(new MockMultipartFile("arquivo", "a.pdf", "application/pdf", new byte[]{1}))
                        .requestAttr("usuarioId", 1).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isUnauthorized());
        verify(documentoService, never()).salvar(any(), any(), any());
    }

    @Test
    void alunoEnviaUmNovoDocumento() throws Exception {
        byte[] pdf = "%PDF-1.4".getBytes();
        when(documentoService.salvar(eq(7), eq("novo.pdf"), any())).thenReturn(resumo("pendente"));

        mockMvc.perform(multipart("/documentos/meus").file(new MockMultipartFile("arquivo", "novo.pdf", "application/pdf", pdf))
                        .requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idDocumento").value(4));
        verify(documentoService).salvar(7, "novo.pdf", pdf);
    }

    @Test
    void arquivoInvalidoVoltaComAMensagem() throws Exception {
        when(documentoService.salvar(eq(7), any(), any())).thenThrow(new RegraDeNegocioException("Envie o documento em PDF, JPG ou PNG."));

        mockMvc.perform(multipart("/documentos/meus").file(new MockMultipartFile("arquivo", "x.exe", "application/octet-stream", new byte[]{1}))
                        .requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Envie o documento em PDF, JPG ou PNG."));
    }

    @Test
    void painelConsultaERevisa() throws Exception {
        when(documentoService.doAluno(7)).thenReturn(List.of(resumo("pendente")));
        when(documentoService.situacaoPorAluno()).thenReturn(Map.of(7, "aprovado"));
        when(documentoService.revisar(4, "recusado", "Ilegível")).thenReturn(resumo("recusado"));

        mockMvc.perform(get("/documentos/aluno/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nomeArquivo").value("certificado.pdf"));
        mockMvc.perform(get("/documentos/situacao"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.7").value("aprovado"));
        mockMvc.perform(put("/documentos/4/revisao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"status\": \"recusado\", \"observacao\": \"Ilegível\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("recusado"));
    }

    @Test
    void baixaOArquivoComOTipoEONomeCertos() throws Exception {
        DocumentoAluno documento = new DocumentoAluno();
        documento.setNomeArquivo("certificado médio.pdf");
        documento.setContentType("application/pdf");
        documento.setConteudo("%PDF-1.4".getBytes());
        when(documentoService.arquivo(4, null)).thenReturn(documento);
        when(documentoService.arquivo(4, 7)).thenReturn(documento);

        mockMvc.perform(get("/documentos/4/arquivo"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", "inline; filename*=UTF-8''certificado%20m%C3%A9dio.pdf"))
                .andExpect(content().bytes("%PDF-1.4".getBytes()));
        // O aluno só baixa os próprios: o id dele vai junto para o serviço conferir
        mockMvc.perform(get("/documentos/4/arquivo").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk());
        verify(documentoService).arquivo(4, 7);
    }
}
