-- ================================================================
-- SQL viết tay: nhật ký kiểm toán chỉ được đọc (UC tra cứu nhật ký, luồng phụ 3; NFR-09)
-- ================================================================

-- Chặn UPDATE, DELETE trên audit_logs ở tầng DB, kể cả khi có code hoặc người sửa thẳng DB.
-- Ngoại lệ duy nhất: khi xóa tài khoản, FK fk_audit_logs_actor_id (ON DELETE SET NULL) đặt
-- actor_id = NULL. Cho phép UPDATE đó nếu mọi cột khác giữ nguyên, để nhật ký vẫn còn.
CREATE FUNCTION "audit_logs_read_only"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD."actor_id" IS NOT NULL
     AND NEW."actor_id" IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_logs is read-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "trg_audit_logs_read_only"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_read_only"();

-- TRUNCATE không kích hoạt trigger theo dòng nên chặn riêng
CREATE TRIGGER "trg_audit_logs_no_truncate"
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_logs_read_only"();
