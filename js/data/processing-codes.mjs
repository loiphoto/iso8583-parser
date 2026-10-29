// DE 3 processing code tables (ISO 8583:1987): positions 1-2 transaction
// type, positions 3-4 (and 5-6) account type.
export const PROCESSING_CODES = {
  "00": { en: "Purchase", vi: "Mua hàng" },
  "01": { en: "Cash Withdrawal", vi: "Rút tiền mặt" },
  "20": { en: "Refund", vi: "Hoàn tiền" },
  "21": { en: "Deposit", vi: "Nộp tiền" },
  "31": { en: "Balance Inquiry", vi: "Truy vấn số dư" },
};

export const ACCOUNT_TYPES = {
  "00": { en: "Unspecified", vi: "Không xác định" },
  "10": { en: "Savings", vi: "Tiết kiệm" },
  "20": { en: "Checking", vi: "Thanh toán" },
  "30": { en: "Credit", vi: "Tín dụng" },
};
