import hashlib
import json
import logging
import secrets
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import FileResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import Attempt, Family, Invite, Match, Member, Pledge, Wish


class Problem(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


def field(data, key, limit, required=True):
    value = data.get(key, "")
    if not isinstance(value, str) or len(value) > limit:
        raise Problem(f"Check the {key} field (maximum {limit} characters).")
    value = value.strip()
    if required and not value:
        raise Problem(f"Please enter {key}.")
    return value


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def throttle(key, limit):
    now = timezone.now()
    with transaction.atomic():
        Attempt.objects.filter(until__lte=now).delete()
        row, _ = Attempt.objects.select_for_update().get_or_create(key=digest(key), defaults={"until": now + timedelta(minutes=15)})
        if row.count >= limit:
            raise Problem("Too many attempts. Try again in 15 minutes.", 429)
        row.count += 1
        row.save()


def snapshot(user):
    me = user.member
    members = list(Member.objects.filter(family=me.family).order_by("id").values("id", "name"))
    wishes = []
    for wish in Wish.objects.filter(member__family=me.family).prefetch_related("pledge_set").order_by("id"):
        item = {"id":wish.id, "memberId":wish.member_id, "title":wish.title, "note":wish.note, "price":wish.price}
        if wish.member_id != me.id:
            item["selectedBy"] = wish.buyer_id
            item["contributions"] = [{"memberId":p.member_id, "amount":p.cents / 100} for p in wish.pledge_set.all()]
        wishes.append(item)
    return {"me":me.id, "email":user.email, "owner":me.owner, "family":me.family.name, "members":members, "wishes":wishes}


def auth_action(request, action, data):
    if action == "reset":
        uid = field(data, "uid", 12)
        token = field(data, "token", 100)
        with transaction.atomic():
            user = User.objects.select_for_update().filter(pk=int(uid)).first() if uid.isascii() and uid.isdigit() else None
            if not user or not default_token_generator.check_token(user, token):
                raise Problem("This reset link has expired or was already used.")
            change_password(user, data)
            user.save()
        return {}
    email = field(data, "email", 150).lower()
    validate_email(email)
    if action == "forgot":
        throttle("forgot:"+email, 3)
        user = User.objects.filter(username=email).first()
        if user:
            link = f"{settings.SITE_URL}/login#reset={user.pk}/{default_token_generator.make_token(user)}"
            try:
                send_mail("Reset your Family List password", f"Open this link within one hour to choose a new password.\n\n{link}", settings.DEFAULT_FROM_EMAIL, [email])
            except Exception:
                logging.getLogger(__name__).exception("Password reset delivery failed")
        return {}
    password = data.get("password")
    if not isinstance(password, str) or len(password) > 256:
        raise Problem("Enter a password of up to 256 characters.")
    if action == "login":
        throttle("login:"+email, 25)
        user = authenticate(request, username=email, password=password)
        if not user:
            raise Problem("Check your email address and password.", 401)
    else:
        name = field(data, "name", 60)
        code = field(data, "code", 100, False)
        with transaction.atomic():
            if User.objects.filter(username=email).exists():
                raise Problem("Unable to register. Try signing in or resetting your password.")
            if code:
                invitation = Invite.objects.select_for_update().filter(digest=digest(code), expires__gt=timezone.now()).first()
                if not invitation:
                    raise Problem("That invitation is invalid or expired.")
                family = invitation.family
                invitation.delete()
            else:
                family = Family.objects.create(name=field(data, "family", 80))
            user = User(username=email, email=email)
            change_password(user, data)
            try:
                user.save()
            except IntegrityError:
                raise Problem("Unable to register. Try signing in or resetting your password.")
            Member.objects.create(user=user, family=family, name=name, owner=not code)
    login(request, user)
    return {}


def change_password(user, data):
    password = data.get("password")
    if not isinstance(password, str) or len(password) > 256:
        raise Problem("Enter a password of up to 256 characters.")
    validate_password(password, user)
    user.set_password(password)


def family_action(me, action, data):
    if action == "invite":
        if not me.owner:
            raise Problem("Only the family organiser can create invitations.", 403)
        token = secrets.token_urlsafe(24)
        Invite.objects.create(family=me.family, digest=digest(token), expires=timezone.now()+timedelta(days=7))
        return {"code":token}
    if action == "santa":
        Family.objects.select_for_update().get(pk=me.family_id)
        year = timezone.now().year
        matches = Match.objects.filter(year=year, giver__family=me.family)
        if not matches.exists():
            ids = list(Member.objects.filter(family=me.family).values_list("pk", flat=True))
            if len(ids) < 2:
                raise Problem("Invite another member before drawing names.")
            secrets.SystemRandom().shuffle(ids)
            Match.objects.bulk_create([Match(year=year, giver_id=giver, recipient_id=ids[(i+1)%len(ids)]) for i,giver in enumerate(ids)])
        mine = matches.filter(giver=me).first()
        if not mine:
            raise Problem("You joined after this year’s draw. You can take part next Christmas.")
        return {"recipient":mine.recipient_id}
    if action == "add":
        Wish.objects.create(member=me, title=field(data,"title",160), note=field(data,"note",600,False) or "No extra details.", price=field(data,"price",100,False) or "Any price")
        return {}
    if action not in ("claim","pledge"):
        raise Problem("Unknown action.",404)
    wish = Wish.objects.select_for_update(of=("self",)).filter(pk=data.get("id"), member__family=me.family).first() if type(data.get("id")) is int and 0 < data["id"] < 2**63 else None
    if not wish or wish.member_id == me.pk:
        raise Problem("This gift is unavailable.",403)
    if action == "claim":
        if data.get("claim") is False:
            if wish.buyer_id == me.pk:
                wish.buyer = None
                wish.save()
        elif data.get("claim") is True:
            if wish.buyer_id not in (None, me.pk) or wish.pledge_set.exists():
                raise Problem("This gift is already reserved or shared.",409)
            wish.buyer = me
            wish.save()
        else:
            raise Problem("Choose a gift action.")
    elif wish.buyer_id:
        raise Problem("This gift is already reserved.",409)
    else:
        try:
            amount = Decimal(field(data, "amount", 12))
            if not amount.is_finite() or not 0 <= amount <= 999999 or amount.as_tuple().exponent < -2:
                raise ValueError
        except (ValueError, InvalidOperation):
            raise Problem("Enter an amount up to A$999999 with at most two decimal places.")
        if amount:
            Pledge.objects.update_or_create(wish=wish, member=me, defaults={"cents":int(amount*100)})
        else:
            Pledge.objects.filter(wish=wish,member=me).delete()
    return {}


@ensure_csrf_cookie
@require_http_methods(["GET", "POST"])
def api(request, action):
    try:
        if request.method == "GET" and action == "state":
            result = snapshot(request.user) if request.user.is_authenticated else {"me":None}
        elif request.method != "POST":
            raise Problem("POST required.",405)
        else:
            if len(request.body) > 8192:
                raise Problem("Request too large.",413)
            data = json.loads(request.body)
            if not isinstance(data,dict):
                raise Problem("Invalid request.")
            if action in ("login","signup","forgot","reset"):
                throttle(action+":"+request.META.get("REMOTE_ADDR",""), 100)
                result = auth_action(request,action,data)
            elif not request.user.is_authenticated:
                raise Problem("Sign in again.",401)
            elif action == "logout":
                logout(request)
                result = {}
            else:
                with transaction.atomic():
                    result = family_action(request.user.member,action,data)
        response = JsonResponse(result)
    except Problem as exc:
        response = JsonResponse({"error":exc.message},status=exc.status)
    except ValidationError as exc:
        response = JsonResponse({"error":" ".join(exc.messages)},status=400)
    except (json.JSONDecodeError, UnicodeDecodeError):
        response = JsonResponse({"error":"Invalid request."},status=400)
    response["Cache-Control"] = "no-store"
    return response


def page(request):
    return FileResponse((settings.BASE / "dist/index.html").open("rb"), content_type="text/html")

