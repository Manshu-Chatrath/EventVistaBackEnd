const bcrypt = require("bcrypt");
class PasswordService {
  static async verifyPassword(
    password: string | number,
    realPassword: string | number
  ) {
    const result = await bcrypt.compare(password, realPassword);
    return result;
  }

  static async hashPassword(password: string | number) {
    const salt = await bcrypt.genSalt(6);
    const hashedPassword = await bcrypt.hash(password, salt);

    return hashedPassword;
  }
}
export default PasswordService;
