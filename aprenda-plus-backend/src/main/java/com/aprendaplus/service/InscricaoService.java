package com.aprendaplus.service;

import com.aprendaplus.dto.MinhaInscricao;
import com.aprendaplus.dto.PartePagamento;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.InscricaoPagamento;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.CarrinhoRepository;
import com.aprendaplus.repository.InscricaoPagamentoRepository;
import com.aprendaplus.repository.InscricaoRepository;
import com.aprendaplus.repository.ItemCarrinhoRepository;
import com.aprendaplus.repository.MatriculaRepository;
import com.aprendaplus.repository.TurmaRepository;
import com.aprendaplus.security.StatusConta;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class InscricaoService {

    // Mesmo desconto usado no front (precoCurso.js): 5% no Pix
    public static final BigDecimal DESCONTO_PIX = new BigDecimal("0.05");

    // Situações em que o aluno ainda pode trocar de turma
    private static final Set<String> STATUS_QUE_PERMITEM_TROCA =
            Set.of("pendente_pagamento", "confirmada", "aguardando_vaga");

    public static final String PENDENTE = "pendente_pagamento";
    public static final String CONFIRMADA = "confirmada";
    public static final String AGUARDANDO_VAGA = "aguardando_vaga";
    public static final String CANCELADA = "cancelada";
    public static final String CONCLUIDA = "concluida";

    // Pagamento dividido: em quantas formas o aluno pode dividir o pedido (ex.: dois cartões)
    public static final int FORMAS_NO_PAGAMENTO_DIVIDIDO = 2;

    // Encontra o número de parcelas em textos como "Cartão de crédito · 10x"
    private static final Pattern PARCELAS = Pattern.compile("(\\d{1,3})\\s*x");

    @Autowired
    private InscricaoRepository inscricaoRepository;

    @Autowired
    private TurmaRepository turmaRepository;

    @Autowired
    private AlunoRepository alunoRepository;

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    @Autowired
    private ItemCarrinhoRepository itemCarrinhoRepository;

    @Autowired
    private TurmaService turmaService;

    @Autowired
    private MatriculaRepository matriculaRepository;

    @Autowired
    private FinanceiroService financeiroService;

    @Autowired
    private DocumentoService documentoService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private InscricaoPagamentoRepository inscricaoPagamentoRepository;

    public List<Inscricao> listarTodos() {
        return inscricaoRepository.findAll();
    }

    public Inscricao buscarPorId(Integer id) {
        return inscricaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inscrição não encontrada com id: " + id));
    }

    // Usado pelo admin no painel: salva exatamente o que foi enviado
    public Inscricao salvar(Inscricao inscricao) {
        return inscricaoRepository.save(inscricao);
    }

    // Usado quando o ALUNO finaliza a compra no site.
    // Do que vem do navegador, só aproveitamos a turma, a forma de pagamento e as observações.
    // Aluno, status e principalmente o VALOR são definidos aqui no servidor,
    // a partir do preço do curso salvo no banco. Assim ninguém consegue
    // alterar o valor pelo navegador e pagar menos.
    @Transactional
    public Inscricao criarInscricaoDoAluno(Inscricao dados, Integer idAluno) {
        // Aluno inativo ou bloqueado não pode comprar, mesmo que ainda esteja logado
        alunoRepository.findById(idAluno).ifPresent(aluno -> {
            String bloqueio = StatusConta.motivoDoBloqueio(aluno.getStatus());
            if (bloqueio != null) {
                throw new RegraDeNegocioException(bloqueio);
            }
        });

        if (dados.getTurma() == null || dados.getTurma().getIdTurma() == null) {
            throw new RegraDeNegocioException("Informe a turma da inscrição.");
        }

        Turma turma = turmaRepository.findById(dados.getTurma().getIdTurma())
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));

        Curso curso = turma.getCurso();
        if (curso == null || curso.getValor() == null) {
            throw new RegraDeNegocioException("Não foi possível identificar o valor do curso desta turma.");
        }

        conferirSeInscricoesEstaoAbertas(turma);

        // Não deixa o aluno se inscrever duas vezes no mesmo curso
        boolean jaInscrito = inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(idAluno).stream()
                .filter(existente -> !"cancelada".equals(existente.getStatus()))
                .anyMatch(existente -> existente.getTurma() != null
                        && existente.getTurma().getCurso() != null
                        && curso.getIdCurso() != null
                        && curso.getIdCurso().equals(existente.getTurma().getCurso().getIdCurso()));
        if (jaInscrito) {
            throw new RegraDeNegocioException("Você já tem uma inscrição no curso \"" + curso.getNome()
                    + "\". Para mudar de turma, use \"Minhas inscrições\".");
        }

        // Quem compra vários cursos juntos pode parcelar até o MAIOR limite entre eles
        int maximoDoPedido = Math.max(maximoDeParcelas(curso), maximoDoCarrinho(idAluno));
        // Pagamento dividido (ex.: dois cartões): cada parte é conferida e o curso paga a sua fatia de cada uma
        boolean dividido = dados.getPagamentoDividido() != null && !dados.getPagamentoDividido().isEmpty();
        Pagamento pagamento = dividido
                ? calcularPagamentoDividido(curso, dados.getPagamentoDividido(), maximoDoPedido,
                        totalDoPedido(idAluno, curso))
                : calcularPagamento(curso, dados.getFormaPagamento(), maximoDoPedido);

        Aluno aluno = new Aluno();
        aluno.setIdAluno(idAluno);

        // A inscrição aponta para a turma só pelo id (o JPA faz o vínculo no banco)
        Turma turmaDaInscricao = new Turma();
        turmaDaInscricao.setIdTurma(turma.getIdTurma());

        Inscricao inscricao = new Inscricao();
        inscricao.setAluno(aluno);
        inscricao.setTurma(turmaDaInscricao);
        // Turma cheia: a inscrição entra na LISTA DE ESPERA (não ocupa vaga e não é cobrada ainda).
        // Quando abrir uma vaga, ela passa para "pendente de pagamento".
        boolean temVaga = turmaService.vagasRestantes(turma) > 0;
        inscricao.setStatus(temVaga ? PENDENTE : AGUARDANDO_VAGA);
        inscricao.setFormaPagamento(pagamento.descricao());
        inscricao.setValorTotal(pagamento.valor());
        inscricao.setObservacoes(dados.getObservacoes());

        Inscricao salva = inscricaoRepository.save(inscricao);
        if (!pagamento.partes().isEmpty()) {
            pagamento.partes().forEach(parte -> parte.setInscricaoId(salva.getIdInscricao()));
            inscricaoPagamentoRepository.saveAll(pagamento.partes());
        }
        return salva;
    }

    // Ao excluir uma inscrição que ocupava vaga, o primeiro da lista de espera sobe
    @Transactional
    public void deletar(Integer id) {
        Inscricao existente = inscricaoRepository.findById(id).orElse(null);
        inscricaoRepository.deleteById(id);
        if (existente != null && ocupaVaga(existente.getStatus()) && existente.getTurma() != null) {
            promoverPrimeiroDaFila(existente.getTurma().getIdTurma());
        }
    }

    // ===== Painel do admin =====

    // Atualização feita pelo admin (mudança de status no painel ou edição completa).
    // Além de salvar, mantém a MATRÍCULA em dia:
    // - inscrição confirmada (pagamento aprovado) -> cria a matrícula "ativa" do aluno na turma;
    // - inscrição cancelada -> cancela a matrícula e chama o primeiro da lista de espera;
    // - inscrição concluída -> conclui a matrícula.
    // E não deixa tirar alguém da lista de espera se a turma não tiver vaga.
    @Transactional
    public Inscricao atualizarPeloAdmin(Integer id, Inscricao dados) {
        Inscricao existente = inscricaoRepository.findById(id)
                .orElseThrow(() -> new RegraDeNegocioException("Inscrição não encontrada."));

        String statusAnterior = existente.getStatus();
        Integer turmaAnterior = existente.getTurma() == null ? null : existente.getTurma().getIdTurma();
        Integer idAluno = existente.getAluno() == null ? null : existente.getAluno().getIdAluno();

        dados.setIdInscricao(id);
        if (dados.getStatus() == null || dados.getStatus().isBlank()) {
            dados.setStatus(statusAnterior);
        }
        if (dados.getAluno() == null || dados.getAluno().getIdAluno() == null) {
            dados.setAluno(existente.getAluno());
        } else {
            idAluno = dados.getAluno().getIdAluno();
        }
        if (dados.getTurma() == null || dados.getTurma().getIdTurma() == null) {
            dados.setTurma(existente.getTurma());
        }

        String novoStatus = dados.getStatus();
        Integer novaTurma = dados.getTurma() == null ? null : dados.getTurma().getIdTurma();
        boolean mudouDeTurma = !Objects.equals(turmaAnterior, novaTurma);

        // Passou a ocupar uma vaga (saiu da lista de espera/cancelada ou foi para outra turma)?
        boolean passaAOcuparVaga = ocupaVaga(novoStatus) && (!ocupaVaga(statusAnterior) || mudouDeTurma);
        if (passaAOcuparVaga && novaTurma != null) {
            Turma turma = turmaRepository.findById(novaTurma)
                    .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));
            if (turmaService.vagasRestantes(turma) <= 0) {
                throw new RegraDeNegocioException("A turma \"" + turma.getNome()
                        + "\" não tem vaga. A inscrição continua aguardando vaga.");
            }
        }

        // Pré-requisito: a secretaria precisa aprovar o certificado de conclusão antes de confirmar
        boolean confirmandoAgora = CONFIRMADA.equals(novoStatus) && !CONFIRMADA.equals(statusAnterior);
        if (confirmandoAgora && idAluno != null && !documentoService.temDocumentoAprovado(idAluno)) {
            throw new RegraDeNegocioException("Antes de confirmar o pagamento, aprove o documento de escolaridade "
                    + "do aluno (certificado de conclusão). Use o botão \"Documento\" na lista de inscrições.");
        }

        Inscricao salva = inscricaoRepository.save(dados);

        sincronizarMatricula(idAluno, turmaAnterior, novaTurma, novoStatus, salva);

        if (confirmandoAgora && idAluno != null) {
            avisarMatriculaConfirmada(idAluno, novaTurma);
        }

        // Liberou a vaga na turma antiga? Chama o primeiro da fila de lá
        boolean liberouVaga = ocupaVaga(statusAnterior) && (!ocupaVaga(novoStatus) || mudouDeTurma);
        if (liberouVaga && turmaAnterior != null) {
            promoverPrimeiroDaFila(turmaAnterior);
        }
        return salva;
    }

    // Cria, move, cancela ou conclui a matrícula conforme o status da inscrição.
    // Também cuida das parcelas: gera ao confirmar e cancela as em aberto ao cancelar.
    private void sincronizarMatricula(Integer idAluno, Integer turmaAnterior, Integer novaTurma,
                                      String status, Inscricao inscricao) {
        String formaPagamento = inscricao == null ? null : inscricao.getFormaPagamento();
        if (idAluno == null || novaTurma == null) {
            return;
        }

        Matricula matricula = matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, novaTurma)
                .orElse(null);
        // Trocou de turma: a matrícula da turma antiga acompanha a inscrição
        if (matricula == null && turmaAnterior != null && !turmaAnterior.equals(novaTurma)) {
            matricula = matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(idAluno, turmaAnterior)
                    .orElse(null);
            if (matricula != null) {
                Turma turma = new Turma();
                turma.setIdTurma(novaTurma);
                matricula.setTurma(turma);
                if (!CONFIRMADA.equals(status)) {
                    matriculaRepository.save(matricula);
                }
            }
        }

        if (CONFIRMADA.equals(status)) {
            if (matricula == null) {
                Aluno aluno = new Aluno();
                aluno.setIdAluno(idAluno);
                Turma turma = new Turma();
                turma.setIdTurma(novaTurma);

                matricula = new Matricula();
                matricula.setAluno(aluno);
                matricula.setTurma(turma);
                matricula.setPlanoPagamento(formaPagamento);
            }
            matricula.setStatus("ativa");
            matriculaRepository.save(matricula);
            financeiroService.prepararParcelas(matricula, inscricao);
        } else if (CANCELADA.equals(status) && matricula != null) {
            matricula.setStatus("cancelada");
            matriculaRepository.save(matricula);
            financeiroService.cancelarParcelasEmAberto(matricula.getIdMatricula());
        } else if (CONCLUIDA.equals(status) && matricula != null) {
            matricula.setStatus("concluida");
            matriculaRepository.save(matricula);
        }
    }

    // Abriu uma vaga: a inscrição mais antiga da lista de espera passa a "pendente de pagamento"
    private void promoverPrimeiroDaFila(Integer idTurma) {
        Turma turma = turmaRepository.findById(idTurma).orElse(null);
        if (turma == null || turmaService.vagasRestantes(turma) <= 0) {
            return;
        }
        inscricaoRepository.findFirstByTurma_IdTurmaAndStatusOrderByIdInscricaoAsc(idTurma, AGUARDANDO_VAGA)
                .ifPresent(primeira -> {
                    primeira.setStatus(PENDENTE);
                    inscricaoRepository.save(primeira);
                    Aluno aluno = primeira.getAluno();
                    if (aluno != null) {
                        emailService.vagaLiberada(aluno.getEmail(), aluno.getNomeCompleto(),
                                turma.getCurso() == null ? null : turma.getCurso().getNome(), turma.getNome());
                    }
                });
    }

    // E-mail "matrícula confirmada" (sai só depois que tudo for gravado)
    private void avisarMatriculaConfirmada(Integer idAluno, Integer idTurma) {
        Aluno aluno = alunoRepository.findById(idAluno).orElse(null);
        if (aluno == null) {
            return;
        }
        Turma turma = idTurma == null ? null : turmaRepository.findById(idTurma).orElse(null);
        String curso = turma == null || turma.getCurso() == null ? "AprendaPlus" : turma.getCurso().getNome();
        emailService.matriculaConfirmada(aluno.getEmail(), aluno.getNomeCompleto(), curso,
                turma == null ? null : turma.getNome());
    }

    // Canceladas e quem está na lista de espera não ocupam vaga
    private boolean ocupaVaga(String status) {
        return status != null && !TurmaService.STATUS_SEM_VAGA.contains(status);
    }

    // ===== Área do aluno =====

    @Transactional(readOnly = true)
    public List<MinhaInscricao> listarDoAluno(Integer idAluno) {
        return inscricaoRepository.findByAluno_IdAlunoOrderByIdInscricaoDesc(idAluno).stream()
                .map(this::paraMinhaInscricao)
                .toList();
    }

    // Troca a turma de uma inscrição por outra turma aberta, com vaga, do mesmo curso.
    // idAluno = null quando quem troca é o admin (pode trocar a de qualquer aluno).
    @Transactional
    public MinhaInscricao trocarTurma(Integer idInscricao, Integer idNovaTurma, Integer idAluno) {
        Inscricao inscricao = inscricaoRepository.findById(idInscricao)
                .orElseThrow(() -> new RegraDeNegocioException("Inscrição não encontrada."));

        if (idAluno != null && (inscricao.getAluno() == null || !idAluno.equals(inscricao.getAluno().getIdAluno()))) {
            // Não conta ao aluno que a inscrição de outra pessoa existe
            throw new RegraDeNegocioException("Inscrição não encontrada.");
        }
        if (!STATUS_QUE_PERMITEM_TROCA.contains(inscricao.getStatus())) {
            throw new RegraDeNegocioException("Esta inscrição não permite mais troca de turma.");
        }
        if (idNovaTurma == null) {
            throw new RegraDeNegocioException("Escolha a nova turma.");
        }

        Turma atual = inscricao.getTurma();
        if (atual != null && idNovaTurma.equals(atual.getIdTurma())) {
            throw new RegraDeNegocioException("Você já está nesta turma.");
        }

        Turma nova = turmaRepository.findById(idNovaTurma)
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));

        Integer cursoAtual = atual == null || atual.getCurso() == null ? null : atual.getCurso().getIdCurso();
        Integer cursoNovo = nova.getCurso() == null ? null : nova.getCurso().getIdCurso();
        if (cursoAtual == null || !cursoAtual.equals(cursoNovo)) {
            throw new RegraDeNegocioException("A nova turma precisa ser do mesmo curso da inscrição.");
        }

        conferirSeInscricoesEstaoAbertas(nova);
        if (turmaService.vagasRestantes(nova) <= 0) {
            throw new RegraDeNegocioException("A turma \"" + nova.getNome() + "\" não tem mais vagas.");
        }

        String statusAnterior = inscricao.getStatus();
        Integer dono = inscricao.getAluno() == null ? null : inscricao.getAluno().getIdAluno();

        inscricao.setTurma(nova);
        // Quem estava na lista de espera e achou vaga em outra turma sai da fila
        if (AGUARDANDO_VAGA.equals(statusAnterior)) {
            inscricao.setStatus(PENDENTE);
        }
        Inscricao salva = inscricaoRepository.save(inscricao);

        // Se já tinha matrícula, ela vai junto para a nova turma
        if (dono != null && atual != null) {
            matriculaRepository.findFirstByAluno_IdAlunoAndTurma_IdTurma(dono, atual.getIdTurma())
                    .ifPresent(matricula -> {
                        matricula.setTurma(nova);
                        matriculaRepository.save(matricula);
                    });
        }

        // A vaga que ele ocupava na turma antiga fica para o primeiro da fila
        if (ocupaVaga(statusAnterior) && atual != null) {
            promoverPrimeiroDaFila(atual.getIdTurma());
        }
        return paraMinhaInscricao(salva);
    }

    // Só aceita inscrição em turma com status "inscrições abertas"
    // (turma ainda planejada, em andamento ou encerrada não recebe inscrições)
    private void conferirSeInscricoesEstaoAbertas(Turma turma) {
        if (!TurmaService.INSCRICOES_ABERTAS.equals(turma.getStatus())) {
            throw new RegraDeNegocioException("As inscrições da turma \"" + turma.getNome() + "\" não estão abertas.");
        }
    }

    private MinhaInscricao paraMinhaInscricao(Inscricao inscricao) {
        Turma turma = inscricao.getTurma();
        Curso curso = turma == null ? null : turma.getCurso();
        return new MinhaInscricao(
                inscricao.getIdInscricao(),
                curso == null ? null : curso.getIdCurso(),
                curso == null ? null : curso.getNome(),
                turma == null ? null : turma.getIdTurma(),
                turma == null ? null : turma.getNome(),
                turma == null ? null : turma.getModalidade(),
                turma == null ? null : turma.getDiasHorarios(),
                inscricao.getStatus(),
                inscricao.getFormaPagamento(),
                inscricao.getValorTotal(),
                inscricao.getDataInscricao(),
                STATUS_QUE_PERMITEM_TROCA.contains(inscricao.getStatus()));
    }

    // ===== Cálculo do pagamento =====

    // Resultado do cálculo: o texto salvo na inscrição, o valor final
    // e, no pagamento dividido, as partes que vão para a tabela inscricao_pagamento
    record Pagamento(String descricao, BigDecimal valor, List<InscricaoPagamento> partes) {
        Pagamento(String descricao, BigDecimal valor) {
            this(descricao, valor, List.of());
        }
    }

    Pagamento calcularPagamento(Curso curso, String formaPagamento, int maximo) {
        String forma = normalizar(formaPagamento);
        BigDecimal valorCurso = curso.getValor().setScale(2, RoundingMode.HALF_UP);

        if (forma.startsWith("pix")) {
            BigDecimal comDesconto = valorCurso
                    .multiply(BigDecimal.ONE.subtract(DESCONTO_PIX))
                    .setScale(2, RoundingMode.HALF_UP);
            int percentual = DESCONTO_PIX.multiply(new BigDecimal(100)).intValue();
            return new Pagamento("Pix à vista (" + percentual + "% de desconto)", comDesconto);
        }

        boolean cartao = forma.startsWith("cartao");
        boolean boleto = forma.startsWith("boleto");
        if (!cartao && !boleto) {
            throw new RegraDeNegocioException("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.");
        }

        int parcelas = lerParcelas(forma);
        if (parcelas < 1 || parcelas > maximo) {
            throw new RegraDeNegocioException("Este pedido pode ser parcelado em no máximo " + maximo + "x.");
        }

        String nome = cartao ? "Cartão de crédito" : "Boleto bancário";
        return new Pagamento(nome + " · " + parcelas + "x", valorCurso);
    }

    // Pagamento dividido em duas formas (ex.: R$ 1.500 em um cartão e o restante em outro).
    // O navegador manda quanto do PEDIDO vai em cada forma; aqui o servidor:
    // - confere as formas, as parcelas e se a soma das partes é exatamente o total do pedido;
    // - calcula a fatia DESTE curso em cada forma, proporcional ao preço dele no pedido
    //   (os centavos que sobram da divisão ficam na última parte);
    // - aplica o desconto do Pix só na parte paga no Pix.
    Pagamento calcularPagamentoDividido(Curso curso, List<PartePagamento> partes, int maximo, BigDecimal totalDoPedido) {
        if (partes.size() != FORMAS_NO_PAGAMENTO_DIVIDIDO) {
            throw new RegraDeNegocioException("Para dividir o pagamento, escolha " + FORMAS_NO_PAGAMENTO_DIVIDIDO
                    + " formas de pagamento.");
        }
        BigDecimal total = totalDoPedido.setScale(2, RoundingMode.HALF_UP);
        BigDecimal soma = BigDecimal.ZERO;
        List<String> formas = new ArrayList<>();
        List<Integer> parcelas = new ArrayList<>();
        for (PartePagamento parte : partes) {
            if (parte == null) {
                throw new RegraDeNegocioException("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.");
            }
            String forma = codigoDaForma(parte.forma());
            int quantidade = InscricaoPagamento.PIX.equals(forma) ? 1 : (parte.parcelas() == null ? 1 : parte.parcelas());
            if (quantidade < 1 || quantidade > maximo) {
                throw new RegraDeNegocioException("Este pedido pode ser parcelado em no máximo " + maximo + "x.");
            }
            if (parte.valor() == null || parte.valor().setScale(2, RoundingMode.HALF_UP).signum() <= 0) {
                throw new RegraDeNegocioException("Informe um valor maior que zero em cada forma de pagamento.");
            }
            formas.add(forma);
            parcelas.add(quantidade);
            soma = soma.add(parte.valor().setScale(2, RoundingMode.HALF_UP));
        }
        if (soma.compareTo(total) != 0) {
            throw new RegraDeNegocioException("A soma das formas de pagamento (" + reais(soma)
                    + ") precisa ser igual ao total do pedido (" + reais(total) + ").");
        }

        BigDecimal valorCurso = curso.getValor().setScale(2, RoundingMode.HALF_UP);
        BigDecimal jaRateado = BigDecimal.ZERO;
        BigDecimal valorFinal = BigDecimal.ZERO;
        List<InscricaoPagamento> resultado = new ArrayList<>();
        List<String> textos = new ArrayList<>();
        for (int i = 0; i < partes.size(); i++) {
            boolean ultima = i == partes.size() - 1;
            BigDecimal fatia = ultima
                    ? valorCurso.subtract(jaRateado)
                    : partes.get(i).valor().setScale(2, RoundingMode.HALF_UP)
                            .multiply(valorCurso).divide(total, 2, RoundingMode.HALF_UP);
            jaRateado = jaRateado.add(fatia);
            String forma = formas.get(i);
            if (InscricaoPagamento.PIX.equals(forma)) {
                fatia = fatia.multiply(BigDecimal.ONE.subtract(DESCONTO_PIX)).setScale(2, RoundingMode.HALF_UP);
            }
            InscricaoPagamento linha = new InscricaoPagamento(i + 1, forma, parcelas.get(i), fatia);
            resultado.add(linha);
            valorFinal = valorFinal.add(fatia);
            textos.add(descreverParte(linha));
        }
        return new Pagamento(String.join(" + ", textos), valorFinal, resultado);
    }

    // "Cartão de crédito · 10x (R$ 1.500,00)" / "Pix à vista (R$ 950,00)"
    private String descreverParte(InscricaoPagamento parte) {
        String forma = InscricaoPagamento.PIX.equals(parte.getForma())
                ? "Pix à vista"
                : parte.nomeDaForma() + " · " + parte.getParcelas() + "x";
        return forma + " (" + reais(parte.getValor()) + ")";
    }

    // "Cartão de Crédito" -> "cartao"; forma desconhecida é recusada
    private String codigoDaForma(String formaPagamento) {
        String forma = normalizar(formaPagamento);
        if (forma.startsWith("pix")) return InscricaoPagamento.PIX;
        if (forma.startsWith("cartao")) return InscricaoPagamento.CARTAO;
        if (forma.startsWith("boleto")) return InscricaoPagamento.BOLETO;
        throw new RegraDeNegocioException("Escolha uma forma de pagamento válida: Pix, cartão ou boleto.");
    }

    // 1500.5 -> "R$ 1.500,50"
    static String reais(BigDecimal valor) {
        return "R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", valor);
    }

    // Total do pedido: soma dos cursos do carrinho (sem desconto).
    // Se este curso não estiver no carrinho, o pedido é só ele.
    private BigDecimal totalDoPedido(Integer idAluno, Curso curso) {
        List<Curso> cursos = cursosDoCarrinho(idAluno);
        boolean estaNoCarrinho = curso.getIdCurso() != null
                && cursos.stream().anyMatch(c -> curso.getIdCurso().equals(c.getIdCurso()));
        if (!estaNoCarrinho) {
            return curso.getValor();
        }
        return cursos.stream()
                .map(Curso::getValor)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Sem número de parcelas no texto, considera pagamento à vista (1x)
    private int lerParcelas(String forma) {
        Matcher m = PARCELAS.matcher(forma);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    // Maior limite de parcelas entre os cursos que estão no carrinho do aluno
    // (o carrinho só é esvaziado depois que todas as inscrições são criadas)
    private int maximoDoCarrinho(Integer idAluno) {
        return cursosDoCarrinho(idAluno).stream()
                .mapToInt(this::maximoDeParcelas)
                .max()
                .orElse(1);
    }

    private List<Curso> cursosDoCarrinho(Integer idAluno) {
        return carrinhoRepository.findFirstByAluno_IdAluno(idAluno)
                .map(carrinho -> itemCarrinhoRepository.findByCarrinho_IdCarrinho(carrinho.getIdCarrinho()))
                .orElse(List.of())
                .stream()
                .map(ItemCarrinho::getCurso)
                .filter(Objects::nonNull)
                .toList();
    }

    // Curso sem limite cadastrado só pode ser pago à vista
    private int maximoDeParcelas(Curso curso) {
        Integer limite = curso.getNumeroParcelas();
        return (limite == null || limite < 1) ? 1 : limite;
    }

    // "Cartão de Crédito" -> "cartao de credito" (sem acentos, minúsculo, sem espaços nas pontas)
    private String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return semAcento.trim().toLowerCase();
    }
}
