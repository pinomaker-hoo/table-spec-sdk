import type { ParsedTable } from '../src/types';

export const sampleTables: ParsedTable[] = [
  {
    name: 'users',
    comment: '사용자 테이블',
    columns: [
      { name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '사용자 ID', isPrimaryKey: true, isForeignKey: false, isUnique: false, isAutoIncrement: true },
      { name: 'email', dataType: 'VARCHAR(255)', nullable: false, defaultValue: null, comment: '이메일 주소', isPrimaryKey: false, isForeignKey: false, isUnique: true, isAutoIncrement: false },
      { name: 'username', dataType: 'VARCHAR(50)', nullable: false, defaultValue: null, comment: '사용자명', isPrimaryKey: false, isForeignKey: false, isUnique: true, isAutoIncrement: false },
      { name: 'password_hash', dataType: 'VARCHAR(255)', nullable: false, defaultValue: null, comment: '비밀번호 해시', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'role', dataType: 'ENUM', nullable: false, defaultValue: 'user', comment: '역할 (user, admin)', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'is_active', dataType: 'BOOLEAN', nullable: false, defaultValue: 'true', comment: '활성 상태', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '생성일시', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'updated_at', dataType: 'TIMESTAMP', nullable: true, defaultValue: null, comment: '수정일시', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
    ],
  },
  {
    name: 'orders',
    comment: '주문 테이블',
    columns: [
      { name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '주문 ID', isPrimaryKey: true, isForeignKey: false, isUnique: false, isAutoIncrement: true },
      { name: 'user_id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '주문자 ID', isPrimaryKey: false, isForeignKey: true, isUnique: false, isAutoIncrement: false, foreignKeyRef: { table: 'users', column: 'id' } },
      { name: 'status', dataType: 'VARCHAR(20)', nullable: false, defaultValue: 'pending', comment: '주문 상태', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'total_amount', dataType: 'DECIMAL(10,2)', nullable: false, defaultValue: '0.00', comment: '총 금액', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'shipping_address', dataType: 'TEXT', nullable: true, defaultValue: null, comment: '배송 주소', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '주문일시', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
    ],
  },
  {
    name: 'products',
    comment: '상품 테이블',
    columns: [
      { name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '상품 ID', isPrimaryKey: true, isForeignKey: false, isUnique: false, isAutoIncrement: true },
      { name: 'name', dataType: 'VARCHAR(200)', nullable: false, defaultValue: null, comment: '상품명', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'description', dataType: 'TEXT', nullable: true, defaultValue: null, comment: '상품 설명', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'price', dataType: 'DECIMAL(10,2)', nullable: false, defaultValue: null, comment: '가격', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'category_id', dataType: 'BIGINT', nullable: true, defaultValue: null, comment: '카테고리 ID', isPrimaryKey: false, isForeignKey: true, isUnique: false, isAutoIncrement: false, foreignKeyRef: { table: 'categories', column: 'id' } },
      { name: 'stock', dataType: 'INT', nullable: false, defaultValue: '0', comment: '재고 수량', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, defaultValue: 'CURRENT_TIMESTAMP', comment: '등록일시', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
    ],
  },
  {
    name: 'order_items',
    comment: '주문 상세 테이블',
    columns: [
      { name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '항목 ID', isPrimaryKey: true, isForeignKey: false, isUnique: false, isAutoIncrement: true },
      { name: 'order_id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '주문 ID', isPrimaryKey: false, isForeignKey: true, isUnique: false, isAutoIncrement: false, foreignKeyRef: { table: 'orders', column: 'id' } },
      { name: 'product_id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '상품 ID', isPrimaryKey: false, isForeignKey: true, isUnique: false, isAutoIncrement: false, foreignKeyRef: { table: 'products', column: 'id' } },
      { name: 'quantity', dataType: 'INT', nullable: false, defaultValue: '1', comment: '수량', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
      { name: 'unit_price', dataType: 'DECIMAL(10,2)', nullable: false, defaultValue: null, comment: '단가', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
    ],
  },
  {
    name: 'categories',
    comment: '카테고리 테이블',
    columns: [
      { name: 'id', dataType: 'BIGINT', nullable: false, defaultValue: null, comment: '카테고리 ID', isPrimaryKey: true, isForeignKey: false, isUnique: false, isAutoIncrement: true },
      { name: 'name', dataType: 'VARCHAR(100)', nullable: false, defaultValue: null, comment: '카테고리명', isPrimaryKey: false, isForeignKey: false, isUnique: true, isAutoIncrement: false },
      { name: 'parent_id', dataType: 'BIGINT', nullable: true, defaultValue: null, comment: '상위 카테고리 ID', isPrimaryKey: false, isForeignKey: true, isUnique: false, isAutoIncrement: false, foreignKeyRef: { table: 'categories', column: 'id' } },
      { name: 'sort_order', dataType: 'INT', nullable: false, defaultValue: '0', comment: '정렬 순서', isPrimaryKey: false, isForeignKey: false, isUnique: false, isAutoIncrement: false },
    ],
  },
];
