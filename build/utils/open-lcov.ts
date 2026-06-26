import path from 'node:path';
import { openFile } from './open-file';

const __dirname = path.resolve(path.dirname(''));
const filePath = path.join(__dirname, '/coverage/index.html');

console.log(filePath);
openFile(filePath);
