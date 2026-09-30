// Nội dung một email, do module nghiệp vụ tạo (template)
export interface MailContent {
  subject: string;
  html: string;
  /** Bản chữ thuần cho trình đọc mail không hiển thị HTML; thiếu bản này dễ bị xếp vào Spam */
  text: string;
}

export interface MailMessage extends MailContent {
  to: string;
}
