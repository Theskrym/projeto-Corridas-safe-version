import { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import "../components/geral/GeralCSS.css";
import api from "../api/axios.ts";
import Header from '../components/common/HeaderFULL.tsx';
import BottomMenu from '../components/common/BottomMenu.tsx';
import SideBarMenu from '../components/common/SideBarMenu.tsx';

const wheelHueOffset = 60;

// Estilos para os sliders
const sliderStyles = `
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
  }
  
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #333;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: 2px solid #333;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`;

interface StatusColor {
  status: string;
  label: string;
  color: string | null; // formato #RRGGBB ou null (removido)
}

const StatusColorsPage = () => {
  const navigate = useNavigate();
  const [statusColors, setStatusColors] = useState<StatusColor[]>([
    { status: 'pendente', label: 'Pendente', color: '#F8C400' },
    { status: 'confirmada', label: 'Confirmada', color: '#34C759' },
    { status: 'em_andamento', label: 'Em Andamento', color: '#1D4ED8' },
    { status: 'concluida', label: 'Concluída', color: '#007AFF' },
    { status: 'cancelada', label: 'Cancelada', color: '#FF3B30' },
    { status: 'recusada', label: 'Recusada', color: '#FF3B30' },
  ]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [originalColor, setOriginalColor] = useState<string>('#FFFFFF');
  const modalRef = useRef<HTMLDivElement>(null);
  const hueWheelRef = useRef<HTMLDivElement>(null);
  const shadePickerRef = useRef<HTMLDivElement>(null);
  const shadeCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeWheelModeRef = useRef<'hue' | 'shade' | null>(null);
  const selectedHueRef = useRef(0);
  const selectedShadeRef = useRef({ x: 0.5, y: 0 });

  // Carregar cores personalizadas do backend
  useEffect(() => {
    const loadColors = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/status-colors/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.data.colors) {
          setStatusColors(response.data.colors);
        }
        setError(null);
      } catch (err: any) {
        // Se não existirem cores personalizadas, usa o padrão (não é erro)
        console.log('Usando cores padrão');
      } finally {
        setLoading(false);
      }
    };

    loadColors();
  }, [navigate]);

  // Fechar modal ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setSelectedStatus(null);
      }
    };

    if (selectedStatus) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedStatus]);

  // Atualizar cor de um status
  const handleColorChange = (status: string, newColor: string | null) => {
    setStatusColors(
      statusColors.map(sc =>
        sc.status === status ? { ...sc, color: newColor } : sc
      )
    );
    setSuccess(null);
  };

  // Salvar cores no backend
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const payload = {
        colors: statusColors
      };

      await api.post('/status-colors/', payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setSuccess('Cores salvas com sucesso!');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message ||
        err.response?.data?.detail ||
        'Erro ao salvar cores';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Resetar para cores padrão
  const handleReset = () => {
    setStatusColors([
      { status: 'pendente', label: 'Pendente', color: '#F8C400' },
      { status: 'confirmada', label: 'Confirmada', color: '#34C759' },
      { status: 'em_andamento', label: 'Em Andamento', color: '#1D4ED8' },
      { status: 'concluida', label: 'Concluída', color: '#007AFF' },
      { status: 'cancelada', label: 'Cancelada', color: '#FF3B30' },
      { status: 'recusada', label: 'Recusada', color: '#FF3B30' },
    ]);
    setError(null);
    setSuccess(null);
  };

  // Remover cores (setar como null)
  const handleRemoveColors = () => {
    setStatusColors(
      statusColors.map(sc => ({
        ...sc,
        color: null
      }))
    );
    setError(null);
    setSuccess(null);
  };

  // Converter HEX para RGB
  const hexToRgb = (hex: string | null): { r: number; g: number; b: number } => {
    if (!hex) return { r: 0, g: 0, b: 0 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Converter RGB para HEX
  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  const rgbToHsv = (r: number, g: number, b: number) => {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let hue = 0;

    if (delta) {
      if (max === red) hue = 60 * (((green - blue) / delta) % 6);
      else if (max === green) hue = 60 * ((blue - red) / delta + 2);
      else hue = 60 * ((red - green) / delta + 4);
    }

    return { h: hue < 0 ? hue + 360 : hue, s: max ? delta / max : 0, v: max };
  };

  const hsvToHex = (h: number, s: number, v: number) => {
    const chroma = v * s;
    const segment = (h / 60) % 2;
    const second = chroma * (1 - Math.abs(segment - 1));
    const match = v - chroma;
    const channels = h < 60 ? [chroma, second, 0] : h < 120 ? [second, chroma, 0] :
      h < 180 ? [0, chroma, second] : h < 240 ? [0, second, chroma] :
        h < 300 ? [second, 0, chroma] : [chroma, 0, second];
    return rgbToHex(...channels.map(channel => Math.round((channel + match) * 255)) as [number, number, number]);
  };

  const trianglePositionFromHsv = (s: number, v: number) => ({
    x: v * s,
    y: 1 - v + v * s / 2
  });

  const triangleToHex = (h: number, x: number, y: number) => {
    const hueRgb = hexToRgb(hsvToHex(h, 1, 1));
    const whiteWeight = Math.max(0, Math.min(1, 1 - y - x / 2));
    const hueWeight = Math.max(0, Math.min(1, x));
    return rgbToHex(
      Math.round(255 * whiteWeight + hueRgb.r * hueWeight),
      Math.round(255 * whiteWeight + hueRgb.g * hueWeight),
      Math.round(255 * whiteWeight + hueRgb.b * hueWeight)
    );
  };

  useEffect(() => {
    const canvas = shadeCanvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    const image = context.createImageData(canvas.width, canvas.height);
    const hueRgb = hexToRgb(hsvToHex(selectedHueRef.current, 1, 1));

    for (let pixelY = 0; pixelY < canvas.height; pixelY += 1) {
      const y = pixelY / canvas.height;
      const leftEdge = 0;
      const rightEdge = y <= 0.5 ? 2 * y : 2 * (1 - y);
      for (let pixelX = 0; pixelX < canvas.width; pixelX += 1) {
        const x = pixelX / canvas.width;
        if (x < leftEdge || x > rightEdge) continue;
        const whiteWeight = Math.max(0, 1 - y - x / 2);
        const hueWeight = x;
        const index = (pixelY * canvas.width + pixelX) * 4;
        image.data[index] = Math.round(255 * whiteWeight + hueRgb.r * hueWeight);
        image.data[index + 1] = Math.round(255 * whiteWeight + hueRgb.g * hueWeight);
        image.data[index + 2] = Math.round(255 * whiteWeight + hueRgb.b * hueWeight);
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, canvas.height);
    context.lineTo(canvas.width, canvas.height / 2);
    context.closePath();
    context.strokeStyle = '#000';
    context.lineWidth = 2 * scale;
    context.stroke();
  }, [selectedStatus, statusColors]);

  const updateFromWheel = (event: React.PointerEvent<HTMLDivElement>, mode: 'hue' | 'shade', allowOutside = false) => {
    const target = mode === 'hue' ? hueWheelRef.current : shadePickerRef.current;
    if (!target || !selectedStatus) return false;
    const bounds = target.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;

    if (mode === 'hue') {
      const angle = Math.atan2(y - bounds.height / 2, x - bounds.width / 2) * 180 / Math.PI;
      const hue = (angle + 90 + wheelHueOffset + 360) % 360;
      selectedHueRef.current = hue;
      handleColorChange(selectedStatus, triangleToHex(hue, selectedShadeRef.current.x, selectedShadeRef.current.y));
    } else {
      const pointer = { x: x / bounds.width, y: y / bounds.height };
      const triangleY = pointer.y;
      const leftEdge = 0;
      const rightEdge = triangleY <= 0.5 ? 2 * triangleY : 2 * (1 - triangleY);
      const isInsideTriangle = triangleY >= 0 && triangleY <= 1 && pointer.x >= leftEdge && pointer.x <= rightEdge;
      if (!isInsideTriangle && !allowOutside) return false;
      const boundedY = Math.max(0, Math.min(1, triangleY));
      const boundedLeftEdge = 0;
      const boundedRightEdge = boundedY <= 0.5 ? 2 * boundedY : 2 * (1 - boundedY);
      const triangleX = Math.max(boundedLeftEdge, Math.min(boundedRightEdge, pointer.x));
      selectedShadeRef.current = { x: triangleX, y: boundedY };
      handleColorChange(selectedStatus, triangleToHex(selectedHueRef.current, triangleX, boundedY));
    }

    return true;
  };

  const handleWheelPointerDown = (event: React.PointerEvent<HTMLDivElement>, mode: 'hue' | 'shade') => {
    if (activeWheelModeRef.current) return;
    activeWheelModeRef.current = mode;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!updateFromWheel(event, mode)) {
      activeWheelModeRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheelPointerUp = () => {
    activeWheelModeRef.current = null;
  };

  // Atualizar cor via slider RGB
  const handleRgbChange = (component: 'r' | 'g' | 'b', value: number) => {
    const currentColor = statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000';
    const rgb = hexToRgb(currentColor);
    rgb[component] = value;
    const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
    if (selectedStatus) {
      handleColorChange(selectedStatus, newHex);
    }
  };

  // Função para determinar cor de texto (preto ou branco) baseado na cor de fundo
  const getContrastColor = (hexColor: string | null): string => {
    if (!hexColor) return '#333333';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  };

  if (loading) {
    return (
      <div className="home-main-container">
        <Header title="Configurar Cores de Status" showLeft={true} showRight={true} />
        <div className="home-content-wrapper">
          <SideBarMenu />
          <main className="conteudo status-colors-content">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              Carregando...
            </div>
          </main>
        </div>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className="home-main-container">
      <style>{sliderStyles}</style>
      <Header title="Configurar Cores de Status" showLeft={true} showRight={true} />

      <div className="home-content-wrapper">
        <SideBarMenu />

        <main className="conteudo status-colors-content">
          {error && (
            <div style={{
              color: '#d32f2f',
              backgroundColor: '#ffebee',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              color: '#388e3c',
              backgroundColor: '#e8f5e9',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              {success}
            </div>
          )}

          <div className="status-color-grid">
            {statusColors.map((statusColor) => (
              <div
                className="status-color-card"
                key={statusColor.status}
                onClick={() => {
                  setSelectedStatus(statusColor.status);
                  if (statusColor.color) {
                    setOriginalColor(statusColor.color);
                    const currentRgb = hexToRgb(statusColor.color);
                    const currentHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b);
                    selectedHueRef.current = currentHsv.h;
                    selectedShadeRef.current = trianglePositionFromHsv(currentHsv.s, currentHsv.v);
                  } else {
                    selectedHueRef.current = 0;
                    selectedShadeRef.current = { x: 0.5, y: 0 };
                  }
                }}
                style={{
                  backgroundColor: statusColor.color || '#f5f5f5',
                  padding: '30px',
                  borderRadius: '8px',
                  border: statusColor.color ? '2px solid #ddd' : '2px dashed #999',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  minHeight: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div className="status-color-editor-grid" style={{
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: getContrastColor(statusColor.color),
                  marginBottom: '8px'
                }}>
                  {statusColor.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: getContrastColor(statusColor.color),
                  opacity: 0.8
                }}>
                  {statusColor.color || 'Sem cor'}
                </div>
              </div>
            ))}
          </div>

          {/* Modal do Color Picker */}
          {selectedStatus && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}
            >
              <div
                ref={modalRef}
                className="status-color-modal"
                style={{
                  backgroundColor: 'white',
                  padding: '30px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  width: '700px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                <div style={{
                  marginBottom: '0px',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#333',
                  textAlign: 'center'
                }}>
                  Selecionar Cor
                </div>

                {/* Preview da cor - Topo */}
                <div
                  style={{
                    width: '100%',
                    height: '80px',
                    borderRadius: '8px',
                    border: '2px solid #ddd',
                    marginBottom: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  {/* Cor Anterior (topo) */}
                  <div
                    style={{
                      backgroundColor: originalColor || '#f5f5f5',
                      width: '100%',
                      height: '50%',
                      border: !originalColor ? '1px dashed #999' : 'none'
                    }}
                  />
                  {/* Cor Atual (fundo) */}
                  <div
                    style={{
                      backgroundColor: statusColors.find(sc => sc.status === selectedStatus)?.color || '#f5f5f5',
                      width: '100%',
                      height: '50%',
                      border: !statusColors.find(sc => sc.status === selectedStatus)?.color ? '1px dashed #999' : 'none'
                    }}
                  />
                </div>

                {/* Layout em 2 colunas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  minHeight: '250px'
                }}>
                  {/* COLUNA ESQUERDA - Barras RGB + Campo HEX */}
                  <div className="color-wheel-column" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}>
                    {(() => {
                      const displayHue = selectedHueRef.current;
                      const displayX = selectedShadeRef.current.x;
                      const displayY = selectedShadeRef.current.y;
                                      const displayPoint = { x: displayX, y: displayY };
                      return (
                        <div
                          ref={hueWheelRef}
                          className="color-wheel"
                          onPointerDown={(event) => {
                            if (event.target !== event.currentTarget || activeWheelModeRef.current) return;
                            const shadeBounds = shadePickerRef.current?.getBoundingClientRect();
                            if (shadeBounds && event.clientX >= shadeBounds.left && event.clientX <= shadeBounds.right &&
                              event.clientY >= shadeBounds.top && event.clientY <= shadeBounds.bottom) return;
                            handleWheelPointerDown(event, 'hue');
                          }}
                          onPointerMove={(event) => event.target === event.currentTarget && activeWheelModeRef.current === 'hue' && updateFromWheel(event, 'hue', true)}
                          onPointerUp={handleWheelPointerUp}
                          onPointerCancel={handleWheelPointerUp}
                          role="slider"
                          aria-label="Matiz da cor"
                          aria-valuenow={Math.round(displayHue)}
                          tabIndex={0}
                        >
                          <div
                            ref={shadePickerRef}
                            className="color-shade-picker"
                            style={{ '--picker-color': `hsl(${displayHue}, 100%, 50%)` } as React.CSSProperties}
                            onPointerDown={(event) => { event.stopPropagation(); handleWheelPointerDown(event, 'shade'); }}
                            onPointerMove={(event) => activeWheelModeRef.current === 'shade' && updateFromWheel(event, 'shade', true)}
                            onPointerUp={handleWheelPointerUp}
                            onPointerCancel={handleWheelPointerUp}
                            role="slider"
                            aria-label="Saturacao e brilho da cor"
                            aria-valuenow={Math.round(displayY * 100)}
                            tabIndex={0}
                          >
                            <canvas ref={shadeCanvasRef} className="color-shade-canvas" aria-hidden="true" />
                            <span
                              className="color-shade-handle"
                              style={{
                                left: `${displayPoint.x * 100}%`,
                                top: `${displayPoint.y * 100}%`,
                                backgroundColor: statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000',
                                transform: 'translate(-50%, -50%)'
                              }}
                            />
                          </div>
                          <span
                            className="color-wheel-handle"
                            style={{
                              left: `calc(50% + ${Math.sin((displayHue - wheelHueOffset) * Math.PI / 180) * 114.4}px)`,
                              top: `calc(50% - ${Math.cos((displayHue - wheelHueOffset) * Math.PI / 180) * 114.4}px)`,
                              transform: `translate(-50%, -50%) rotate(${displayHue - wheelHueOffset}deg)`
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Sliders RGB */}
                    <div className="status-rgb-controls">
                      {/* Slider Vermelho */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#FF0000' }}>
                            R
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                            {hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').r}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').r}
                          onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '4px',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(255,0,0))',
                            outline: 'none',
                            cursor: 'pointer',
                          } as any}
                        />
                      </div>

                      {/* Slider Verde */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#00AA00' }}>
                            G
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                            {hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').g}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').g}
                          onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '4px',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(0,255,0))',
                            outline: 'none',
                            cursor: 'pointer',
                          } as any}
                        />
                      </div>

                      {/* Slider Azul */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0000FF' }}>
                            B
                          </label>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>
                            {hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').b}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="255"
                          value={hexToRgb(statusColors.find(sc => sc.status === selectedStatus)?.color || '#000000').b}
                          onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '4px',
                            background: 'linear-gradient(to right, rgb(0,0,0), rgb(0,0,255))',
                            outline: 'none',
                            cursor: 'pointer',
                          } as any}
                        />
                      </div>
                    </div>

                    {/* Campo HEX */}
                    <input
                      type="text"
                      value={statusColors.find(sc => sc.status === selectedStatus)?.color || ''}
                      onChange={(e) => {
                        const hex = e.target.value;
                        if (hex === '') {
                          handleColorChange(selectedStatus, null);
                        } else if (/^#[0-9A-F]{6}$/i.test(hex)) {
                          const enteredRgb = hexToRgb(hex);
                          const enteredHsv = rgbToHsv(enteredRgb.r, enteredRgb.g, enteredRgb.b);
                          if (enteredHsv.s > 0.001) selectedHueRef.current = enteredHsv.h;
                          selectedShadeRef.current = trianglePositionFromHsv(enteredHsv.s, enteredHsv.v);
                          handleColorChange(selectedStatus, hex);
                        }
                      }}
                      placeholder="Vazio = sem cor"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        textAlign: 'center'
                      }}
                    />
                  </div>

                  {/* COLUNA DIREITA - Cores Rápidas + Botão */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}>
                    {/* Paleta de cores predefinidas */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#666',
                        marginBottom: '10px'
                      }}>
                        Cores Rápidas:
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px'
                      }}>
                        {[
                          '#FF0000', '#FF6B6B', '#FF9999', '#FFCC00', '#FFD700', '#FFA500',
                          '#00CC00', '#34C759', '#66BB6A', '#0066FF', '#007AFF', '#1D4ED8',
                          '#9933FF', '#9C27B0', '#E91E63', '#FF1744', '#00BCD4', '#FFFFFF',
                          '#666666', '#999999', '#CCCCCC', '#000000', '#F8C400', '#FF3B30'
                        ].map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              const quickRgb = hexToRgb(color);
                              const quickHsv = rgbToHsv(quickRgb.r, quickRgb.g, quickRgb.b);
                              selectedHueRef.current = quickHsv.h;
                              selectedShadeRef.current = trianglePositionFromHsv(quickHsv.s, quickHsv.v);
                              handleColorChange(selectedStatus, color);
                            }}
                            style={{
                              backgroundColor: color,
                              width: '100%',
                              height: '30px',
                              border: statusColors.find(sc => sc.status === selectedStatus)?.color === color
                                ? '3px solid #333'
                                : '1px solid #ddd',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title={color}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Botão Fechar */}
                    <button
                      onClick={() => setSelectedStatus(null)}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#1976D2';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#2196F3';
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="status-color-actions">
            <button
              className="secondary-btn secondary-btn-confirm status-color-action-button"
              onClick={handleSave}
              disabled={saving}
              style={{
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Salvando...' : 'Salvar Cores'}
            </button>

            <button
              className="secondary-btn secondary-btn-cancel status-color-action-button"
              onClick={handleReset}
              style={{
                cursor: 'pointer'
              }}
            >
              Resetar Padrão
            </button>

            <button
              className="secondary-btn secondary-btn-delete status-color-action-button"
              onClick={handleRemoveColors}
              style={{
                cursor: 'pointer'
              }}
            >
              Remover Cores
            </button>

            <button
              className="secondary-btn secondary-btn-cancel status-color-action-button"
              onClick={() => navigate('/gerar-relatorio')}
              style={{
                cursor: 'pointer'
              }}
            >
              Voltar
            </button>
          </div>
        </main>
      </div>

      <BottomMenu />
    </div>
  );
};

export default StatusColorsPage;
