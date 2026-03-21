import type { ParsedTable, ERDOptions } from './types';
import { computeERDLayout, MAX_COLUMNS_SHOWN } from './erdLayout';
import type { ERDLayout, TableBox, FKRelationship } from './erdLayout';
import { COLORS } from './styles';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + '…';
}

function renderTableBoxSVG(box: TableBox, maxColumnsShown: number): string {
  const { x, y, width, height, headerHeight, rowHeight, columns, totalColumns, tableName } = box;
  let svg = '';

  // Shadow filter reference (defined in defs)
  // Background rect
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" ry="4" fill="${COLORS.erdNormalRowBg}" filter="url(#shadow)" />`;

  // Header background
  svg += `<clipPath id="header-clip-${escapeXml(tableName)}">`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" rx="4" ry="4" />`;
  svg += `</clipPath>`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="${COLORS.erdHeaderBg}" clip-path="url(#header-clip-${escapeXml(tableName)})" />`;
  // Fill the bottom corners of header (since clipPath rounds all 4 corners)
  svg += `<rect x="${x}" y="${y + headerHeight - 4}" width="${width}" height="4" fill="${COLORS.erdHeaderBg}" />`;

  // Header text
  const headerText = truncateText(tableName, 28);
  svg += `<text x="${x + 6}" y="${y + headerHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="11" font-weight="bold" fill="${COLORS.erdHeaderText}" dominant-baseline="central">${escapeXml(headerText)}</text>`;

  // Column rows
  const bodyY = y + headerHeight;
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const rowY = bodyY + i * rowHeight;

    // Row background
    let rowBg: string;
    if (col.isPrimaryKey) {
      rowBg = COLORS.erdPkRowBg;
    } else if (col.isForeignKey) {
      rowBg = COLORS.erdFkRowBg;
    } else {
      rowBg = i % 2 === 0 ? COLORS.erdNormalRowBg : COLORS.erdAlternateRowBg;
    }
    svg += `<rect x="${x + 1}" y="${rowY}" width="${width - 2}" height="${rowHeight}" fill="${rowBg}" />`;

    // Badge
    let badgeWidth = 0;
    if (col.isPrimaryKey || col.isForeignKey) {
      const label = col.isPrimaryKey ? 'PK' : 'FK';
      const bgColor = col.isPrimaryKey ? COLORS.erdPkBadgeBg : COLORS.erdFkBadgeBg;
      const textColor = col.isPrimaryKey ? COLORS.erdPkBadgeText : COLORS.erdFkBadgeText;

      const bw = label === 'PK' ? 20 : 18;
      const bh = 11;
      const bx = x + 4;
      const by = rowY + (rowHeight - bh) / 2;

      svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" ry="2" fill="${bgColor}" />`;
      svg += `<text x="${bx + 3}" y="${rowY + rowHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="7" font-weight="bold" fill="${textColor}" dominant-baseline="central">${label}</text>`;
      badgeWidth = bw + 4;
    }

    // Column name
    const nameX = x + 4 + badgeWidth;
    const colName = truncateText(col.name, 18);
    svg += `<text x="${nameX}" y="${rowY + rowHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="10" fill="${COLORS.erdColumnName}" dominant-baseline="central">${escapeXml(colName)}</text>`;

    // Data type (right-aligned)
    const typeText = truncateText(col.dataType, 12);
    svg += `<text x="${x + width - 4}" y="${rowY + rowHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="9" fill="${COLORS.erdColumnType}" dominant-baseline="central" text-anchor="end">${escapeXml(typeText)}</text>`;
  }

  // Overflow indicator
  if (totalColumns > maxColumnsShown) {
    const overflowY = bodyY + columns.length * rowHeight;
    svg += `<rect x="${x + 1}" y="${overflowY}" width="${width - 2}" height="${rowHeight}" fill="${COLORS.erdAlternateRowBg}" />`;
    svg += `<text x="${x + 6}" y="${overflowY + rowHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="9" font-style="italic" fill="${COLORS.erdOverflowText}" dominant-baseline="central">... +${totalColumns - maxColumnsShown} more</text>`;
  }

  // Border
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" ry="4" fill="none" stroke="${COLORS.erdBorderColor}" stroke-width="1" />`;

  return svg;
}

