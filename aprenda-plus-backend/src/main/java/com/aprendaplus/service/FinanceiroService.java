package com.aprendaplus.service;

import com.aprendaplus.dto.AlertasFinanceiros;
import com.aprendaplus.dto.ParcelaFinanceira;
import com.aprendaplus.dto.ResumoFinanceiro;
import com.aprendaplus.dto.ResumoFinanceiro.ValorPorItem;
import com.aprendaplus.dto.ResumoFinanceiro.ValorPorMes;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Pagamento;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import com.aprendaplus.repository.PagamentoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Financeiro: parcelas das matrículas (tabela pagamento), baixa de pagamentos,
// indicadores do painel e as parcelas que o aluno vê na área dele.
// O pagamento é simulado: quem confirma é a secretaria/financeiro, no painel.
@Service
public class FinanceiroService {

    public static final String PENDENTE = "pendente";
    public static final String PAGO = "pago";
    public static final String ATRASADO = "atrasado";
    public static final String CANCELADO = "cancelado";

    // Datas sempre no horário de Brasília (o servidor no Render fica em UTC)
    static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");

    // A primeira parcela de boleto/cartão vence uma semana depois da confirmação
    static final int DIAS_ATE_PRIMEIRA_PARCELA = 7;

    private static final Set<String> EM_ABERTO = Set.of(PENDENTE, ATRASADO);
    private static final Pattern PARCELAS = Pattern.compile("(\\d{1,3})\\s*x");

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private MatriculaRepository matriculaRepository;

    @Autowired
    private InscricaoRepository inscricaoRepository;

    LocalDate hoje() {
        return LocalDate.now(ZONA);
    }

    // ===== Geração e cancelamento (chamados quando a inscrição muda de status) =====

    // Matrícula nova: gera as parcelas. Matrícula que volta a valer: reabre as canceladas.
    @Transactional
    public void prepararParcelas(Matricula matricula, BigDecimal valorTotal, String formaPagamento) {
        prepararParcelas(matricula, valorTotal, formaPagamento, hoje());
    }

    void prepararParcelas(Matricula matricula, BigDecimal valorTotal, String formaPagamento, LocalDate hoje) {
        if (matricula == null || matricula.getIdMatricula() == null) {
            return;
        }
        List<Pagamento> existentes =
                pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(matricula.getIdMatricula());
        if (existentes.isEmpty()) {
            gerarParcelas(matricula, valorTotal, formaPagamento, hoje);
            return;
        }
        List<Pagamento> reabertas = existentes.stream().filter(p -> CANCELADO.equals(p.getStatus())).toList();
        reabertas.forEach(p -> p.setStatus(p.getDataVencimento().isBefore(hoje) ? ATRASADO : PENDENTE));
        if (!reabertas.isEmpty()) {
            pagamentoRepository.saveAll(reabertas);
        }
    }

    // Pix: 1 parcela já paga. Cartão ou boleto em Nx: N parcelas mensais.
    // Os centavos que sobram da divisão entram na última parcela.
    List<Pagamento> gerarParcelas(Matricula matricula, BigDecimal valorTotal, String formaPagamento, LocalDate hoje) {
        if (valorTotal == null || valorTotal.signum() <= 0) {
            return List.of();
        }
        String forma = normalizar(formaPagamento);
        boolean pix = forma.startsWith("pix");
        int quantidade = pix ? 1 : Math.max(1, Math.min(lerParcelas(forma), 120));

        BigDecimal total = valorTotal.setScale(2, RoundingMode.HALF_UP);
        BigDecimal valorParcela = total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.DOWN);
        BigDecimal ultima = total.subtract(valorParcela.multiply(BigDecimal.valueOf(quantidade - 1L)));

