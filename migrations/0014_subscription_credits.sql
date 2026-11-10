ALTER TABLE contact_unlocks ADD COLUMN subscription_id INTEGER REFERENCES user_subscriptions(id);
ALTER TABLE user_subscriptions ADD COLUMN credits_granted INTEGER NOT NULL DEFAULT 0;
UPDATE user_subscriptions SET contact_limit_balance=MAX(0,COALESCE(contact_limit_balance,0));
UPDATE user_subscriptions SET credits_granted = MAX(COALESCE(contact_limit_balance,0),
  COALESCE((SELECT contact_limit FROM packages WHERE id = package_id),0));

CREATE TABLE credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id INTEGER NOT NULL REFERENCES user_subscriptions(id),
  unlock_id INTEGER UNIQUE REFERENCES contact_unlocks(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
  reason TEXT NOT NULL CHECK(reason IN ('opening_balance','plan_grant','contact_unlock')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_credit_ledger_user ON credit_ledger(user_id, id DESC);
CREATE INDEX idx_subscription_entitlement ON user_subscriptions(user_id, status, end_date);

-- Opening balances preserve existing credits without inventing historical transactions.
INSERT INTO credit_ledger(user_id, subscription_id, amount, balance_after, reason)
SELECT user_id, id, MAX(0,COALESCE(contact_limit_balance,0)),
  MAX(0,COALESCE(contact_limit_balance,0)), 'opening_balance' FROM user_subscriptions;

CREATE TRIGGER subscription_credit_grant AFTER INSERT ON user_subscriptions
BEGIN
  UPDATE user_subscriptions SET credits_granted = MAX(0,COALESCE(NEW.contact_limit_balance,0)) WHERE id = NEW.id;
  INSERT INTO credit_ledger(user_id,subscription_id,amount,balance_after,reason)
  VALUES(NEW.user_id,NEW.id,MAX(0,COALESCE(NEW.contact_limit_balance,0)),
    MAX(0,COALESCE(NEW.contact_limit_balance,0)),'plan_grant');
END;

-- Validation, debit and ledger insert are part of the same SQLite transaction as the unlock.
CREATE TRIGGER contact_credit_validate BEFORE INSERT ON contact_unlocks
WHEN NEW.subscription_id IS NOT NULL
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM user_subscriptions WHERE id = NEW.subscription_id AND user_id = NEW.user_id
      AND status = 'active' AND julianday(start_date) <= julianday('now')
      AND julianday(end_date) > julianday('now') AND contact_limit_balance > 0
  ) THEN RAISE(ABORT, 'Contact credit unavailable') END;
END;

CREATE TRIGGER contact_credit_debit AFTER INSERT ON contact_unlocks
WHEN NEW.subscription_id IS NOT NULL
BEGIN
  UPDATE user_subscriptions SET contact_limit_balance = contact_limit_balance - 1 WHERE id = NEW.subscription_id;
  INSERT INTO credit_ledger(user_id,subscription_id,unlock_id,amount,balance_after,reason)
  SELECT NEW.user_id,NEW.subscription_id,NEW.id,-1,contact_limit_balance,'contact_unlock'
  FROM user_subscriptions WHERE id = NEW.subscription_id;
END;

CREATE TRIGGER subscription_balance_insert BEFORE INSERT ON user_subscriptions
WHEN NEW.contact_limit_balance IS NULL OR NEW.contact_limit_balance < 0 OR NEW.contact_limit_balance != CAST(NEW.contact_limit_balance AS INTEGER)
BEGIN SELECT RAISE(ABORT,'Invalid contact credit balance'); END;
CREATE TRIGGER subscription_balance_update BEFORE UPDATE OF contact_limit_balance ON user_subscriptions
WHEN NEW.contact_limit_balance IS NULL OR NEW.contact_limit_balance < 0 OR NEW.contact_limit_balance != CAST(NEW.contact_limit_balance AS INTEGER)
BEGIN SELECT RAISE(ABORT,'Invalid contact credit balance'); END;

-- New fulfilments are idempotent without rewriting any legacy payment history.
CREATE TRIGGER subscription_payment_once BEFORE INSERT ON user_subscriptions
WHEN NEW.payment_id IS NOT NULL AND EXISTS(SELECT 1 FROM user_subscriptions WHERE payment_id=NEW.payment_id)
BEGIN SELECT RAISE(ABORT,'Payment already fulfilled'); END;
