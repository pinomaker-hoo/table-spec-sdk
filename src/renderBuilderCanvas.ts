import type { ParsedTable, BuilderCanvasOptions } from './types';
import {
  computeBuilderLayout,
  resolveDisplayOptions,
  BUILDER_HEADER_HEIGHT,
  BUILDER_ROW_HEIGHT,
  BUILDER_DETAIL_ROW_HEIGHT,
} from './builderLayout';
import type { BuilderTableBox, BuilderFKRelationship, BuilderLayout } from './builderLayout';
import { BUILDER_COLORS } from './styles';
import { escapeXml } from './utils';
import { renderBuilderNodeSVG } from './renderBuilderTableNode';

function getColumnAnchor(
  box: BuilderTableBox,
  columnName: string,
  side: 'left' | 'right',
): { x: number; y: number } {
  const xPos = side === 'left' ? box.x : box.x + box.width;

  const colIndex = box.columns.findIndex((c) => c.name === columnName);
  if (colIndex === -1) {
    return { x: xPos, y: box.y + box.headerHeight + BUILDER_ROW_HEIGHT / 2 };
  }

  let yOffset = 0;
  for (let i = 0; i < colIndex; i++) {
    yOffset += box.columns[i].hasDetailRow ? BUILDER_DETAIL_ROW_HEIGHT : BUILDER_ROW_HEIGHT;
  }

  return {
    x: xPos,
    y: box.y + BUILDER_HEADER_HEIGHT + yOffset + BUILDER_ROW_HEIGHT / 2,
  };
}

function renderFKLineSVG(
  layout: BuilderLayout,
  rel: BuilderFKRelationship,
): string {
  const boxMap = new Map<string, BuilderTableBox>();
  for (const b of layout.tableBoxes) boxMap.set(b.tableName, b);

  const fromBox = boxMap.get(rel.fromTable);
  const toBox = boxMap.get(rel.toTable);
  if (!fromBox || !toBox) return '';

  // Self-referencing
  if (rel.fromTable === rel.toTable) {
    const fromAnchor = getColumnAnchor(fromBox, rel.fromColumn, 'right');
    const toAnchor = getColumnAnchor(fromBox, rel.toColumn, 'right');
    const loopOffset = 30;
    return `<path d="M ${fromAnchor.x} ${fromAnchor.y} C ${fromAnchor.x + loopOffset} ${fromAnchor.y}, ${toAnchor.x + loopOffset} ${toAnchor.y}, ${toAnchor.x} ${toAnchor.y}" fill="none" stroke="${BUILDER_COLORS.fkLineColor}" stroke-width="1" opacity="0.6" />`;
  }

  const fromCenterX = fromBox.x + fromBox.width / 2;
  const toCenterX = toBox.x + toBox.width / 2;
  const fromSide: 'left' | 'right' = fromCenterX < toCenterX ? 'right' : 'left';
  const toSide: 'left' | 'right' = fromCenterX < toCenterX ? 'left' : 'right';

  const from = getColumnAnchor(fromBox, rel.fromColumn, fromSide);
  const to = getColumnAnchor(toBox, rel.toColumn, toSide);

  const cpOffset = Math.min(Math.abs(to.x - from.x) * 0.4, 80);
  const cp1x = fromSide === 'right' ? from.x + cpOffset : from.x - cpOffset;
  const cp2x = toSide === 'left' ? to.x - cpOffset : to.x + cpOffset;

  return `<path d="M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="${BUILDER_COLORS.fkLineColor}" stroke-width="1" opacity="0.6" marker-end="url(#builder-arrowhead)" />`;
}

export function renderBuilderCanvas(
  tables: ParsedTable[],
  options?: BuilderCanvasOptions,
): string {
  const opts = resolveDisplayOptions(options?.displayOptions);
  const showGrid = options?.showGrid ?? true;
  const title = options?.title;

  const layout = computeBuilderLayout(tables, options?.displayOptions, title);
  const { canvasWidth, canvasHeight, tableBoxes, relationships } = layout;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="100%" style="max-width:${canvasWidth}px;background:${BUILDER_COLORS.canvasBg};border-radius:8px;">`;

  // Defs
  svg += `<defs>`;

  // Grid pattern
  if (showGrid) {
    svg += `<pattern id="builder-grid" width="20" height="20" patternUnits="userSpaceOnUse">`;
    svg += `<circle cx="10" cy="10" r="0.5" fill="${BUILDER_COLORS.gridDotColor}" />`;
    svg += `</pattern>`;
  }

  // Shadow filter
  svg += `<filter id="builder-shadow" x="-4%" y="-4%" width="108%" height="108%">`;
  svg += `<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />`;
  svg += `</filter>`;

  // Arrowhead marker
  svg += `<marker id="builder-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">`;
  svg += `<polygon points="0 0, 8 3, 0 6" fill="${BUILDER_COLORS.fkArrowColor}" opacity="0.7" />`;
  svg += `</marker>`;

  svg += `</defs>`;

  // Background
  svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="${BUILDER_COLORS.canvasBg}" />`;

  // Grid
  if (showGrid) {
    svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="url(#builder-grid)" />`;
  }

  // Title
  if (title) {
    svg += `<text x="60" y="35" font-family="-apple-system,'Segoe UI',sans-serif" font-size="16" font-weight="bold" fill="${BUILDER_COLORS.primaryText}">${escapeXml(title)}</text>`;
    svg += `<text x="60" y="55" font-family="-apple-system,'Segoe UI',sans-serif" font-size="12" fill="${BUILDER_COLORS.mutedText}">${tableBoxes.length} Tables, ${relationships.length} Relationships</text>`;
  }

  // FK lines (behind nodes)
  for (const rel of relationships) {
    svg += renderFKLineSVG(layout, rel);
  }

  // Table nodes (on top)
  for (const box of tableBoxes) {
    svg += renderBuilderNodeSVG(box, opts);
  }

  svg += `</svg>`;
  return svg;
}
