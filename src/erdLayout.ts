import type { ParsedTable } from './types';

const TABLE_BOX_WIDTH = 220;
const HEADER_HEIGHT = 28;
const COLUMN_ROW_HEIGHT = 18;
const MAX_COLUMNS_SHOWN = 15;
const TABLE_PADDING = 4;
const CELL_WIDTH = 320;
const VERTICAL_GAP = 40;
const MARGIN = 80;
const TITLE_AREA_HEIGHT = 60;

export interface ColumnEntry {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface TableBox {
  tableName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  headerHeight: number;
  rowHeight: number;
  columns: ColumnEntry[];
  totalColumns: number;
}

export interface FKRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface ERDLayout {
  canvasWidth: number;
  canvasHeight: number;
  tableBoxes: TableBox[];
  relationships: FKRelationship[];
}

function buildColumnEntries(table: ParsedTable): ColumnEntry[] {
  return table.columns.slice(0, MAX_COLUMNS_SHOWN).map((col) => ({
    name: col.name,
    dataType: col.dataType,
    isPrimaryKey: col.isPrimaryKey,
    isForeignKey: col.isForeignKey,
  }));
}

function computeBoxHeight(totalColumns: number): number {
  const visible = Math.min(totalColumns, MAX_COLUMNS_SHOWN);
  const hasOverflow = totalColumns > MAX_COLUMNS_SHOWN;
  return HEADER_HEIGHT + (visible + (hasOverflow ? 1 : 0)) * COLUMN_ROW_HEIGHT + TABLE_PADDING * 2;
}

function extractRelationships(tables: ParsedTable[]): FKRelationship[] {
  const rels: FKRelationship[] = [];
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

export function computeERDLayout(tables: ParsedTable[], maxColumnsShown?: number): ERDLayout {
  const maxCols = maxColumnsShown ?? MAX_COLUMNS_SHOWN;
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const gridCols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.2)));

  const boxes: TableBox[] = sorted.map((t) => {
    const columns = t.columns.slice(0, maxCols).map((col) => ({
      name: col.name,
      dataType: col.dataType,
      isPrimaryKey: col.isPrimaryKey,
      isForeignKey: col.isForeignKey,
    }));
    const totalColumns = t.columns.length;
    const visible = Math.min(totalColumns, maxCols);
    const hasOverflow = totalColumns > maxCols;
    const height = HEADER_HEIGHT + (visible + (hasOverflow ? 1 : 0)) * COLUMN_ROW_HEIGHT + TABLE_PADDING * 2;

    return {
      tableName: t.name,
      x: 0,
      y: 0,
      width: TABLE_BOX_WIDTH,
      height,
      headerHeight: HEADER_HEIGHT,
      rowHeight: COLUMN_ROW_HEIGHT,
      columns,
      totalColumns,
    };
  });

  const rows: TableBox[][] = [];
  for (let i = 0; i < boxes.length; i++) {
    const rowIdx = Math.floor(i / gridCols);
    if (!rows[rowIdx]) rows[rowIdx] = [];
    rows[rowIdx].push(boxes[i]);
  }

  const rowHeights = rows.map((row) => Math.max(...row.map((b) => b.height)));

  let yOffset = MARGIN + TITLE_AREA_HEIGHT;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      rows[r][c].x = MARGIN + c * CELL_WIDTH;
      rows[r][c].y = yOffset;
    }
    yOffset += rowHeights[r] + VERTICAL_GAP;
  }

  const canvasWidth = gridCols * CELL_WIDTH + MARGIN * 2;
  const canvasHeight = yOffset + MARGIN;

  const relationships = extractRelationships(sorted);

  return { canvasWidth, canvasHeight, tableBoxes: boxes, relationships };
}

export { MAX_COLUMNS_SHOWN, HEADER_HEIGHT, COLUMN_ROW_HEIGHT };
