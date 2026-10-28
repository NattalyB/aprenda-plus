package com.aprendaplus.controller;

import com.aprendaplus.dto.ContatoForm;
import com.aprendaplus.dto.LeadComercial;
import com.aprendaplus.dto.PainelComercial;
import com.aprendaplus.entity.ContatoComercial;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.service.ComercialService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ComercialController.class)
class ComercialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ComercialService comercialService;

    @Test
    void painelDoPeriodoPedido() throws Exception {
        PainelComercial painel = new PainelComercial(LocalDate.of(2026, 10, 22), LocalDate.of(2026, 10, 28), 7,
                new PainelComercial.Indicadores(12, 3, 2, 1, 9, 2, 8.3),
                List.of(new PainelComercial.EtapaFunil("visitaram", "Visitaram o site", 12)),
                List.of(), List.of(new PainelComercial.TermoBuscado("python", 4, 3, 0, true)), List.of());
        when(comercialService.painel(7)).thenReturn(painel);

        mockMvc.perform(get("/comercial/painel").param("dias", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dias").value(7))
                .andExpect(jsonPath("$.indicadores.visitantes").value(12))
                .andExpect(jsonPath("$.funil[0].chave").value("visitaram"))
                .andExpect(jsonPath("$.buscas[0].semResultado").value(true));
    }

    @Test
    void painelSemPeriodoUsaOPadraoDoService() throws Exception {
        when(comercialService.painel(null)).thenReturn(new PainelComercial(LocalDate.of(2026, 9, 29),
                LocalDate.of(2026, 10, 28), 30, new PainelComercial.Indicadores(0, 0, 0, 0, 0, 0, 0),
                List.of(), List.of(), List.of(), List.of()));

        mockMvc.perform(get("/comercial/painel")).andExpect(status().isOk()).andExpect(jsonPath("$.dias").value(30));
    }

    @Test
    void listaOsLeads() throws Exception {
        LeadComercial lead = new LeadComercial(11, "Bruno", "bruno@teste.com", "51999990000", true, false,
                "carrinho", List.of("Ciência de Dados"), new BigDecimal("800.00"),
                LocalDateTime.of(2026, 10, 26, 10, 0), 2, null, 0);
        when(comercialService.leads()).thenReturn(List.of(lead));

        mockMvc.perform(get("/comercial/leads"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].nome").value("Bruno"))
                .andExpect(jsonPath("$[0].etapa").value("carrinho"))
                .andExpect(jsonPath("$[0].cursos[0]").value("Ciência de Dados"))
                .andExpect(jsonPath("$[0].aceitaMarketing").value(true));
    }

    @Test
    void registraEListaContatos() throws Exception {
        ContatoComercial contato = new ContatoComercial();
        contato.setIdContato(5);
        contato.setAlunoId(11);
        contato.setCanal("whatsapp");
        contato.setResultado("interessado");
        contato.setFuncionarioNome("Carla");
        when(comercialService.registrarContato(eq(new ContatoForm(11, "whatsapp", "interessado", "Ok")), eq(4)))
                .thenReturn(contato);
        when(comercialService.contatosDoAluno(11)).thenReturn(List.of(contato));

        mockMvc.perform(post("/comercial/contatos").requestAttr("usuarioId", 4)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idAluno\":11,\"canal\":\"whatsapp\",\"resultado\":\"interessado\",\"observacao\":\"Ok\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idContato").value(5));

        mockMvc.perform(get("/comercial/contatos").param("aluno", "11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].funcionarioNome").value("Carla"));
    }

    @Test
    void contatoInvalidoVolta400ComAMensagem() throws Exception {
        when(comercialService.registrarContato(any(), any()))
                .thenThrow(new RegraDeNegocioException("Escolha como foi o contato."));

        mockMvc.perform(post("/comercial/contatos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idAluno\":11,\"canal\":\"email\",\"resultado\":\"talvez\"}"))
                .andExpect(status().isBadRequest());
    }
}
