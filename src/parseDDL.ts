import type { ParsedColumn, ParsedTable } from './types';

/**
 * Split string by top-level commas (respecting parentheses nesting)
 */
function splitByTopLevelComma(input: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  let inSingleQuote = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "'" && !inSingleQuote) {
      inSingleQuote = true;
      current += char;
    } else if (char === "'" && inSingleQuote) {
      if (i + 1 < input.length && input[i + 1] === "'") {
        current += "''";
        i++;
      } else {
        inSingleQuote = false;
        current += char;
      }
    } else if (inSingleQuote) {
      current += char;
    } else if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * Remove SQL comments
 */
function preprocessSQL(sql: string): string {
  let result = sql.replace(/--[^\n]*/g, '');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

/**
 * Strip backticks, double quotes, or square brackets from identifier
 */
function stripQuotes(name: string): string {
  return name.replace(/[`"\[\]]/g, '').trim();
}

/**
 * Extract COMMENT value from a string segment
 */
function extractComment(segment: string): string {
  const match = segment.match(/COMMENT\s+'((?:[^'\\]|\\.|'')*)'/i);
  if (!match) return '';
  return match[1].replace(/''/g, "'").replace(/\\'/g, "'");
}

/**
 * Parse a single column definition
 */
function parseColumnDef(def: string): ParsedColumn | null {
  const colMatch = def.match(
    /^[`"\[]?(\w+)[`"\]]?\s+([\w]+(?:\s*\([^)]*\))?(?:\s+(?:UNSIGNED|ZEROFILL|SIGNED|VARYING|CHARACTER\s+SET\s+\w+|COLLATE\s+\w+))*)/i
  );

  if (!colMatch) return null;

  const name = stripQuotes(colMatch[1]);
  const dataType = colMatch[2].trim().toUpperCase();

  const reservedKeywords = [
    'PRIMARY', 'UNIQUE', 'INDEX', 'KEY', 'CONSTRAINT',
    'FOREIGN', 'CHECK', 'FULLTEXT', 'SPATIAL',
  ];
  if (reservedKeywords.includes(name.toUpperCase())) return null;

  const upperDef = def.toUpperCase();

  const nullable = !upperDef.includes('NOT NULL');
  const isAutoIncrement = upperDef.includes('AUTO_INCREMENT');
  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(def);
  const isUnique = /\bUNIQUE\b/i.test(def);

  let defaultValue: string | null = null;
  const defaultMatch = def.match(/DEFAULT\s+('(?:[^'\\]|\\.)*'|[\w()]+(?:\s*\(\))?)/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].replace(/^'|'$/g, '');
  }

  const comment = extractComment(def);

  return {
    name,
    dataType,
    nullable,
    defaultValue,
    comment,
    isPrimaryKey,
    isForeignKey: false,
    isUnique,
    isAutoIncrement,
  };
}

/**
 * Extract the body of CREATE TABLE by tracking parenthesis depth.
 */
function extractCreateTable(
  sql: string,
  startIndex: number
): { tableName: string; body: string; tableOptions: string; endIndex: number } | null {
  const headerRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?(\w+)[`"\]]?(?:\s*\.\s*[`"\[]?(\w+)[`"\]]?)?\s*\(/gi;
  headerRegex.lastIndex = startIndex;
  const headerMatch = headerRegex.exec(sql);
  if (!headerMatch || headerMatch.index !== startIndex) return null;

  const tableName = headerMatch[2]
    ? stripQuotes(headerMatch[2])
    : stripQuotes(headerMatch[1]);

  let depth = 1;
  let i = headerRegex.lastIndex;
  let inSingleQuote = false;

  while (i < sql.length && depth > 0) {
    const ch = sql[i];
    if (ch === "'" && !inSingleQuote) {
      inSingleQuote = true;
    } else if (ch === "'" && inSingleQuote) {
      if (i + 1 < sql.length && sql[i + 1] === "'") {
        i++;
      } else {
        inSingleQuote = false;
      }
    } else if (!inSingleQuote) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    if (depth > 0) i++;
  }

  if (depth !== 0) return null;

  const body = sql.substring(headerRegex.lastIndex, i);

  const afterBody = sql.substring(i + 1);
  const semiIndex = afterBody.indexOf(';');
  const tableOptions = semiIndex >= 0 ? afterBody.substring(0, semiIndex) : afterBody.trim();
  const endIndex = semiIndex >= 0 ? i + 1 + semiIndex + 1 : sql.length;

  return { tableName, body, tableOptions, endIndex };
}

/**
 * Main DDL parser
 */
