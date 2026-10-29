// Bilingual UI strings: English default, Vietnamese toggle.
export const LANGS = {
  en: {
    title: "ISO 8583 Parser",
    tagline: "Paste a hex dump from your logs — offsets, spaces and all",
    placeholder: "Paste hex dump here (hexdump -C, xxd, app log…), multiple messages OK",
    parse: "Parse",
    sample: "Load sample",
    clear: "Clear",
    share: "Copy link",
    copied: "Link copied",
    enc: "Encoding",
    "summary.mti": "MTI",
    "summary.proc": "Processing code",
    "summary.resp": "Response",
    "summary.amount": "Amount",
    "summary.pan": "PAN",
    "summary.stan": "STAN",
    "summary.rrn": "RRN",
    "list.title": "Fields",
    "hex.title": "Hex",
    "msg.request": "Request",
    "msg.response": "Response",
    "msg.advice": "Advice",
    "msg.adviceResponse": "Advice response",
    "msg.unknown": "Message",
    "err.empty": "Paste a hex dump to parse",
    "err.unknownField": "Field not in public dictionary — tail shown raw",
    "err.uncertain": "Truncated or inconsistent data",
    "dict.load": "Load custom dictionary",
    "dict.loaded": "Custom dictionary loaded",
    "dict.invalid": "Invalid dictionary — nothing loaded",
    "footer.privacy": "100% client-side — messages never leave your browser",
  },
  vi: {
    title: "Trình phân tích ISO 8583",
    tagline: "Dán hex dump từ log — kèm offset, khoảng trắng cũng được",
    placeholder: "Dán hex dump vào đây (hexdump -C, xxd, log app…), nhiều message cùng lúc OK",
    parse: "Phân tích",
    sample: "Tải mẫu",
    clear: "Xóa",
    share: "Sao chép liên kết",
    copied: "Đã sao chép liên kết",
    enc: "Mã hóa",
    "summary.mti": "MTI",
    "summary.proc": "Mã xử lý",
    "summary.resp": "Mã phản hồi",
    "summary.amount": "Số tiền",
    "summary.pan": "Số thẻ",
    "summary.stan": "STAN",
    "summary.rrn": "RRN",
    "list.title": "Các trường",
    "hex.title": "Hex",
    "msg.request": "Yêu cầu",
    "msg.response": "Phản hồi",
    "msg.advice": "Thông báo",
    "msg.adviceResponse": "Phản hồi thông báo",
    "msg.unknown": "Message",
    "err.empty": "Hãy dán hex dump để phân tích",
    "err.unknownField": "Trường không có trong từ điển công khai — phần còn lại hiển thị dạng thô",
    "err.uncertain": "Dữ liệu bị cắt cụt hoặc không nhất quán",
    "dict.load": "Nạp từ điển riêng",
    "dict.loaded": "Đã nạp từ điển riêng",
    "dict.invalid": "Từ điển không hợp lệ — chưa nạp gì",
    "footer.privacy": "Xử lý 100% tại trình duyệt — dữ liệu không rời khỏi máy bạn",
  },
};

let current = "en";

export function setLang(lang) {
  current = LANGS[lang] ? lang : "en";
}

export function getLang() {
  return current;
}

export function t(key) {
  const dict = LANGS[current];
  return dict[key] !== undefined ? dict[key] : key;
}
