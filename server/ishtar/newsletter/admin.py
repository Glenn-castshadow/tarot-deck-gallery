from django.contrib import admin

from .models import Subscriber


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'consent_at', 'consent_version')
    search_fields = ('email',)
    readonly_fields = ('unsubscribe_token',)
