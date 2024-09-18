export const validateUsername = (newUsername: string) => {
  let valid = false;
  if (newUsername && newUsername.length > 0 && !newUsername.includes(" ")) {
    valid = true;
  }

  return valid;
};
