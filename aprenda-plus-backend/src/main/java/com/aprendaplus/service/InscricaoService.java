package com.aprendaplus.service;

import com.aprendaplus.dto.MinhaInscricao;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Inscricao;
import com.aprendaplus.entity.Matricula;
import com.aprendaplus.entity.Turma;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.entity.ItemCarrinho;
import com.aprendaplus.repository.CarrinhoRepository;
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
import java.util.List;
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
        Pagamento pagamento = calcularPagamento(curso, dados.getFormaPagamento(), maximoDoPedido);

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

        return inscricaoRepository.save(inscricao);
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

        Inscricao salva = inscricaoRepository.save(dados);

        sincronizarMatricula(idAluno, turmaAnterior, novaTurma, novoStatus, salva.getFormaPagamento());

        // Liberou a vaga na turma antiga? Chama o primeiro da fila de lá
        boolean liberouVaga = ocupaVaga(statusAnterior) && (!ocupaVaga(novoStatus) || mudouDeTurma);
        if (liberouVaga && turmaAnterior != null) {
            promoverPrimeiroDaFila(turmaAnterior);
        }
        return salva;
    }

    // Cria, move, cancela ou conclui a matrícula conforme o status da inscrição
    private void sincronizarMatricula(Integer idAluno, Integer turmaAnterior, Integer novaTurma,
                                      String status, String formaPagamento) {
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
        } else if (CANCELADA.equals(status) && matricula != null) {
            matricula.setStatus("cancelada");
            matriculaRepository.save(matricula);
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
                });
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

    // Resultado do cálculo: o texto salvo na inscrição e o valor final
    record Pagamento(String descricao, BigDecimal valor) {}

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

    // Sem número de parcelas no texto, considera pagamento à vista (1x)
    private int lerParcelas(String forma) {
        Matcher m = PARCELAS.matcher(forma);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    // Maior limite de parcelas entre os cursos que estão no carrinho do aluno
    // (o carrinho só é esvaziado depois que todas as inscrições são criadas)
    private int maximoDoCarrinho(Integer idAluno) {
        return carrinhoRepository.findFirstByAluno_IdAluno(idAluno)
                .map(carrinho -> itemCarrinhoRepository.findByCarrinho_IdCarrinho(carrinho.getIdCarrinho()))
                .orElse(List.of())
                .stream()
                .map(ItemCarrinho::getCurso)
                .filter(cursoDoItem -> cursoDoItem != null)
                .mapToInt(this::maximoDeParcelas)
                .max()
                .orElse(1);
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
