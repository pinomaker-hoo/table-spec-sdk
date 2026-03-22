import type { ParsedTable, ParsedColumn, NodeDisplayOptions } from './types';

// Layout constants (matching ERD Builder original)
export const BUILDER_HEADER_HEIGHT = 28;
export const BUILDER_ROW_HEIGHT = 20;
export const BUILDER_DETAIL_ROW_HEIGHT = 32;
export const BUILDER_NODE_MIN_WIDTH = 220;
export const BUILDER_NODE_MAX_WIDTH = 380;
const CELL_WIDTH = 300;
const VERTICAL_GAP = 40;
const MARGIN = 60;
const TITLE_AREA_HEIGHT = 50;

export interface ResolvedDisplayOptions {
  showDataType: boolean;
  showConstraints: boolean;
  showNullable: boolean;
  showDefault: boolean;
  showComment: boolean;
  showUnique: boolean;
  showAutoIncrement: boolean;
}

export interface BuilderColumnEntry {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  comment: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  hasDetailRow: boolean;
}

export interface BuilderTableBox {
  tableName: string;
  tableComment: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  columns: BuilderColumnEntry[];
}

export interface BuilderFKRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface BuilderLayout {
  canvasWidth: number;
  canvasHeight: number;
  tableBoxes: BuilderTableBox[];
  relationships: BuilderFKRelationship[];
}

export function resolveDisplayOptions(opts?: NodeDisplayOptions): ResolvedDisplayOptions {
  return {
    showDataType: opts?.showDataType ?? true,
    showConstraints: opts?.showConstraints ?? true,
    showNullable: opts?.showNullable ?? false,
    showDefault: opts?.showDefault ?? false,
    showComment: opts?.showComment ?? false,
    showUnique: opts?.showUnique ?? false,
    showAutoIncrement: opts?.showAutoIncrement ?? false,
  };
}

export function hasDetailOptions(opts: ResolvedDisplayOptions): boolean {
  return opts.showNullable || opts.showDefault || opts.showComment;
}

function columnHasDetail(col: ParsedColumn, opts: ResolvedDisplayOptions): boolean {
  if (!hasDetailOptions(opts)) return false;
  if (opts.showNullable) return true;
  if (opts.showDefault && col.defaultValue) return true;
  if (opts.showComment && col.comment) return true;
  return false;
}

export function computeNodeWidth(table: ParsedTable, opts: ResolvedDisplayOptions): number {
  const CHAR_WIDTH = 6.5;
  const PADDING = 24;
  const BADGE_WIDTH = 24;
  const TYPE_GAP = 12;

  let maxWidth = 0;

  for (const col of table.columns) {
    let rowWidth = PADDING;

    if (opts.showConstraints) {
      if (col.isPrimaryKey) rowWidth += BADGE_WIDTH;
      if (col.isForeignKey) rowWidth += BADGE_WIDTH;
    }
    if (opts.showUnique && col.isUnique) rowWidth += BADGE_WIDTH;
    if (opts.showAutoIncrement && col.isAutoIncrement) rowWidth += BADGE_WIDTH;

    rowWidth += Math.min(col.name.length, 18) * CHAR_WIDTH;

    if (opts.showDataType) {
      rowWidth += TYPE_GAP + Math.min(col.dataType.length, 12) * CHAR_WIDTH;
    }

    maxWidth = Math.max(maxWidth, rowWidth);
  }

  const headerWidth = PADDING + Math.min(table.name.length, 28) * 7;
  maxWidth = Math.max(maxWidth, headerWidth);

  return Math.max(BUILDER_NODE_MIN_WIDTH, Math.min(BUILDER_NODE_MAX_WIDTH, maxWidth));
}

export function computeNodeHeight(table: ParsedTable, opts: ResolvedDisplayOptions): number {
  let totalHeight = BUILDER_HEADER_HEIGHT;
  for (const col of table.columns) {
    totalHeight += columnHasDetail(col, opts) ? BUILDER_DETAIL_ROW_HEIGHT : BUILDER_ROW_HEIGHT;
  }
  return Math.max(totalHeight, BUILDER_HEADER_HEIGHT + BUILDER_ROW_HEIGHT);
}

export function getRowHeight(col: ParsedColumn, opts: ResolvedDisplayOptions): number {
  return columnHasDetail(col, opts) ? BUILDER_DETAIL_ROW_HEIGHT : BUILDER_ROW_HEIGHT;
}

function extractRelationships(tables: ParsedTable[]): BuilderFKRelationship[] {
  const rels: BuilderFKRelationship[] = [];
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isForeignKey && col.foreignKeyRef) {
        rels.push({
          fromTable: table.name,
          fromColumn: col.name,
          toTable: col.foreignKeyRef.table,
          toColumn: col.foreignKeyRef.column,
        });
      }
    }
  }
  return rels;
}

export function computeBuilderLayout(
  tables: ParsedTable[],
  displayOptions?: NodeDisplayOptions,
  title?: string,
): BuilderLayout {
  const opts = resolveDisplayOptions(displayOptions);
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const n = sorted.length;

  if (n === 0) {
    return { canvasWidth: 400, canvasHeight: 200, tableBoxes: [], relationships: [] };
  }

  const gridCols = Math.max(1, Math.ceil(Math.sqrt(n * 1.2)));
  const hasTitle = !!title;

  const boxes: BuilderTableBox[] = [];
  let yOffset = MARGIN + (hasTitle ? TITLE_AREA_HEIGHT : 0);

  for (let row = 0; row < Math.ceil(n / gridCols); row++) {
    let rowMaxHeight = 0;

    for (let col = 0; col < gridCols; col++) {
      const idx = row * gridCols + col;
      if (idx >= n) break;

      const table = sorted[idx];
      const width = computeNodeWidth(table, opts);
      const height = computeNodeHeight(table, opts);
      rowMaxHeight = Math.max(rowMaxHeight, height);

      const columns: BuilderColumnEntry[] = table.columns.map((c) => ({
        name: c.name,
        dataType: c.dataType,
        nullable: c.nullable,
        defaultValue: c.defaultValue,
        comment: c.comment,
        isPrimaryKey: c.isPrimaryKey,
        isForeignKey: c.isForeignKey,
        isUnique: c.isUnique,
        isAutoIncrement: c.isAutoIncrement,
        hasDetailRow: columnHasDetail(c, opts),
      }));

      boxes.push({
        tableName: table.name,
        tableComment: table.comment,
        x: MARGIN + col * CELL_WIDTH,
        y: yOffset,
        width,
        height,
        headerHeight: BUILDER_HEADER_HEIGHT,
        columns,
      });
    }

    yOffset += rowMaxHeight + VERTICAL_GAP;
  }

  const canvasWidth = gridCols * CELL_WIDTH + MARGIN * 2;
  const canvasHeight = yOffset + MARGIN;
  const relationships = extractRelationships(tables);

  return { canvasWidth, canvasHeight, tableBoxes: boxes, relationships };
}
