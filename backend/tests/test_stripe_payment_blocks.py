import asyncio
import logging
from contextlib import asynccontextmanager
import pytest
from app.routers import stripe_payments as SP
from test_stripe_pass_entitlement import FakeConn, FakePool, PASS_META

class Ledger(FakeConn):
    def __init__(self):
        super().__init__()
        self.blocks = {}
        self.receipt = None
        self.in_transaction = False

    @asynccontextmanager
    async def transaction(self):
        assert not self.in_transaction
        self.in_transaction = True
        try: yield
        finally: self.in_transaction = False

    async def execute(self, sql, *args):
        self.executed.append((sql, args))
        assert self.in_transaction
        if 'insert into public.pass_payment_blocks' in sql:
            # Stored exactly as given: the never-downgrade-a-refund rule is the
            # route's to enforce, so a fake that applied it would hide its removal.
            self.blocks[args[0]] = args[1]
        if 'insert into public.event_passes' in sql:
            if self.receipt: return 'INSERT 0 0'
            self.receipt = args
            return 'INSERT 0 1'
        return 'SELECT 1'

    async def fetchval(self, sql, *args):
        if 'pass_payment_blocks' in sql:
            return self.blocks.get(args[0])
        return None

@pytest.fixture
def ledger(monkeypatch):
    conn = Ledger()
    async def pool(): return FakePool(conn)
    monkeypatch.setattr(SP, 'get_pool', pool)
    # The real list class, not a dict: stripe-python >= 15 objects refuse `.get`,
    # and a dict stub here hid exactly that on the live refund (11/10/2026).
    listed = SP.stripe.ListObject.construct_from(
        {'object': 'list', 'has_more': False, 'url': '/v1/checkout/sessions',
         'data': [{'id': 'cs_pass_1', 'object': 'checkout.session'}]}, 'sk_test_x')
    monkeypatch.setattr(SP.stripe.checkout.Session, 'list', lambda **kw: listed)
    return conn

def grant():
    return SP._grant_pass(PASS_META, {'payment_status':'paid', 'payment_intent':'pi_pass_1', 'currency':'usd'}, 'cs_pass_1', 3900)

def block(reason='refunded'):
    return SP._block_pass_payment({'payment_intent':'pi_pass_1'}, reason, 'evt_refund')

def test_refund_retains_receipt_and_replay_cannot_restore_access(ledger, caplog):
    async def scenario():
        await grant(); receipt = ledger.receipt
        await block(); await grant()
        assert ledger.receipt == receipt
        assert ledger.blocks['pi_pass_1'] == 'refunded'
    with caplog.at_level(logging.INFO, logger='ngw.stripe'):
        asyncio.run(scenario())
    assert caplog.text.count('PASS GRANTED') == 1
    assert 'PASS BLOCKED' in caplog.text

def test_refund_before_checkout_prevents_initial_grant(ledger, caplog):
    async def scenario():
        await block(); await grant()
        assert ledger.receipt
        assert ledger.blocks['pi_pass_1'] == 'refunded'
    with caplog.at_level(logging.INFO, logger='ngw.stripe'):
        asyncio.run(scenario())
    assert 'PASS GRANTED' not in caplog.text

def test_duplicate_grant_does_not_claim_pass_granted(ledger, caplog):
    async def scenario():
        await grant(); await grant()
    with caplog.at_level(logging.INFO, logger='ngw.stripe'):
        asyncio.run(scenario())
    assert caplog.text.count('PASS GRANTED') == 1
    assert 'DUPLICATE' in caplog.text

def test_dispute_suspends_and_cannot_downgrade_full_refund(ledger):
    async def scenario():
        await block('disputed'); assert ledger.blocks['pi_pass_1'] == 'disputed'
        await block(); await block('disputed')
        assert ledger.blocks['pi_pass_1'] == 'refunded'
    asyncio.run(scenario())

