from django.urls import path
from lists.views import api, page

urlpatterns = [path("",page),path("login",page),path("api/<str:action>",api)]

