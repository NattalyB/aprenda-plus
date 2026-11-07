package com.aprendaplus.controller;

import com.aprendaplus.entity.ChamadoMensagem;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ChamadoService;
import com.aprendaplus.service.ChamadoService.Anexo;
import com.aprendaplus.service.ChamadoService.Atendimento;
import com.aprendaplus.service.ChamadoService.ChamadoDto;
import com.aprendaplus.service.ChamadoService.NovoChamado;
import com.aprendaplus.service.ChamadoService.Solicitante;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {MeusChamadosController.class, DocenteChamadoController.class, ChamadoController.class})
class ChamadoControllersTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChamadoService chamadoService;

    private static ChamadoDto dto(String status) {
        return new ChamadoDto(10, "Erro ao salvar", "erro", "media", status, "Turmas", "funcionario", "Julia",
                "julia@escola.com", null, null, "solicitante", null, null, null,
                List.of(new ChamadoService.MensagemDto(1, "solicitante", "Julia", "Deu erro", "print.png", "image/png", 9, null)));
    }

    private static ChamadoMensagem anexo() {
        ChamadoMensagem m = new ChamadoMensagem();
        m.setAnexoNome("print da tela.png");
        m.setAnexoTipo("image/png");
        m.setAnexoConteudo(new byte[]{1, 2, 3});
        return m;
    }

    // ===================== Funcionário (/meus-chamados) =====================

    @Test
    void funcionarioListaEAbreOsProprios() throws Exception {
        when(chamadoService.meus(Solicitante.funcionario(5))).thenReturn(List.of(dto("aberto")));
        when(chamadoService.meu(Solicitante.funcionario(5), 10)).thenReturn(dto("aberto"));

        mockMvc.perform(get("/meus-chamados").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assunto").value("Erro ao salvar"));
        mockMvc.perform(get("/meus-chamados/10").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mensagens[0].anexoNome").value("print.png"))
                .andExpect(jsonPath("$.mensagens[0].anexoConteudo").doesNotExist());
    }

    @Test
    void funcionarioAbreChamadoComPrint() throws Exception {
        when(chamadoService.abrir(any(), any(), any())).thenReturn(dto("aberto"));

        mockMvc.perform(multipart("/meus-chamados")
                        .file(new MockMultipartFile("anexo", "print.png", "image/png", new byte[]{9, 9}))
                        .param("assunto", "Erro ao salvar").param("categoria", "erro").param("prioridade", "alta")
                        .param("descricao", "Deu erro").param("tela", "Turmas")
                        .requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idChamado").value(10));

        ArgumentCaptor<NovoChamado> dados = ArgumentCaptor.forClass(NovoChamado.class);
        ArgumentCaptor<Anexo> arquivo = ArgumentCaptor.forClass(Anexo.class);
        verify(chamadoService).abrir(eq(Solicitante.funcionario(5)), dados.capture(), arquivo.capture());
        assertEquals(new NovoChamado("Erro ao salvar", "erro", "alta", "Deu erro", "Turmas"), dados.getValue());
        assertEquals("print.png", arquivo.getValue().nome());
        assertArrayEquals(new byte[]{9, 9}, arquivo.getValue().conteudo());
    }

    @Test
    void funcionarioRespondeFechaEBaixaOAnexo() throws Exception {
        when(chamadoService.responderComoSolicitante(eq(Solicitante.funcionario(5)), eq(10), eq("Oi"), isNull()))
                .thenReturn(dto("aberto"));
        when(chamadoService.fecharComoSolicitante(Solicitante.funcionario(5), 10)).thenReturn(dto("fechado"));
        when(chamadoService.anexoDoSolicitante(Solicitante.funcionario(5), 10, 1)).thenReturn(anexo());

        mockMvc.perform(multipart("/meus-chamados/10/mensagens").param("texto", "Oi")
                        .requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/meus-chamados/10/fechar").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("fechado"));
        mockMvc.perform(get("/meus-chamados/10/mensagens/1/anexo").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Content-Disposition", "inline; filename*=UTF-8''print%20da%20tela.png"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }

    @Test
    void semLoginDeFuncionarioNaoEntra() throws Exception {
        mockMvc.perform(get("/meus-chamados")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/meus-chamados").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/meus-chamados/10").requestAttr("usuarioId", 5)).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/meus-chamados").param("assunto", "A")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/meus-chamados/10/mensagens").param("texto", "A")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/meus-chamados/10/fechar")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/meus-chamados/10/mensagens/1/anexo")).andExpect(status().isUnauthorized());
        verifyNoInteractions(chamadoService);
    }

    @Test
    void erroDeRegraViraMensagemClara() throws Exception {
        when(chamadoService.meu(Solicitante.funcionario(6), 10)).thenThrow(new RegraDeNegocioException("Chamado não encontrado."));
        mockMvc.perform(get("/meus-chamados/10").requestAttr("usuarioId", 6).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isBadRequest());
    }

    // ===================== Professor (/docente/chamados) =====================

    @Test
    void professorUsaOsMesmosRecursosComOProprioId() throws Exception {
        when(chamadoService.meus(Solicitante.professor(8))).thenReturn(List.of());
        when(chamadoService.meu(Solicitante.professor(8), 10)).thenReturn(dto("aberto"));
        when(chamadoService.abrir(any(), any(), any())).thenReturn(dto("aberto"));
        when(chamadoService.responderComoSolicitante(any(), eq(10), any(), any())).thenReturn(dto("aberto"));
        when(chamadoService.fecharComoSolicitante(Solicitante.professor(8), 10)).thenReturn(dto("fechado"));
        when(chamadoService.anexoDoSolicitante(Solicitante.professor(8), 10, 1)).thenReturn(anexo());

        mockMvc.perform(get("/docente/chamados").requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/docente/chamados/10").requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());
        mockMvc.perform(multipart("/docente/chamados").param("assunto", "Vídeo").param("descricao", "Não carrega")
                        .requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());
        mockMvc.perform(multipart("/docente/chamados/10/mensagens").param("texto", "Oi")
                        .requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/docente/chamados/10/fechar").requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/docente/chamados/10/mensagens/1/anexo").requestAttr("usuarioId", 8).requestAttr("usuarioPapel", "PROFESSOR"))
                .andExpect(status().isOk());

        verify(chamadoService).abrir(eq(Solicitante.professor(8)), any(), isNull());
        verify(chamadoService).responderComoSolicitante(Solicitante.professor(8), 10, "Oi", null);
    }

    @Test
    void funcionarioNaoUsaARotaDoProfessor() throws Exception {
        mockMvc.perform(get("/docente/chamados").requestAttr("usuarioId", 5).requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensagem").value("Faça login como professor para continuar."));
        mockMvc.perform(get("/docente/chamados/10")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/docente/chamados")).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart("/docente/chamados/10/mensagens")).andExpect(status().isUnauthorized());
        mockMvc.perform(put("/docente/chamados/10/fechar")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/docente/chamados/10/mensagens/1/anexo")).andExpect(status().isUnauthorized());
        verifyNoInteractions(chamadoService);
    }

    // ===================== Suporte (/chamados) =====================

    @Test
    void suporteListaVeRespondeEAtende() throws Exception {
        when(chamadoService.todos()).thenReturn(List.of(dto("aberto")));
        when(chamadoService.doSuporte(10)).thenReturn(dto("aberto"));
        when(chamadoService.responderComoSuporte(eq(1), eq(10), eq("Resolvido!"), any(), eq("resolvido")))
                .thenReturn(dto("resolvido"));
        when(chamadoService.atender(eq(10), any())).thenReturn(dto("em_atendimento"));
        when(chamadoService.anexoDoSuporte(10, 1)).thenReturn(anexo());

        mockMvc.perform(get("/chamados")).andExpect(status().isOk()).andExpect(jsonPath("$[0].idChamado").value(10));
        mockMvc.perform(get("/chamados/10")).andExpect(status().isOk());
        mockMvc.perform(multipart("/chamados/10/mensagens")
                        .file(new MockMultipartFile("anexo", "ok.pdf", "application/pdf", "%PDF".getBytes()))
                        .param("texto", "Resolvido!").param("status", "resolvido")
                        .requestAttr("usuarioId", 1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("resolvido"));
        mockMvc.perform(put("/chamados/10").contentType("application/json")
                        .content("{\"status\":\"em_atendimento\",\"prioridade\":\"alta\",\"responsavelId\":1}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/chamados/10/mensagens/1/anexo")).andExpect(status().isOk());

        verify(chamadoService).atender(10, new Atendimento("em_atendimento", "alta", 1));
    }

    @Test
    void respostaDoSuporteSemLoginNaoGrava() throws Exception {
        mockMvc.perform(multipart("/chamados/10/mensagens").param("texto", "Oi")).andExpect(status().isUnauthorized());
        verifyNoInteractions(chamadoService);
    }
}
