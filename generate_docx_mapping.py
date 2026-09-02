import os
import zipfile
from xml.sax.saxutils import escape

root = r"c:\Users\Bruno Cabianca\OneDrive - CESMAC\TRABALHO 1 COUR\Projeto E.L.I.A.S"
out_path = os.path.join(root, 'MAPEAMENTO_ARQUIVOS_ELIAS.docx')

content_lines = [
    'Mapa de Arquivos do Projeto E.L.I.A.S.',
    '',
    'Baseado nas documentações de especificação técnica e mapeamento funcional.',
    '',
    '1. Visão geral',
    'O projeto E.L.I.A.S. é uma aplicação full-stack para gestão de corridas internas, com backend em Django REST Framework e frontend em React + TypeScript.',
    '',
    '2. Arquivos principais da raiz',
    'Aptfile - configura dependências para deploy em ambientes como Render.',
    'DOCUMENTACAO.md - documentação complementar do projeto.',
    'ESPECIFICACAO_TECNICA_ELIAS.md - especificação técnica do sistema.',
    'ESPECIFICACAO_TECNICA_ELIAS.odg - diagrama da arquitetura.',
    'MAPEAMENTO_COMPLETO_ELIAS.md - referência funcional do sistema.',
    'package.json - dependências e configuração do projeto raiz.',
    'Procfile - instruções de execução para deploy.',
    'README.md - documentação geral.',
    'requirements.txt - dependências Python do backend.',
    'run.sh - script de execução local.',
    'runtime.txt - versão de runtime para deploy.',
    'wsgi.py - entrada WSGI do projeto.',
    '',
    '3. Backend',
    'backend/manage.py - ponto de entrada para comandos do Django.',
    'backend/backend/settings.py - configurações principais: banco, JWT, CORS, logging e Celery.',
    'backend/backend/urls.py - roteamento principal da API.',
    'backend/backend/wsgi.py - ponto de entrada WSGI.',
    'backend/backend/asgi.py - ponto de entrada ASGI.',
    'backend/backend/celery.py - configuração de filas assíncronas.',
    'backend/backend/db_utils.py - utilidades de banco.',
    '',
    '4. Aplicação autenticacao',
    'backend/autenticacao/models.py - modelos de Usuario, Corridas, Veiculo, Notificacao e RefreshTokenLocal.',
    'backend/autenticacao/views.py - endpoints de login, recuperação de senha, alteração de senha, dados pessoais, veículos e corridas.',
    'backend/autenticacao/urls.py - rotas da API do módulo autenticacao.',
    'backend/autenticacao/serializers.py - validação e serialização de dados.',
    'backend/autenticacao/auth_service.py - autenticação integrada com serviço externo e refresh token.',
    'backend/autenticacao/auth_backends.py - backends customizados de autenticação.',
    'backend/autenticacao/auth_serializers.py - serializers extras para autenticação.',
    'backend/autenticacao/authentication.py - camada personalizada de autenticação.',
    'backend/autenticacao/backends.py - ajustes adicionais de backend.',
    'backend/autenticacao/corrida_helpers.py - regras auxiliares para manipulação de corridas.',
    'backend/autenticacao/relatorio_views.py - geração de relatórios e estatísticas.',
    'backend/autenticacao/routers.py - configurações de roteadores do DRF.',
    'backend/autenticacao/signals.py - sinais do Django para eventos do sistema.',
    'backend/autenticacao/tasks.py - tarefas assíncronas e checagem de timeout.',
    'backend/autenticacao/tests.py - testes da aplicação.',
    'backend/autenticacao/test_login_temp.py - testes de login temporário.',
    'backend/autenticacao/admin.py - configuração do painel admin.',
    'backend/autenticacao/apps.py - configuração da app.',
    'backend/autenticacao/README_AUTHENTICATION.md - documentação do módulo de autenticação.',
    'backend/autenticacao/status_colors.json - tabela de cores para estados das corridas.',
    '',
    '5. Scripts e banco',
    'backend/create_missing_tables.sql - script para criar tabelas ausentes.',
    'backend/FULL_DATABASE_SETUP.sql - script de configuração completa do banco.',
    'backend/fix_status_field.sql - correção de campos de status.',
    'backend/fix_telefone_field.sql - correção de campo telefone.',
    'backend/PLANO E.sql - script de apoio ao banco.',
    'backend/db.sqlite3 - banco local de desenvolvimento.',
    'backend/EXEMPLOS_USO_FLUXOS.py - exemplos de uso dos fluxos do sistema.',
    'backend/reset_test_passwords.py - utilitário de reset de senhas.',
    'backend/test_change_password.py e backend/test_http_change_password.py - testes de mudança de senha.',
    '',
    '6. Frontend',
    'frontend/package.json - dependências e scripts do frontend.',
    'frontend/vite.config.ts - configuração do Vite.',
    'frontend/tsconfig.json, tsconfig.app.json, tsconfig.node.json e tsconfig.test.json - configuração do TypeScript.',
    'frontend/jest.config.js - configuração de testes.',
    'frontend/index.html - página base da aplicação.',
    'frontend/babel.config.cjs - configuração do Babel.',
    'frontend/eslint.config.js - regras de lint.',
    '',
    '7. Estrutura do frontend em src',
    'frontend/src/main.tsx - montagem da aplicação React no navegador.',
    'frontend/src/App.tsx - componente raiz que carrega as rotas.',
    'frontend/src/routes/AppRoutes.tsx - definição das rotas públicas e protegidas.',
    'frontend/src/routes/RequireAuth.tsx - proteção por autenticação.',
    'frontend/src/routes/RequireAdminAuth.tsx - proteção por perfil administrativo.',
    'frontend/src/pages/LoginPage.tsx - tela de login.',
    'frontend/src/pages/AutoLoginPage.tsx - fluxo de auto-login.',
    'frontend/src/pages/EsqueceuPage.tsx - recuperação de senha.',
    'frontend/src/pages/HomePage.tsx - dashboard administrativo.',
    'frontend/src/pages/Agendamento/Agendamento.tsx - página de agendamento para motoristas.',
    'frontend/src/pages/CorridasPage.tsx - gestão de corridas.',
    'frontend/src/pages/FormPage.tsx - formulário para cadastros e edições.',
    'frontend/src/pages/MotoristasPage.tsx - gestão de motoristas.',
    'frontend/src/pages/VeiculosPage.tsx - gestão de veículos.',
    'frontend/src/pages/DadosPessoaisPage.tsx - dados pessoais do usuário.',
    'frontend/src/pages/AlterarSenhaPage.tsx - alteração de senha.',
    'frontend/src/pages/NotificacoesPage.tsx e NotificacaoPage.tsx - listagem e visualização de notificações.',
    'frontend/src/pages/GerarRelatorioPage.tsx e StatusColorsPage.tsx - relatórios e configuração visual.',
    'frontend/src/pages/NotFoundPage.tsx - página de erro 404.',
    'frontend/src/services/api.ts - cliente Axios para comunicação com a API.',
    'frontend/src/api/axios.ts - configuração do cliente HTTP.',
    'frontend/src/components, hooks, contexts, types, assets - módulos reutilizáveis e recursos da interface.',
    '',
    '8. Resumo funcional',
    'Autenticação: login, refresh, recuperação de senha e proteção de rotas.',
    'Gestão de corridas: criação, aceitação, recusa, conclusão e cancelamento.',
    'Gestão de usuários: motoristas e administradores.',
    'Gestão de veículos: cadastro e associação às corridas.',
    'Notificações: atualização automática de eventos relevantes.',
    'Relatórios: métricas e estatísticas administrativas.',
    '',
    '9. Conclusão',
    'Este documento consolida os principais arquivos do projeto e suas responsabilidades para facilitar entendimento, manutenção e evolução do sistema.'
]


