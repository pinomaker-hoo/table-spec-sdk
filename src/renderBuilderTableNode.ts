import type { ParsedTable, BuilderTableNodeOptions } from './types';
import {
  BUILDER_HEADER_HEIGHT,
  BUILDER_ROW_HEIGHT,
  BUILDER_DETAIL_ROW_HEIGHT,
  resolveDisplayOptions,
  computeNodeWidth,
  computeNodeHeight,
  getRowHeight,
} from './builderLayout';
import type { BuilderTableBox, BuilderColumnEntry, ResolvedDisplayOptions } from './builderLayout';
import { BUILDER_COLORS } from './styles';
import { escapeXml, truncateText, sanitizeId } from './utils';

function renderBadgeSVG(
  label: string,
  bx: number,
  centerY: number,
): { svg: string; width: number } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    PK: { bg: BUILDER_COLORS.pkBadgeBg, text: BUILDER_COLORS.pkBadgeText },
    FK: { bg: BUILDER_COLORS.fkBadgeBg, text: BUILDER_COLORS.fkBadgeText },
    UQ: { bg: BUILDER_COLORS.uqBadgeBg, text: BUILDER_COLORS.uqBadgeText },
    AI: { bg: BUILDER_COLORS.aiBadgeBg, text: BUILDER_COLORS.aiBadgeText },
  };
  const c = colorMap[label] || { bg: BUILDER_COLORS.borderColor, text: BUILDER_COLORS.secondaryText };

  const bw = label.length * 6 + 8;
  const bh = 12;
  const by = centerY - bh / 2;

  let svg = '';
  svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="${c.bg}" />`;
  svg += `<text x="${bx + bw / 2}" y="${centerY}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="8" font-weight="bold" fill="${c.text}" dominant-baseline="central" text-anchor="middle">${label}</text>`;

  return { svg, width: bw + 3 };
}

