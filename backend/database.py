# GDPR 대응을 위한 데이터 처리
class UserData(Model):
    def save(self):
        if self.consent_level < 2:
            anonymize_data(self)  # 익명화 처리
        encrypt_sensitive_data(self)
        super().save() 