def paragraph(text, style=None):
    p = ['<w:p>']
    if style:
        p.append(f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>')
    p.append('<w:r><w:t xml:space="preserve">' + escape(text) + '</w:t></w:r>')
    p.append('</w:p>')
    return ''.join(p)

body = ''.join(paragraph(text, 'Title' if idx == 0 or text.startswith('1.') or text.startswith('2.') or text.startswith('3.') or text.startswith('4.') or text.startswith('5.') or text.startswith('6.') or text.startswith('7.') or text.startswith('8.') or text.startswith('9.') else None) for idx, text in enumerate(content_lines) if text)
# replace with explicit paragraphs to avoid style on every section heading incorrectly
body_parts = []
for text in content_lines:
    if not text:
        body_parts.append('<w:p/>')
        continue
    style = None
    if text.startswith('Mapa') or text.startswith('1.') or text.startswith('2.') or text.startswith('3.') or text.startswith('4.') or text.startswith('5.') or text.startswith('6.') or text.startswith('7.') or text.startswith('8.') or text.startswith('9.'):
        style = 'Title'
    body_parts.append(paragraph(text, style))

body_xml = ''.join(body_parts)

doc_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>'''

content_types_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

rels_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types_xml)
    z.writestr('_rels/.rels', rels_xml)
    z.writestr('word/document.xml', doc_xml)
    z.writestr('word/styles.xml', styles_xml)

print(f'Arquivo criado: {out_path}')
