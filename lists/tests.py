import json
import re
from decimal import Decimal
from unittest.mock import patch
from .pricing import PriceCheckError
from django.core import mail
from django.test import Client, TestCase
from .models import Wish


class FamilyPrivacyTests(TestCase):
    password = "Christmas-Holly-72!"

    def post(self, client, action, **data):
        return client.post("/api/"+action, json.dumps(data), content_type="application/json")

    def signup(self, name, **extra):
        client = Client()
        response = self.post(client, "signup", name=name, email=name+"@example.com", password=self.password, **extra)
        self.assertEqual(response.status_code,200,response.content)
        return client

    def setUp(self):
        self.lookup = self.enterContext(patch("lists.views.lookup_price", return_value=(Decimal("30"), "https://shop.example.com.au/lamp")))
        self.owner = self.signup("Alex",family="Evergreen")
        code = self.post(self.owner,"invite").json()["code"]
        self.guest = self.signup("Jamie",code=code)
        self.assertEqual(self.post(Client(),"signup",name="Intruder",email="i@example.com",password=self.password,code=code).status_code,400)
        self.post(self.owner,"add",title="Reading lamp",note="Warm light",price="A$40")
        self.wish = Wish.objects.get().pk

    def state(self, client):
        return client.get("/api/state").json()

    def test_only_author_can_edit_or_delete(self):
        changes = dict(id=self.wish, title="Desk lamp", note="Green", price="A$30")
        self.assertEqual(self.post(self.guest, "edit", **changes).status_code, 404)
        self.assertEqual(self.post(self.guest, "delete", id=self.wish).status_code, 404)
        self.post(self.guest, "pledge", id=self.wish, amount="10")
        self.assertEqual(self.post(self.owner, "edit", **changes).status_code, 200)
        saved = self.state(self.guest)["wishes"][0]
        self.assertEqual((saved["title"], saved["note"], saved["price"]), ("Desk lamp", "Green", "A$30.00"))
        self.assertEqual(saved["contributions"][0]["amount"], 10)
        self.assertEqual(self.post(self.owner, "delete", id=self.wish).status_code, 200)
        self.assertEqual(self.state(self.guest)["wishes"], [])

    def test_family_and_gift_privacy(self):
        other = self.signup("Taylor",family="Other")
        self.assertEqual(self.state(other)["wishes"],[])
        for client in [self.owner,other]:
            self.assertEqual(self.post(client,"claim",id=self.wish,claim=True).status_code,403)
            self.assertEqual(self.post(client,"pledge",id=self.wish,amount="10").status_code,403)
        self.assertEqual(self.post(self.guest,"invite").status_code,403)
        self.assertEqual(self.post(self.guest,"pledge",id=self.wish,amount="5.75").status_code,200)
        self.assertEqual(self.post(self.guest,"claim",id=self.wish,claim=True).status_code,409)
        self.assertNotIn("contributions",self.state(self.owner)["wishes"][0])
        self.assertEqual(self.state(self.guest)["wishes"][0]["contributions"][0]["amount"],5.75)
        self.post(self.guest,"pledge",id=self.wish,amount="0")
        self.post(self.guest,"claim",id=self.wish,claim=True)
        self.assertNotIn("selectedBy",self.state(self.owner)["wishes"][0])
        self.assertEqual(self.state(self.guest)["wishes"][0]["selectedBy"],self.state(self.guest)["me"])
        self.post(self.guest,"claim",id=self.wish,claim=False)
        self.assertIsNone(self.state(self.guest)["wishes"][0]["selectedBy"])

    def test_server_checks_limit_and_preserves_wish_on_failure(self):
        source = "https://shop.example.com.au/lamp"
        self.lookup.return_value = (Decimal("300.01"), source)
        payload = dict(title="Budget test", price="1", checked_price="1", id=self.wish)
        for action in ("add", "edit"):
            self.assertEqual(self.post(self.owner, action, **payload).status_code, 422)
        self.assertEqual(Wish.objects.get().title, "Reading lamp")
        self.lookup.side_effect = PriceCheckError("Unverified price")
        self.assertEqual(self.post(self.owner, "add", **payload).status_code, 422)
        self.lookup.side_effect = None
        self.lookup.return_value = (Decimal("300"), source)
        self.assertEqual(self.post(self.owner, "add", **payload).status_code, 200)
        new = Wish.objects.get(title="Budget test")
        self.assertEqual((new.price, new.price_source), ("A$300.00", source))

    def test_draw_and_sessions(self):
        recipient=self.post(self.owner,"santa").json()["recipient"]
        self.assertEqual(recipient,self.state(self.guest)["me"])
        self.assertEqual(self.post(self.owner,"santa").json()["recipient"],recipient)
        self.assertEqual(self.post(self.guest,"santa").json()["recipient"],self.state(self.owner)["me"])
        self.post(self.guest,"logout")
        self.assertEqual(self.post(self.guest,"claim",id=self.wish,claim=True).status_code,401)
        self.post(self.guest,"login",email="jamie@example.com",password=self.password)
        self.assertEqual(self.state(self.guest)["me"],recipient)

    def test_reset_and_csrf(self):
        self.assertEqual(self.post(Client(enforce_csrf_checks=True),"signup").status_code,403)
        self.post(Client(),"forgot",email="alex@example.com")
        uid,token=re.search(r"#reset=(\d+)/([\w-]+)",mail.outbox[0].body).groups()
        payload=dict(uid=uid,token=token,password="Spruce-Forest-97!")
        self.assertEqual(self.post(Client(),"reset",**payload).status_code,200)
        self.assertEqual(self.post(Client(),"reset",**payload).status_code,400)
        self.assertIsNone(self.state(self.owner)["me"])

