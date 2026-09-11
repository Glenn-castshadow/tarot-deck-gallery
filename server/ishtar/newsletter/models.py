import secrets

from django.db import models


def new_token():
    return secrets.token_urlsafe(32)


class Subscriber(models.Model):
    email = models.EmailField(primary_key=True)
    consent_at = models.DateTimeField()
    consent_version = models.CharField(max_length=40)
    consent_text = models.TextField()
    unsubscribe_token = models.CharField(max_length=43, unique=True, default=new_token)

    def __str__(self):
        return self.email
