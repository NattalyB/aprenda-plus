package com.aprendaplus.controller;

import com.aprendaplus.dto.MeuAcesso;
import com.aprendaplus.entity.NivelAcesso;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.NivelAcessoService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NivelAcessoController.class)
class NivelAcessoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NivelAcessoService nivelAcessoService;

    private static NivelAcesso nivel(int id, String nome, String modulos, boolean master) {
        NivelAcesso n = new NivelAcesso();
        n.setIdNivel(id);
        n.setNome(nome);
        n.setModulosTexto(modulos);
        n.setMaster(master);
        return n;
    }

    @Test
    void listaOsNiveisComOsModulosEmLista() throws Exception {
        when(nivelAcessoService.listar()).thenReturn(List.of(
                nivel(1, "Master", "", true), nivel(3, "Financeiro", "inscricoes,matriculas", false)));

        mockMvc.perform(get("/niveis-acesso"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].master").value(true))
                .andExpect(jsonPath("$[0].modulos[11]").value("sistema"))
                .andExpect(jsonPath("$[1].nome").value("Financeiro"))
                .andExpect(jsonPath("$[1].modulos[1]").value("matriculas"))
                .andExpect(jsonPath("$[1].modulosTexto").doesNotExist());
    }

    @Test
    void meuNivel() throws Exception {
        when(nivelAcessoService.doFuncionario(2)).thenReturn(new MeuAcesso("Financeiro", false, List.of("matriculas")));

        mockMvc.perform(get("/niveis-acesso/meu").requestAttr("usuarioId", 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nivel").value("Financeiro"))
                .andExpect(jsonPath("$.modulos[0]").value("matriculas"));
    }

    @Test
    void meuNivelSemLogin() throws Exception {
        mockMvc.perform(get("/niveis-acesso/meu"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void criaNivelRecebendoOsModulosEmLista() throws Exception {
        when(nivelAcessoService.salvar(any(NivelAcesso.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(post("/niveis-acesso")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"idNivel\": 7, \"nome\": \"Contabilidade\", \"modulos\": [\"matriculas\", \"inscricoes\"] }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Contabilidade"))
                .andExpect(jsonPath("$.modulos[0]").value("inscricoes"));

        ArgumentCaptor<NivelAcesso> captor = ArgumentCaptor.forClass(NivelAcesso.class);
        verify(nivelAcessoService).salvar(captor.capture());
        assertNull(captor.getValue().getIdNivel());
        assertEquals("inscricoes,matriculas", captor.getValue().getModulosTexto());
    }

    @Test
    void editaNivelPeloId() throws Exception {
        when(nivelAcessoService.salvar(any(NivelAcesso.class))).thenAnswer(invocation -> invocation.getArgument(0));

        mockMvc.perform(put("/niveis-acesso/3")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nome\": \"Financeiro\", \"modulos\": [\"matriculas\"] }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idNivel").value(3));
    }

    @Test
    void erroDeRegraVoltaComAMensagem() throws Exception {
        when(nivelAcessoService.salvar(any(NivelAcesso.class)))
                .thenThrow(new RegraDeNegocioException("O nível Master tem acesso a tudo e não pode ser alterado."));

        mockMvc.perform(put("/niveis-acesso/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nome\": \"Master\" }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensagem").value("O nível Master tem acesso a tudo e não pode ser alterado."));
    }

    @Test
    void excluiNivel() throws Exception {
        mockMvc.perform(delete("/niveis-acesso/4"))
                .andExpect(status().isNoContent());

        verify(nivelAcessoService).deletar(4);
    }
}
