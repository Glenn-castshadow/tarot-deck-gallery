from django.contrib import admin

from .models import Reading


@admin.register(Reading)
class ReadingAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'layout', 'deck', 'created_at')
    list_filter = ('kind',)
    search_fields = ('user__email', 'question')
    readonly_fields = ('created_at',)
