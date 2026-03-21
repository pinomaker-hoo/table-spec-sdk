<p align="center">
  <h1 align="center">table-spec-sdk</h1>
  <p align="center">
    A TypeScript SDK that parses SQL DDL to generate table specifications (HTML) and ERD diagrams (SVG)
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/table-spec-sdk"><img src="https://img.shields.io/npm/v/table-spec-sdk.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/table-spec-sdk"><img src="https://img.shields.io/npm/dm/table-spec-sdk.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/pinomaker/table-spec-sdk/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/table-spec-sdk.svg?style=flat-square" alt="license" /></a>
</p>

<p align="center">
  <a href="./README.md">한국어</a> | <b>English</b>
</p>

---

## Features

- **DDL Parsing** — Extracts table/column metadata from `CREATE TABLE` statements
- **Table Specification** — Renders summary table + column details as HTML
- **ERD Diagram** — Generates SVG ERD with FK relationships
- **Multi-DB Support** — Supports MySQL `COMMENT` and PostgreSQL `COMMENT ON` syntax
- **Zero Dependencies** — No runtime dependencies
- **TypeScript** — Full type support

## Install

```bash
# npm
npm install table-spec-sdk

# pnpm
pnpm add table-spec-sdk

# yarn
yarn add table-spec-sdk
```

## Quick Start

```typescript
import { parseDDL, renderTableView, renderERD } from 'table-spec-sdk';

const ddl = `
CREATE TABLE users (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'User ID',
  name VARCHAR(100) NOT NULL COMMENT 'Name',
  email VARCHAR(255) NOT NULL COMMENT 'Email',
  PRIMARY KEY (id),
  UNIQUE KEY (email)
) COMMENT='Users';

CREATE TABLE posts (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT 'Post ID',
  user_id BIGINT NOT NULL COMMENT 'Author ID',
  title VARCHAR(200) NOT NULL COMMENT 'Title',
  content TEXT COMMENT 'Content',
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='Posts';
`;

// 1. Parse DDL
const tables = parseDDL(ddl);

// 2. Generate table specification HTML
const tableHtml = renderTableView(tables);

// 3. Generate ERD SVG
const erdSvg = renderERD(tables);
```

## API

### `parseDDL(sql: string): ParsedTable[]`

Parses a SQL DDL string and returns an array of `ParsedTable`.

- Extracts columns, PK, FK, UNIQUE, AUTO_INCREMENT, etc. from `CREATE TABLE` statements
- Supports MySQL `COMMENT` and PostgreSQL `COMMENT ON` syntax

### `renderTableView(tables: ParsedTable[], options?: TableViewOptions): string`

Renders parsed table data as an HTML table specification.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showSummary` | `boolean` | `true` | Show summary table list at the top |
| `darkTheme` | `boolean` | `true` | Use dark theme |

### `renderERD(tables: ParsedTable[], options?: ERDOptions): string`

Renders parsed table data as an SVG ERD diagram.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `darkTheme` | `boolean` | `true` | Use dark theme |
| `maxColumnsShown` | `number` | `15` | Max columns displayed per table |

## Types

```typescript
interface ParsedTable {
  name: string;
  comment: string;
  columns: ParsedColumn[];
}

interface ParsedColumn {
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
```

## License

[MIT](LICENSE)