export function parseDDL(sql: string): ParsedTable[] {
  const cleaned = preprocessSQL(sql);
  const tables: ParsedTable[] = [];

  const createTableFinder =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"\[]?\w+[`"\]]?(?:\s*\.\s*[`"\[]?\w+[`"\]]?)?\s*\(/gi;

  let headerMatch: RegExpExecArray | null;
  while ((headerMatch = createTableFinder.exec(cleaned)) !== null) {
    const extracted = extractCreateTable(cleaned, headerMatch.index);
    if (!extracted) continue;

    const { tableName, body, tableOptions } = extracted;
    createTableFinder.lastIndex = extracted.endIndex;

    const tableCommentMatch = tableOptions.match(/COMMENT\s*=?\s*'((?:[^'\\]|\\.|'')*)'/i);
    const tableComment = tableCommentMatch
      ? tableCommentMatch[1].replace(/''/g, "'").replace(/\\'/g, "'")
      : '';

    const definitions = splitByTopLevelComma(body);

    const columns: ParsedColumn[] = [];
    const primaryKeyColumns: string[] = [];
    const uniqueColumns: string[] = [];
    const foreignKeys: { column: string; refTable: string; refColumn: string }[] = [];

    for (const def of definitions) {
      const trimmedDef = def.trim();

      const pkMatch = trimmedDef.match(/^\s*PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        const cols = pkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        primaryKeyColumns.push(...cols);
        continue;
      }

      const uqMatch = trimmedDef.match(
        /^\s*(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?UNIQUE\s+(?:KEY|INDEX)?\s*(?:[`"\[]?\w+[`"\]]?\s*)?\(([^)]+)\)/i
      );
      if (uqMatch) {
        const cols = uqMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        uniqueColumns.push(...cols);
        continue;
      }

      const fkMatch = trimmedDef.match(
        /^\s*(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+[`"\[]?(\w+)[`"\]]?\s*\(([^)]+)\)/i
      );
      if (fkMatch) {
        const fkCols = fkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
        const refTable = stripQuotes(fkMatch[2]);
        const refCols = fkMatch[3].split(',').map((c) => stripQuotes(c.trim()));
        fkCols.forEach((col, i) => {
          foreignKeys.push({
            column: col,
            refTable,
            refColumn: refCols[i] || refCols[0],
          });
        });
        continue;
      }

      if (/^\s*(?:INDEX|KEY|FULLTEXT|SPATIAL)\s+/i.test(trimmedDef)) {
        continue;
      }

      if (/^\s*(?:CONSTRAINT\s+[`"\[]?\w+[`"\]]?\s+)?CHECK\s*\(/i.test(trimmedDef)) {
        continue;
      }

      const column = parseColumnDef(trimmedDef);
      if (column) {
        columns.push(column);
      }
    }

    for (const col of columns) {
      if (primaryKeyColumns.includes(col.name)) {
        col.isPrimaryKey = true;
      }
      if (uniqueColumns.includes(col.name)) {
        col.isUnique = true;
      }
      const fk = foreignKeys.find((f) => f.column === col.name);
      if (fk) {
        col.isForeignKey = true;
        col.foreignKeyRef = { table: fk.refTable, column: fk.refColumn };
      }
    }

    tables.push({
      name: tableName,
      comment: tableComment,
      columns,
    });
  }

  // Handle PostgreSQL COMMENT ON statements
  const commentOnTableRegex =
    /COMMENT\s+ON\s+TABLE\s+(?:[`"\[]?\w+[`"\]]?\s*\.\s*)?[`"\[]?(\w+)[`"\]]?\s+IS\s+'((?:[^'\\]|\\.|'')*)'/gi;
  let commentMatch: RegExpExecArray | null;
  while ((commentMatch = commentOnTableRegex.exec(cleaned)) !== null) {
    const tName = stripQuotes(commentMatch[1]);
    const comment = commentMatch[2].replace(/''/g, "'");
    const table = tables.find((t) => t.name.toLowerCase() === tName.toLowerCase());
    if (table && !table.comment) {
      table.comment = comment;
    }
  }

  const commentOnColumnRegex =
    /COMMENT\s+ON\s+COLUMN\s+(?:[`"\[]?\w+[`"\]]?\s*\.\s*)?[`"\[]?(\w+)[`"\]]?\s*\.\s*[`"\[]?(\w+)[`"\]]?\s+IS\s+'((?:[^'\\]|\\.|'')*)'/gi;
  while ((commentMatch = commentOnColumnRegex.exec(cleaned)) !== null) {
    const tName = stripQuotes(commentMatch[1]);
    const cName = stripQuotes(commentMatch[2]);
    const comment = commentMatch[3].replace(/''/g, "'");
    const table = tables.find((t) => t.name.toLowerCase() === tName.toLowerCase());
    if (table) {
      const col = table.columns.find((c) => c.name.toLowerCase() === cName.toLowerCase());
      if (col && !col.comment) {
        col.comment = comment;
      }
    }
  }

  return tables;
}
