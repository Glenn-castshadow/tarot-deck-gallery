from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('An email address is required.')
        user = self.model(email=self.normalize_email(email).strip().lower(), **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class Profile(models.Model):
    """The birth profile object the frontend writes to localStorage, stored as-is."""
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, related_name='profile')
    version = models.PositiveSmallIntegerField(default=1)
    data = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user}'


class EntitlementQuerySet(models.QuerySet):
    def active(self):
        now = timezone.now()
        return self.filter(starts_at__lte=now).filter(models.Q(ends_at__isnull=True) | models.Q(ends_at__gt=now))

    def active_features(self, user):
        return sorted(set(self.filter(user=user).active().values_list('feature', flat=True)))


class Entitlement(models.Model):
    """A feature grant. Manual today; Stripe writes these later."""
    SOURCES = [('manual', 'Manual'), ('stripe', 'Stripe')]
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='entitlements')
    feature = models.SlugField(max_length=40)
    source = models.CharField(max_length=10, choices=SOURCES, default='manual')
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    reference = models.CharField(max_length=120, blank=True, help_text='Stripe subscription id once billing exists.')
    objects = EntitlementQuerySet.as_manager()

    class Meta:
        indexes = [models.Index(fields=['user', 'feature'])]

    def __str__(self):
        return f'{self.user}: {self.feature}'
