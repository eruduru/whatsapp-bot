import bcrypt from 'bcryptjs';
import { createInterface } from 'readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('Enter password: ');
rl.close();

const hash = await bcrypt.hash(password, 12);
console.log('\nPassword hash (set as DASHBOARD_USER_PASSWORD_HASH):\n');
console.log(hash);
