<p align="center">
  <h1 align="center">table-spec-sdk</h1>
  <p align="center">
    SQL DDL을 파싱하여 테이블 명세서(HTML)와 ERD 다이어그램(SVG)을 생성하는 TypeScript SDK
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/table-spec-sdk"><img src="https://img.shields.io/npm/v/table-spec-sdk.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/table-spec-sdk"><img src="https://img.shields.io/npm/dm/table-spec-sdk.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/pinomaker/table-spec-sdk/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/table-spec-sdk.svg?style=flat-square" alt="license" /></a>
</p>

<p align="center">
  <b>한국어</b> | <a href="./README.en.md">English</a>
</p>

---

## Features

- **DDL 파싱** — `CREATE TABLE` 문을 분석하여 테이블/컬럼 메타데이터 추출
- **테이블 명세서** — 요약 테이블 + 컬럼 상세 정보를 HTML로 렌더링
- **ERD 다이어그램** — FK 관계를 포함한 ERD를 SVG로 생성
- **Builder Canvas** — ERD Builder 스타일의 다크 테마 캔버스 (그리드 + 노드 + FK선)
- **Builder Table View** — 테이블 목록 + 컬럼 스프레드시트 뷰
- **Builder Table Node** — 단일 테이블 노드 독립 렌더링
- **다중 DB 지원** — MySQL, PostgreSQL의 `COMMENT ON` 구문 지원
- **Zero Dependencies** — 런타임 의존성 없음
- **TypeScript** — 완전한 타입 지원

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
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '사용자 ID',
  name VARCHAR(100) NOT NULL COMMENT '이름',
  email VARCHAR(255) NOT NULL COMMENT '이메일',
  PRIMARY KEY (id),
  UNIQUE KEY (email)
) COMMENT='사용자';

CREATE TABLE posts (
  id BIGINT NOT NULL AUTO_INCREMENT COMMENT '게시글 ID',
  user_id BIGINT NOT NULL COMMENT '작성자 ID',
  title VARCHAR(200) NOT NULL COMMENT '제목',
  content TEXT COMMENT '내용',
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) COMMENT='게시글';
`;

// 1. DDL 파싱
const tables = parseDDL(ddl);

// 2. 테이블 명세서 HTML 생성
const tableHtml = renderTableView(tables);

// 3. ERD SVG 생성
const erdSvg = renderERD(tables);
```

### Builder View 사용법

```typescript
import {
  parseDDL,
  renderBuilderCanvas,
  renderBuilderTableView,
  renderBuilderTableNode,
} from 'table-spec-sdk';

const tables = parseDDL(ddl);

// Builder 캔버스 (그리드 배경 + 테이블 노드 + FK 관계선)
const canvasSvg = renderBuilderCanvas(tables, {
  title: 'My Database',
  showGrid: true,
  displayOptions: {
    showDataType: true,
    showConstraints: true,
    showComment: true,
  },
});

// 테이블 목록 + 컬럼 스프레드시트
const tableViewHtml = renderBuilderTableView(tables, {
  selectedTable: 'users',
});

// 단일 테이블 노드
const nodeHtml = renderBuilderTableNode(tables[0], {
  displayOptions: { showNullable: true, showDefault: true },
});
```

## API

### `parseDDL(sql: string): ParsedTable[]`

SQL DDL 문자열을 파싱하여 `ParsedTable` 배열을 반환합니다.

- `CREATE TABLE` 문에서 컬럼, PK, FK, UNIQUE, AUTO_INCREMENT 등을 추출
- MySQL `COMMENT` 및 PostgreSQL `COMMENT ON` 구문 지원

### `renderTableView(tables: ParsedTable[], options?: TableViewOptions): string`

파싱된 테이블 데이터를 HTML 테이블 명세서로 렌더링합니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showSummary` | `boolean` | `true` | 상단에 테이블 요약 목록 표시 |
| `darkTheme` | `boolean` | `true` | 다크 테마 사용 |

### `renderERD(tables: ParsedTable[], options?: ERDOptions): string`

파싱된 테이블 데이터를 SVG ERD 다이어그램으로 렌더링합니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `darkTheme` | `boolean` | `true` | 다크 테마 사용 |
| `maxColumnsShown` | `number` | `15` | 테이블당 표시할 최대 컬럼 수 |

### `renderBuilderCanvas(tables: ParsedTable[], options?: BuilderCanvasOptions): string`

ERD Builder 스타일의 다크 테마 캔버스를 SVG로 렌더링합니다. 그리드 배경, 테이블 노드, FK 베지어 곡선을 포함합니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `displayOptions` | `NodeDisplayOptions` | 아래 참조 | 컬럼 표시 옵션 |
| `showGrid` | `boolean` | `true` | 점선 그리드 배경 표시 |
| `title` | `string` | - | 다이어그램 상단 타이틀 |

### `renderBuilderTableView(tables: ParsedTable[], options?: BuilderTableViewOptions): string`

좌측 테이블 목록 + 우측 컬럼 상세 스프레드시트를 HTML로 렌더링합니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selectedTable` | `string` | 첫 번째 테이블 | 선택/하이라이트할 테이블 이름 |

### `renderBuilderTableNode(table: ParsedTable, options?: BuilderTableNodeOptions): string`

단일 테이블 노드를 독립적으로 SVG 렌더링합니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `displayOptions` | `NodeDisplayOptions` | 아래 참조 | 컬럼 표시 옵션 |

### `NodeDisplayOptions`

Builder 계열 함수에서 사용하는 컬럼 표시 옵션입니다.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showDataType` | `boolean` | `true` | 데이터 타입 표시 |
| `showConstraints` | `boolean` | `true` | PK/FK 배지 표시 |
| `showNullable` | `boolean` | `false` | NULL/NOT NULL 표시 |
| `showDefault` | `boolean` | `false` | 기본값 표시 |
| `showComment` | `boolean` | `false` | 컬럼 코멘트 표시 |
| `showUnique` | `boolean` | `false` | UNIQUE 배지 표시 |
| `showAutoIncrement` | `boolean` | `false` | AUTO_INCREMENT 배지 표시 |

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
