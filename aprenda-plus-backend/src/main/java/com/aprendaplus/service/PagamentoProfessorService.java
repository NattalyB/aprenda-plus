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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

// Pagamento dos professores por hora-aula: o financeiro define o valor da hora de cada professor,
// lança as horas do mês e gera o pagamento, que vira uma conta a pagar (categoria "Professores").
@Service
public class PagamentoProfessorService {

    public static final String CATEGORIA = "Professores";
    static final BigDecimal VALOR_HORA_MAXIMO = new BigDecimal("10000.00");
    static final BigDecimal HORAS_MAXIMAS = new BigDecimal("744"); // 31 dias x 24 h
    private static final Set<String> TURMAS_EM_AULA = Set.of("inscricoes_abertas", "inscricoes_encerradas", "em_andamento");
    private static final String[] MESES = {"janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
            "agosto", "setembro", "outubro", "novembro", "dezembro"};

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private ProfessorHoraAulaRepository horaAulaRepository;

    @Autowired
    private TurmaProfessorRepository turmaProfessorRepository;

    @Autowired
    private ContaPagarRepository contaPagarRepository;

    // referencia = "2026-10"
    @Transactional(readOnly = true)
    public List<FolhaDoProfessor> folha(String referencia) {
        YearMonth mes = lerReferencia(referencia);
        String ref = mes.toString();

        Map<Integer, BigDecimal> valores = new HashMap<>();
        horaAulaRepository.findAll().forEach(v -> valores.put(v.getProfessorId(), v.getValorHora()));

        Map<Integer, Set<String>> turmas = new HashMap<>();
        for (TurmaProfessor tp : turmaProfessorRepository.findAll()) {
            Turma turma = tp.getTurma();
            Professor professor = tp.getProfessor();
            if (turma == null || professor == null || !TURMAS_EM_AULA.contains(turma.getStatus())) {
                continue;
            }
            turmas.computeIfAbsent(professor.getIdProfessor(), k -> new TreeSet<>()).add(turma.getNome());
        }

        List<ContaPagar> contasDosProfessores = contaPagarRepository.findAll().stream()
                .filter(c -> c.getProfessorId() != null && c.getReferencia() != null)
                .filter(c -> !ContaPagar.CANCELADO.equals(c.getStatus()))
                .toList();

        return professorRepository.findAll().stream()
                .map(p -> linha(p, ref, valores, turmas, contasDosProfessores))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(FolhaDoProfessor::nome, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private FolhaDoProfessor linha(Professor p, String ref, Map<Integer, BigDecimal> valores,
                                   Map<Integer, Set<String>> turmas, List<ContaPagar> contas) {
        Integer id = p.getIdProfessor();
        ContaPagar doMes = contas.stream()
                .filter(c -> id.equals(c.getProfessorId()) && ref.equals(c.getReferencia()))
                .findFirst().orElse(null);
        // Professor inativo só aparece se já tem pagamento no mês
        if (!"ativo".equals(p.getStatus()) && doMes == null) {
            return null;
        }
        // Sugestão: as horas do último mês lançado antes deste
        BigDecimal sugeridas = contas.stream()
                .filter(c -> id.equals(c.getProfessorId()) && c.getReferencia().compareTo(ref) < 0 && c.getHoras() != null)
                .max(Comparator.comparing(ContaPagar::getReferencia))
                .map(ContaPagar::getHoras)
                .orElse(null);
        return new FolhaDoProfessor(
                id,
                p.getNomeCompleto(),
                p.getStatus(),
                valores.get(id),
                List.copyOf(turmas.getOrDefault(id, Set.of())),
                sugeridas,
                doMes == null ? null : doMes.getIdConta(),
                doMes == null ? null : doMes.getSituacao(),
                doMes == null ? null : doMes.getHoras(),
                doMes == null ? null : doMes.getValor());
    }

    // valor vazio ou zero: tira o valor da hora do professor
    @Transactional
    public BigDecimal definirValorHora(Integer idProfessor, BigDecimal valor) {
        professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
        if (valor == null || valor.signum() == 0) {
            if (horaAulaRepository.existsById(idProfessor)) {
                horaAulaRepository.deleteById(idProfessor);
            }
            return null;
        }
        if (valor.signum() < 0 || valor.compareTo(VALOR_HORA_MAXIMO) > 0) {
            throw new RegraDeNegocioException("Informe um valor de hora-aula entre R$ 0,01 e R$ 10.000,00.");
        }
        BigDecimal valorHora = valor.setScale(2, RoundingMode.HALF_UP);
        horaAulaRepository.save(new ProfessorHoraAula(idProfessor, valorHora));
        return valorHora;
    }

    // Gera o pagamento do mês: horas x valor da hora, vencendo no dia 5 do mês seguinte (ou na data escolhida)
    @Transactional
    public ContaPagar gerarPagamento(Integer idProfessor, String referencia, BigDecimal horas, LocalDate vencimento) {
        Professor professor = professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
        YearMonth mes = lerReferencia(referencia);
        String ref = mes.toString();
        if (horas == null || horas.signum() <= 0 || horas.compareTo(HORAS_MAXIMAS) > 0) {
            throw new RegraDeNegocioException("Informe as horas-aula do mês (entre 0 e 744).");
        }
        BigDecimal valorHora = horaAulaRepository.findById(idProfessor)
                .map(ProfessorHoraAula::getValorHora)
                .orElseThrow(() -> new RegraDeNegocioException(
                        "Defina o valor da hora-aula de " + professor.getNomeCompleto() + " antes de gerar o pagamento."));
        boolean jaTem = contaPagarRepository.findByProfessorIdOrderByReferenciaDesc(idProfessor).stream()
                .anyMatch(c -> ref.equals(c.getReferencia()) && !ContaPagar.CANCELADO.equals(c.getStatus()));
        if (jaTem) {
            throw new RegraDeNegocioException("O pagamento de " + nomeDoMes(mes) + " de " + professor.getNomeCompleto()
                    + " já foi gerado. Para refazer, exclua a conta em Contas a pagar.");
        }

        BigDecimal horasMes = horas.setScale(2, RoundingMode.HALF_UP);
        ContaPagar conta = new ContaPagar();
        conta.setDescricao("Hora-aula de " + nomeDoMes(mes) + " — " + professor.getNomeCompleto());
        conta.setCategoria(CATEGORIA);
        conta.setFornecedor(professor.getNomeCompleto());
        conta.setValor(horasMes.multiply(valorHora).setScale(2, RoundingMode.HALF_UP));
        conta.setDataVencimento(vencimento != null ? vencimento : mes.plusMonths(1).atDay(5));
        conta.setObservacao(horasMes.stripTrailingZeros().toPlainString().replace('.', ',') + " h × R$ "
                + valorHora.toPlainString().replace('.', ','));
        conta.setProfessorId(idProfessor);
        conta.setReferencia(ref);
        conta.setHoras(horasMes);
        conta.setValorHora(valorHora);
        return contaPagarRepository.save(conta);
    }

    static YearMonth lerReferencia(String referencia) {
        try {
            return YearMonth.parse(referencia == null ? "" : referencia.trim());
        } catch (DateTimeParseException e) {
            throw new RegraDeNegocioException("Informe o mês no formato AAAA-MM (ex.: 2026-10).");
        }
    }

    // "2026-10" -> "outubro/2026"
    static String nomeDoMes(YearMonth mes) {
        return MESES[mes.getMonthValue() - 1] + "/" + mes.getYear();
    }
}
