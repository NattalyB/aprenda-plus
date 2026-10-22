package com.aprendaplus.service;

import com.aprendaplus.dto.AndamentoAluno;
import com.aprendaplus.dto.AulaDaSala;
import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.AvisoDaTurma;
import com.aprendaplus.dto.AvisoForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.entity.*;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Painel: monta a sala de aula EAD de cada turma (professor responsável, aulas e mural de avisos)
// e mostra o andamento dos alunos.
@Service
public class ConteudoEadService {

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    static final Set<String> TIPOS = Set.of("video", "leitura", "ao_vivo", "atividade");
    // Matrículas que dão acesso à sala de aula
    static final Set<String> STATUS_COM_ACESSO = Set.of("ativa", "concluida");

    private static final Pattern YOUTUBE = Pattern.compile(
            "^(?:https?://)?(?:www\\.|m\\.)?(?:youtube\\.com/(?:watch\\?(?:[^#]*&)?v=|embed/|shorts/|live/)|youtu\\.be/)"
                    + "([A-Za-z0-9_-]{11})(?:[?&#/].*)?$");
    private static final Pattern LINK = Pattern.compile("^https?://\\S+$");

    @Autowired
    private PlanoDeAulaRepository planoRepository;

    @Autowired
    private AulaRepository aulaRepository;

    @Autowired
    private AvisoTurmaRepository avisoRepository;

    @Autowired
    private TurmaRepository turmaRepository;

    @Autowired
    private ProfessorRepository professorRepository;

    @Autowired
    private DisciplinaRepository disciplinaRepository;

    @Autowired
    private TurmaProfessorRepository turmaProfessorRepository;

    @Autowired
    private FuncionarioRepository funcionarioRepository;

    @Autowired
    private MatriculaRepository matriculaRepository;

    @Autowired
    private AulaConcluidaRepository aulaConcluidaRepository;

    @Autowired
    private CertificadoRepository certificadoRepository;

    @Autowired
    private EmailService emailService;

    // ===== Consulta =====

