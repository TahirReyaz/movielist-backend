import { checkWhitespace } from ".";

export const validateUsername = (username: string) => {
  let valid = false;
  if (username && username.length > 0 && !checkWhitespace(username)) {
    valid = true;
  }

  return valid;
};

export const passwordValidity = (password: string) => {
  // regex for password validation (at least 1 uppercase, 1 lowercase, 1 number, 1 special character,  min 8 characters long)
  const re =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const result = re.test(password);
  return result;
};
