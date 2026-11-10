from django.contrib.auth.models import User
from django.db import models


class Family(models.Model):
    name = models.CharField(max_length=80)


class Member(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    family = models.ForeignKey(Family, on_delete=models.CASCADE)
    name = models.CharField(max_length=60)
    owner = models.BooleanField(default=False)


class Invite(models.Model):
    digest = models.CharField(max_length=64, unique=True)
    family = models.ForeignKey(Family, on_delete=models.CASCADE)
    expires = models.DateTimeField()


class Wish(models.Model):
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    title = models.CharField(max_length=160)
    note = models.CharField(max_length=600)
    price = models.CharField(max_length=100)
    price_source = models.URLField(max_length=2000, blank=True, default="")
    buyer = models.ForeignKey(Member, null=True, on_delete=models.SET_NULL, related_name="claims")


class Pledge(models.Model):
    wish = models.ForeignKey(Wish, on_delete=models.CASCADE)
    member = models.ForeignKey(Member, on_delete=models.CASCADE)
    cents = models.PositiveIntegerField()

    class Meta:
        unique_together = ("wish", "member")


class Match(models.Model):
    year = models.PositiveIntegerField()
    giver = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="matches")
    recipient = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="receivers")

    class Meta:
        unique_together = (("year", "giver"), ("year", "recipient"))


class Attempt(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    until = models.DateTimeField()
    count = models.PositiveIntegerField(default=0)

