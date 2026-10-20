package com.aprendaplus.service;

import com.aprendaplus.dto.AulaForm;
import com.aprendaplus.dto.PlanoDaTurma;
import com.aprendaplus.dto.ResultadoImportacao;
import com.aprendaplus.entity.Aluno;
import com.aprendaplus.entity.Curso;
import com.aprendaplus.entity.Disciplina;
import com.aprendaplus.entity.Professor;
import com.aprendaplus.exception.RegraDeNegocioException;
import com.aprendaplus.repository.AlunoRepository;
import com.aprendaplus.repository.CursoRepository;
import com.aprendaplus.repository.DisciplinaRepository;
import com.aprendaplus.repository.ProfessorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImportacaoServiceTest {

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private CursoRepository cursoRepository;

    @Mock
    private DisciplinaRepository disciplinaRepository;

    @Mock
    private AlunoService alunoService;

    @Mock
    private ProfessorService professorService;

    @Mock
    private CursoService cursoService;

    @Mock
    private DisciplinaService disciplinaService;

    @Mock
    private ConteudoEadService conteudoEadService;

    @InjectMocks
    private ImportacaoService service;

    // "coluna", "valor", "coluna", "valor"...
    private static Map<String, String> linha(String... colunasEValores) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < colunasEValores.length; i += 2) {
            m.put(colunasEValores[i], colunasEValores[i + 1]);
        }
        return m;
    }

    private static Map<String, String> pessoa(String nome, String email, String cpf) {
        return linha("Nome completo", nome, "E-mail", email, "CPF", cpf, "Telefone", "51999998888",
                "Data de nascimento", "15/03/2001", "CEP", "92010000", "Rua", "Rua A", "Número", "10",
                "Bairro", "Centro", "Cidade", "Canoas", "UF", "rs");
    }

    private void cadastrosVazios() {
        when(alunoRepository.existsByEmailIgnoreCase(anyString()))
                .thenAnswer(i -> "ja@aluno.com".equalsIgnoreCase(i.getArgument(0)));
        when(alunoRepository.existsByCpf(anyString())).thenAnswer(i -> "99999999999".equals(i.getArgument(0)));
    }

    private static Curso curso(int id, String nome) {
        Curso c = new Curso();
        c.setIdCurso(id);
        c.setNome(nome);
        return c;
    }

    private static Disciplina disciplina(int id, String nome, Curso... cursos) {
        Disciplina d = new Disciplina();
        d.setIdDisciplina(id);
        d.setNome(nome);
        d.setCursos(new ArrayList<>(List.of(cursos)));
        return d;
    }

    // ===== Alunos =====

    @Test
    void previaConfereTudoSemGravarNada() {
        cadastrosVazios();
        Map<String, String> repetido = pessoa("Ana de Novo", "ANA@email.com", "11122233344");
        Map<String, String> cheioDeErros = linha("Nome completo", "Zé", "E-mail", "ja@aluno.com", "CPF", "999.999.999-99",
                "Telefone", "5133334444", "Data de nascimento", "2099-01-01", "CEP", "123", "Número", "1",
                "Bairro", "B", "Cidade", "C", "UF", "RSS", "Senha", "123");

        ResultadoImportacao r = service.alunos(List.of(pessoa("Ana Souza", "ana@email.com", "123.456.789-01"),
                repetido, cheioDeErros, linha("Nome completo", " ", "E-mail", "")), false);

        assertFalse(r.confirmado());
        assertEquals(3, r.total()); // a linha em branco é ignorada
        assertEquals(1, r.validas());
        assertEquals(2, r.comErro());
        assertEquals(0, r.importadas());
        assertEquals(List.of("O e-mail ana@email.com aparece mais de uma vez na planilha."), r.linhas().get(1).erros());
        assertEquals(List.of(
                "Já existe um aluno com o e-mail ja@aluno.com.",
                "Já existe um aluno com o CPF 999.999.999-99.",
                "A data de nascimento não pode ser no futuro.",
                "CEP inválido: \"123\" (ex.: 92010-000).",
                "Informe a rua.",
                "A UF deve ter 2 letras (ex.: RS).",
                "A senha deve ter pelo menos 6 caracteres."), r.linhas().get(2).erros());
        assertEquals(4, r.linhas().get(2).linha());
        verifyNoInteractions(alunoService);
    }

    @Test
    void confirmarGravaAsLinhasCertasComOsDadosArrumados() {
        cadastrosVazios();
        when(alunoService.salvar(any(Aluno.class))).thenAnswer(i -> i.getArgument(0));
        Map<String, String> comSenha = pessoa("Bia Lima", "bia@email.com", "33344455566");
        comSenha.put("senha", "segura123");
        comSenha.put("_linha", "40");

        ResultadoImportacao r = service.alunos(List.of(pessoa("Ana Souza", "Ana@Email.com ", "123.456.789-01"), comSenha), true);

        assertTrue(r.confirmado());
        assertEquals(2, r.importadas());
        assertTrue(r.linhas().get(0).importada());
        assertEquals(40, r.linhas().get(1).linha());
        ArgumentCaptor<Aluno> captor = ArgumentCaptor.forClass(Aluno.class);
        verify(alunoService, times(2)).salvar(captor.capture());
        Aluno ana = captor.getAllValues().get(0);
        assertEquals("ana@email.com", ana.getEmail());
        assertEquals("12345678901", ana.getCpf());
        assertEquals("(51) 99999-8888", ana.getTelefone());
        assertEquals("92010-000", ana.getCep());
        assertEquals("RS", ana.getEstado());
        assertEquals(LocalDate.of(2001, 3, 15), ana.getDataNascimento());
        assertEquals("ativo", ana.getStatus());
        // Sem senha na planilha: uma sorteada (o aluno usa "Esqueci minha senha")
        assertTrue(ana.getSenhaHash().length() >= 20);
        assertEquals("segura123", captor.getAllValues().get(1).getSenhaHash());
    }

    @Test
    void falhaAoGravarUmaLinhaNaoAtrapalhaAsOutras() {
        cadastrosVazios();
        when(alunoService.salvar(any(Aluno.class)))
                .thenThrow(new RuntimeException("duplicate key"))
                .thenThrow(new RegraDeNegocioException("Regra do cadastro."))
                .thenAnswer(i -> i.getArgument(0));

        ResultadoImportacao r = service.alunos(List.of(
                pessoa("Ana", "a@x.com", "11111111111"),
                pessoa("Bia", "b@x.com", "22222222222"),
                pessoa("Caio", "c@x.com", "33333333333")), true);

        assertEquals(1, r.importadas());
        assertEquals(2, r.comErro());
        assertEquals("Não foi possível gravar esta linha. Confira se ela já não foi cadastrada.",
                r.linhas().get(0).erros().get(0));
        assertEquals("Regra do cadastro.", r.linhas().get(1).erros().get(0));
        assertTrue(r.linhas().get(2).importada());
    }

    @Test
    void camposObrigatoriosEFormatos() {
        Map<String, String> l = linha("E-mail", "sem-arroba", "CPF", "123", "Data de nascimento", "31/02/2000",
                "CEP", "92010-000", "Telefone", "+55 51 9 9999 8888 ramal 2", "Bairro", "x".repeat(101));

        List<String> erros = service.alunos(List.of(l), false).linhas().get(0).erros();

        assertTrue(erros.contains("Informe o nome completo."));
        assertTrue(erros.contains("E-mail inválido: \"sem-arroba\"."));
        assertTrue(erros.contains("O CPF deve ter 11 números."));
        assertTrue(erros.contains("O telefone deve ter no máximo 20 caracteres."));
        assertTrue(erros.contains("\"Data de nascimento\" com data inválida: \"31/02/2000\" (use dd/mm/aaaa)."));
        assertTrue(erros.contains("O bairro deve ter no máximo 100 caracteres."));
        assertTrue(erros.contains("Informe a cidade."));
        assertTrue(erros.contains("Informe a UF (ex.: RS)."));
        assertFalse(erros.stream().anyMatch(e -> e.contains("CEP")));
    }

    // ===== Professores =====

    @Test
    void professoresUsamOsMesmosDadosDePessoa() {
        when(professorRepository.existsByEmailIgnoreCase("prof@escola.com")).thenReturn(true);
        when(professorRepository.existsByCpf(anyString())).thenReturn(false);
        when(professorRepository.existsByEmailIgnoreCase("rui@escola.com")).thenReturn(false);
        when(professorService.salvar(any(Professor.class))).thenAnswer(i -> i.getArgument(0));

        ResultadoImportacao r = service.professores(List.of(
                pessoa("Rui Prates", "rui@escola.com", "12345678901"),
                pessoa("Outro", "prof@escola.com", "12345678902")), true);

        assertEquals(1, r.importadas());
        assertEquals(List.of("Já existe um professor com o e-mail prof@escola.com."), r.linhas().get(1).erros());
        ArgumentCaptor<Professor> captor = ArgumentCaptor.forClass(Professor.class);
        verify(professorService).salvar(captor.capture());
        assertEquals("ativo", captor.getValue().getStatus());
        assertEquals("Canoas", captor.getValue().getCidade());
    }

    // ===== Cursos =====

    @Test
    void cursosComValorEmReaisHorasEParcelas() {
        when(cursoRepository.findAll()).thenReturn(List.of(curso(2, "Redes de Computadores")));
        when(cursoService.salvar(any(Curso.class))).thenAnswer(i -> i.getArgument(0));

        ResultadoImportacao r = service.cursos(List.of(
                linha("Nome", "Engenharia de Software", "Categoria", "Superior", "Carga horária", "3200h",
                        "Modalidade", "EAD", "Valor", "R$ 48.000,00", "Número de parcelas", "48x",
                        "Formas de pagamento", "Pix, cartão, boleto", "Descrição", "Curso completo"),
                linha("Nome", "redes de computadores", "Categoria", "técnico", "Carga horária", "muitas",
                        "Modalidade", "EAD", "Valor", "abc", "Parcelas", "200"),
                linha("Nome", "Engenharia de software", "Categoria", "superior", "Carga horária", "0",
                        "Modalidade", "x".repeat(31), "Valor", "10.5"),
                linha("Nome", "Gastronomia", "Categoria", "profissionalizante", "Carga horária", "400",
                        "Modalidade", "Presencial", "Valor", "-1")), true);

        assertEquals(1, r.importadas());
        ArgumentCaptor<Curso> captor = ArgumentCaptor.forClass(Curso.class);
        verify(cursoService).salvar(captor.capture());
        Curso es = captor.getValue();
        assertEquals(new BigDecimal("48000.00"), es.getValor());
        assertEquals(3200, es.getCargaHoraria());
        assertEquals(48, es.getNumeroParcelas());
        assertEquals("superior", es.getCategoria());
        assertEquals("Curso completo", es.getDescricao());
        assertEquals(List.of(
                "Já existe um curso com o nome \"redes de computadores\".",
                "A categoria deve ser \"superior\" ou \"profissionalizante\".",
                "\"Carga horária\" deve ser um número inteiro (veio \"muitas\").",
                "Valor inválido: \"abc\" (use 12000,00 ou 12000.00).",
                "\"Número de parcelas\" deve ficar entre 1 e 120."), r.linhas().get(1).erros());
        assertEquals(List.of(
                "O curso \"Engenharia de software\" aparece mais de uma vez na planilha.",
                "\"Carga horária\" deve ficar entre 1 e 100000.",
                "A modalidade pode ter no máximo 30 caracteres."), r.linhas().get(2).erros());
        assertEquals(List.of("Valor inválido: \"-1\" (use 12000,00 ou 12000.00)."), r.linhas().get(3).erros());
    }

    @Test
    void cursoSemOsCamposObrigatorios() {
        when(cursoRepository.findAll()).thenReturn(List.of());

        assertEquals(List.of(
                "Informe o nome do curso.",
                "Informe a categoria (superior ou profissionalizante).",
                "Preencha a coluna \"Carga horária\".",
                "Informe a modalidade (ex.: EAD).",
                "Informe o valor do curso."), service.cursos(List.of(linha("Descrição", "só isso")), false).linhas().get(0).erros());
    }

    // ===== Disciplinas =====

    @Test
    void disciplinasLigadasAosCursosPeloNome() {
        Curso ads = curso(1, "Análise e Desenvolvimento de Sistemas");
        Curso redes = curso(2, "Redes de Computadores");
        when(cursoRepository.findAll()).thenReturn(List.of(ads, redes));
        when(disciplinaRepository.findAll()).thenReturn(List.of(disciplina(5, "Banco de Dados", ads)));
        when(disciplinaService.salvar(any(Disciplina.class))).thenAnswer(i -> i.getArgument(0));

        ResultadoImportacao r = service.disciplinas(List.of(
                linha("Nome", "Algoritmos", "Cursos", "analise e desenvolvimento de sistemas; Redes de Computadores; ;",
                        "Carga horária", "80", "Modalidade", "EAD", "Situação", "Inativa"),
                linha("Nome", "Banco de dados", "Cursos", "ADS", "Carga horária", "80", "Situação", "pausada"),
                linha("Nome", "Lógica", "Curso", "Redes de Computadores | redes de computadores", "Carga horária", "40"),
                linha("Nome", "Algoritmos", "Carga horária", "40")), true);

        assertEquals(2, r.importadas());
        ArgumentCaptor<Disciplina> captor = ArgumentCaptor.forClass(Disciplina.class);
        verify(disciplinaService, times(2)).salvar(captor.capture());
        Disciplina algoritmos = captor.getAllValues().get(0);
        assertEquals(List.of(1, 2), algoritmos.getCursos().stream().map(Curso::getIdCurso).toList());
        assertEquals("inativa", algoritmos.getStatus());
        assertEquals("ativa", captor.getAllValues().get(1).getStatus());
        assertEquals(1, captor.getAllValues().get(1).getCursos().size());
        assertEquals(List.of(
                "Já existe uma disciplina com o nome \"Banco de dados\".",
                "Curso \"ADS\" não encontrado. Use o nome igual ao do cadastro de cursos.",
                "A situação deve ser \"ativa\" ou \"inativa\"."), r.linhas().get(1).erros());
        assertEquals(List.of(
                "A disciplina \"Algoritmos\" aparece mais de uma vez na planilha.",
                "Informe o curso (ou os cursos, separados por ;)."), r.linhas().get(3).erros());
    }

    // ===== Aulas do EAD =====

    private void salaDaTurma3() {
        when(conteudoEadService.planoDaTurma(3))
                .thenReturn(new PlanoDaTurma(9, 3, "ADS-A", 1, "ADS", 2, "Carla", List.of(), List.of()));
        Curso ads = curso(1, "ADS");
        when(disciplinaRepository.findAll()).thenReturn(List.of(
                disciplina(5, "Banco de Dados", ads),
                disciplina(6, "Roteamento", curso(2, "Redes"))));
    }

    @Test
    void aulasComDisciplinaTipoDataEDuracao() {
        salaDaTurma3();

        ResultadoImportacao r = service.aulas(3, List.of(
                linha("Título", "Introdução", "Disciplina", "banco de dados", "Tipo", "Videoaula",
                        "Vídeo", "https://youtu.be/abcdefghijk", "Duração (minutos)", "45 min",
                        "Data de liberação", "01/11/2026", "Publicada", "não", "Conteúdo", "Leia antes"),
                linha("Título", "Rotas", "Disciplina", "Roteamento", "Tipo", "palestra", "Publicada", "talvez",
                        "Data de liberação", "ontem", "Duração (minutos)", "900"),
                linha("Tipo", "leitura"),
                linha("Título", "Aula ao vivo", "Tipo", "Ao vivo")), true);

        ArgumentCaptor<AulaForm> captor = ArgumentCaptor.forClass(AulaForm.class);
        verify(conteudoEadService, times(2)).adicionarAula(eq(3), captor.capture());
        AulaForm primeira = captor.getAllValues().get(0);
        assertEquals("Introdução", primeira.titulo());
        assertEquals(5, primeira.idDisciplina());
        assertEquals("video", primeira.tipo());
        assertEquals(45, primeira.duracaoMinutos());
        assertEquals(LocalDate.of(2026, 11, 1), primeira.dataLiberacao());
        assertFalse(primeira.publicada());
        assertEquals("Leia antes", primeira.conteudo());
        assertEquals("ao_vivo", captor.getAllValues().get(1).tipo());
        assertTrue(captor.getAllValues().get(1).publicada());
        assertEquals(List.of(
                "A disciplina \"Roteamento\" não é do curso desta turma.",
                "Tipo de aula inválido: use videoaula, leitura, ao vivo ou atividade.",
                "\"Data de liberação\" com data inválida: \"ontem\" (use dd/mm/aaaa).",
                "\"Duração (minutos)\" deve ficar entre 1 e 600.",
                "Na coluna \"publicada\", use sim ou não."), r.linhas().get(1).erros());
        assertEquals(List.of("Informe o título da aula."), r.linhas().get(2).erros());
        assertEquals("Linha 4", r.linhas().get(2).descricao());
    }

    @Test
    void aulaPassaPelasRegrasDoCadastroNaPrevia() {
        salaDaTurma3();
        doThrow(new RegraDeNegocioException("Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...)."))
                .when(conteudoEadService).conferirAula(eq(3), any(AulaForm.class));

        ResultadoImportacao r = service.aulas(3, List.of(linha("Título", "Vídeo", "Vídeo", "https://vimeo.com/1")), false);

        assertEquals(List.of("Use um link de vídeo do YouTube (ex.: https://www.youtube.com/watch?v=...)."),
                r.linhas().get(0).erros());
        verify(conteudoEadService, never()).adicionarAula(any(), any());
    }

    @Test
    void semSalaCriadaNaoImportaAulas() {
        when(conteudoEadService.planoDaTurma(4))
                .thenReturn(new PlanoDaTurma(null, 4, "T", 1, "ADS", null, null, List.of(), List.of()));

        assertEquals("Escolha o professor responsável antes de importar as aulas.",
                assertThrows(RegraDeNegocioException.class,
                        () -> service.aulas(4, List.of(linha("Título", "x")), false)).getMessage());
    }

    // ===== Planilha inteira =====

    @Test
    void planilhaVaziaOuGrandeDemais() {
        when(cursoRepository.findAll()).thenReturn(List.of());
        String vazia = "A planilha está vazia. Preencha pelo menos uma linha abaixo do cabeçalho.";

        assertEquals(vazia, assertThrows(RegraDeNegocioException.class, () -> service.cursos(null, false)).getMessage());
        assertEquals(vazia, assertThrows(RegraDeNegocioException.class, () -> service.cursos(List.of(), false)).getMessage());
        assertEquals(vazia, assertThrows(RegraDeNegocioException.class,
                () -> service.cursos(List.of(linha("Nome", " ")), false)).getMessage());

        List<Map<String, String>> muitas = new ArrayList<>();
        for (int i = 0; i <= ImportacaoService.LIMITE_LINHAS; i++) {
            muitas.add(linha("Nome", "Curso " + i));
        }
        assertEquals("Envie no máximo 500 linhas por vez.",
                assertThrows(RegraDeNegocioException.class, () -> service.cursos(muitas, false)).getMessage());
    }

    @Test
    void linhaComColunaSemNomeOuNumeroQuebrado() {
        when(cursoRepository.findAll()).thenReturn(List.of());
        Map<String, String> l = new HashMap<>(linha("Nome", "Curso", "_linha", "abc"));
        l.put(null, "ignorado");

        assertEquals(2, service.cursos(List.of(l), false).linhas().get(0).linha());
    }

    // ===== Leitura dos valores =====

    @Test
    void leituraDosValores() {
        assertEquals(LocalDate.of(2001, 3, 5), ImportacaoService.lerData("5/3/2001"));
        assertEquals(LocalDate.of(2001, 3, 5), ImportacaoService.lerData("2001-03-05"));
        assertNull(ImportacaoService.lerData("05-03-2001"));
        assertEquals(new BigDecimal("1234.50"), ImportacaoService.decimal("1.234,5"));
        assertEquals(new BigDecimal("1234.50"), ImportacaoService.decimal("1234.5"));
        assertNull(ImportacaoService.decimal("R$"));
        assertTrue(ImportacaoService.simOuNao("Sim"));
        assertTrue(ImportacaoService.simOuNao("X"));
        assertFalse(ImportacaoService.simOuNao("NÃO"));
        assertNull(ImportacaoService.simOuNao("talvez"));
        assertEquals("video", ImportacaoService.tipoDaAula(null));
        assertEquals("leitura", ImportacaoService.tipoDaAula("Texto"));
        assertEquals("atividade", ImportacaoService.tipoDaAula("Exercício"));
        assertEquals("(51) 3333-4444", ImportacaoService.telefoneFormatado("51 3333-4444"));
        assertEquals("+1 555 0100", ImportacaoService.telefoneFormatado(" +1 555 0100 "));
        assertEquals("datadenascimento", ImportacaoService.Linha.coluna("Data de Nascimento"));
        assertEquals("", ImportacaoService.chave(null));
    }
}
