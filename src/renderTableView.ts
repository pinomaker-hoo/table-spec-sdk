import type { ParsedTable, ParsedColumn, TableViewOptions } from './types';
import { COLORS } from './styles';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFKRelationshipMap(tables: ParsedTable[]): Map<string, Set<string>> {
  const relMap = new Map<string, Set<string>>();
  for (const table of tables) relMap.set(table.name, new Set<string>());
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isForeignKey && col.foreignKeyRef) {
        const ref = col.foreignKeyRef.table;
        if (ref !== table.name) {
          relMap.get(table.name)?.add(ref);
          if (!relMap.has(ref)) relMap.set(ref, new Set<string>());
          relMap.get(ref)?.add(table.name);
        }
      }
    }
  }
  return relMap;
}

function formatConstraints(col: ParsedColumn): string[] {
  const parts: string[] = [];
  if (col.isPrimaryKey) parts.push('PK');
  if (col.isForeignKey) parts.push('FK');
  if (col.isUnique) parts.push('UQ');
  if (col.isAutoIncrement) parts.push('AI');
  return parts;
}

function renderBadge(label: string): string {
  const colorMap: Record<string, { bg: string; text: string }> = {
    PK: { bg: COLORS.pkBadgeBg, text: COLORS.pkBadgeText },
    FK: { bg: COLORS.fkBadgeBg, text: COLORS.fkBadgeText },
    UQ: { bg: COLORS.uqBadgeBg, text: COLORS.uqBadgeText },
    AI: { bg: COLORS.aiBadgeBg, text: COLORS.aiBadgeText },
  };
  const c = colorMap[label] || { bg: COLORS.borderColor, text: COLORS.secondaryText };
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:3px;background:${c.bg};color:${c.text};margin-right:3px;">${label}</span>`;
}

function renderSummaryTable(tables: ParsedTable[], relMap: Map<string, Set<string>>): string {
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));

  let rows = '';
  sortedTables.forEach((tbl, i) => {
    const related = relMap.get(tbl.name);
    const relatedStr = related && related.size > 0
      ? Array.from(related).sort().join(', ')
      : '-';
    const bg = i % 2 === 0 ? COLORS.normalRowBg : COLORS.alternateRowBg;
    rows += `<tr style="background:${bg};">
      <td style="padding:8px 12px;text-align:center;color:${COLORS.mutedText};">${i + 1}</td>
      <td style="padding:8px 12px;font-family:monospace;color:${COLORS.accentText};">${escapeHtml(tbl.name)}</td>
      <td style="padding:8px 12px;color:${COLORS.secondaryText};">${escapeHtml(tbl.comment || '-')}</td>
      <td style="padding:8px 12px;color:${COLORS.mutedText};font-family:monospace;font-size:12px;">${escapeHtml(relatedStr)}</td>
    </tr>`;
  });

  return `<div style="background:${COLORS.tabBarBg};padding:12px 16px;border-bottom:1px solid ${COLORS.borderColor};">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-weight:600;color:${COLORS.primaryText};font-size:14px;">Table List</span>
      <span style="color:${COLORS.mutedText};font-size:13px;">${tables.length} tables</span>
    </div>
  </div>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:${COLORS.pageBg};color:${COLORS.secondaryText};">
          <th style="padding:8px 12px;text-align:center;width:40px;">#</th>
          <th style="padding:8px 12px;text-align:left;">Table Name</th>
          <th style="padding:8px 12px;text-align:left;">Description</th>
          <th style="padding:8px 12px;text-align:left;">FK Relations</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderTableDetail(table: ParsedTable, index: number): string {
  let rows = '';
  table.columns.forEach((col, i) => {
    const constraints = formatConstraints(col);
    const bg = i % 2 === 0 ? COLORS.normalRowBg : COLORS.alternateRowBg;
    const badges = constraints.length > 0
      ? constraints.map(renderBadge).join('')
      : `<span style="color:${COLORS.borderColor};">-</span>`;
    const nullableStyle = col.nullable
      ? `color:${COLORS.mutedText};`
      : `color:#FC8181;font-weight:500;`;

    rows += `<tr style="background:${bg};">
      <td style="padding:6px 12px;text-align:center;color:${COLORS.mutedText};font-size:12px;">${i + 1}</td>
      <td style="padding:6px 12px;font-family:monospace;color:${COLORS.primaryText};font-size:13px;">${escapeHtml(col.name)}</td>
      <td style="padding:6px 12px;text-align:center;font-family:monospace;font-size:12px;color:${COLORS.secondaryText};">${escapeHtml(col.dataType)}</td>
      <td style="padding:6px 12px;text-align:center;font-size:12px;${nullableStyle}">${col.nullable ? 'NULL' : 'NOT NULL'}</td>
      <td style="padding:6px 12px;text-align:center;font-size:12px;color:${COLORS.mutedText};">${escapeHtml(col.defaultValue ?? '-')}</td>
      <td style="padding:6px 12px;text-align:center;">${badges}</td>
      <td style="padding:6px 12px;color:${COLORS.secondaryText};font-size:12px;">${escapeHtml(col.comment || '-')}</td>
    </tr>`;
  });

  const commentStr = table.comment
    ? ` <span style="color:${COLORS.mutedText};font-weight:normal;"> — ${escapeHtml(table.comment)}</span>`
    : '';

  return `<details style="margin-top:8px;" ${index === 0 ? 'open' : ''}>
    <summary style="cursor:pointer;padding:10px 16px;background:${COLORS.tabBarBg};border:1px solid ${COLORS.borderColor};border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:space-between;list-style:none;">
      <span style="font-weight:600;color:${COLORS.primaryText};font-size:14px;">${escapeHtml(table.name)}${commentStr}</span>
      <span style="color:${COLORS.mutedText};font-size:12px;">${table.columns.length} columns</span>
    </summary>
    <div style="border:1px solid ${COLORS.borderColor};border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:${COLORS.pageBg};color:${COLORS.secondaryText};">
              <th style="padding:6px 12px;text-align:center;width:36px;">#</th>
              <th style="padding:6px 12px;text-align:left;">Column</th>
              <th style="padding:6px 12px;text-align:center;">Type</th>
              <th style="padding:6px 12px;text-align:center;">Nullable</th>
              <th style="padding:6px 12px;text-align:center;">Default</th>
              <th style="padding:6px 12px;text-align:center;">Constraints</th>
              <th style="padding:6px 12px;text-align:left;">Comment</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </details>`;
}

export function renderTableView(tables: ParsedTable[], options?: TableViewOptions): string {
  const showSummary = options?.showSummary ?? true;
  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const relMap = buildFKRelationshipMap(tables);

  let html = `<div style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:${COLORS.primaryText};">`;

  if (showSummary) {
    html += `<div style="border:1px solid ${COLORS.borderColor};border-radius:12px;overflow:hidden;margin-bottom:16px;">`;
    html += renderSummaryTable(tables, relMap);
    html += `</div>`;
  }

  for (let i = 0; i < sortedTables.length; i++) {
    html += renderTableDetail(sortedTables[i], i);
  }

  html += `</div>`;
  return html;
}