        List<Pagamento> parcelas = new ArrayList<>();
        for (int numero = 1; numero <= quantidade; numero++) {
            Pagamento parcela = new Pagamento();
            parcela.setMatricula(matricula);
            parcela.setNumeroParcela(numero);
            parcela.setValorParcela(numero == quantidade ? ultima : valorParcela);
            parcela.setFormaPagamento(familia(formaPagamento));
            if (pix) {
                parcela.setDataVencimento(hoje);
                parcela.setDataPagamento(hoje);
                parcela.setStatus(PAGO);
            } else {
                parcela.setDataVencimento(hoje.plusDays(DIAS_ATE_PRIMEIRA_PARCELA).plusMonths(numero - 1L));
                parcela.setStatus(PENDENTE);
            }
            parcelas.add(parcela);
        }
        return pagamentoRepository.saveAll(parcelas);
    }

    // Matrícula cancelada: o que ainda não foi pago deixa de ser cobrado
    @Transactional
    public void cancelarParcelasEmAberto(Integer idMatricula) {
        if (idMatricula == null) {
            return;
        }
        List<Pagamento> abertas = pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(idMatricula)
                .stream()
                .filter(p -> EM_ABERTO.contains(p.getStatus()))
                .toList();
        abertas.forEach(p -> p.setStatus(CANCELADO));
        if (!abertas.isEmpty()) {
            pagamentoRepository.saveAll(abertas);
        }
    }

    // Para matrículas que já existiam antes do financeiro: gera as parcelas que faltam
    // a partir da inscrição confirmada (valor e forma de pagamento). Devolve quantas gerou.
    @Transactional
    public int gerarParcelasQueFaltam() {
        LocalDate hoje = hoje();
        int geradas = 0;
        for (Matricula matricula : matriculaRepository.findAll()) {
            if (!"ativa".equals(matricula.getStatus()) || matricula.getAluno() == null || matricula.getTurma() == null) {
                continue;
            }
            if (!pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(matricula.getIdMatricula()).isEmpty()) {
                continue;
            }
            Inscricao inscricao = inscricaoRepository.findFirstByAluno_IdAlunoAndTurma_IdTurmaAndStatusOrderByIdInscricaoDesc(
                    matricula.getAluno().getIdAluno(), matricula.getTurma().getIdTurma(), "confirmada").orElse(null);
            if (inscricao == null) {
                continue;
            }
            if (!gerarParcelas(matricula, inscricao.getValorTotal(), inscricao.getFormaPagamento(), hoje).isEmpty()) {
                geradas++;
            }
        }
        return geradas;
    }

    // ===== Baixa e estorno =====

    @Transactional
    public ParcelaFinanceira registrarPagamento(Integer idPagamento, LocalDate dataPagamento, String formaPagamento) {
        return registrarPagamento(idPagamento, dataPagamento, formaPagamento, hoje());
    }

    ParcelaFinanceira registrarPagamento(Integer idPagamento, LocalDate dataPagamento, String formaPagamento, LocalDate hoje) {
        Pagamento parcela = buscar(idPagamento);
        if (PAGO.equals(parcela.getStatus())) {
            throw new RegraDeNegocioException("Esta parcela já está paga.");
        }
        if (CANCELADO.equals(parcela.getStatus())) {
            throw new RegraDeNegocioException("Parcela cancelada não pode ser paga.");
        }
        LocalDate data = dataPagamento == null ? hoje : dataPagamento;
        if (data.isAfter(hoje)) {
            throw new RegraDeNegocioException("A data do pagamento não pode ser no futuro.");
        }
        parcela.setStatus(PAGO);
        parcela.setDataPagamento(data);
        if (formaPagamento != null && !formaPagamento.isBlank()) {
            parcela.setFormaPagamento(formaPagamento.trim());
        }
        Pagamento salva = pagamentoRepository.save(parcela);
        return paraParcela(salva, totalDaMatricula(salva));
    }

    // Desfaz uma baixa feita por engano
    @Transactional
    public ParcelaFinanceira estornar(Integer idPagamento) {
        return estornar(idPagamento, hoje());
    }

    ParcelaFinanceira estornar(Integer idPagamento, LocalDate hoje) {
        Pagamento parcela = buscar(idPagamento);
        if (!PAGO.equals(parcela.getStatus())) {
            throw new RegraDeNegocioException("Só dá para estornar uma parcela que está paga.");
        }
        parcela.setDataPagamento(null);
        parcela.setStatus(parcela.getDataVencimento().isBefore(hoje) ? ATRASADO : PENDENTE);
        Pagamento salva = pagamentoRepository.save(parcela);
        return paraParcela(salva, totalDaMatricula(salva));
    }

    // ===== Consultas =====

    @Transactional
    public List<ParcelaFinanceira> listarParcelas() {
        LocalDate hoje = hoje();
        atualizarAtrasadas(hoje);
        return paraParcelas(pagamentoRepository.findAll());
    }

    @Transactional
    public List<ParcelaFinanceira> parcelasDoAluno(Integer idAluno) {
        atualizarAtrasadas(hoje());
        return paraParcelas(pagamentoRepository.findByMatricula_Aluno_IdAlunoOrderByDataVencimentoAsc(idAluno));
    }

    @Transactional
    public AlertasFinanceiros alertas() {
        return alertas(hoje());
    }

    AlertasFinanceiros alertas(LocalDate hoje) {
        atualizarAtrasadas(hoje);
        List<Pagamento> todas = pagamentoRepository.findAll();
        LocalDate limite = hoje.plusDays(7);
        long vencendo = todas.stream()
                .filter(p -> PENDENTE.equals(p.getStatus()))
                .filter(p -> !p.getDataVencimento().isBefore(hoje) && !p.getDataVencimento().isAfter(limite))
                .count();
        long atrasadas = todas.stream().filter(p -> ATRASADO.equals(p.getStatus())).count();
        return new AlertasFinanceiros(vencendo, atrasadas);
    }

    @Transactional
    public ResumoFinanceiro resumo() {
        return resumo(hoje());
    }

    ResumoFinanceiro resumo(LocalDate hoje) {
        atualizarAtrasadas(hoje);
        List<Pagamento> validas = pagamentoRepository.findAll().stream()
                .filter(p -> !CANCELADO.equals(p.getStatus()))
                .toList();
        YearMonth mesAtual = YearMonth.from(hoje);

        BigDecimal previstoNoMes = somar(validas, p -> YearMonth.from(p.getDataVencimento()).equals(mesAtual));
        BigDecimal recebidoNoMes = somar(validas,
                p -> PAGO.equals(p.getStatus()) && p.getDataPagamento() != null
                        && YearMonth.from(p.getDataPagamento()).equals(mesAtual));
        BigDecimal emAtraso = somar(validas, p -> ATRASADO.equals(p.getStatus()));
        long parcelasAtrasadas = validas.stream().filter(p -> ATRASADO.equals(p.getStatus())).count();
        BigDecimal aReceber = somar(validas, p -> EM_ABERTO.contains(p.getStatus()));

        // Inadimplência: do que já venceu, quanto não foi pago
        BigDecimal jaVenceu = somar(validas, p -> p.getDataVencimento().isBefore(hoje));
        BigDecimal inadimplencia = jaVenceu.signum() == 0 ? BigDecimal.ZERO.setScale(1)
                : emAtraso.multiply(BigDecimal.valueOf(100)).divide(jaVenceu, 1, RoundingMode.HALF_UP);

        // Seis meses para trás e seis para frente
        List<ValorPorMes> porMes = new ArrayList<>();
        for (int i = -5; i <= 6; i++) {
            YearMonth mes = mesAtual.plusMonths(i);
            porMes.add(new ValorPorMes(
                    mes.toString(),
                    somar(validas, p -> YearMonth.from(p.getDataVencimento()).equals(mes)),
                    somar(validas, p -> PAGO.equals(p.getStatus()) && p.getDataPagamento() != null
                            && YearMonth.from(p.getDataPagamento()).equals(mes))));
        }

        return new ResumoFinanceiro(previstoNoMes, recebidoNoMes, emAtraso, parcelasAtrasadas, aReceber,
                inadimplencia, porMes, agrupar(validas, this::nomeDoCurso), agrupar(validas, p -> familia(p.getFormaPagamento())));
    }

    // Parcela pendente com vencimento já passado vira "atrasado"
    void atualizarAtrasadas(LocalDate hoje) {
        List<Pagamento> vencidas = pagamentoRepository.findByStatusAndDataVencimentoBefore(PENDENTE, hoje);
        vencidas.forEach(p -> p.setStatus(ATRASADO));
        if (!vencidas.isEmpty()) {
            pagamentoRepository.saveAll(vencidas);
        }
    }

    // ===== Auxiliares =====

    private Pagamento buscar(Integer idPagamento) {
        return pagamentoRepository.findById(idPagamento)
                .orElseThrow(() -> new RegraDeNegocioException("Parcela não encontrada."));
    }

    private int totalDaMatricula(Pagamento parcela) {
        Matricula matricula = parcela.getMatricula();
        if (matricula == null || matricula.getIdMatricula() == null) {
            return 1;
        }
        return Math.max(1, pagamentoRepository.findByMatricula_IdMatriculaOrderByNumeroParcelaAsc(matricula.getIdMatricula()).size());
    }

    private List<ParcelaFinanceira> paraParcelas(List<Pagamento> parcelas) {
        Map<Integer, Integer> totalPorMatricula = new HashMap<>();
        for (Pagamento p : parcelas) {
            Integer id = p.getMatricula() == null ? null : p.getMatricula().getIdMatricula();
            totalPorMatricula.merge(id, 1, Integer::sum);
        }
        return parcelas.stream()
                .sorted(Comparator.comparing(Pagamento::getDataVencimento)
                        .thenComparing(Pagamento::getNumeroParcela))
                .map(p -> paraParcela(p, totalPorMatricula.getOrDefault(
                        p.getMatricula() == null ? null : p.getMatricula().getIdMatricula(), 1)))
                .toList();
    }

    private ParcelaFinanceira paraParcela(Pagamento p, int total) {
        Matricula matricula = p.getMatricula();
        Aluno aluno = matricula == null ? null : matricula.getAluno();
        Turma turma = matricula == null ? null : matricula.getTurma();
        return new ParcelaFinanceira(
                p.getIdPagamento(),
                matricula == null ? null : matricula.getIdMatricula(),
                turma == null ? null : turma.getIdTurma(),
                aluno == null ? null : aluno.getNomeCompleto(),
                nomeDoCurso(p),
                turma == null ? null : turma.getNome(),
                p.getNumeroParcela(),
                total,
                p.getValorParcela(),
                p.getDataVencimento(),
                p.getDataPagamento(),
                p.getFormaPagamento(),
                p.getStatus());
    }

    private String nomeDoCurso(Pagamento p) {
        Matricula matricula = p.getMatricula();
        Turma turma = matricula == null ? null : matricula.getTurma();
        Curso curso = turma == null ? null : turma.getCurso();
        return curso == null || curso.getNome() == null ? "Sem curso" : curso.getNome();
    }

    private static BigDecimal somar(List<Pagamento> parcelas, java.util.function.Predicate<Pagamento> filtro) {
        return parcelas.stream()
                .filter(filtro)
                .map(Pagamento::getValorParcela)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    // Soma por nome (curso ou forma de pagamento), do maior para o menor
    private static List<ValorPorItem> agrupar(List<Pagamento> parcelas, Function<Pagamento, String> nome) {
        Map<String, BigDecimal> somas = new LinkedHashMap<>();
        for (Pagamento p : parcelas) {
            if (p.getValorParcela() != null) {
                somas.merge(nome.apply(p), p.getValorParcela(), BigDecimal::add);
            }
        }
        return somas.entrySet().stream()
                .map(e -> new ValorPorItem(e.getKey(), e.getValue().setScale(2, RoundingMode.HALF_UP)))
                .sorted(Comparator.comparing(ValorPorItem::valor).reversed().thenComparing(ValorPorItem::nome))
                .toList();
    }

    // "Cartão de crédito · 10x" -> "Cartão de crédito" (para agrupar e guardar na parcela)
    static String familia(String formaPagamento) {
        String forma = normalizar(formaPagamento);
        if (forma.startsWith("pix")) return "Pix";
        if (forma.startsWith("cartao")) return "Cartão de crédito";
        if (forma.startsWith("boleto")) return "Boleto bancário";
        return formaPagamento == null || formaPagamento.isBlank() ? "Outros" : formaPagamento.trim();
    }

    private static int lerParcelas(String forma) {
        Matcher m = PARCELAS.matcher(forma);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    private static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "").trim().toLowerCase();
    }
}
