-- Temporary local fixtures. Never execute remotely.
INSERT OR REPLACE INTO users (id,email,status) VALUES ('qa-profile-hidden','qa-hidden@example.test','active'),('qa-profile-blocked','qa-blocked@example.test','active'),('qa-profile-inactive','qa-inactive@example.test','suspended');
INSERT OR REPLACE INTO profiles (user_id,gender,age,height,caste,highest_degree,occupation,annual_income,work_location,full_name) VALUES
('qa-profile-hidden','Female',27,'5ft 5in','Brahmin','CA','Analyst','₹20 LPA','Mumbai','QA Hidden'),
('qa-profile-blocked','Female',27,'5ft 5in','Brahmin','CA','Analyst','₹20 LPA','Mumbai','QA Blocked'),
('qa-profile-inactive','Female',27,'5ft 5in','Brahmin','CA','Analyst','₹20 LPA','Mumbai','QA Inactive');
INSERT OR REPLACE INTO user_settings (user_id,hide_profile,hide_income,hide_contact) VALUES ('qa-profile-hidden',1,1,1);
INSERT INTO notifications (user_id,type,title,body) VALUES ('mock-user-review','interest','QA regression interest','Temporary local test'),('mock-user-review','message','QA regression message','Temporary local test');
