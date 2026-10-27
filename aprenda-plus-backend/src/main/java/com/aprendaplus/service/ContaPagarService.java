package com.aprendaplus.service;

import com.aprendaplus.dto.FluxoDeCaixa;
import com.aprendaplus.entity.ContaPagar;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.ContaPagarRepository;
import com.aprendaplus.repository.PagamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

// Contas a pagar (despesas da escola) e o fluxo de caixa (entradas das parcelas x saídas das contas).
@Service
public class ContaPagarService {

    public static final List<String> CATEGORIAS = List.of(
            "Aluguel", "Professores", "Salários", "Energia", "Água", "Internet e telefone", "Marketing",
            "Impostos", "Material", "Manutenção", "Sistemas e softwares", "Outros");

    static final int MAXIMO_REPETICOES = 36;
    private static final BigDecimal VALOR_MAXIMO = new BigDecimal("9999999.99");
    private static final Set<String> STATUS_EDITAVEIS = Set.of(ContaPagar.PENDENTE, ContaPagar.CANCELADO);

    @Autowired
    private ContaPagarRepository contaPagarRepository;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private FinanceiroService financeiroService;

    LocalDate hoje() {
        return LocalDate.now(FinanceiroService.ZONA);
    }

    public List<ContaPagar> listar() {
        return contaPagarRepository.findAll().stream()
                .sorted(Comparator.comparing(ContaPagar::getDataVencimento,
                                Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(ContaPagar::getIdConta, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    // repetirMeses > 1: conta fixa (ex.: aluguel) — cria uma por mês, com "(1/12)", "(2/12)"...
    @Transactional
    public List<ContaPagar> criar(ContaPagar dados, Integer repetirMeses) {
        int vezes = repetirMeses == null ? 1 : repetirMeses;
        if (vezes < 1 || vezes > MAXIMO_REPETICOES) {
            throw new RegraDeNegocioException("A conta pode se repetir por no máximo " + MAXIMO_REPETICOES + " meses.");
        }
        conferir(dados);
        List<ContaPagar> novas = new ArrayList<>();
        for (int i = 0; i < vezes; i++) {
            ContaPagar conta = copiar(dados);
            conta.setDataVencimento(dados.getDataVencimento().plusMonths(i));
            if (vezes > 1) {
                conta.setDescricao(dados.getDescricao().trim() + " (" + (i + 1) + "/" + vezes + ")");
            }
            novas.add(conta);
        }
        return contaPagarRepository.saveAll(novas);
    }

    @Transactional
    public ContaPagar atualizar(Integer id, ContaPagar dados) {
        ContaPagar conta = buscar(id);
        if (ContaPagar.PAGO.equals(conta.getStatus())) {
            throw new RegraDeNegocioException("Esta conta já foi paga. Desfaça o pagamento antes de editar.");
        }
        conferir(dados);
        conta.setDescricao(dados.getDescricao().trim());
        conta.setCategoria(dados.getCategoria().trim());
        conta.setFornecedor(textoOuNulo(dados.getFornecedor()));
        conta.setValor(dados.getValor().setScale(2, RoundingMode.HALF_UP));
        conta.setDataVencimento(dados.getDataVencimento());
        conta.setObservacao(textoOuNulo(dados.getObservacao()));
        if (dados.getStatus() != null && STATUS_EDITAVEIS.contains(dados.getStatus())) {
            conta.setStatus(dados.getStatus());
        }
        return contaPagarRepository.save(conta);
    }

    @Transactional
    public void excluir(Integer id) {
        ContaPagar conta = buscar(id);
        if (ContaPagar.PAGO.equals(conta.getStatus())) {
            throw new RegraDeNegocioException("Esta conta já foi paga. Desfaça o pagamento antes de excluir.");
        }
        contaPagarRepository.delete(conta);
    }

    @Transactional
    public ContaPagar pagar(Integer id, LocalDate dataPagamento, String formaPagamento) {
        return pagar(id, dataPagamento, formaPagamento, hoje());
    }

    ContaPagar pagar(Integer id, LocalDate dataPagamento, String formaPagamento, LocalDate hoje) {
        ContaPagar conta = buscar(id);
        if (ContaPagar.PAGO.equals(conta.getStatus())) {
            throw new RegraDeNegocioException("Esta conta já está paga.");
        }
        if (ContaPagar.CANCELADO.equals(conta.getStatus())) {
            throw new RegraDeNegocioException("Conta cancelada não pode ser paga.");
        }
        LocalDate data = dataPagamento == null ? hoje : dataPagamento;
        if (data.isAfter(hoje)) {
            throw new RegraDeNegocioException("A data do pagamento não pode ser no futuro.");
        }
        conta.setStatus(ContaPagar.PAGO);
        conta.setDataPagamento(data);
        conta.setFormaPagamento(textoOuNulo(formaPagamento));
        return contaPagarRepository.save(conta);
    }

    @Transactional
    public ContaPagar estornar(Integer id) {
        ContaPagar conta = buscar(id);
        if (!ContaPagar.PAGO.equals(conta.getStatus())) {
            throw new RegraDeNegocioException("Só dá para desfazer o pagamento de uma conta paga.");
        }
        conta.setStatus(ContaPagar.PENDENTE);
        conta.setDataPagamento(null);
        conta.setFormaPagamento(null);
        return contaPagarRepository.save(conta);
    }

    @Transactional
    public FluxoDeCaixa fluxo() {
        LocalDate hoje = hoje();
        financeiroService.atualizarAtrasadas(hoje); // Pix/cartão que caiu e boleto que atrasou
        return CalculoFluxoDeCaixa.montar(pagamentoRepository.findAll(), contaPagarRepository.findAll(), hoje);
    }

    // ===== Auxiliares =====

    ContaPagar buscar(Integer id) {
        return contaPagarRepository.findById(id)
                .orElseThrow(() -> new RegraDeNegocioException("Conta não encontrada."));
    }

    private static void conferir(ContaPagar dados) {
        if (dados == null || dados.getDescricao() == null || dados.getDescricao().isBlank()) {
            throw new RegraDeNegocioException("Informe a descrição da conta.");
        }
        if (dados.getDescricao().trim().length() > 140) {
            throw new RegraDeNegocioException("A descrição pode ter no máximo 140 caracteres.");
        }
        if (dados.getCategoria() == null || dados.getCategoria().isBlank()) {
            throw new RegraDeNegocioException("Escolha a categoria da conta.");
        }
        if (dados.getValor() == null || dados.getValor().signum() <= 0 || dados.getValor().compareTo(VALOR_MAXIMO) > 0) {
            throw new RegraDeNegocioException("Informe um valor maior que zero.");
        }
        if (dados.getDataVencimento() == null) {
            throw new RegraDeNegocioException("Informe a data de vencimento.");
        }
    }

    private static ContaPagar copiar(ContaPagar dados) {
        ContaPagar conta = new ContaPagar();
        conta.setDescricao(dados.getDescricao().trim());
        conta.setCategoria(dados.getCategoria().trim());
        conta.setFornecedor(textoOuNulo(dados.getFornecedor()));
        conta.setValor(dados.getValor().setScale(2, RoundingMode.HALF_UP));
        conta.setObservacao(textoOuNulo(dados.getObservacao()));
        conta.setStatus(ContaPagar.PENDENTE);
        conta.setProfessorId(dados.getProfessorId());
        conta.setReferencia(dados.getReferencia());
        conta.setHoras(dados.getHoras());
        conta.setValorHora(dados.getValorHora());
        return conta;
    }

    static String textoOuNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
