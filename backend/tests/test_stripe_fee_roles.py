import asyncio
import pytest
from fastapi import HTTPException
from app import auth
from app.routers import stripe_payments as SP

@pytest.mark.parametrize('role', [None, 'host', 'support'])
def test_host_cannot_mint_arbitrary_fee(monkeypatch, role):
    async def user(_):
        return {'id': 'host', 'app_metadata': {'role': role}, 'user_metadata': {'role': 'planner'}}
    monkeypatch.setattr(auth, 'verify_supabase_token', user)
    monkeypatch.setattr(SP, 'STRIPE_SECRET_KEY', '')
    body = SP.CheckoutRequest(amount_cents=1, label='Anything', fee_id='x', success_url='x', cancel_url='x')
    with pytest.raises(HTTPException) as exc:
        asyncio.run(SP.create_checkout_session(body, 'Bearer valid', None))
    assert exc.value.status_code == 403

@pytest.mark.parametrize('role', ['planner', 'admin'])
def test_trusted_planner_can_mint_fee(monkeypatch, role):
    async def user(_):
        return {'id': 'planner', 'app_metadata': {'role': role}}
    monkeypatch.setattr(auth, 'verify_supabase_token', user)
    monkeypatch.setattr(SP, 'STRIPE_SECRET_KEY', 'test')
    monkeypatch.setattr(SP.stripe.checkout.Session, 'create', lambda **kw: type('Session', (), {'id':'cs', 'url':'https://checkout.stripe.com/cs'})())
    body = SP.CheckoutRequest(amount_cents=1, label='Fee', fee_id='x', success_url='http://localhost:3000/', cancel_url='http://localhost:3000/')
    assert asyncio.run(SP.create_checkout_session(body, 'Bearer valid', None))['session_id'] == 'cs'


def test_host_authentication_stays_available(monkeypatch):
    async def user(_):
        return {'id': 'host', 'app_metadata': {'role': 'host'}}
    monkeypatch.setattr(auth, 'verify_supabase_token', user)
    assert asyncio.run(auth.require_planner('Bearer valid', None))['id'] == 'host'


def test_dev_token_does_not_assign_planner_role(monkeypatch):
    monkeypatch.setattr(auth, 'ALLOW_DEV_TOKEN', True)
    monkeypatch.setattr(auth, 'PLANNER_DEV_TOKEN', 'dev')
    with pytest.raises(HTTPException) as exc:
        asyncio.run(auth.require_fee_planner(None, 'dev'))
    assert exc.value.status_code == 401
