from django.db import models


class Reading(models.Model):
    KINDS = [('tarot-daily', 'Tarot daily card'), ('tarot-spread', 'Tarot spread'), ('lenormand', 'Lenormand'),
             ('oracle', 'Ishtar Reflection Oracle'), ('runes', 'Runes'), ('geomancy', 'Geomancy')]
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='readings')
    kind = models.CharField(max_length=20, choices=KINDS)
    deck = models.CharField(max_length=40, blank=True)
    layout = models.CharField(max_length=40, blank=True)
    question = models.CharField(max_length=240, blank=True)
    focus = models.CharField(max_length=40, blank=True)
    payload = models.JSONField()
    note = models.TextField(blank=True, max_length=4000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['user', '-created_at'])]

    def __str__(self):
        return f'{self.user}: {self.kind} {self.created_at:%Y-%m-%d}'
