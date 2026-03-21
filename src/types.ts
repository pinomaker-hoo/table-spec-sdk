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
