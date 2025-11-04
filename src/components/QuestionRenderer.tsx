import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface ExcalidrawData {
  type: 'excalidraw';
  version: number;
  source: string;
  elements: any[];
}

interface QuestionRendererProps {
  content: string;
  className?: string;
}

export function QuestionRenderer({ content, className = '' }: QuestionRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      const excalidrawMatch = content.match(/\{[\s\S]*"type":\s*"excalidraw"[\s\S]*\}/);

      if (excalidrawMatch) {
        const excalidrawData: ExcalidrawData = JSON.parse(excalidrawMatch[0]);
        const textBefore = content.substring(0, excalidrawMatch.index);
        const textAfter = content.substring(excalidrawMatch.index! + excalidrawMatch[0].length);

        const beforeDiv = document.createElement('div');
        beforeDiv.className = 'mb-4';
        renderKaTeX(textBefore, beforeDiv);

        const svgContainer = document.createElement('div');
        svgContainer.className = 'my-6 p-4 bg-white border border-gray-200 rounded-lg';
        svgContainer.innerHTML = generateSVGFromExcalidraw(excalidrawData);

        const afterDiv = document.createElement('div');
        afterDiv.className = 'mt-4';
        renderKaTeX(textAfter, afterDiv);

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(beforeDiv);
        containerRef.current.appendChild(svgContainer);
        containerRef.current.appendChild(afterDiv);
      } else {
        renderKaTeX(content, containerRef.current);
      }
    } catch (error) {
      console.error('Error rendering content:', error);
      containerRef.current.textContent = content;
    }
  }, [content]);

  return <div ref={containerRef} className={`question-content ${className}`} />;
}

function renderKaTeX(text: string, container: HTMLElement) {
  container.innerHTML = '';

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\text\{[^}]*\}|\\frac\{[^}]*\}\{[^}]*\}|\\[a-zA-Z]+)/g);

  parts.forEach((part) => {
    if (!part) return;

    try {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2);
        const span = document.createElement('div');
        span.className = 'my-2';
        katex.render(math, span, { displayMode: true, throwOnError: false });
        container.appendChild(span);
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        const span = document.createElement('span');
        katex.render(math, span, { displayMode: false, throwOnError: false });
        container.appendChild(span);
      } else if (part.startsWith('\\')) {
        const span = document.createElement('span');
        katex.render(part, span, { displayMode: false, throwOnError: false });
        container.appendChild(span);
      } else {
        const textNode = document.createTextNode(part);
        container.appendChild(textNode);
      }
    } catch (error) {
      const textNode = document.createTextNode(part);
      container.appendChild(textNode);
    }
  });
}

function generateSVGFromExcalidraw(data: ExcalidrawData): string {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  data.elements.forEach((el) => {
    if (el.type === 'text') {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + 100);
      maxY = Math.max(maxY, el.y + 30);
    } else if (el.type === 'rectangle' || el.type === 'ellipse') {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    } else if (el.type === 'polygon' || el.type === 'line') {
      el.points.forEach(([px, py]: [number, number]) => {
        minX = Math.min(minX, el.x + px);
        minY = Math.min(minY, el.y + py);
        maxX = Math.max(maxX, el.x + px);
        maxY = Math.max(maxY, el.y + py);
      });
    }
  });

  const padding = 20;
  const viewBoxWidth = maxX - minX + padding * 2;
  const viewBoxHeight = maxY - minY + padding * 2;

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - padding} ${minY - padding} ${viewBoxWidth} ${viewBoxHeight}" width="100%" height="auto">`;

  data.elements.forEach((el) => {
    const strokeColor = el.strokeColor || '#000000';
    const backgroundColor = el.backgroundColor || 'transparent';
    const strokeWidth = el.strokeWidth || 2;

    if (el.type === 'rectangle') {
      svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"
        stroke="${strokeColor}" fill="${backgroundColor}" stroke-width="${strokeWidth}" />`;
    } else if (el.type === 'ellipse') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      svgContent += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
        stroke="${strokeColor}" fill="${backgroundColor}" stroke-width="${strokeWidth}" />`;
    } else if (el.type === 'polygon') {
      const points = el.points.map(([x, y]: [number, number]) => `${el.x + x},${el.y + y}`).join(' ');
      svgContent += `<polygon points="${points}"
        stroke="${strokeColor}" fill="${backgroundColor}" stroke-width="${strokeWidth}" />`;
    } else if (el.type === 'line') {
      const points = el.points.map(([x, y]: [number, number]) => `${el.x + x},${el.y + y}`).join(' ');
      svgContent += `<polyline points="${points}"
        stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}" />`;
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 16;
      svgContent += `<text x="${el.x}" y="${el.y + fontSize}"
        font-size="${fontSize}" font-family="Arial, sans-serif" fill="${strokeColor}">${el.text}</text>`;
    }
  });

  svgContent += '</svg>';
  return svgContent;
}
