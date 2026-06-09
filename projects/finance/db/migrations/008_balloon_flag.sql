-- Distinguishes true balloon mortgages (hard deadline, balance remaining → needs refi)
-- from regular debts where payoff_date_est is just an expected natural payoff date.
ALTER TABLE accounts ADD COLUMN is_balloon BOOLEAN NOT NULL DEFAULT 0;
