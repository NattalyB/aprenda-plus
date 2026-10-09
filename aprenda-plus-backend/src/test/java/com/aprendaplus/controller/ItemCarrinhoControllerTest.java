package com.aprendaplus.controller;

import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Carrinho;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.service.ItemCarrinhoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Observação: nos testes a proteção da API (AuthInterceptor) fica desligada.
// O id e o papel que ela colocaria na requisição são simulados com .requestAttr(...)
@WebMvcTest(ItemCarrinhoController.class)
class ItemCarrinhoControllerTest {

    private static final String NOVO_ITEM = """
            { "carrinho": { "idCarrinho": 1 }, "curso": { "idCurso": 2 } }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ItemCarrinhoService itemCarrinhoService;

    @MockitoBean
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @MockitoBean
    private CarrinhoRepository carrinhoRepository;

    // Carrinho de id 1 pertencente ao aluno de id 7
    private Carrinho carrinhoDoAluno7() {
        Aluno aluno = new Aluno();
        aluno.setIdAluno(7);

        Carrinho carrinho = new Carrinho();
        carrinho.setIdCarrinho(1);
        carrinho.setAluno(aluno);
        return carrinho;
    }

    private ItemCarrinho itemNoCarrinho(Carrinho carrinho) {
        Curso curso = new Curso();
        curso.setIdCurso(2);
        curso.setNome("Engenharia de Software");

        ItemCarrinho item = new ItemCarrinho();
        item.setIdItem(5);
        item.setCarrinho(carrinho);
        item.setCurso(curso);
        return item;
    }

    // ===== /itens-carrinho/meus =====

    @Test
    void deveListarSomenteOsItensDoAlunoLogado() throws Exception {
        Carrinho carrinho = carrinhoDoAluno7();
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.of(carrinho));
        when(itemCarrinhoRepository.findByCarrinho_IdCarrinho(1))
                .thenReturn(Arrays.asList(itemNoCarrinho(carrinho)));

        mockMvc.perform(get("/itens-carrinho/meus").requestAttr("usuarioId", 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].curso.nome").value("Engenharia de Software"));
    }

    @Test
    void deveDevolverListaVaziaQuandoAlunoNaoTemCarrinho() throws Exception {
        when(carrinhoRepository.findFirstByAluno_IdAluno(7)).thenReturn(Optional.empty());

        mockMvc.perform(get("/itens-carrinho/meus").requestAttr("usuarioId", 7))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void deveRecusarMeusItensSemLogin() throws Exception {
        mockMvc.perform(get("/itens-carrinho/meus"))
                .andExpect(status().isUnauthorized());
    }

    // ===== Adicionar item =====

    @Test
    void deveAdicionarItemNoProprioCarrinho() throws Exception {
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(carrinhoDoAluno7()));
        when(itemCarrinhoService.salvar(any(ItemCarrinho.class))).thenReturn(itemNoCarrinho(null));

        mockMvc.perform(post("/itens-carrinho")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(NOVO_ITEM)
                        .requestAttr("usuarioId", 7)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idItem").value(5));
    }

    @Test
    void naoDevePermitirAdicionarNoCarrinhoDeOutroAluno() throws Exception {
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(carrinhoDoAluno7()));

        mockMvc.perform(post("/itens-carrinho")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(NOVO_ITEM)
                        .requestAttr("usuarioId", 99)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isForbidden());

        verify(itemCarrinhoService, never()).salvar(any(ItemCarrinho.class));
    }

    @Test
    void adminPodeAdicionarEmQualquerCarrinho() throws Exception {
        when(itemCarrinhoService.salvar(any(ItemCarrinho.class))).thenReturn(itemNoCarrinho(null));

        mockMvc.perform(post("/itens-carrinho")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(NOVO_ITEM)
                        .requestAttr("usuarioId", 1)
                        .requestAttr("usuarioPapel", "ADMIN"))
                .andExpect(status().isOk());
    }

    // ===== Remover item =====

    @Test
    void deveRemoverItemDoProprioCarrinho() throws Exception {
        Carrinho carrinho = carrinhoDoAluno7();
        when(itemCarrinhoRepository.findById(5)).thenReturn(Optional.of(itemNoCarrinho(carrinho)));
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(carrinho));

        mockMvc.perform(delete("/itens-carrinho/5")
                        .requestAttr("usuarioId", 7)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isNoContent());

        verify(itemCarrinhoService).deletar(5);
    }

    @Test
    void naoDevePermitirRemoverItemDeOutroAluno() throws Exception {
        Carrinho carrinho = carrinhoDoAluno7();
        when(itemCarrinhoRepository.findById(5)).thenReturn(Optional.of(itemNoCarrinho(carrinho)));
        when(carrinhoRepository.findById(1)).thenReturn(Optional.of(carrinho));

        mockMvc.perform(delete("/itens-carrinho/5")
                        .requestAttr("usuarioId", 99)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isForbidden());

        verify(itemCarrinhoService, never()).deletar(anyInt());
    }

    @Test
    void deveResponder404AoRemoverItemInexistente() throws Exception {
        when(itemCarrinhoRepository.findById(5)).thenReturn(Optional.empty());

        mockMvc.perform(delete("/itens-carrinho/5")
                        .requestAttr("usuarioId", 7)
                        .requestAttr("usuarioPapel", "ALUNO"))
                .andExpect(status().isNotFound());
    }

    // ===== Rotas do admin =====

    @Test
    void deveRetornarListaDeItens() throws Exception {
        when(itemCarrinhoService.listarTodos()).thenReturn(Arrays.asList(itemNoCarrinho(null)));

        mockMvc.perform(get("/itens-carrinho"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idItem").value(5));
    }

    @Test
    void deveBuscarItemPorId() throws Exception {
        when(itemCarrinhoService.buscarPorId(5)).thenReturn(itemNoCarrinho(null));

        mockMvc.perform(get("/itens-carrinho/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idItem").value(5));
    }
}
