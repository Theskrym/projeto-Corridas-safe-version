import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { AppText as Text } from './AppText';

type Props = {
  label: string;
  color: string | null;
  onChange: (color: string | null) => void;
  onClose: () => void;
};

type Hsv = { h: number; x: number; y: number };
type Point = { x: number; y: number };
type PickerMode = 'hue' | 'shade';

const VIEW_SIZE = 180;
const TRIANGLE = { left: 54, top: 30, width: 108, height: 121 };
const OUTER_RADIUS = 89;
const INNER_RADIUS = 74.5;
const QUICK_COLORS = [
  '#FF0000', '#FF6B6B', '#FF9999', '#FFCC00',
  '#FFD700', '#FFA500', '#00CC00', '#34C759',
  '#66BB6A', '#0066FF', '#007AFF', '#1D4ED8',
  '#9933FF', '#9C27B0', '#E91E63', '#FF1744',
  '#00BCD4', '#FFFFFF', '#666666', '#999999',
  '#CCCCCC', '#000000', '#F8C400', '#FF3B30',
];

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function hexToHsv(color: string | null): Hsv {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color || '');
  if (!match) return { h: 0, x: 1, y: 0.5 };

  const [red, green, blue] = match.slice(1).map(value => parseInt(value, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  const saturation = max ? delta / max : 0;
  return { h: (hue + 360) % 360, x: max * saturation, y: 1 - max + max * saturation / 2 };
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const chroma = value * saturation;
  const segment = ((hue % 360) + 360) % 360 / 60;
  const second = chroma * (1 - Math.abs(segment % 2 - 1));
  const match = value - chroma;
  const channels = segment < 1 ? [chroma, second, 0]
    : segment < 2 ? [second, chroma, 0]
      : segment < 3 ? [0, chroma, second]
        : segment < 4 ? [0, second, chroma]
          : segment < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  return rgbToHex(...channels.map(channel => (channel + match) * 255) as [number, number, number]);
}

function triangleToHex(hue: number, x: number, y: number) {
  const hueColor = hsvToHex(hue, 1, 1);
  const red = parseInt(hueColor.slice(1, 3), 16);
  const green = parseInt(hueColor.slice(3, 5), 16);
  const blue = parseInt(hueColor.slice(5, 7), 16);
  const whiteWeight = Math.max(0, Math.min(1, 1 - y - x / 2));
  const hueWeight = Math.max(0, Math.min(1, x));
  return rgbToHex(
    255 * whiteWeight + red * hueWeight,
    255 * whiteWeight + green * hueWeight,
    255 * whiteWeight + blue * hueWeight,
  );
}

function rightEdge(y: number) {
  return y <= 0.5 ? 2 * y : 2 * (1 - y);
}

function polarPoint(radius: number, angle: number) {
  const radians = angle * Math.PI / 180;
  return { x: 90 + radius * Math.cos(radians), y: 90 + radius * Math.sin(radians) };
}

function arcPath(start: number, end: number) {
  const outerStart = polarPoint(OUTER_RADIUS, start);
  const outerEnd = polarPoint(OUTER_RADIUS, end);
  const innerEnd = polarPoint(INNER_RADIUS, end);
  const innerStart = polarPoint(INNER_RADIUS, start);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

const HUE_SEGMENTS = Array.from({ length: 360 }, (_, index) => {
  const start = -90 + index;
  const end = start + 1;
  const hue = (start + 0.5 + 150 + 360) % 360;
  return { path: arcPath(start - 0.5, end + 0.5), color: hsvToHex(hue, 1, 1) };
});

function getTriangleRows(hue: number) {
  const rowCount = 220;
  const overlap = 0.005;
  return Array.from({ length: rowCount }, (_, index) => {
    const baseY0 = index / rowCount;
    const baseY1 = (index + 1) / rowCount;
    const yMid = (baseY0 + baseY1) / 2;
    const y0 = Math.max(0, baseY0 - overlap);
    const y1 = Math.min(1, baseY1 + overlap);
    const right0 = rightEdge(y0);
    const right1 = rightEdge(y1);
    const rightMid = rightEdge(yMid);
    const x0 = TRIANGLE.left;
    const x1 = TRIANGLE.left + TRIANGLE.width * right1;
    const x2 = TRIANGLE.left + TRIANGLE.width * right0;
    const yStart = TRIANGLE.top + TRIANGLE.height * y0;
    const yEnd = TRIANGLE.top + TRIANGLE.height * y1;
    return {
      id: `shade-${index}`,
      leftColor: triangleToHex(hue, 0, yMid),
      rightColor: triangleToHex(hue, rightMid, yMid),
      points: `${x0},${yStart} ${x0},${yEnd} ${x1},${yEnd} ${x2},${yStart}`,
    };
  });
}

function ColorWheel({ hsv, onChange, size }: { hsv: Hsv; onChange: (value: Hsv) => void; size: number }) {
  const activeMode = useRef<PickerMode | null>(null);
  const shadeRows = useMemo(() => getTriangleRows(hsv.h), [hsv.h]);
  const huePoint = polarPoint(81, hsv.h - 150);
  const shadePoint = {
    x: TRIANGLE.left + TRIANGLE.width * hsv.x,
    y: TRIANGLE.top + TRIANGLE.height * hsv.y,
  };
  const hueColor = hsvToHex(hsv.h, 1, 1);
  const shadeColor = triangleToHex(hsv.h, hsv.x, hsv.y);

  function toPoint(event: GestureResponderEvent): Point {
    return {
      x: event.nativeEvent.locationX * VIEW_SIZE / size,
      y: event.nativeEvent.locationY * VIEW_SIZE / size,
    };
  }

  function modeAt(point: Point): PickerMode | null {
    const radius = Math.hypot(point.x - 90, point.y - 90);
    if (radius >= INNER_RADIUS - 1 && radius <= OUTER_RADIUS + 1) return 'hue';
    const x = (point.x - TRIANGLE.left) / TRIANGLE.width;
    const y = (point.y - TRIANGLE.top) / TRIANGLE.height;
    if (y >= 0 && y <= 1 && x >= 0 && x <= rightEdge(y)) return 'shade';
    return null;
  }

  function updateAt(point: Point, mode: PickerMode, allowOutside: boolean) {
    if (mode === 'hue') {
      const angle = Math.atan2(point.y - 90, point.x - 90) * 180 / Math.PI;
      const hue = (angle + 150 + 360) % 360;
      onChange({ ...hsv, h: hue });
      return;
    }

    const y = Math.max(0, Math.min(1, (point.y - TRIANGLE.top) / TRIANGLE.height));
    const edge = rightEdge(y);
    const x = Math.max(0, Math.min(edge, (point.x - TRIANGLE.left) / TRIANGLE.width));
    if (!allowOutside && modeAt(point) !== 'shade') return;
    onChange({ ...hsv, x, y });
  }

  const startResponder = (event: GestureResponderEvent) => {
    const point = toPoint(event);
    const mode = modeAt(point);
    if (!mode) return;
    activeMode.current = mode;
    updateAt(point, mode, false);
  };

  const moveResponder = (event: GestureResponderEvent) => {
    if (activeMode.current) updateAt(toPoint(event), activeMode.current, true);
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Seletor de matiz e tonalidade"
      accessibilityHint="Toque ou arraste no anel para mudar a matiz e no triângulo para ajustar a tonalidade."
      onStartShouldSetResponder={event => modeAt(toPoint(event)) !== null}
      onMoveShouldSetResponder={event => modeAt(toPoint(event)) !== null}
      onResponderGrant={startResponder}
      onResponderMove={moveResponder}
      onResponderRelease={() => { activeMode.current = null; }}
      onResponderTerminate={() => { activeMode.current = null; }}
      onResponderTerminationRequest={() => false}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} pointerEvents="none">
        {HUE_SEGMENTS.map((segment, index) => <Path key={index} d={segment.path} fill={segment.color} />)}
        <Circle cx="90" cy="90" r={OUTER_RADIUS} fill="none" stroke="#111111" strokeWidth="1.5" />
        <Circle cx="90" cy="90" r={INNER_RADIUS} fill="none" stroke="#111111" strokeWidth="1.5" />
        <Defs>
          {shadeRows.map(row => (
            <LinearGradient key={row.id} id={row.id} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={row.leftColor} />
              <Stop offset="100%" stopColor={row.rightColor} />
            </LinearGradient>
          ))}
        </Defs>
        {shadeRows.map(row => <Polygon key={row.id} points={row.points} fill={`url(#${row.id})`} />)}
        <Polygon
          points={`${TRIANGLE.left},${TRIANGLE.top} ${TRIANGLE.left},${TRIANGLE.top + TRIANGLE.height} ${TRIANGLE.left + TRIANGLE.width},90`}
          fill="none"
          stroke="#111111"
          strokeWidth="1.5"
        />
        <Circle cx={shadePoint.x} cy={shadePoint.y} r="5.5" fill={shadeColor} stroke="#111111" strokeWidth="3" />
        <Circle cx={shadePoint.x} cy={shadePoint.y} r="5.5" fill={shadeColor} stroke="#FFFFFF" strokeWidth="2" />
        <Rect
          x={huePoint.x - 2.5}
          y={huePoint.y - 9}
          width="5"
          height="18"
          rx="1.5"
          fill={hueColor}
          stroke="#111111"
          strokeWidth="3"
          transform={`rotate(${hsv.h - 60}, ${huePoint.x}, ${huePoint.y})`}
        />
        <Rect
          x={huePoint.x - 2.5}
          y={huePoint.y - 9}
          width="5"
          height="18"
          rx="1.5"
          fill={hueColor}
          stroke="#FFFFFF"
          strokeWidth="2"
          transform={`rotate(${hsv.h - 60}, ${huePoint.x}, ${huePoint.y})`}
        />
      </Svg>
    </View>
  );
}

export function StatusColorPicker({ label, color, onChange, onClose }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexDraft, setHexDraft] = useState(color || '');
  const invalidHex = hexDraft.length > 0 && !/^#[\da-f]{6}$/i.test(hexDraft);
  const modalWidth = Math.min(windowWidth * 0.92, 520);
  const contentWidth = modalWidth - 32;
  const compact = windowWidth < 360;
  const wheelSize = Math.min(230, windowWidth * 0.42, windowHeight * 0.4, compact ? contentWidth : contentWidth * 0.52);

  function applyHsv(next: Hsv) {
    const nextColor = triangleToHex(next.h, next.x, next.y);
    setHsv(next);
    setHexDraft(nextColor);
    onChange(nextColor);
  }

  function selectQuickColor(nextColor: string) {
    setHsv(hexToHsv(nextColor));
    setHexDraft(nextColor);
    onChange(nextColor);
  }

  function changeHex(value: string) {
    const nextValue = value.toUpperCase();
    setHexDraft(nextValue);
    if (!nextValue) {
      onChange(null);
    } else if (/^#[\da-f]{6}$/i.test(nextValue)) {
      setHsv(hexToHsv(nextValue));
      onChange(nextValue);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar seletor de cor" />
        <View style={[styles.modalCard, { width: modalWidth, maxHeight: windowHeight * 0.9 }]}>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>Selecionar Cor</Text>
            <View style={[styles.preview, { backgroundColor: color || '#F5F5F5', borderStyle: color ? 'solid' : 'dashed' }]} />
            <View style={[styles.pickerRow, compact && styles.pickerRowCompact]}>
              <View style={[styles.wheelColumn, !compact && { width: wheelSize }]}>
                <ColorWheel hsv={hsv} onChange={applyHsv} size={wheelSize} />
                <TextInput
                  accessibilityLabel={`Código hexadecimal da cor de ${label}`}
                  value={hexDraft}
                  onChangeText={changeHex}
                  autoCapitalize="characters"
                  maxLength={7}
                  placeholder="#RRGGBB"
                  style={[styles.hexInput, invalidHex && styles.hexInputError]}
                />
                {invalidHex ? <Text style={styles.hexError}>Use o formato #RRGGBB.</Text> : null}
                <Pressable accessibilityRole="button" onPress={() => { setHexDraft(''); onChange(null); }} hitSlop={8}>
                  <Text style={styles.clearColor}>Sem preenchimento</Text>
                </Pressable>
              </View>
              <View style={[styles.quickColumn, compact && styles.quickColumnCompact]}>
                <Text style={styles.sectionLabel}>Cores Rápidas:</Text>
                <View style={styles.swatches}>
                  {QUICK_COLORS.map(quickColor => (
                    <Pressable
                      key={quickColor}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar cor ${quickColor}`}
                      accessibilityState={{ selected: color?.toUpperCase() === quickColor }}
                      onPress={() => selectQuickColor(quickColor)}
                      style={[
                        styles.swatch,
                        { backgroundColor: quickColor },
                        color?.toUpperCase() === quickColor && styles.swatchSelected,
                      ]}
                    />
                  ))}
                </View>
                <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                  <Text style={styles.closeText}>Fechar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#00000080' },
  modalCard: { padding: 16, borderRadius: 8, backgroundColor: '#FFFFFF', elevation: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 },
  modalContent: { gap: 12, paddingBottom: 2 },
  title: { color: '#333333', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  preview: { height: 46, borderColor: '#DDDDDD', borderWidth: 1, borderRadius: 5 },
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pickerRowCompact: { flexDirection: 'column', alignItems: 'center' },
  wheelColumn: { alignItems: 'center', gap: 6 },
  quickColumn: { flex: 1, gap: 10 },
  quickColumnCompact: { width: '100%' },
  sectionLabel: { color: '#666666', fontSize: 12, fontWeight: '700' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  swatch: { width: '22%', height: 29, borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 3 },
  swatchSelected: { borderWidth: 3, borderColor: '#333333' },
  hexInput: { width: '100%', height: 27, paddingHorizontal: 8, borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 4, color: '#111111', fontFamily: 'monospace', fontSize: 11, textAlign: 'center' },
  hexInputError: { borderColor: '#D32F2F' },
  hexError: { color: '#D32F2F', fontSize: 11, textAlign: 'center' },
  clearColor: { color: '#555555', fontSize: 11, textAlign: 'center', textDecorationLine: 'underline' },
  closeButton: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 3, backgroundColor: '#2196F3' },
  closeButtonPressed: { backgroundColor: '#1976D2' },
  closeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
