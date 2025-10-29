import path from 'path';
import { openFile } from './open-file';

const __dirname = path.resolve(path.dirname(''));
const filePath = path.join(__dirname, '/coverage/lcov-report/index.html');

console.log(filePath);
openFile(filePath);
