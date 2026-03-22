import type { ParsedTable, ParsedColumn, BuilderTableViewOptions } from './types';
import { BUILDER_COLORS } from './styles';
import { escapeHtml, truncateText } from './utils';

function renderBadgeHTML(label: string): string {
  const colorMap: Record<string, { bg: string; text: string }> = {
    PK: { bg: BUILDER_COLORS.pkBadgeBg, text: BUILDER_COLORS.pkBadgeText },
    FK: { bg: BUILDER_COLORS.fkBadgeBg, text: BUILDER_COLORS.fkBadgeText },
    UQ: { bg: BUILDER_COLORS.uqBadgeBg, text: BUILDER_COLORS.uqBadgeText },
    AI: { bg: BUILDER_COLORS.aiBadgeBg, text: BUILDER_COLORS.aiBadgeText },
  };
  const c = colorMap[label] || { bg: BUILDER_COLORS.borderColor, text: BUILDER_COLORS.secondaryText };
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:3px;background:${c.bg};color:${c.text};margin-right:3px;">${label}</span>`;
}

function getConstraintBadges(col: ParsedColumn): string {
  const parts: string[] = [];
  if (col.isPrimaryKey) parts.push(renderBadgeHTML('PK'));
  if (col.isForeignKey) parts.push(renderBadgeHTML('FK'));
  if (col.isUnique) parts.push(renderBadgeHTML('UQ'));
  if (col.isAutoIncrement) parts.push(renderBadgeHTML('AI'));
  return parts.length > 0 ? parts.join('') : `<span style="color:${BUILDER_COLORS.borderColor};">-</span>`;
}

function renderLeftPanel(tables: ParsedTable[], selectedName: string): string {
  let items = '';
  for (const tbl of tables) {
    const isSelected = tbl.name === selectedName;
    const bg = isSelected ? BUILDER_COLORS.listSelectedBg : 'transparent';
    const nameColor = isSelected ? BUILDER_COLORS.accent : BUILDER_COLORS.primaryText;
    const commentText = tbl.comment ? ` — ${escapeHtml(truncateText(tbl.comment, 20))}` : '';

    items += `<div style="padding:8px 16px;border-bottom:1px solid rgba(74,85,104,0.3);background:${bg};">
      <div style="font-size:13px;color:${nameColor};font-family:'SF Mono',Consolas,Monaco,monospace;">${escapeHtml(tbl.name)}</div>
      <div style="font-size:11px;color:${BUILDER_COLORS.mutedText};margin-top:2px;">${tbl.columns.length} columns${commentText}</div>
    </div>`;
  }

  return `<div style="width:240px;min-width:240px;background:${BUILDER_COLORS.panelBg};border-right:1px solid ${BUILDER_COLORS.borderColor};overflow-y:auto;">
    <div style="padding:12px 16px;border-bottom:1px solid ${BUILDER_COLORS.borderColor};">
      <div style="font-weight:600;font-size:13px;color:${BUILDER_COLORS.primaryText};">Tables</div>
      <div style="font-size:11px;color:${BUILDER_COLORS.mutedText};margin-top:2px;">${tables.length} tables</div>
    </div>
    ${items}
  </div>`;
}

function renderRightPanel(table: ParsedTable): string {
  let rows = '';
  table.columns.forEach((col, i) => {
    const bg = i % 2 === 0 ? BUILDER_COLORS.panelBg : BUILDER_COLORS.alternateRowBg;
    const nullableStyle = col.nullable
      ? `color:${BUILDER_COLORS.mutedText};`
      : `color:#FC8181;font-weight:500;`;

    rows += `<tr style="background:${bg};">
      <td style="padding:6px 12px;text-align:center;color:${BUILDER_COLORS.mutedText};font-size:12px;">${i + 1}</td>
      <td style="padding:6px 12px;font-family:'SF Mono',Consolas,Monaco,monospace;color:${BUILDER_COLORS.primaryText};font-size:13px;">${escapeHtml(col.name)}</td>
      <td style="padding:6px 12px;text-align:center;font-family:'SF Mono',Consolas,Monaco,monospace;font-size:12px;color:${BUILDER_COLORS.secondaryText};">${escapeHtml(col.dataType)}</td>
      <td style="padding:6px 12px;text-align:center;font-size:12px;${nullableStyle}">${col.nullable ? 'NULL' : 'NOT NULL'}</td>
      <td style="padding:6px 12px;text-align:center;font-size:12px;color:${BUILDER_COLORS.mutedText};">${escapeHtml(col.defaultValue ?? '-')}</td>
      <td style="padding:6px 12px;text-align:center;">${getConstraintBadges(col)}</td>
      <td style="padding:6px 12px;color:${BUILDER_COLORS.secondaryText};font-size:12px;">${escapeHtml(col.comment || '-')}</td>
    </tr>`;
  });

  const commentStr = table.comment
    ? `<span style="color:${BUILDER_COLORS.mutedText};font-size:12px;margin-left:8px;">${escapeHtml(table.comment)}</span>`
    : '';

  return `<div style="flex:1;overflow-x:auto;">
    <div style="padding:12px 16px;border-bottom:1px solid ${BUILDER_COLORS.borderColor};background:${BUILDER_COLORS.panelBg};">
      <span style="font-weight:600;font-size:14px;color:${BUILDER_COLORS.accent};">${escapeHtml(table.name)}</span>
      ${commentStr}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:${BUILDER_COLORS.canvasBg};color:${BUILDER_COLORS.secondaryText};">
          <th style="padding:8px 12px;text-align:center;width:40px;">#</th>
          <th style="padding:8px 12px;text-align:left;">Name</th>
          <th style="padding:8px 12px;text-align:center;">Type</th>
          <th style="padding:8px 12px;text-align:center;">Nullable</th>
          <th style="padding:8px 12px;text-align:center;">Default</th>
          <th style="padding:8px 12px;text-align:center;">Constraints</th>
          <th style="padding:8px 12px;text-align:left;">Comment</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export function renderBuilderTableView(
  tables: ParsedTable[],
  options?: BuilderTableViewOptions,
): string {
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));

  if (sorted.length === 0) {
    return `<div style="display:flex;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:${BUILDER_COLORS.canvasBg};color:${BUILDER_COLORS.primaryText};border-radius:8px;border:1px solid ${BUILDER_COLORS.borderColor};padding:40px;justify-content:center;align-items:center;">
      <span style="color:${BUILDER_COLORS.mutedText};">No tables</span>
    </div>`;
  }

  const selectedName = options?.selectedTable
    && sorted.find((t) => t.name === options.selectedTable)
    ? options.selectedTable
    : sorted[0].name;

  const selectedTable = sorted.find((t) => t.name === selectedName)!;

  let html = `<div style="display:flex;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:${BUILDER_COLORS.canvasBg};color:${BUILDER_COLORS.primaryText};border-radius:8px;overflow:hidden;border:1px solid ${BUILDER_COLORS.borderColor};">`;
  html += renderLeftPanel(sorted, selectedName);
  html += renderRightPanel(selectedTable);
  html += `</div>`;

  return html;
}
