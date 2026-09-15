/**
 * The only definitions of these values. There used to be two TransactionType
 * enums with different casing ("INCOME" vs "income"), and revenue reports had
 * to test for both spellings. Stored values are uppercase.
 */
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
}

export enum TransactionCategory {
  TUITION_FEE = 'TUITION_FEE',
  SALARY = 'SALARY',
  RENT = 'RENT',
  OTHER = 'OTHER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}