def test_grant_and_block_serialize_on_same_payment_key(ledger):
    async def scenario():
        await grant(); await block()
    asyncio.run(scenario())
    locks = [args for sql,args in ledger.executed if 'pg_advisory_xact_lock' in sql]
    assert locks == [('pi_pass_1',), ('pi_pass_1',)]

from test_stripe_pass_entitlement import dev_webhook, _webhook

@pytest.mark.parametrize('kind, payload, reason', [
    ('charge.refunded', {'payment_intent':'pi_pass_1', 'refunded': True}, 'refunded'),
    ('charge.dispute.created', {'payment_intent':'pi_pass_1'}, 'disputed'),
])
def test_only_verified_provider_events_block(dev_webhook, ledger, kind, payload, reason):
    _webhook({'id':'evt_block', 'type':kind, 'data':{'object':payload}})
    assert ledger.blocks == {'pi_pass_1': reason}


def test_unverified_refund_never_changes_access(monkeypatch, ledger):
    monkeypatch.setattr(SP, 'STRIPE_SECRET_KEY', 'test')
    monkeypatch.setattr(SP, 'STRIPE_WEBHOOK_SECRET', '')
    _webhook({'type':'charge.refunded', 'data':{'object':{'payment_intent':'pi_pass_1','refunded':True}}}, stripe_signature=None)
    assert not ledger.blocks


def test_old_receipt_mapping_comes_from_stripe_lookup(ledger, monkeypatch):
    seen = {}
    def lookup(**kwargs):
        seen.update(kwargs)
        return SP.stripe.ListObject.construct_from(
            {'object': 'list', 'has_more': False, 'url': '/v1/checkout/sessions',
             'data': [{'id': 'cs_historic', 'object': 'checkout.session'}]}, 'sk_test_x')
    monkeypatch.setattr(SP.stripe.checkout.Session, 'list', lookup)
    asyncio.run(SP._block_pass_payment({'payment_intent':'pi_pass_1','metadata':{'session_id':'cs_forged'}},'refunded','evt'))
    assert seen == {'payment_intent':'pi_pass_1','limit':100}
    update_args = next(args for sql,args in ledger.executed if 'update public.event_passes' in sql)
    assert update_args == ('pi_pass_1', ['cs_historic'])


def test_mapping_failure_is_retryable_and_writes_no_partial_block(ledger, monkeypatch):
    def fail(**kwargs): raise RuntimeError('Stripe unavailable')
    monkeypatch.setattr(SP.stripe.checkout.Session, 'list', fail)
    with pytest.raises(RuntimeError): asyncio.run(block())
    assert not ledger.blocks


def test_blocked_receipt_cannot_be_returned_as_active(ledger, monkeypatch):
    async def auth(*args): return {'id':'user'}
    async def studio(*args): return 'studio'
    async def receipt(sql, *args):
        assert 'not exists' in sql and 'pass_payment_blocks' in sql
        return None
    monkeypatch.setattr(SP, 'require_planner', auth)
    monkeypatch.setattr(SP, '_studio_for_event', studio)
    monkeypatch.setattr(ledger, 'fetchrow', receipt)
    assert asyncio.run(SP.get_pass('cust-123', 'Bearer user', None))['held'] is False


def test_partial_refund_keeps_access_per_owner_policy(dev_webhook, ledger):
    asyncio.run(grant())
    receipt = ledger.receipt
    _webhook({'id':'evt_partial','type':'charge.refunded','data':{'object':{
        'payment_intent':'pi_pass_1','amount':3900,'amount_refunded':1000,'refunded':False,
    }}})
    assert ledger.receipt == receipt
    assert ledger.blocks == {}
    # A later full refund still revokes, including after this partial event.
    _webhook({'id':'evt_full','type':'charge.refunded','data':{'object':{
        'payment_intent':'pi_pass_1','amount':3900,'amount_refunded':3900,'refunded':True,
    }}})
    assert ledger.blocks == {'pi_pass_1':'refunded'}
