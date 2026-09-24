import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Minus,
  Square,
  Circle,
  Type,
  RotateCcw,
  Trash2,
  Download,
  Grid,
  Palette,
  Users,
  Maximize2,
  Check,
  Sparkles,
} from 'lucide-react';
import { WhiteboardStroke, WhiteboardTool, WhiteboardPoint } from '../../types';
import { getSocket } from '../../lib/socket';

interface SharedWhiteboardProps {
  roomId: string;
  studentName: string;
  initialStrokes?: WhiteboardStroke[];
  isDarkMode?: boolean;
}

const PRESET_COLORS = [
  '#0f172a', // Slate 900 / Dark
  '#2563eb', // Blue 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#dc2626', // Red 600
  '#7c3aed', // Purple 600
  '#db2777', // Pink 600
  '#ffffff', // White
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
  { label: 'Marker', value: 16 },
];

export const SharedWhiteboard: React.FC<SharedWhiteboardProps> = ({
  roomId,
  studentName,
  initialStrokes = [],
  isDarkMode = false,
}) => {
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(initialStrokes);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>(isDarkMode ? '#60a5fa' : '#2563eb');
  const [width, setWidth] = useState<number>(4);
  const [gridType, setGridType] = useState<'none' | 'dots' | 'grid'>('grid');
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<WhiteboardPoint | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const [activeCollaborators, setActiveCollaborators] = useState<string[]>([]);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPointsRef = useRef<WhiteboardPoint[]>([]);

  // Keep strokes ref for event listeners
  const strokesRef = useRef<WhiteboardStroke[]>(strokes);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Redraw canvas helper
  const redrawCanvas = useCallback(
    (canvas: HTMLCanvasElement, strokeList: WhiteboardStroke[], previewStroke?: WhiteboardStroke) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Save transform and clear
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background grid if selected
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.scale(dpr, dpr);

      // Background styling
      if (isDarkMode) {
        ctx.fillStyle = '#0f172a'; // slate-900
      } else {
        ctx.fillStyle = '#f8fafc'; // slate-50
      }
      ctx.fillRect(0, 0, w, h);

      // Background grid lines / dots for math/diagrams
      if (gridType === 'grid') {
        ctx.strokeStyle = isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';
        ctx.lineWidth = 1;
        const gridSize = 24;
        ctx.beginPath();
        for (let x = 0; x <= w; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      } else if (gridType === 'dots') {
        ctx.fillStyle = isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(203, 213, 225, 0.9)';
        const dotGap = 24;
        for (let x = dotGap; x < w; x += dotGap) {
          for (let y = dotGap; y < h; y += dotGap) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw all persisted strokes
      const allToRender = previewStroke ? [...strokeList, previewStroke] : strokeList;

      for (const s of allToRender) {
        if (!s.points || s.points.length === 0) continue;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (s.tool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width * 2.5;
        } else if (s.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
          ctx.lineWidth = s.width * 3;
        } else {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.width;
        }

        if (s.tool === 'pen' || s.tool === 'highlighter' || s.tool === 'eraser') {
          if (s.points.length === 1) {
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let i = 1; i < s.points.length; i++) {
              // Smooth quadratic curve through midpoints
              const p1 = s.points[i - 1];
              const p2 = s.points[i];
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            ctx.lineTo(s.points[s.points.length - 1].x, s.points[s.points.length - 1].y);
            ctx.stroke();
          }
        } else if (s.tool === 'line') {
          const start = s.points[0];
          const end = s.points[s.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        } else if (s.tool === 'rectangle') {
          const start = s.points[0];
          const end = s.points[s.points.length - 1];
          const rx = Math.min(start.x, end.x);
          const ry = Math.min(start.y, end.y);
          const rw = Math.abs(start.x - end.x);
          const rh = Math.abs(start.y - end.y);
          ctx.beginPath();
          ctx.rect(rx, ry, rw, rh);
          ctx.stroke();
        } else if (s.tool === 'circle') {
          const start = s.points[0];
          const end = s.points[s.points.length - 1];
          const radiusX = Math.abs(end.x - start.x) / 2;
          const radiusY = Math.abs(end.y - start.y) / 2;
          const centerX = Math.min(start.x, end.x) + radiusX;
          const centerY = Math.min(start.y, end.y) + radiusY;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (s.tool === 'text' && s.text) {
          ctx.fillStyle = s.color;
          ctx.font = `${Math.max(14, s.width * 4)}px sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(s.text, s.points[0].x, s.points[0].y);
        }

        ctx.restore();
      }

      ctx.restore();
    },
    [gridType, isDarkMode]
  );

  // Resize canvas according to container
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawCanvas(canvas, strokesRef.current);
  }, [redrawCanvas]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Initial and remote strokes change
  useEffect(() => {
    if (canvasRef.current) {
      redrawCanvas(canvasRef.current, strokes);
    }
  }, [strokes, redrawCanvas]);

  // Socket collaboration listeners
  useEffect(() => {
    const socket = getSocket();

    const handleRemoteStroke = (remoteStroke: WhiteboardStroke) => {
      setStrokes((prev) => [...prev, remoteStroke]);
      // Track remote contributor
      if (remoteStroke.authorName && remoteStroke.authorName !== studentName) {
        setActiveCollaborators((prev) => {
          if (!prev.includes(remoteStroke.authorName)) {
            return [...prev, remoteStroke.authorName];
          }
          return prev;
        });
      }
    };

    const handleWhiteboardCleared = () => {
      setStrokes([]);
      if (canvasRef.current) {
        redrawCanvas(canvasRef.current, []);
      }
    };

    const handleWhiteboardStateUpdated = (updatedStrokes: WhiteboardStroke[]) => {
      setStrokes(updatedStrokes);
    };

    socket.on('whiteboard_stroke_received', handleRemoteStroke);
    socket.on('whiteboard_cleared', handleWhiteboardCleared);
    socket.on('whiteboard_state_updated', handleWhiteboardStateUpdated);

    return () => {
      socket.off('whiteboard_stroke_received', handleRemoteStroke);
      socket.off('whiteboard_cleared', handleWhiteboardCleared);
      socket.off('whiteboard_state_updated', handleWhiteboardStateUpdated);
    };
  }, [redrawCanvas, studentName]);

  // Coordinates helper
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): WhiteboardPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (tool === 'text') {
      setTextInputPosition(pt);
      setTextInputValue('');
      return;
    }

    setIsDrawing(true);
    currentPointsRef.current = [pt];

    if (canvasRef.current) {
      const preview: WhiteboardStroke = {
        id: 'preview',
        tool,
        color,
        width,
        points: [pt],
        authorName: studentName,
        timestamp: Date.now(),
      };
      redrawCanvas(canvasRef.current, strokes, preview);
    }
  };

  // Move drawing
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      currentPointsRef.current.push(pt);
    } else {
      // Shape tools: update end point
      if (currentPointsRef.current.length > 1) {
        currentPointsRef.current[1] = pt;
      } else {
        currentPointsRef.current.push(pt);
      }
    }

    if (canvasRef.current) {
      const preview: WhiteboardStroke = {
        id: 'preview',
        tool,
        color,
        width,
        points: currentPointsRef.current,
        authorName: studentName,
        timestamp: Date.now(),
      };
      redrawCanvas(canvasRef.current, strokes, preview);
    }
  };

  // End drawing & publish
  const finishDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPointsRef.current.length > 0) {
      const newStroke: WhiteboardStroke = {
        id: 'stroke_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        tool,
        color,
        width,
        points: [...currentPointsRef.current],
        authorName: studentName,
        timestamp: Date.now(),
      };

      setStrokes((prev) => [...prev, newStroke]);

      // Broadcast stroke to peers in room
      const socket = getSocket();
      socket.emit('whiteboard_stroke', {
        roomId,
        stroke: newStroke,
      });
    }

    currentPointsRef.current = [];
  };

  // Handle text placement submit
  const handlePlaceText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInputPosition || !textInputValue.trim()) {
      setTextInputPosition(null);
      setTextInputValue('');
      return;
    }

    const newStroke: WhiteboardStroke = {
      id: 'stroke_txt_' + Date.now(),
      tool: 'text',
      color,
      width,
      points: [textInputPosition],
      text: textInputValue.trim(),
      authorName: studentName,
      timestamp: Date.now(),
    };

    setStrokes((prev) => [...prev, newStroke]);
    const socket = getSocket();
    socket.emit('whiteboard_stroke', {
      roomId,
      stroke: newStroke,
    });

    setTextInputPosition(null);
    setTextInputValue('');
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));

    const socket = getSocket();
    socket.emit('whiteboard_undo', {
      roomId,
      strokeId: lastStroke.id,
    });
  };

  // Clear board
  const handleClear = () => {
    setStrokes([]);
    setClearConfirmOpen(false);

    const socket = getSocket();
    socket.emit('whiteboard_clear', {
      roomId,
      studentName,
    });
  };

  // Download / Export as PNG
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Stuflix_Whiteboard_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div
      id="shared-whiteboard-container"
      ref={containerRef}
      className="relative flex-1 w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 select-none overflow-hidden"
    >
      {/* Top Floating Whiteboard Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg max-w-[95vw] overflow-x-auto">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 pr-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTool('pen')}
            title="Pen (P)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'pen'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Pen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('highlighter')}
            title="Highlighter (H)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'highlighter'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('line')}
            title="Line (L)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'line'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('rectangle')}
            title="Rectangle (R)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'rectangle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('circle')}
            title="Circle (C)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'circle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('text')}
            title="Text Note (T)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'text'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setTool('eraser')}
            title="Eraser (E)"
            className={`p-2 rounded-xl text-xs font-medium transition cursor-pointer ${
              tool === 'eraser'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-200 dark:border-slate-800">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              style={{ backgroundColor: preset }}
              className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 transition transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                color === preset ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900 scale-110' : ''
              }`}
            >
              {color === preset && (
                <span className={`w-1.5 h-1.5 rounded-full ${preset === '#ffffff' ? 'bg-slate-900' : 'bg-white'}`} />
              )}
            </button>
          ))}
          {/* Custom color input */}
          <label
            title="Custom color"
            className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-blue-500"
          >
            <Palette className="w-3 h-3 text-slate-500" />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1 px-1 border-r border-slate-200 dark:border-slate-800">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.value}
              type="button"
              onClick={() => setWidth(sw.value)}
              title={`${sw.label} stroke (${sw.value}px)`}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                width === sw.value
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {sw.label}
            </button>
          ))}
        </div>

        {/* Grid Background Selector */}
        <div className="flex items-center gap-1 px-1 border-r border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() =>
              setGridType((prev) => (prev === 'grid' ? 'dots' : prev === 'dots' ? 'none' : 'grid'))
            }
            title={`Toggle Grid (Current: ${gridType})`}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Actions: Undo, Clear, Export */}
        <div className="flex items-center gap-1 pl-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setClearConfirmOpen(true)}
            disabled={strokes.length === 0}
            title="Clear Whiteboard"
            className="p-2 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExport}
            title="Export as PNG"
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collaborators indicator badge in corner */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-xs text-slate-600 dark:text-slate-300 pointer-events-none">
        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="font-medium">Shared Canvas</span>
        {activeCollaborators.length > 0 && (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            • {activeCollaborators.join(', ')} active
          </span>
        )}
      </div>

      {/* Main Drawing Canvas */}
      <canvas
        id="collaborative-whiteboard-canvas"
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={finishDrawing}
        className={`w-full h-full block touch-none ${
          tool === 'pen'
            ? 'cursor-crosshair'
            : tool === 'highlighter'
            ? 'cursor-crosshair'
            : tool === 'eraser'
            ? 'cursor-cell'
            : tool === 'text'
            ? 'cursor-text'
            : 'cursor-crosshair'
        }`}
      />

      {/* Floating Text Note Input popup */}
      {textInputPosition && (
        <form
          onSubmit={handlePlaceText}
          className="absolute z-30 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-xl border border-blue-500 flex items-center gap-2"
          style={{
            left: `${textInputPosition.x}px`,
            top: `${textInputPosition.y}px`,
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            placeholder="Type note & press Enter..."
            className="px-2 py-1 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none min-w-[180px]"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium cursor-pointer shadow-xs"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setTextInputPosition(null)}
            className="px-1.5 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
          >
            ✕
          </button>
        </form>
      )}

      {/* Clear Confirmation Modal */}
      {clearConfirmOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 mx-auto mb-3 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Clear Shared Whiteboard?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              This will erase all current drawing annotations for everyone in the room.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
              >
                Clear for All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