export function renderBuilderNodeSVG(
  box: BuilderTableBox,
  opts: ResolvedDisplayOptions,
): string {
  const { x, y, width, height, headerHeight, columns, tableName, tableComment } = box;
  const safeId = sanitizeId(tableName);
  let svg = '';

  // Node background with shadow
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ry="6" fill="${BUILDER_COLORS.nodeBg}" filter="url(#builder-shadow)" />`;

  // Header background
  svg += `<clipPath id="bh-${safeId}">`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" rx="6" ry="6" />`;
  svg += `</clipPath>`;
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="${BUILDER_COLORS.nodeHeaderBg}" clip-path="url(#bh-${safeId})" />`;
  svg += `<rect x="${x}" y="${y + headerHeight - 4}" width="${width}" height="4" fill="${BUILDER_COLORS.nodeHeaderBg}" />`;

  // Header text: table name
  const headerText = truncateText(tableName, 28);
  svg += `<text x="${x + 8}" y="${y + headerHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="11" font-weight="bold" fill="${BUILDER_COLORS.primaryText}" dominant-baseline="central">${escapeXml(headerText)}</text>`;

  // Header comment (right-aligned, if present)
  if (tableComment) {
    const commentText = truncateText(tableComment, 12);
    svg += `<text x="${x + width - 8}" y="${y + headerHeight / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="8" fill="${BUILDER_COLORS.dimText}" dominant-baseline="central" text-anchor="end">${escapeXml(commentText)}</text>`;
  }

  // Column rows
  let rowY = y + headerHeight;

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const currentRowHeight = col.hasDetailRow ? BUILDER_DETAIL_ROW_HEIGHT : BUILDER_ROW_HEIGHT;
    const mainRowCenterY = rowY + BUILDER_ROW_HEIGHT / 2;

    // Row background
    let rowBg: string;
    if (col.isPrimaryKey) {
      rowBg = BUILDER_COLORS.pkRowBg;
    } else if (col.isForeignKey) {
      rowBg = BUILDER_COLORS.fkRowBg;
    } else {
      rowBg = i % 2 === 0 ? BUILDER_COLORS.nodeBg : BUILDER_COLORS.nodeAltBg;
    }
    svg += `<rect x="${x + 1}" y="${rowY}" width="${width - 2}" height="${currentRowHeight}" fill="${rowBg}" />`;

    // Constraint badges
    let badgeX = x + 4;

    if (opts.showConstraints) {
      if (col.isPrimaryKey) {
        const badge = renderBadgeSVG('PK', badgeX, mainRowCenterY);
        svg += badge.svg;
        badgeX += badge.width;
      }
      if (col.isForeignKey) {
        const badge = renderBadgeSVG('FK', badgeX, mainRowCenterY);
        svg += badge.svg;
        badgeX += badge.width;
      }
    }
    if (opts.showUnique && col.isUnique) {
      const badge = renderBadgeSVG('UQ', badgeX, mainRowCenterY);
      svg += badge.svg;
      badgeX += badge.width;
    }
    if (opts.showAutoIncrement && col.isAutoIncrement) {
      const badge = renderBadgeSVG('AI', badgeX, mainRowCenterY);
      svg += badge.svg;
      badgeX += badge.width;
    }

    // Column name
    const nameX = badgeX + 2;
    const colName = truncateText(col.name, 18);
    svg += `<text x="${nameX}" y="${mainRowCenterY}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="10" fill="${BUILDER_COLORS.primaryText}" dominant-baseline="central">${escapeXml(colName)}</text>`;

    // Data type (right-aligned)
    if (opts.showDataType) {
      const typeText = truncateText(col.dataType, 12);
      svg += `<text x="${x + width - 6}" y="${mainRowCenterY}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="9" fill="${BUILDER_COLORS.dimText}" dominant-baseline="central" text-anchor="end">${escapeXml(typeText)}</text>`;
    }

    // Detail sub-row
    if (col.hasDetailRow) {
      const detailY = rowY + BUILDER_ROW_HEIGHT + (BUILDER_DETAIL_ROW_HEIGHT - BUILDER_ROW_HEIGHT) / 2;
      const parts: string[] = [];
      if (opts.showNullable) {
        parts.push(col.nullable ? 'NULL' : 'NOT NULL');
      }
      if (opts.showDefault && col.defaultValue) {
        parts.push(`DEFAULT: ${col.defaultValue}`);
      }
      if (opts.showComment && col.comment) {
        parts.push(col.comment);
      }
      const detailText = truncateText(parts.join(' | '), 40);
      svg += `<text x="${x + 6}" y="${detailY}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="8" fill="${BUILDER_COLORS.dimText}" dominant-baseline="central">${escapeXml(detailText)}</text>`;
    }

    rowY += currentRowHeight;
  }

  // Empty state
  if (columns.length === 0) {
    svg += `<text x="${x + width / 2}" y="${y + headerHeight + BUILDER_ROW_HEIGHT / 2}" font-family="'SF Mono',Consolas,Monaco,monospace" font-size="9" fill="${BUILDER_COLORS.mutedText}" dominant-baseline="central" text-anchor="middle">No columns</text>`;
  }

  // Border
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ry="6" fill="none" stroke="${BUILDER_COLORS.borderColor}" stroke-width="1" />`;

  return svg;
}

export function renderBuilderTableNode(
  table: ParsedTable,
  options?: BuilderTableNodeOptions,
): string {
  const opts = resolveDisplayOptions(options?.displayOptions);
  const width = computeNodeWidth(table, opts);
  const height = computeNodeHeight(table, opts);
  const padding = 8;

  const columns = table.columns.map((c) => ({
    name: c.name,
    dataType: c.dataType,
    nullable: c.nullable,
    defaultValue: c.defaultValue,
    comment: c.comment,
    isPrimaryKey: c.isPrimaryKey,
    isForeignKey: c.isForeignKey,
    isUnique: c.isUnique,
    isAutoIncrement: c.isAutoIncrement,
    hasDetailRow: getRowHeight(c, opts) === BUILDER_DETAIL_ROW_HEIGHT,
  }));

  const box: BuilderTableBox = {
    tableName: table.name,
    tableComment: table.comment,
    x: padding,
    y: padding,
    width,
    height,
    headerHeight: BUILDER_HEADER_HEIGHT,
    columns,
  };

  const svgW = width + padding * 2;
  const svgH = height + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" style="background:transparent;">`;
  svg += `<defs>`;
  svg += `<filter id="builder-shadow" x="-4%" y="-4%" width="108%" height="108%">`;
  svg += `<feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />`;
  svg += `</filter>`;
  svg += `</defs>`;
  svg += renderBuilderNodeSVG(box, opts);
  svg += `</svg>`;

  return svg;
}
