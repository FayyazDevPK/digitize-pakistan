from django.urls import path

from .views import BalanceView, TriggerReadView, WithdrawalView

urlpatterns = [
    path("balance/", BalanceView.as_view(), name="rewards-balance"),
    path("read/", TriggerReadView.as_view(), name="rewards-read"),
    path("withdrawals/", WithdrawalView.as_view(), name="withdrawals"),
]
