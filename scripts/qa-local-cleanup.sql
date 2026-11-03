DELETE FROM notifications WHERE user_id='mock-user-review' AND title IN ('QA regression interest','QA regression message');
DELETE FROM profiles WHERE user_id IN ('qa-profile-hidden','qa-profile-blocked','qa-profile-inactive');
DELETE FROM users WHERE id IN ('qa-profile-hidden','qa-profile-blocked','qa-profile-inactive');
