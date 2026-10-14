package com.aprendaplus.controller;

import com.aprendaplus.dto.CertificadoEmitido;
import com.aprendaplus.dto.MinhaTurmaEad;
import com.aprendaplus.dto.SalaDoAluno;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.SalaDeAulaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SalaDeAulaController.class)
class SalaDeAulaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SalaDeAulaService salaDeAulaService;

    private static SalaDoAluno sala(int percentual) {
        return new SalaDoAluno(5, "Turma A", "Administração", "EAD", null, "Carla", 360,
                2, percentual / 50, percentual, List.of(), List.of(), null);
    }

    @Test
    void alunoVeAsTurmasDele() throws Exception {
        when(salaDeAulaService.minhasTurmas(7)).thenReturn(List.of(
                new MinhaTurmaEad(5, "Turma A", "Administração", "Carla", "ativa", true, 10, 4, 40, false)));

        mockMvc.perform(get("/sala/minhas-turmas").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].turma").value("Turma A"))
                .andExpect(jsonPath("$[0].percentual").value(40))
                .andExpect(jsonPath("$[0].podeAcessar").value(true));
    }

    @Test
    void abreASalaDaTurma() throws Exception {
        when(salaDeAulaService.sala(7, 5)).thenReturn(sala(50));

        mockMvc.perform(get("/sala/turmas/5").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.percentual").value(50))
                .andExpect(jsonPath("$.professor").value("Carla"));
    }

    @Test
    void semMatriculaRecebeAMensagem() throws Exception {
        when(salaDeAulaService.sala(7, 5)).thenThrow(new RegraDeNegocioException("Você não está matriculado nesta turma."));

        mockMvc.perform(get("/sala/turmas/5").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("Você não está matriculado nesta turma."));
    }

    @Test
    void marcaEDesmarcaAula() throws Exception {
        when(salaDeAulaService.marcarAula(7, 9, true)).thenReturn(sala(100));
        when(salaDeAulaService.marcarAula(7, 9, false)).thenReturn(sala(50));

        mockMvc.perform(put("/sala/aulas/9/concluida").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.percentual").value(100));
        mockMvc.perform(delete("/sala/aulas/9/concluida").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.percentual").value(50));
    }

    @Test
    void emiteOCertificado() throws Exception {
        when(salaDeAulaService.emitirCertificado(7, 5)).thenReturn(
                new CertificadoEmitido("ABCD-EFGH-JKLM", "Lucas", "Administração", "Turma A", 360, "Carla", null));

        mockMvc.perform(post("/sala/turmas/5/certificado").requestAttr("usuarioId", 7).requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value("ABCD-EFGH-JKLM"))
                .andExpect(jsonPath("$.cargaHoraria").value(360));
    }

    @Test
    void soAlunoLogadoUsaASala() throws Exception {
        List<RequestBuilder> rotas = List.of(
                get("/sala/minhas-turmas"),
                get("/sala/turmas/5").requestAttr("usuarioId", 1).requestAttr("usuarioPapel", "ADMIN"),
                put("/sala/aulas/9/concluida"),
                delete("/sala/aulas/9/concluida").requestAttr("usuarioPapel", "ALUNO"),
                post("/sala/turmas/5/certificado").requestAttr("usuarioId", 1).requestAttr("usuarioPapel", "ADMIN"));
        for (RequestBuilder rota : rotas) {
            mockMvc.perform(rota)
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.erro").value("Faça login como aluno para acessar a sala de aula."));
        }
        verify(salaDeAulaService, never()).marcarAula(anyInt(), anyInt(), anyBoolean());
        verifyNoMoreInteractions(salaDeAulaService);
    }
}
