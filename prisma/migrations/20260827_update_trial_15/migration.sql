ALTER TABLE planes MODIFY trialDays INT NOT NULL DEFAULT 15;
UPDATE planes SET trialDays = 15 WHERE trialDays = 14;
