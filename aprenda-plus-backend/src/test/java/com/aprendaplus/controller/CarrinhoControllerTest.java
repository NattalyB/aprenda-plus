package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.service.CarrinhoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Observação: nos testes a proteção da API (AuthInterceptor) fica desligada.
// O "usuarioId" que ela colocaria na requisição é simulado com .requestAttr(...)
@WebMvcTest(CarrinhoController.class)
class CarrinhoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CarrinhoService carrinhoService;

    @MockitoBean
    private CarrinhoRepository carrinhoRepository;

    @MockitoBean
    private AlunoRepository alunoRepository;

    private Carrinho carrinho(Integer idCarrinho) {
        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(idCarrinho);
        return carrinho;
    }

    // ===== Rota do aluno logado: /carrinhos/meu =====

    @Test
    void deveDevolverOCarrinhoExistenteDoAluno() throws Exception {
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.of(carrinho(3)));

        mockMvc.perform(get("/carrinhos/meu").requestAttr("usuarioId", 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCarrinho").value(3))
                .andExpect(jsonPath("$.idAluno").value(7));

        verify(carrinhoRepository, never()).save(any(Carrinho.class));
    }

    @Test
    void deveCriarCarrinhoQuandoAlunoAindaNaoTem() throws Exception {
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.empty());
        when(alunoRepository.getReferenceById(7)).thenReturn(new Aluno());
        when(carrinhoRepository.save(any(Carrinho.class))).thenReturn(carrinho(10));

        mockMvc.perform(get("/carrinhos/meu").requestAttr("usuarioId", 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCarrinho").value(10));

        verify(carrinhoRepository).save(any(Carrinho.class));
    }

    @Test
    void deveRecusarMeuCarrinhoSemLogin() throws Exception {
        mockMvc.perform(get("/carrinhos/meu"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erro").exists());
    }

    // ===== Rotas do admin =====

    @Test
    void deveRetornarListaDeCarrinhos() throws Exception {
        when(carrinhoService.listarTodos()).thenReturn(Arrays.asList(carrinho(1)));

        mockMvc.perform(get("/carrinhos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idCarrinho").value(1));
    }

    @Test
    void deveBuscarCarrinhoPorId() throws Exception {
        when(carrinhoService.buscarPorId(1)).thenReturn(carrinho(1));

        mockMvc.perform(get("/carrinhos/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCarrinho").value(1));
    }

    @Test
    void deveCriarCarrinhoComSucesso() throws Exception {
        when(carrinhoService.salvar(any(Carrinho.class))).thenReturn(carrinho(1));

        mockMvc.perform(post("/carrinhos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"aluno\": { \"idAluno\": 7 } }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idCarrinho").value(1));
    }

    @Test
    void deveExcluirCarrinho() throws Exception {
        mockMvc.perform(delete("/carrinhos/1"))
                .andExpect(status().isNoContent());

        verify(carrinhoService).deletar(1);
    }
}