function getColumnAnchor(
  box: TableBox, columnName: string, side: 'left' | 'right', maxColumnsShown: number
): { x: number; y: number } {
  const colIndex = box.columns.findIndex((c) => c.name === columnName);
  const xPos = side === 'left' ? box.x : box.x + box.width;

  if (colIndex === -1 || colIndex >= maxColumnsShown) {
    return { x: xPos, y: box.y + box.height - box.rowHeight / 2 };
  }
  return {
    x: xPos,
    y: box.y + box.headerHeight + colIndex * box.rowHeight + box.rowHeight / 2,
  };
}

function renderFKLineSVG(
  layout: ERDLayout,
  rel: FKRelationship,
  maxColumnsShown: number
): string {
  const boxMap = new Map<string, TableBox>();
  for (const b of layout.tableBoxes) boxMap.set(b.tableName, b);

  const fromBox = boxMap.get(rel.fromTable);
  const toBox = boxMap.get(rel.toTable);
  if (!fromBox || !toBox) return '';

  // Self-referencing
  if (rel.fromTable === rel.toTable) {
    const fromAnchor = getColumnAnchor(fromBox, rel.fromColumn, 'right', maxColumnsShown);
    const toAnchor = getColumnAnchor(fromBox, rel.toColumn, 'right', maxColumnsShown);
    const loopOffset = 25;
    return `<path d="M ${fromAnchor.x} ${fromAnchor.y} C ${fromAnchor.x + loopOffset} ${fromAnchor.y}, ${toAnchor.x + loopOffset} ${toAnchor.y}, ${toAnchor.x} ${toAnchor.y}" fill="none" stroke="${COLORS.erdFkLineColor}" stroke-width="0.8" opacity="0.5" />`;
  }

  const fromCenterX = fromBox.x + fromBox.width / 2;
  const toCenterX = toBox.x + toBox.width / 2;
  const fromSide: 'left' | 'right' = fromCenterX < toCenterX ? 'right' : 'left';
  const toSide: 'left' | 'right' = fromCenterX < toCenterX ? 'left' : 'right';

  const from = getColumnAnchor(fromBox, rel.fromColumn, fromSide, maxColumnsShown);
  const to = getColumnAnchor(toBox, rel.toColumn, toSide, maxColumnsShown);

  const cpOffset = Math.min(Math.abs(to.x - from.x) * 0.4, 80);
  const cp1x = fromSide === 'right' ? from.x + cpOffset : from.x - cpOffset;
  const cp2x = toSide === 'left' ? to.x - cpOffset : to.x + cpOffset;

  return `<path d="M ${from.x} ${from.y} C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="${COLORS.erdFkLineColor}" stroke-width="0.8" opacity="0.5" marker-end="url(#erd-arrowhead)" />`;
}

export function renderERD(tables: ParsedTable[], options?: ERDOptions): string {
  const maxColumnsShown = options?.maxColumnsShown ?? MAX_COLUMNS_SHOWN;
  const layout = computeERDLayout(tables, maxColumnsShown);

  const { canvasWidth, canvasHeight, tableBoxes, relationships } = layout;
  const tableCount = tableBoxes.length;
  const relCount = relationships.length;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="100%" style="max-width:${canvasWidth}px;background:${COLORS.erdBackground};border-radius:8px;">`;

  // Defs: shadow filter + arrowhead marker
  svg += `<defs>`;
  svg += `<filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">`;
  svg += `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.08)" />`;
  svg += `</filter>`;
  svg += `<marker id="erd-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">`;
  svg += `<polygon points="0 0, 8 3, 0 6" fill="${COLORS.erdFkLineColor}" opacity="0.5" />`;
  svg += `</marker>`;
  svg += `</defs>`;

  // Background
  svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="${COLORS.erdBackground}" />`;

  // Title
  svg += `<text x="80" y="35" font-family="-apple-system,'Segoe UI',sans-serif" font-size="20" font-weight="bold" fill="${COLORS.erdTitleText}">ERD Diagram</text>`;
  svg += `<text x="80" y="55" font-family="-apple-system,'Segoe UI',sans-serif" font-size="13" fill="${COLORS.erdSubtitleText}">${tableCount} Tables, ${relCount} Relationships</text>`;

  // FK lines (draw behind tables)
  for (const rel of relationships) {
    svg += renderFKLineSVG(layout, rel, maxColumnsShown);
  }

  // Table boxes (draw on top)
  for (const box of tableBoxes) {
    svg += renderTableBoxSVG(box, maxColumnsShown);
  }

  svg += `</svg>`;
  return svg;
}
