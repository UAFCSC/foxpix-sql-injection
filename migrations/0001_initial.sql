CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT,
  password TEXT,
  admin BOOLEAN
);

CREATE TABLE foxes (
  id SERIAL PRIMARY KEY,
  url TEXT,
  description TEXT,
  likes INTEGER
);