    @Transactional(readOnly = true)
    public PlanoDaTurma planoDaTurma(Integer idTurma) {
        Turma turma = turma(idTurma);
        return montar(turma, planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null));
    }

    // { idTurma: quantidade de aulas } para o seletor de turmas do painel
    @Transactional(readOnly = true)
    public Map<Integer, Integer> quantidadeDeAulasPorTurma() {
        Map<Integer, Integer> resultado = new LinkedHashMap<>();
        for (PlanoDeAula plano : planoRepository.findAll()) {
            if (plano.getTurma() != null) {
                resultado.put(plano.getTurma().getIdTurma(),
                        aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano()).size());
            }
        }
        return resultado;
    }

    // ===== Professor responsável =====

    @Transactional
    public PlanoDaTurma definirProfessor(Integer idTurma, Integer idProfessor) {
        Turma turma = turma(idTurma);
        if (idProfessor == null) {
            throw new RegraDeNegocioException("Escolha o professor responsável pela sala de aula.");
        }
        Professor professor = professorRepository.findById(idProfessor)
                .orElseThrow(() -> new RegraDeNegocioException("Professor não encontrado."));
        if (professor.getStatus() != null && !"ativo".equals(professor.getStatus())) {
            throw new RegraDeNegocioException("Esse professor não está ativo. Escolha outro.");
        }
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma).orElseGet(() -> {
            PlanoDeAula novo = new PlanoDeAula();
            novo.setTurma(turma);
            return novo;
        });
        plano.setProfessorResponsavel(professor);
        return montar(turma, planoRepository.save(plano));
    }

    // ===== Aulas =====

    @Transactional
    public PlanoDaTurma adicionarAula(Integer idTurma, AulaForm form) {
        Turma turma = turma(idTurma);
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma)
                .orElseThrow(() -> new RegraDeNegocioException(
                        "Escolha o professor responsável antes de cadastrar as aulas."));
        Aula aula = new Aula();
        aula.setPlano(plano);
        preencher(aula, form, turma);
        List<Aula> existentes = aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano());
        aula.setNumeroAula(existentes.isEmpty() ? 1 : existentes.get(existentes.size() - 1).getNumeroAula() + 1);
        aulaRepository.save(aula);
        return montar(turma, plano);
    }

    // Confere uma aula sem gravar nada (prévia da importação por planilha): mesmas regras do cadastro
    @Transactional(readOnly = true)
    public void conferirAula(Integer idTurma, AulaForm form) {
        Turma turma = turma(idTurma);
        if (planoRepository.findFirstByTurma_IdTurma(idTurma).isEmpty()) {
            throw new RegraDeNegocioException("Escolha o professor responsável antes de cadastrar as aulas.");
        }
        preencher(new Aula(), form, turma);
    }

    @Transactional
    public PlanoDaTurma atualizarAula(Integer idAula, AulaForm form) {
        Aula aula = aula(idAula);
        Turma turma = aula.getPlano().getTurma();
        preencher(aula, form, turma);
        aulaRepository.save(aula);
        return montar(turma, aula.getPlano());
    }

    @Transactional
    public PlanoDaTurma excluirAula(Integer idAula) {
        Aula aula = aula(idAula);
        PlanoDeAula plano = aula.getPlano();
        aulaRepository.delete(aula);
        // Renumera as que sobraram (1, 2, 3...)
        List<Aula> restantes = new ArrayList<>(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano()));
        restantes.removeIf(a -> Objects.equals(a.getIdAula(), idAula));
        renumerar(restantes);
        return montar(plano.getTurma(), plano);
    }

    // Exclui várias aulas da mesma turma de uma vez (seleção na tela) e renumera as que sobraram
    @Transactional
    public PlanoDaTurma excluirAulas(Integer idTurma, List<Integer> idsAulas) {
        Turma turma = turma(idTurma);
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma)
                .orElseThrow(() -> new RegraDeNegocioException("Esta turma ainda não tem aulas."));
        Set<Integer> ids = new HashSet<>();
        if (idsAulas != null) {
            idsAulas.stream().filter(Objects::nonNull).forEach(ids::add);
        }
        if (ids.isEmpty()) {
            throw new RegraDeNegocioException("Selecione pelo menos uma aula para excluir.");
        }

        List<Aula> aulas = new ArrayList<>(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano()));
        List<Aula> excluir = aulas.stream().filter(a -> ids.contains(a.getIdAula())).toList();
        // Só exclui se todas as aulas escolhidas forem desta turma (nada pela metade)
        if (excluir.size() != ids.size()) {
            throw new RegraDeNegocioException("Alguma aula selecionada não pertence a esta turma. Atualize a página e tente de novo.");
        }

        aulaRepository.deleteAll(excluir);
        aulas.removeIf(a -> ids.contains(a.getIdAula()));
        renumerar(aulas);
        return montar(turma, plano);
    }

    // direcao: "cima" ou "baixo"
    @Transactional
    public PlanoDaTurma moverAula(Integer idAula, String direcao) {
        Aula aula = aula(idAula);
        PlanoDeAula plano = aula.getPlano();
        List<Aula> aulas = new ArrayList<>(aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano()));
        int posicao = -1;
        for (int i = 0; i < aulas.size(); i++) {
            if (Objects.equals(aulas.get(i).getIdAula(), idAula)) {
                posicao = i;
            }
        }
        int destino = "cima".equals(direcao) ? posicao - 1 : "baixo".equals(direcao) ? posicao + 1 : -2;
        if (destino == -2) {
            throw new RegraDeNegocioException("Use \"cima\" ou \"baixo\" para mover a aula.");
        }
        if (posicao >= 0 && destino >= 0 && destino < aulas.size()) {
            Collections.swap(aulas, posicao, destino);
            renumerar(aulas);
        }
        return montar(plano.getTurma(), plano);
    }

    // Copia as aulas de outra turma (sem as datas, que mudam de uma turma para outra)
    @Transactional
    public int copiarAulas(Integer idTurma, Integer idTurmaOrigem) {
        if (idTurmaOrigem == null || Objects.equals(idTurma, idTurmaOrigem)) {
            throw new RegraDeNegocioException("Escolha outra turma para copiar as aulas.");
        }
        Turma turma = turma(idTurma);
        PlanoDeAula origem = planoRepository.findFirstByTurma_IdTurma(idTurmaOrigem).orElse(null);
        List<Aula> aulasOrigem = origem == null ? List.of()
                : aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(origem.getIdPlano());
        if (aulasOrigem.isEmpty()) {
            throw new RegraDeNegocioException("A turma escolhida não tem aulas para copiar.");
        }

        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null);
        if (plano == null) {
            plano = new PlanoDeAula();
            plano.setTurma(turma);
            plano.setProfessorResponsavel(origem.getProfessorResponsavel());
            plano = planoRepository.save(plano);
        }
        List<Aula> existentes = aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano());
        int proximo = existentes.isEmpty() ? 1 : existentes.get(existentes.size() - 1).getNumeroAula() + 1;

        for (Aula original : aulasOrigem) {
            Aula copia = new Aula();
            copia.setPlano(plano);
            copia.setNumeroAula(proximo++);
            copia.setTopico(original.getTopico());
            copia.setConteudoDetalhado(original.getConteudoDetalhado());
            copia.setRecursosNecessarios(original.getRecursosNecessarios());
            copia.setTipoAula(original.getTipoAula());
            copia.setVideoUrl(original.getVideoUrl());
            copia.setMaterialUrl(original.getMaterialUrl());
            copia.setDuracaoMinutos(original.getDuracaoMinutos());
            copia.setPublicada(original.getPublicada());
            // A disciplina só vai junto se também fizer parte do curso desta turma
            if (original.getDisciplina() != null && disciplinaDoCurso(original.getDisciplina(), turma)) {
                copia.setDisciplina(original.getDisciplina());
            }
            aulaRepository.save(copia);
        }
        return aulasOrigem.size();
    }

    // ===== Mural de avisos =====

    @Transactional
    public PlanoDaTurma publicarAviso(Integer idTurma, AvisoForm form, Integer idFuncionario) {
        Turma turma = turma(idTurma);
        String[] textos = textosDoAviso(form);
        String titulo = textos[0];
        String mensagem = textos[1];

        AvisoTurma aviso = new AvisoTurma();
        aviso.setTurma(turma);
        aviso.setTitulo(titulo);
        aviso.setMensagem(mensagem);
        aviso.setFixado(Boolean.TRUE.equals(form.fixado()));
        aviso.setAutor(nomeDoAutor(idFuncionario));
        aviso.setCriadoEm(LocalDateTime.now(FUSO));
        avisoRepository.save(aviso);

        if (Boolean.TRUE.equals(form.enviarEmail())) {
            for (Matricula matricula : matriculaRepository.findByTurma_IdTurma(idTurma)) {
                Aluno aluno = matricula.getAluno();
                if (aluno != null && STATUS_COM_ACESSO.contains(matricula.getStatus())) {
                    emailService.novoAviso(aluno.getEmail(), aluno.getNomeCompleto(), turma.getNome(), titulo, mensagem);
                }
            }
        }
        return montar(turma, planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null));
    }

    // Edita título, mensagem e se o aviso fica fixado (não manda e-mail de novo)
    @Transactional
    public PlanoDaTurma editarAviso(Integer idAviso, AvisoForm form) {
        AvisoTurma aviso = avisoRepository.findById(idAviso)
                .orElseThrow(() -> new RegraDeNegocioException("Aviso não encontrado."));
        String[] textos = textosDoAviso(form);
        aviso.setTitulo(textos[0]);
        aviso.setMensagem(textos[1]);
        if (form.fixado() != null) {
            aviso.setFixado(form.fixado());
        }
        avisoRepository.save(aviso);
        Turma turma = aviso.getTurma();
        return montar(turma, planoRepository.findFirstByTurma_IdTurma(turma.getIdTurma()).orElse(null));
    }

    // Confere e limpa o título e a mensagem: [titulo, mensagem]
    private static String[] textosDoAviso(AvisoForm form) {
        String titulo = texto(form == null ? null : form.titulo());
        String mensagem = texto(form == null ? null : form.mensagem());
        if (titulo == null || mensagem == null) {
            throw new RegraDeNegocioException("Preencha o título e a mensagem do aviso.");
        }
        if (titulo.length() > 120) {
            throw new RegraDeNegocioException("O título do aviso pode ter no máximo 120 caracteres.");
        }
        if (mensagem.length() > 4000) {
            throw new RegraDeNegocioException("A mensagem pode ter no máximo 4.000 caracteres.");
        }
        return new String[]{titulo, mensagem};
    }

    @Transactional
    public PlanoDaTurma excluirAviso(Integer idAviso) {
        AvisoTurma aviso = avisoRepository.findById(idAviso)
                .orElseThrow(() -> new RegraDeNegocioException("Aviso não encontrado."));
        Turma turma = aviso.getTurma();
        avisoRepository.delete(aviso);
        return montar(turma, planoRepository.findFirstByTurma_IdTurma(turma.getIdTurma()).orElse(null));
    }

    // ===== Andamento da turma =====

    @Transactional(readOnly = true)
    public List<AndamentoAluno> andamento(Integer idTurma) {
        turma(idTurma);
        PlanoDeAula plano = planoRepository.findFirstByTurma_IdTurma(idTurma).orElse(null);
        Set<Integer> aulasValidas = new HashSet<>();
        if (plano != null) {
            for (Aula aula : aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano())) {
                if (!Boolean.FALSE.equals(aula.getPublicada())) {
                    aulasValidas.add(aula.getIdAula());
                }
            }
        }
        Map<Integer, Integer> concluidas = new HashMap<>();
        Map<Integer, LocalDateTime> ultima = new HashMap<>();
        if (plano != null) {
            for (AulaConcluida c : aulaConcluidaRepository.findByAula_Plano_IdPlano(plano.getIdPlano())) {
                if (c.getAluno() == null || c.getAula() == null || !aulasValidas.contains(c.getAula().getIdAula())) {
                    continue;
                }
                Integer idAluno = c.getAluno().getIdAluno();
                concluidas.merge(idAluno, 1, Integer::sum);
                if (c.getConcluidaEm() != null
                        && (ultima.get(idAluno) == null || c.getConcluidaEm().isAfter(ultima.get(idAluno)))) {
                    ultima.put(idAluno, c.getConcluidaEm());
                }
            }
        }
        Set<Integer> comCertificado = new HashSet<>();
        for (Certificado certificado : certificadoRepository.findByTurma_IdTurma(idTurma)) {
            if (certificado.getAluno() != null) {
                comCertificado.add(certificado.getAluno().getIdAluno());
            }
        }

        int total = aulasValidas.size();
        List<AndamentoAluno> lista = new ArrayList<>();
        for (Matricula matricula : matriculaRepository.findByTurma_IdTurma(idTurma)) {
            Aluno aluno = matricula.getAluno();
            if (aluno == null || "cancelada".equals(matricula.getStatus())) {
                continue;
            }
            int feitas = concluidas.getOrDefault(aluno.getIdAluno(), 0);
            lista.add(new AndamentoAluno(aluno.getIdAluno(), aluno.getNomeCompleto(), aluno.getEmail(),
                    matricula.getStatus(), feitas, total, percentual(feitas, total),
                    ultima.get(aluno.getIdAluno()), comCertificado.contains(aluno.getIdAluno())));
        }
        lista.sort(Comparator.comparing(a -> a.nome() == null ? "" : a.nome(), String.CASE_INSENSITIVE_ORDER));
        return lista;
    }

    // ===== Auxiliares (também usados pela sala do aluno) =====

    PlanoDaTurma montar(Turma turma, PlanoDeAula plano) {
        LocalDate hoje = LocalDate.now(FUSO);
        List<AulaDaSala> aulas = new ArrayList<>();
        Professor professor;
        if (plano == null) {
            professor = professorSugerido(turma.getIdTurma());
        } else {
            professor = plano.getProfessorResponsavel();
            for (Aula aula : aulaRepository.findByPlano_IdPlanoOrderByNumeroAulaAsc(plano.getIdPlano())) {
                aulas.add(paraDto(aula, hoje, false, true));
            }
        }
        Curso curso = turma.getCurso();
        return new PlanoDaTurma(
                plano == null ? null : plano.getIdPlano(),
                turma.getIdTurma(), turma.getNome(),
                curso == null ? null : curso.getIdCurso(), curso == null ? null : curso.getNome(),
                professor == null ? null : professor.getIdProfessor(),
                professor == null ? null : professor.getNomeCompleto(),
                aulas, avisosDaTurma(turma.getIdTurma()));
    }

    List<AvisoDaTurma> avisosDaTurma(Integer idTurma) {
        return avisoRepository.findByTurma_IdTurmaOrderByFixadoDescCriadoEmDesc(idTurma).stream()
                .map(a -> new AvisoDaTurma(a.getIdAviso(), a.getTitulo(), a.getMensagem(), a.getAutor(),
                        Boolean.TRUE.equals(a.getFixado()), a.getCriadoEm()))
                .toList();
    }

    // Professor sugerido para uma sala nova: o principal da turma (ou o primeiro ligado a ela)
    Professor professorSugerido(Integer idTurma) {
        List<TurmaProfessor> vinculos = turmaProfessorRepository.findByTurma_IdTurma(idTurma);
        return vinculos.stream()
                .filter(v -> "principal".equals(v.getPapel()))
                .findFirst()
                .or(() -> vinculos.stream().findFirst())
                .map(TurmaProfessor::getProfessor)
                .orElse(null);
    }

    // completo = false esconde vídeo, material e conteúdo das aulas ainda não liberadas (visão do aluno)
    static AulaDaSala paraDto(Aula aula, LocalDate hoje, boolean concluida, boolean completo) {
        boolean liberada = estaLiberada(aula, hoje);
        boolean mostrar = completo || liberada;
        Disciplina disciplina = aula.getDisciplina();
        return new AulaDaSala(
                aula.getIdAula(), aula.getNumeroAula(), aula.getTopico(),
                disciplina == null ? null : disciplina.getIdDisciplina(),
                disciplina == null ? null : disciplina.getNome(),
                aula.getTipoAula() == null ? "video" : aula.getTipoAula(),
                aula.getDataAula(), liberada, !Boolean.FALSE.equals(aula.getPublicada()),
                mostrar ? aula.getVideoUrl() : null,
                mostrar ? aula.getMaterialUrl() : null,
                mostrar ? aula.getConteudoDetalhado() : null,
                aula.getDuracaoMinutos(), concluida);
    }

    static boolean estaLiberada(Aula aula, LocalDate hoje) {
        return aula.getDataAula() == null || !aula.getDataAula().isAfter(hoje);
    }

    static int percentual(int feitas, int total) {
        return total == 0 ? 0 : (int) Math.round(feitas * 100.0 / total);
    }

    // Pega o código do vídeo de qualquer formato de link do YouTube (ou null se não for do YouTube)
    static String idDoYoutube(String url) {
        if (url == null) {
            return null;
        }
        Matcher m = YOUTUBE.matcher(url.trim());
        return m.matches() ? m.group(1) : null;
    }

    static String texto(String valor) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.trim();
        return limpo.isEmpty() ? null : limpo;
    }

    private void preencher(Aula aula, AulaForm form, Turma turma) {
        if (form == null) {
            throw new RegraDeNegocioException("Informe os dados da aula.");
        }
        String titulo = texto(form.titulo());
        if (titulo == null) {
            throw new RegraDeNegocioException("Informe o título da aula.");
        }
        if (titulo.length() > 200) {
            throw new RegraDeNegocioException("O título pode ter no máximo 200 caracteres.");
        }

        String tipo = texto(form.tipo());
        tipo = tipo == null ? "video" : tipo.toLowerCase(Locale.ROOT);
        if (!TIPOS.contains(tipo)) {
            throw new RegraDeNegocioException("Tipo de aula inválido.");
        }

        String video = texto(form.videoUrl());
        if (video != null) {
            String id = idDoYoutube(video);
            if (id == null) {
                throw new RegraDeNegocioException(
                        "Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...).");
            }
            video = "https://www.youtube.com/watch?v=" + id;
        }

        String material = texto(form.materialUrl());
        if (material != null && (material.length() > 300 || !LINK.matcher(material).matches())) {
            throw new RegraDeNegocioException("O link do material precisa começar com https:// (ex.: Google Drive).");
        }

        String conteudo = texto(form.conteudo());
        if (conteudo != null && conteudo.length() > 20000) {
            throw new RegraDeNegocioException("O conteúdo pode ter no máximo 20.000 caracteres.");
        }

        Integer duracao = form.duracaoMinutos();
        if (duracao != null && (duracao < 1 || duracao > 600)) {
            throw new RegraDeNegocioException("A duração deve ficar entre 1 e 600 minutos.");
        }

        Disciplina disciplina = null;
        if (form.idDisciplina() != null) {
            disciplina = disciplinaRepository.findById(form.idDisciplina())
                    .orElseThrow(() -> new RegraDeNegocioException("Disciplina não encontrada."));
            if (!disciplinaDoCurso(disciplina, turma)) {
                throw new RegraDeNegocioException("Essa disciplina não faz parte do curso da turma.");
            }
        }

        aula.setTopico(titulo);
        aula.setTipoAula(tipo);
        aula.setVideoUrl(video);
        aula.setMaterialUrl(material);
        aula.setConteudoDetalhado(conteudo);
        aula.setDuracaoMinutos(duracao);
        aula.setDataAula(form.dataLiberacao());
        aula.setDisciplina(disciplina);
        aula.setPublicada(form.publicada() == null || form.publicada());
    }

    private static boolean disciplinaDoCurso(Disciplina disciplina, Turma turma) {
        if (turma.getCurso() == null || disciplina.getCursos() == null) {
            return true;
        }
        Integer idCurso = turma.getCurso().getIdCurso();
        return disciplina.getCursos().stream().anyMatch(c -> Objects.equals(c.getIdCurso(), idCurso));
    }

    private void renumerar(List<Aula> aulas) {
        int numero = 1;
        for (Aula aula : aulas) {
            if (!Objects.equals(aula.getNumeroAula(), numero)) {
                aula.setNumeroAula(numero);
                aulaRepository.save(aula);
            }
            numero++;
        }
    }

    private String nomeDoAutor(Integer idFuncionario) {
        if (idFuncionario != null) {
            Optional<Funcionario> funcionario = funcionarioRepository.findById(idFuncionario);
            if (funcionario.isPresent() && funcionario.get().getNomeCompleto() != null) {
                return funcionario.get().getNomeCompleto();
            }
        }
        return "Equipe AprendaPlus";
    }

    private Turma turma(Integer idTurma) {
        return turmaRepository.findById(idTurma)
                .orElseThrow(() -> new RegraDeNegocioException("Turma não encontrada."));
    }

    private Aula aula(Integer idAula) {
        return aulaRepository.findById(idAula)
                .orElseThrow(() -> new RegraDeNegocioException("Aula não encontrada."));
    }
}
