"""
Endpoints para relatórios e estatísticas do sistema E.L.I.A.S
"""

from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from datetime import datetime
from django.db.models import Count, Q
from django.utils import timezone
from django.http import FileResponse
from django.conf import settings
from .models import Corridas, Usuario, Veiculo, Notificacao
from .serializers import CorridaSerializer
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import io
import json
import os


def _filter_report_rides(request):
    data_inicio_str = request.query_params.get('data_inicio', '').strip()
    data_fim_str = request.query_params.get('data_fim', '').strip()

    try:
        data_inicio = datetime.strptime(data_inicio_str, '%Y-%m-%d').date() if data_inicio_str else None
        data_fim = datetime.strptime(data_fim_str, '%Y-%m-%d').date() if data_fim_str else None
        if data_inicio and data_inicio.isoformat() != data_inicio_str:
            raise ValueError
        if data_fim and data_fim.isoformat() != data_fim_str:
            raise ValueError
    except ValueError:
        return None, None, None, Response(
            {'error': 'Informe as datas no formato AAAA-MM-DD.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if data_inicio and data_fim and data_inicio > data_fim:
        return None, None, None, Response(
            {'error': 'A data inicial não pode ser posterior à data final.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    corridas = Corridas.objects.all()
    if data_inicio:
        corridas = corridas.filter(data_solicitacao__date__gte=data_inicio)
    if data_fim:
        corridas = corridas.filter(data_solicitacao__date__lte=data_fim)

    status_filter = request.query_params.get('status', '').strip().lower()
    valid_statuses = {choice for choice, _ in Corridas.StatusChoices.choices}
    if status_filter:
        if status_filter not in valid_statuses:
            return None, None, None, Response(
                {'error': 'Status de corrida inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        corridas = corridas.filter(status=status_filter)

    motorista_id = request.query_params.get('motorista_id', '').strip()
    if motorista_id:
        try:
            corridas = corridas.filter(motorista_id=int(motorista_id))
        except ValueError:
            return None, None, None, Response(
                {'error': 'O identificador do motorista deve ser numérico.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    query = request.query_params.get('q', '').strip()
    if query:
        corridas = corridas.filter(
            Q(ponto_inicio__icontains=query)
            | Q(ponto_chegada__icontains=query)
            | Q(solicitante__icontains=query)
            | Q(destinos__icontains=query)
            | Q(servico__icontains=query)
            | Q(motorista__nome__icontains=query)
            | Q(veiculo__nome__icontains=query)
            | Q(veiculo__placa__icontains=query)
        )

    return corridas, data_inicio, data_fim, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorios(request):
    """
    Endpoint para gerar relatórios de corridas.
    
    Query params:
    - data_inicio: data no formato YYYY-MM-DD (padrão: 7 dias atrás)
    - data_fim: data no formato YYYY-MM-DD (padrão: hoje)
    - motorista_id: ID do motorista (opcional)
    - status: status da corrida (opcional)
    
    Response:
    {
        "total_corridas": int,
        "corridas_concluidas": int,
        "corridas_canceladas": int,
        "corridas_pendentes": int,
        "distancia_total_km": decimal,
        "motoristas": [
            {
                "id_usuario": int,
                "nome": str,
                "telefone": str,
                "status": str,
                "corridas_count": int,
                "corridas_concluidas": int,
                "corridas_canceladas": int
            }
        ]
    }
    """
    try:
        # Gerentes e operadores também podem consultar relatórios de uso geral
        user = request.user
        if getattr(user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response(
                {'detail': 'Você não tem permissão para acessar relatórios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        corridas, data_inicio, data_fim, filter_error = _filter_report_rides(request)
        if filter_error:
            return filter_error
        
        # Calcular estatísticas gerais
        total_corridas = corridas.count()
        corridas_concluidas = corridas.filter(status=Corridas.StatusChoices.CONCLUIDA).count()
        corridas_canceladas = corridas.filter(status=Corridas.StatusChoices.CANCELADA).count()
        corridas_recusadas = corridas.filter(status=Corridas.StatusChoices.RECUSADA).count()
        corridas_pendentes = corridas.filter(status=Corridas.StatusChoices.PENDENTE).count()
        
        # Distância total não está mais armazenada (campo removido do modelo)
        distancia_total = 0
        
        # Serializar corridas com detalhes completos
        corridas_queryset = corridas.select_related('veiculo', 'motorista', 'criado_por')
        corridas_serialized = CorridaSerializer(corridas_queryset, many=True).data
        
        # Agrupar por motorista
        motoristas_data = []
        motoristas = Usuario.objects.filter(nivel_acesso__gt=1).distinct()
        
        for motorista in motoristas:
            corridas_motorista = corridas.filter(motorista=motorista)
            if corridas_motorista.count() > 0:
                motoristas_data.append({
                    'id_usuario': motorista.id_usuario,
                    'nome': motorista.nome,
                    'telefone': motorista.telefone,
                    'is_active': motorista.is_active,
                    'corridas_count': corridas_motorista.count(),
                    'corridas_concluidas': corridas_motorista.filter(status=Corridas.StatusChoices.CONCLUIDA).count(),
                    'corridas_canceladas': corridas_motorista.filter(status=Corridas.StatusChoices.CANCELADA).count(),
                })
        
        response_data = {
            'periodo': {
                'data_inicio': data_inicio.isoformat() if data_inicio else None,
                'data_fim': data_fim.isoformat() if data_fim else None
            },
            'resumo': {
                'total_corridas': total_corridas,
                'corridas_concluidas': corridas_concluidas,
                'corridas_canceladas': corridas_canceladas,
                'corridas_recusadas': corridas_recusadas,
                'corridas_pendentes': corridas_pendentes,
                'distancia_total_km': round(distancia_total, 2)
            },
            'corridas': corridas_serialized,  # Adicionar corridas com detalhes completos
            'motoristas': motoristas_data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Erro ao gerar relatório: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_stats(request):
    """
    Endpoint para estatísticas da página Home.
    
    Response:
    {
        "total_motoristas": int,
        "motoristas_ativos": int,
        "total_veiculos": int,
        "veiculos_disponiveis": int,
        "corridas_hoje": int,
        "corridas_pendentes_hoje": int,
        "corridas_em_andamento": int,
        "ultima_atualizacao": datetime
    }
    """
    try:
        # Gerentes e operadores também podem ver estatísticas da home
        user = request.user
        if getattr(user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response(
                {'detail': 'Você não tem permissão para acessar estatísticas'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        today = timezone.now().date()
        
        # Calcular estatísticas
        total_motoristas = Usuario.objects.filter(nivel_acesso__gt=1).count()
        motoristas_ativos = Usuario.objects.filter(nivel_acesso__gt=1, is_active=True).count()
        total_veiculos = Veiculo.objects.count()
        veiculos_disponiveis = Veiculo.objects.filter(status='disponivel').count()
        
        corridas_hoje = Corridas.objects.filter(data_solicitacao__date=today).count()
        corridas_pendentes_hoje = Corridas.objects.filter(
            data_solicitacao__date=today,
            status=Corridas.StatusChoices.PENDENTE
        ).count()
        corridas_em_andamento = Corridas.objects.filter(
            status=Corridas.StatusChoices.EM_ANDAMENTO
        ).count()
        
        response_data = {
            'motoristas': {
                'total': total_motoristas,
                'ativos': motoristas_ativos,
                'inativos': total_motoristas - motoristas_ativos
            },
            'veiculos': {
                'total': total_veiculos,
                'disponiveis': veiculos_disponiveis,
                'indisponiveis': total_veiculos - veiculos_disponiveis
            },
            'corridas': {
                'hoje': corridas_hoje,
                'pendentes_hoje': corridas_pendentes_hoje,
                'em_andamento': corridas_em_andamento
            },
            'ultima_atualizacao': timezone.now().isoformat()
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Erro ao obter estatísticas: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def hex_to_argb(hex_color, transparency=0.3):
    """
    Converte cor HEX (#RRGGBB) para RGB mais claro simulando transparência.
    Retorna None se hex_color for None (sem cor).
    
    Como openpyxl não suporta alpha/opacidade em preenchimentos,
    simulamos a transparência interpolando a cor com branco.
    transparency: 0.0 (cor original) a 1.0 (branco)
    Para 30% de transparência, usa-se transparency=0.3, resultado é 30% cor + 70% branco
    """
    if hex_color is None:
        return None
    
    # Remove o # se existir
    hex_color = hex_color.lstrip('#')
    
    # Parse RGB
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    
    # Interpolar com branco (255, 255, 255) para simular transparência
    # resultado = cor_original * transparency + branco * (1 - transparency)
    r_new = int(r * transparency + 255 * (1 - transparency))
    g_new = int(g * transparency + 255 * (1 - transparency))
    b_new = int(b * transparency + 255 * (1 - transparency))
    
    # Retornar em formato RGB hex (sem o alfa que não é suportado)
    return f"FF{r_new:02X}{g_new:02X}{b_new:02X}"


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def relatorios_download(request):
    """
    Endpoint para download de relatório em Excel.
    
    Query params:
    - data_inicio: data no formato YYYY-MM-DD (padrão: 7 dias atrás)
    - data_fim: data no formato YYYY-MM-DD (padrão: hoje)
    - motorista_id: ID do motorista (opcional)
    - status: status da corrida (opcional)
    
    Returns: arquivo XLSX com todas as corridas
    """
    try:
        # Os mesmos perfis que podem consultar o relatório podem exportá-lo.
        user = request.user
        if getattr(user, 'nivel_acesso', None) not in [1, 2, 4]:
            return Response(
                {'detail': 'Você não tem permissão para exportar relatórios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        corridas, data_inicio, data_fim, filter_error = _filter_report_rides(request)
        if filter_error:
            return filter_error

        today = timezone.now().date()
        corridas = corridas.select_related('veiculo', 'motorista', 'criado_por').order_by('-data_solicitacao')
        
        # Criar workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Relatório de Corridas"
        
        # Definir estilos
        header_font = Font(bold=True, color="FFFFFFFF")
        header_fill = PatternFill(start_color="B31F4E78", end_color="B31F4E78", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        # Definir bordas
        thin_border = Border(
            left=Side(style='thin', color='000000'),
            right=Side(style='thin', color='000000'),
            top=Side(style='thin', color='000000'),
            bottom=Side(style='thin', color='000000')
        )
        header_border = Border(
            left=Side(style='thin', color='FFFFFF'),
            right=Side(style='thin', color='FFFFFF'),
            top=Side(style='thin', color='FFFFFF'),
            bottom=Side(style='thin', color='FFFFFF')
        )
        
        # Cabeçalho - Ordem reorganizada
        headers = [
            "ID",
            "Status",
            "Data Solicitação",
            "Motorista",
            "Veículo",
            "Ponto Início",
            "Paradas Intermediárias",
            "Ponto Chegada",
            "Serviço",
            "Observação",
            "Data Início",
            "Horário Saída",
            "Horário Retorno",
            "Data Conclusão",
            "Criado por"
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = header_border
        
        # Carregar cores personalizadas do arquivo JSON
        colors_data = load_status_colors()
        
        # Construir mapeamento de cores com base no JSON
        status_colors = {}
        for color_item in colors_data.get('colors', []):
            status_key = color_item.get('status', '')
            hex_color = color_item.get('color')
            # Converter HEX para ARGB com 30% de transparência (None se sem cor)
            argb_color = hex_to_argb(hex_color, transparency=0.3) if hex_color else None
            status_colors[status_key] = argb_color
        
        # Adicionar dados
        for row_num, corrida in enumerate(corridas, 2):
            # Formatar paradas intermediárias
            paradas_str = ""
            if corrida.paradas_intermediarias:
                if isinstance(corrida.paradas_intermediarias, list):
                    paradas_str = ", ".join([p.get('nome', '') for p in corrida.paradas_intermediarias if p.get('nome')])
                else:
                    paradas_str = str(corrida.paradas_intermediarias)
            
            # Formatar veículo (nome - placa)
            veiculo_str = "N/A"
            if corrida.veiculo:
                veiculo_str = f"{corrida.veiculo.nome} | {corrida.veiculo.placa}"
            
            # Obter cor baseada no status
            status_normalized = corrida.status.lower()
            color_argb = status_colors.get(status_normalized)
            
            # Aplicar cor apenas se houver cor definida
            if color_argb:
                cell_fill = PatternFill(start_color=color_argb, end_color=color_argb, fill_type="solid")
            else:
                # Sem cor - usar padrão
                cell_fill = PatternFill()
            
            # Sempre usar texto preto
            cell_font = Font(color="FF000000")
            
            cells_data = [
                (1, corrida.id_corrida),
                (2, corrida.status),
                (3, corrida.data_solicitacao.strftime('%d/%m/%Y %H:%M') if corrida.data_solicitacao else ""),
                (4, corrida.motorista.nome if corrida.motorista else "N/A"),
                (5, veiculo_str),
                (6, corrida.ponto_inicio),
                (7, paradas_str),
                (8, corrida.ponto_chegada),
                (9, corrida.servico),
                (10, corrida.observacao),
                (11, corrida.data_inicio.strftime('%d/%m/%Y') if corrida.data_inicio else ""),
                (12, corrida.horario_inicio.strftime('%H:%M') if corrida.horario_inicio else ""),
                (13, corrida.horario_retorno.strftime('%H:%M') if corrida.horario_retorno else ""),
                (14, corrida.data_conclusao.strftime('%d/%m/%Y %H:%M') if corrida.data_conclusao else ""),
                (15, corrida.criado_por.nome if corrida.criado_por else "N/A")
            ]
            
            for col_num, value in cells_data:
                cell = ws.cell(row=row_num, column=col_num)
                cell.value = value
                cell.fill = cell_fill
                cell.font = cell_font
                cell.border = thin_border
        
        # Ajustar largura das colunas - Nova ordem
        column_widths = [8, 12, 18, 15, 20, 20, 25, 20, 20, 20, 12, 12, 12, 18, 15]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[chr(64 + col_num)].width = width
        
        # Congelar a primeira linha
        ws.freeze_panes = "A2"
        
        # Salvar em memória
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        # Gerar nome do arquivo com formato: "relatorio_corridas DD/MM/YYYY - DD/MM/YYYY.xlsx"
        if data_inicio and data_fim:
            filename = f"relatorio_corridas {data_inicio:%d-%m-%Y} - {data_fim:%d-%m-%Y}.xlsx"
        elif data_inicio:
            filename = f"relatorio_corridas a partir de {data_inicio:%d-%m-%Y}.xlsx"
        elif data_fim:
            filename = f"relatorio_corridas ate {data_fim:%d-%m-%Y}.xlsx"
        else:
            today_str = today.strftime('%d-%m-%Y')
            filename = f"relatorio_corridas {today_str}.xlsx"
        
        # Retornar arquivo com header Content-Disposition manual
        response = FileResponse(
            output,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(output.getvalue())
        return response
    
    except Exception as e:
        return Response(
            {'error': f'Erro ao gerar arquivo: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notificacoes_contagem(request):
    """
    Endpoint para contar notificações não lidas do usuário.
    
    Returns:
    {
        "total_nao_lidas": int,
        "ultimas_nao_lidas": [
            {
                "id_notificacao": int,
                "titulo": str,
                "tipo": str,
                "data_criacao": datetime
            }
        ]
    }
    """
    try:
        user = request.user
        
        # Contar não lidas
        total_nao_lidas = Notificacao.objects.filter(usuario=user, lida=False).count()
        
        # Últimas 5 não lidas
        ultimas_nao_lidas = Notificacao.objects.filter(
            usuario=user, 
            lida=False
        ).order_by('-data_criacao')[:5].values(
            'id_notificacao', 'titulo', 'tipo', 'data_criacao'
        )
        
        response_data = {
            'total_nao_lidas': total_nao_lidas,
            'ultimas_nao_lidas': list(ultimas_nao_lidas)
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Erro ao contar notificações: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Caminho para armazenar as cores personalizadas
STATUS_COLORS_FILE = os.path.join(settings.BASE_DIR, 'autenticacao', 'status_colors.json')


def get_default_status_colors():
    """Retorna as cores padrão para os status"""
    return {
        'colors': [
            {'status': 'pendente', 'label': 'Pendente', 'color': '#F8C400'},
            {'status': 'confirmada', 'label': 'Confirmada', 'color': '#34C759'},
            {'status': 'reconfirmacao_necessaria', 'label': 'Reconfirmação', 'color': '#F8C400'},
            {'status': 'em_andamento', 'label': 'Em Andamento', 'color': '#1D4ED8'},
            {'status': 'concluida', 'label': 'Concluída', 'color': '#007AFF'},
            {'status': 'cancelada', 'label': 'Cancelada', 'color': '#FF3B30'},
            {'status': 'recusada', 'label': 'Recusada', 'color': '#FF3B30'},
        ]
    }


def load_status_colors():
    """Carrega as cores personalizadas do arquivo JSON"""
    try:
        if os.path.exists(STATUS_COLORS_FILE):
            with open(STATUS_COLORS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f'Erro ao carregar cores: {str(e)}')
    
    return get_default_status_colors()


def save_status_colors(colors_data):
    """Salva as cores personalizadas em arquivo JSON"""
    try:
        os.makedirs(os.path.dirname(STATUS_COLORS_FILE), exist_ok=True)
        with open(STATUS_COLORS_FILE, 'w', encoding='utf-8') as f:
            json.dump(colors_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f'Erro ao salvar cores: {str(e)}')
        return False


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def status_colors(request):
    """
    Endpoint para gerenciar cores personalizadas dos status.
    
    GET: Retorna as cores personalizadas atuais
    POST: Salva as cores personalizadas
    
    Body do POST:
    {
        "colors": [
            {"status": "pendente", "label": "Pendente", "color": "#F8C400"},
            ...
        ]
    }
    """
    try:
        user = request.user
        allowed_roles = [1, 2, 4] if request.method == 'GET' else [1]
        if getattr(user, 'nivel_acesso', None) not in allowed_roles:
            return Response(
                {'error': 'Você não tem permissão para acessar estas cores'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            colors_data = load_status_colors()
            return Response(colors_data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            colors_data = request.data
            
            # Validar estrutura
            if 'colors' not in colors_data or not isinstance(colors_data['colors'], list):
                return Response(
                    {'error': 'Estrutura inválida. Deve conter "colors" como array'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar cada cor (formato hex ou null)
            for color_item in colors_data['colors']:
                if 'color' not in color_item:
                    return Response(
                        {'error': 'Cada cor deve ter um campo "color"'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                color_hex = color_item['color']
                
                # Permitir null (cores removidas)
                if color_hex is None:
                    continue
                
                # Validar formato hex
                if not isinstance(color_hex, str) or not color_hex.startswith('#') or len(color_hex) != 7:
                    return Response(
                        {'error': f'Cor inválida: {color_hex}. Use formato #RRGGBB ou deixe como null'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validar se são dígitos hex válidos
                try:
                    int(color_hex[1:], 16)
                except ValueError:
                    return Response(
                        {'error': f'Cor inválida: {color_hex}. Deve ser um valor hexadecimal válido'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Salvar as cores
            if save_status_colors(colors_data):
                return Response(
                    {'message': 'Cores salvas com sucesso', 'colors': colors_data},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Erro ao salvar as cores'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    except Exception as e:
        return Response(
            {'error': f'Erro ao processar cores: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
