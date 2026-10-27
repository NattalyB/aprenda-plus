package com.aprendaplus.service;

import com.aprendaplus.dto.FolhaDoProfessor;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.entity.ProfessorHoraAula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.entity.TurmaProfessor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ContaPagarRepository;
import com.aprendaplus.repository.ProfessorHoraAulaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import com.aprendaplus.repository.TurmaProfessorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PagamentoProfessorServiceTest {

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private ProfessorHoraAulaRepository horaAulaRepository;

    @Mock
    private TurmaProfessorRepository turmaProfessorRepository;

    @Mock
    private ContaPagarRepository contaPagarRepository;

    @InjectMocks
    private PagamentoProfessorService service;

    private static Professor professor(int id, String nome, String status) {
        Professor p = new Professor();
        p.setIdProfessor(id);
        p.setNomeCompleto(nome);
        p.setStatus(status);
        return p;
    }

    private static TurmaProfessor vinculo(Professor p, String turma, String status) {
        Turma t = new Turma();
        t.setNome(turma);
        t.setStatus(status);
        TurmaProfessor tp = new TurmaProfessor();
        tp.setTurma(t);
        tp.setProfessor(p);
        return tp;
    }

    private static ContaPagar pagamento(int id, int professor, String referencia, String horas, String status) {
        ContaPagar c = new ContaPagar();
        c.setIdConta(id);
        c.setProfessorId(professor);
        c.setReferencia(referencia);
        c.setHoras(new BigDecimal(horas));
        c.setValor(new BigDecimal(horas).multiply(new BigDecimal("50")));
        c.setDataVencimento(LocalDate.of(2030, 1, 5));
        c.setStatus(status);
        return c;
    }

    @Test
    void montaAFolhaDoMes() {
        Professor ana = professor(1, "Ana Souza", "ativo");
        Professor bruno = professor(2, "bruno Lima", "ativo");
        Professor carla = professor(3, "Carla Dias", "inativo");
        Professor davi = professor(4, "Davi Rocha", "inativo");
        when(professorRepository.findAll()).thenReturn(List.of(carla, bruno, ana, davi));
        when(horaAulaRepository.findAll()).thenReturn(List.of(new ProfessorHoraAula(1, new BigDecimal("50.00"))));
        when(turmaProfessorRepository.findAll()).thenReturn(List.of(
                vinculo(ana, "ADS 2026/2", "em_andamento"),
                vinculo(ana, "Redes A", "inscricoes_abertas"),
                vinculo(ana, "Turma antiga", "encerrada")));
        when(contaPagarRepository.findAll()).thenReturn(List.of(
                pagamento(10, 1, "2026-08", "30", "pago"),
                pagamento(11, 1, "2026-09", "40", "pago"),
                pagamento(12, 2, "2026-10", "20", "pendente"),
                pagamento(13, 3, "2026-10", "8", "pago"),
                pagamento(14, 1, "2026-10", "99", "cancelado")));

        List<FolhaDoProfessor> folha = service.folha("2026-10");

        // Davi está inativo e não tem pagamento no mês: não aparece. Ordem por nome.
        assertEquals(List.of("Ana Souza", "bruno Lima", "Carla Dias"), folha.stream().map(FolhaDoProfessor::nome).toList());
        FolhaDoProfessor primeira = folha.get(0);
        assertEquals(new BigDecimal("50.00"), primeira.valorHora());
        assertEquals(List.of("ADS 2026/2", "Redes A"), primeira.turmas());
        assertEquals(new BigDecimal("40"), primeira.horasSugeridas());
        assertNull(primeira.idConta()); // a de outubro foi cancelada
        FolhaDoProfessor segunda = folha.get(1);
        assertEquals(12, segunda.idConta());
        assertEquals("pendente", segunda.situacaoConta());
        assertEquals(new BigDecimal("20"), segunda.horasLancadas());
        assertNull(segunda.valorHora());
        assertNull(segunda.horasSugeridas());
    }

    @Test
    void mesInvalido() {
        assertEquals("Informe o mês no formato AAAA-MM (ex.: 2026-10).", assertThrows(RegraDeNegocioException.class,
                () -> service.folha("10/2026")).getMessage());
        assertThrows(RegraDeNegocioException.class, () -> service.folha(null));
    }

    @Test
    void defineETiraOValorDaHora() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor(1, "Ana", "ativo")));
        when(horaAulaRepository.existsById(1)).thenReturn(true);

        assertEquals(new BigDecimal("55.50"), service.definirValorHora(1, new BigDecimal("55.5")));
        ArgumentCaptor<ProfessorHoraAula> salvo = ArgumentCaptor.forClass(ProfessorHoraAula.class);
        verify(horaAulaRepository).save(salvo.capture());
        assertEquals(1, salvo.getValue().getProfessorId());

        assertNull(service.definirValorHora(1, null));
        verify(horaAulaRepository).deleteById(1);

        assertEquals("Informe um valor de hora-aula entre R$ 0,01 e R$ 10.000,00.",
                assertThrows(RegraDeNegocioException.class, () -> service.definirValorHora(1, new BigDecimal("-3"))).getMessage());
    }

    @Test
    void valorDaHoraDeProfessorQueNaoExiste() {
        when(professorRepository.findById(9)).thenReturn(Optional.empty());
        assertEquals("Professor não encontrado.", assertThrows(RegraDeNegocioException.class,
                () -> service.definirValorHora(9, BigDecimal.TEN)).getMessage());
    }

    @Test
    void geraOPagamentoComoContaAPagar() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor(1, "Ana Souza", "ativo")));
        when(horaAulaRepository.findById(1)).thenReturn(Optional.of(new ProfessorHoraAula(1, new BigDecimal("50.00"))));
        when(contaPagarRepository.findByProfessorIdOrderByReferenciaDesc(1))
                .thenReturn(List.of(pagamento(14, 1, "2026-10", "10", "cancelado")));
        when(contaPagarRepository.save(any(ContaPagar.class))).thenAnswer(i -> i.getArgument(0));

        ContaPagar conta = service.gerarPagamento(1, "2026-10", new BigDecimal("37.5"), null);

        assertEquals("Hora-aula de outubro/2026 — Ana Souza", conta.getDescricao());
        assertEquals("Professores", conta.getCategoria());
        assertEquals(new BigDecimal("1875.00"), conta.getValor());
        assertEquals(LocalDate.of(2026, 11, 5), conta.getDataVencimento());
        assertEquals("37,5 h × R$ 50,00", conta.getObservacao());
        assertEquals("2026-10", conta.getReferencia());
        assertEquals(1, conta.getProfessorId());
    }

    @Test
    void pagamentoRecusado() {
        when(professorRepository.findById(1)).thenReturn(Optional.of(professor(1, "Ana Souza", "ativo")));
        when(professorRepository.findById(2)).thenReturn(Optional.of(professor(2, "Bruno", "ativo")));
        when(horaAulaRepository.findById(1)).thenReturn(Optional.of(new ProfessorHoraAula(1, new BigDecimal("50.00"))));
        when(horaAulaRepository.findById(2)).thenReturn(Optional.empty());
        when(contaPagarRepository.findByProfessorIdOrderByReferenciaDesc(1))
                .thenReturn(List.of(pagamento(11, 1, "2026-10", "40", "pendente")));

        assertEquals("Informe as horas-aula do mês (entre 0 e 744).", assertThrows(RegraDeNegocioException.class,
                () -> service.gerarPagamento(1, "2026-10", BigDecimal.ZERO, null)).getMessage());
        assertEquals("Defina o valor da hora-aula de Bruno antes de gerar o pagamento.", assertThrows(RegraDeNegocioException.class,
                () -> service.gerarPagamento(2, "2026-10", BigDecimal.TEN, null)).getMessage());
        assertEquals("O pagamento de outubro/2026 de Ana Souza já foi gerado. Para refazer, exclua a conta em Contas a pagar.",
                assertThrows(RegraDeNegocioException.class,
                        () -> service.gerarPagamento(1, "2026-10", BigDecimal.TEN, LocalDate.of(2026, 11, 10))).getMessage());
        verify(contaPagarRepository, never()).save(any());
    }

    @Test
    void nomeDoMes() {
        assertEquals("março/2027", PagamentoProfessorService.nomeDoMes(YearMonth.of(2027, 3)));
    }
}
