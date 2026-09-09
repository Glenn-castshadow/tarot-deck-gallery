from allauth.account.adapter import DefaultAccountAdapter


class AccountAdapter(DefaultAccountAdapter):
    def clean_email(self, email):
        return super().clean_email(email).strip().lower()
