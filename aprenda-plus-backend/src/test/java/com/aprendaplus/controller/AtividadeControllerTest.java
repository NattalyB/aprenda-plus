package com.aprendaplus.controller;

import com.aprendaplus.dto.PaginaAtividades;
import com.aprendaplus.dto.UltimaAlteracao;
import com.aprendaplus.entity.RegistroAtividade;
import com.aprendaplus.service.AtividadeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AtividadeController.class)
class AtividadeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AtividadeService atividadeService;

    @Test
    void buscaComFiltros() throws Exception {
        RegistroAtividade r = new RegistroAtividade();
        r.setUsuarioNome("Carla");
        r.setDescricao("Alterou aluno #12");
        when(atividadeService.buscar("Alunos", "funcionario", "alterou", "carla",
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 27), 2, 50))
                .thenReturn(new PaginaAtividades(List.of(r), 51, 2, 50, 2));

        mockMvc.perform(get("/atividades").param("modulo", "Alunos").param("tipo", "funcionario")
                        .param("acao", "alterou").param("busca", "carla")
                        .param("de", "2026-10-01").param("ate", "2026-10-27")
                        .param("pagina", "2").param("tamanho", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itens[0].usuarioNome").value("Carla"))
                .andExpect(jsonPath("$.total").value(51))
                .andExpect(jsonPath("$.totalPaginas").value(2));
    }

    @Test
    void buscaSemFiltrosUsaAPrimeiraPagina() throws Exception {
        when(atividadeService.buscar(null, null, null, null, null, null, 1, 20))
                .thenReturn(new PaginaAtividades(List.of(), 0, 1, 20, 1));

        mockMvc.perform(get("/atividades")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void ultimaAlteracaoDeUmRegistro() throws Exception {
        when(atividadeService.ultima("alunos", 12)).thenReturn(new UltimaAlteracao(
                "Ana", LocalDateTime.of(2026, 10, 20, 9, 0), "Carla", LocalDateTime.of(2026, 10, 27, 18, 45), "Alterou aluno #12"));

        mockMvc.perform(get("/atividades/ultima").param("alvo", "alunos").param("id", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criadoPor").value("Ana"))
                .andExpect(jsonPath("$.alteradoPor").value("Carla"));
    }
}
