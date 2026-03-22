export interface ParsedColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  comment: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  foreignKeyRef?: {
    table: string;
    column: string;
  };
}

export interface ParsedTable {
  name: string;
  comment: string;
  columns: ParsedColumn[];
}

export interface TableViewOptions {
  /** Show summary table at the top (default: true) */
  showSummary?: boolean;
  /** Dark theme (default: true) */
  darkTheme?: boolean;
}

export interface ERDOptions {
  /** Dark theme (default: true) */
  darkTheme?: boolean;
  /** Max columns shown per table (default: 15) */
  maxColumnsShown?: number;
}

export interface NodeDisplayOptions {
  /** Show data type next to column name (default: true) */
  showDataType?: boolean;
  /** Show constraint badges PK/FK (default: true) */
  showConstraints?: boolean;
  /** Show nullable indicator in detail row (default: false) */
  showNullable?: boolean;
  /** Show default value in detail row (default: false) */
  showDefault?: boolean;
  /** Show column comment in detail row (default: false) */
  showComment?: boolean;
  /** Show unique constraint badge (default: false) */
  showUnique?: boolean;
  /** Show auto-increment badge (default: false) */
  showAutoIncrement?: boolean;
}

export interface BuilderCanvasOptions {
  /** Column display toggles */
  displayOptions?: NodeDisplayOptions;
  /** Show dotted grid background (default: true) */
  showGrid?: boolean;
  /** Optional title text shown above the diagram */
  title?: string;
}

export interface BuilderTableViewOptions {
  /** Table name to highlight and show in the right panel */
  selectedTable?: string;
}

export interface BuilderTableNodeOptions {
  /** Column display toggles */
  displayOptions?: NodeDisplayOptions;
}
